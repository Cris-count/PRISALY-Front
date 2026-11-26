import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CasosM3Api, NarrativaDocente } from '../../academico/casos-m3.api';
import type { GuionNarrativo } from '../narrativa/narrativa.models';
import { VistaPreviaDocenteUnreal } from './acceso-simulador';
import { SESION_VISUAL_UNREAL, SesionVisualUnreal } from './configuracion-unreal';
import { CARGAR_ESQUEMAS_UNREAL, cargarEsquemasBrowser } from './protocolo/cargar-esquemas-browser';
import { Esquemas, Mensaje, validarObjeto } from './protocolo/validador-mensaje';
import { FABRICA_REPRODUCTOR_UNREAL, ReproductorUnreal } from './reproductor-unreal';
import { SimuladorUnrealPage } from './simulador-unreal-page';
import { CanalPixelStreaming, TransportePixelStreaming } from './transporte-pixel-streaming';

/** CB-05A: la vista previa docente lee el caso de M3, envía caso.configurar y solo usa los diálogos guardados. */
describe('SimuladorUnrealPage — vista previa docente (CB-05A)', () => {
  const ID_CASO = '0b6f5a52-6d0e-4a43-9a0e-2f1d7c3b9e11';
  const DIALOGO = 'Durante la valoración inicial observamos que la persona presenta dificultades para comunicarse.';
  const asignacion: SesionVisualUnreal = {
    urlSenalizacion: 'ws://127.0.0.1:8888', streamerId: 'instancia-prueba', sesion: 'sesion-prueba-0001', casoId: 'caso-demo-01',
  };
  const narrativa: NarrativaDocente = {
    idCaso: ID_CASO,
    publicado: null,
    borrador: {
      idGuion: '6a1d2b3c-4e5f-4a7b-8c9d-0e1f2a3b4c5d', version: 1, estado: 'BORRADOR', fechaActualizacion: '2026-11-26T21:00:00Z',
      hashDefinicion: 'a'.repeat(64),
      definicion: {
        formato: 'prisaly-guion-1', inicio: 'hospital',
        espacios: [{ idEspacio: 'hospital', titulo: 'Hospital', recursoVisual: 'edificio:hospital' }],
        personajes: [{ idPersonaje: 'dra-lopez', nombre: 'Dra. López', rol: 'Médica', recursoVisual: 'npc:hosp-npc-doctor' }],
        intervenciones: [{ idIntervencion: 'dra-lopez-conversacion', idEspacio: 'hospital', idPersonaje: 'dra-lopez',
          dialogos: [{ idPersonaje: 'dra-lopez', texto: DIALOGO }] }],
      },
    },
  };
  let esquemas: Esquemas;
  beforeAll(async () => { esquemas = await cargarEsquemasBrowser(); });

  function preparar(api: Pick<CasosM3Api, 'narrativa'>) {
    let responder!: (texto: string) => void;
    let numero = 1;
    const canal: jasmine.SpyObj<CanalPixelStreaming> = jasmine.createSpyObj('PixelStreaming',
      ['emitUIInteraction', 'addResponseEventListener', 'removeResponseEventListener', 'disconnect']);
    canal.addResponseEventListener.and.callFake((_n, receptor) => { responder = receptor; });
    // Como MUNDO-24 (PrisalyNucleoPuente::Construir): tras caso.configurar, todo mensaje de Unreal lleva el contexto vigente.
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
    let transporte = new TransportePixelStreaming(canal);
    const fabrica = jasmine.createSpy('fabrica').and.callFake(async () => {
      transporte = new TransportePixelStreaming(canal);
      const t = transporte;
      return { transporte: t, conectar: () => t.abrir(), reproducir: () => {}, permitirEntrada: () => {}, cerrar: () => t.cerrar() } as ReproductorUnreal;
    });
    TestBed.configureTestingModule({
      imports: [SimuladorUnrealPage],
      providers: [
        provideRouter([]),
        { provide: SESION_VISUAL_UNREAL, useValue: asignacion },
        { provide: CARGAR_ESQUEMAS_UNREAL, useValue: async () => esquemas },
        { provide: FABRICA_REPRODUCTOR_UNREAL, useValue: fabrica },
        { provide: CasosM3Api, useValue: api },
      ],
    });
    TestBed.inject(VistaPreviaDocenteUnreal).actual.set({ idCaso: ID_CASO });
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
    return { fixture, pagina, mundoListo, enviados, guiones };
  }

  it('lee la narrativa de M3 y envía sesion.iniciar y luego caso.configurar con contexto opaco y solo Hospital + médico', async () => {
    const api = { narrativa: jasmine.createSpy('narrativa').and.returnValue(of(narrativa)) };
    const p = preparar(api);
    await p.pagina.conectar();
    await p.mundoListo();
    expect(api.narrativa).toHaveBeenCalledOnceWith(ID_CASO);
    const [inicio, configurar] = p.enviados();
    expect(inicio.tipo).toBe('sesion.iniciar');
    expect(inicio.contexto).toBeUndefined();
    expect(configurar.tipo).toBe('caso.configurar');
    expect(configurar.contexto).toMatch(/^cv-[0-9a-f]{32}$/);
    expect(configurar.datos['idContextoVisual']).toBe(configurar.contexto);
    expect(configurar.datos['edificiosHabilitados']).toEqual(['hospital_entrada']);
    expect(configurar.datos['npcsActivos']).toEqual(['hosp-npc-doctor']);
    expect(JSON.stringify(configurar)).not.toContain(ID_CASO); // ningún identificador académico viaja a Unreal
    expect(JSON.stringify(configurar)).not.toContain('Dra. López'); // ni la narrativa
    expect(validarObjeto(esquemas, configurar).ok).toBeTrue();
    // Los diálogos disponibles son exactamente los guardados, y solo para el médico.
    expect([...p.guiones()!.keys()]).toEqual(['hosp-npc-doctor']);
    expect(p.guiones()!.get('hosp-npc-doctor')!.escenas[0].dialogos.map((d) => d.texto)).toEqual([DIALOGO]);
    expect(p.pagina.personajesCaso()).toEqual(['Dra. López']);
    p.fixture.detectChanges();
    expect(p.fixture.nativeElement.querySelector('[data-prueba="aviso-vista-previa"]').textContent).toContain('Dra. López');
    // El panel del recorrido solo lista el personaje del caso, con su nombre (no los de demostración).
    const recorrido = p.pagina.hospital.recorridoVisible();
    expect(recorrido.map((e) => e.npcs.map((n) => n.nombre))).toEqual([['Dra. López']]);
    expect(p.pagina.hospital.totalConversaciones()).toBe(1);
    p.pagina.desconectar();
  });

  it('al reconectar vuelve a pedir el caso y reutiliza el mismo contexto visual (Unreal restaura sin reiniciar)', async () => {
    const api = { narrativa: jasmine.createSpy('narrativa').and.returnValue(of(narrativa)) };
    const p = preparar(api);
    await p.pagina.conectar();
    await p.mundoListo();
    const primero = p.enviados().find((m) => m.tipo === 'caso.configurar')!;
    p.pagina.desconectar();
    await p.pagina.conectar();
    await p.mundoListo();
    const configuraciones = p.enviados().filter((m) => m.tipo === 'caso.configurar');
    expect(api.narrativa).toHaveBeenCalledTimes(2);
    expect(configuraciones.length).toBe(2);
    expect(configuraciones[1].contexto).toBe(primero.contexto);
    expect(configuraciones[1].datos['huella']).toBe(primero.datos['huella']);
    expect(p.pagina.sesionIniciada()).toBeTrue(); // mundo.listo y acks con el contexto vigente no se descartan
    p.pagina.desconectar();
  });

  it('si M3 no devuelve el caso no envía caso.configurar, no conecta y no deja diálogos de demostración', async () => {
    const api = { narrativa: jasmine.createSpy('narrativa').and.returnValue(throwError(() => new Error('404'))) };
    const p = preparar(api);
    await p.pagina.conectar();
    await p.mundoListo();
    expect(p.enviados().map((m) => m.tipo)).toEqual(['sesion.iniciar']);
    expect(p.pagina.conectado()).toBeFalse();
    expect(p.pagina.error()).toContain('No se pudo cargar o aplicar el caso guardado');
    expect(p.guiones()!.size).toBe(0);
  });
});
