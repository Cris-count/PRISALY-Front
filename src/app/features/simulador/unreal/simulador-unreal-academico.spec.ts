import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CasosM3Api } from '../../academico/casos-m3.api';
import { FalloPortal, NarrativaIntentoM5, PortalEstudianteApi } from '../../estudiante/portal-estudiante.api';
import type { GuionM3 } from '../narrativa/adaptador-guion-m3';
import type { GuionNarrativo } from '../narrativa/narrativa.models';
import { ContextoAcademicoUnreal } from './acceso-simulador';
import { SESION_VISUAL_UNREAL, SesionVisualUnreal } from './configuracion-unreal';
import { CARGAR_ESQUEMAS_UNREAL, cargarEsquemasBrowser } from './protocolo/cargar-esquemas-browser';
import { Esquemas, Mensaje, validarObjeto } from './protocolo/validador-mensaje';
import { FABRICA_REPRODUCTOR_UNREAL, ReproductorUnreal } from './reproductor-unreal';
import { SimuladorUnrealPage } from './simulador-unreal-page';
import { CanalPixelStreaming, TransportePixelStreaming } from './transporte-pixel-streaming';

/** CB-07 (DC-CB-AVANCE-08): en modo estudiante el visor usa la narrativa FIJADA en el intento (M5), nunca M3 ni la demo. */
describe('SimuladorUnrealPage — modo académico del estudiante (CB-07)', () => {
  const CONTEXTO = {
    idIntento: '7c1e2f3a-4b5c-4d6e-8f70-81a2b3c4d5e6', idSesion: '8d2f3a4b-5c6d-4e7f-8a81-92b3c4d5e6f7',
    idCaso: '9e3a4b5c-6d7e-4f80-9b92-a3c4d5e6f708', tituloCaso: 'Caso de validación CB-07',
  };
  const asignacion: SesionVisualUnreal = {
    urlSenalizacion: 'ws://127.0.0.1:8888', streamerId: 'instancia-prueba', sesion: 'sesion-prueba-0001', casoId: 'caso-demo-01',
  };
  const GUION: GuionM3 = {
    formato: 'prisaly-guion-1', inicio: 'hospital',
    espacios: [
      { idEspacio: 'hospital', titulo: 'Hospital', recursoVisual: 'edificio:hospital' },
      { idEspacio: 'comisaria', titulo: 'Comisaría', recursoVisual: 'edificio:comisaria' }],
    personajes: [
      { idPersonaje: 'dr-martinez', nombre: 'Dr. Martínez', recursoVisual: 'npc:hosp-npc-doctor' },
      { idPersonaje: 'oficial-rios', nombre: 'Oficial Ríos', recursoVisual: 'npc:pol-npc-oficial' }],
    intervenciones: [
      { idIntervencion: 'medico', idEspacio: 'hospital', idPersonaje: 'dr-martinez', dialogos: [{ idPersonaje: 'dr-martinez', texto: 'Texto publicado del médico.' }] },
      { idIntervencion: 'oficial', idEspacio: 'comisaria', idPersonaje: 'oficial-rios', dialogos: [{ idPersonaje: 'oficial-rios', texto: 'Texto publicado del oficial.' }] }],
  };
  const narrativa = (definicion: GuionM3 = GUION): NarrativaIntentoM5 => ({
    idIntento: CONTEXTO.idIntento, idGuion: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', version: 3, hashDefinicion: 'b'.repeat(64), definicion,
  });
  let esquemas: Esquemas;
  beforeAll(async () => { esquemas = await cargarEsquemasBrowser(); });

  function preparar(portal: Pick<PortalEstudianteApi, 'narrativa'>) {
    let responder!: (texto: string) => void;
    let numero = 1;
    const canal: jasmine.SpyObj<CanalPixelStreaming> = jasmine.createSpyObj('PixelStreaming',
      ['emitUIInteraction', 'addResponseEventListener', 'removeResponseEventListener', 'disconnect']);
    canal.addResponseEventListener.and.callFake((_n, receptor) => { responder = receptor; });
    let contextoUnreal: string | null = null;
    const sobreUnreal = () => (contextoUnreal ? { contexto: contextoUnreal } : {});
    canal.emitUIInteraction.and.callFake((descriptor) => {
      const orden = descriptor as Mensaje;
      if (orden.tipo === 'caso.configurar') contextoUnreal = orden.datos['idContextoVisual'] as string;
      queueMicrotask(() => responder(JSON.stringify({
        v: 1, tipo: 'orden.ack', id: `u-${String(++numero).padStart(6, '0')}`, correlacion: orden.id,
        sesion: asignacion.sesion, ts: 1, origen: 'unreal', ...sobreUnreal(), datos: {},
      })));
      return true;
    });
    const fabrica = jasmine.createSpy('fabrica').and.callFake(async () => {
      const t = new TransportePixelStreaming(canal);
      return { transporte: t, conectar: () => t.abrir(), reproducir: () => {}, permitirEntrada: () => {}, cerrar: () => t.cerrar() } as ReproductorUnreal;
    });
    const m3 = { narrativa: jasmine.createSpy('narrativaM3') };
    TestBed.configureTestingModule({
      imports: [SimuladorUnrealPage],
      providers: [
        provideRouter([]),
        { provide: SESION_VISUAL_UNREAL, useValue: asignacion },
        { provide: CARGAR_ESQUEMAS_UNREAL, useValue: async () => esquemas },
        { provide: FABRICA_REPRODUCTOR_UNREAL, useValue: fabrica },
        { provide: PortalEstudianteApi, useValue: portal },
        { provide: CasosM3Api, useValue: m3 },
      ],
    });
    TestBed.inject(ContextoAcademicoUnreal).actual.set(CONTEXTO);
    const fixture = TestBed.createComponent(SimuladorUnrealPage);
    fixture.detectChanges();
    const pagina = fixture.componentInstance;
    const mundoListo = async () => {
      responder(JSON.stringify({ v: 1, tipo: 'mundo.listo', id: `u-${String(++numero).padStart(6, '0')}`, correlacion: null,
        sesion: asignacion.sesion, ts: 1, origen: 'unreal', ...sobreUnreal(), datos: { versionContenido: 'prototipo-0.1.2' } }));
      for (let i = 0; i < 40 && !pagina.sesionIniciada() && !pagina.error(); i++) await new Promise((r) => setTimeout(r, 25));
    };
    const enviados = () => canal.emitUIInteraction.calls.allArgs().map(([m]) => m as Mensaje);
    const guiones = () => (pagina.hospital as unknown as { guionesCaso: ReadonlyMap<string, GuionNarrativo> | null }).guionesCaso;
    return { pagina, mundoListo, enviados, guiones, m3 };
  }

  it('lee la narrativa fijada de M5 (no M3) y configura MUNDO-24 sin identificadores académicos', async () => {
    const portal = { narrativa: jasmine.createSpy('narrativa').and.returnValue(of(narrativa())) };
    const p = preparar(portal);
    await p.pagina.conectar();
    await p.mundoListo();
    expect(portal.narrativa).toHaveBeenCalledOnceWith(CONTEXTO.idIntento);
    expect(p.m3.narrativa).not.toHaveBeenCalled();
    const configurar = p.enviados().find((m) => m.tipo === 'caso.configurar')!;
    expect(configurar.datos['edificiosHabilitados']).toEqual(['hospital_entrada', 'policia_entrada']);
    expect(configurar.datos['npcsActivos']).toEqual(['hosp-npc-doctor', 'pol-npc-oficial']);
    expect(validarObjeto(esquemas, configurar).ok).toBeTrue();
    const texto = JSON.stringify(p.enviados());
    for (const id of [CONTEXTO.idIntento, CONTEXTO.idSesion, CONTEXTO.idCaso, 'Dr. Martínez']) expect(texto).not.toContain(id);
    expect([...p.guiones()!.keys()].sort()).toEqual(['hosp-npc-doctor', 'pol-npc-oficial']);
    expect(p.guiones()!.get('hosp-npc-doctor')!.escenas[0].dialogos.map((d) => d.texto)).toEqual(['Texto publicado del médico.']);
    expect(p.pagina.sesionIniciada()).toBeTrue();
    p.pagina.desconectar();
  });

  it('al reconectar vuelve a pedir la narrativa del intento y reutiliza el contexto visual', async () => {
    const portal = { narrativa: jasmine.createSpy('narrativa').and.returnValue(of(narrativa())) };
    const p = preparar(portal);
    await p.pagina.conectar();
    await p.mundoListo();
    const primero = p.enviados().find((m) => m.tipo === 'caso.configurar')!;
    p.pagina.desconectar();
    await p.pagina.conectar();
    await p.mundoListo();
    const configuraciones = p.enviados().filter((m) => m.tipo === 'caso.configurar');
    expect(portal.narrativa).toHaveBeenCalledTimes(2);
    expect(configuraciones[1].contexto).toBe(primero.contexto);
    expect(TestBed.inject(ContextoAcademicoUnreal).aplicado?.idIntento).toBe(CONTEXTO.idIntento);
    p.pagina.desconectar();
  });

  it('con la exploración cerrada (409) no configura el mundo ni usa diálogos de demostración', async () => {
    const portal = { narrativa: jasmine.createSpy('narrativa').and.returnValue(throwError(() => new FalloPortal(409, 'EXPLORACION_CERRADA'))) };
    const p = preparar(portal);
    await p.pagina.conectar();
    await p.mundoListo();
    expect(p.enviados().map((m) => m.tipo)).toEqual(['sesion.iniciar']);
    expect(p.pagina.conectado()).toBeFalse();
    expect(p.pagina.error()).toContain('La narrativa de tu intento no está disponible');
    expect(p.guiones()!.size).toBe(0);
  });

  it('rechaza un guion fijado incompatible con el catálogo visual sin aplicarlo', async () => {
    const incompatible: GuionM3 = { ...GUION, personajes: [{ idPersonaje: 'x', nombre: 'X', recursoVisual: 'npc:pol-npc-sargento' }] };
    const portal = { narrativa: jasmine.createSpy('narrativa').and.returnValue(of(narrativa(incompatible))) };
    const p = preparar(portal);
    await p.pagina.conectar();
    await p.mundoListo();
    expect(p.enviados().some((m) => m.tipo === 'caso.configurar')).toBeFalse();
    expect(p.guiones()!.size).toBe(0);
    expect(p.pagina.error()).toBeTruthy();
  });
});
