import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { LibretaStore } from '../investigacion/libreta.store';
import { SESION_VISUAL_UNREAL, SesionVisualUnreal } from './configuracion-unreal';
import { CARGAR_ESQUEMAS_UNREAL, cargarEsquemasBrowser } from './protocolo/cargar-esquemas-browser';
import { Esquemas, Mensaje, validarObjeto } from './protocolo/validador-mensaje';
import {
  FABRICA_REPRODUCTOR_UNREAL,
  FabricaReproductorUnreal,
  ReproductorUnreal,
} from './reproductor-unreal';
import { RETARDOS_RECONEXION_UNREAL, SimuladorUnrealPage } from './simulador-unreal-page';
import { CanalPixelStreaming, TransportePixelStreaming } from './transporte-pixel-streaming';

describe('SimuladorUnrealPage', () => {
  let esquemas: Esquemas;
  const asignacion: SesionVisualUnreal = {
    urlSenalizacion: 'ws://127.0.0.1:8888',
    streamerId: 'instancia-prueba',
    sesion: 'sesion-prueba-0001',
    casoId: 'caso-demo-01',
  };
  beforeAll(async () => {
    esquemas = await cargarEsquemasBrowser();
  });

  function preparar(sesion: SesionVisualUnreal | null = asignacion, retardos?: readonly number[]) {
    let responder!: (texto: string) => void;
    let informar!: Parameters<FabricaReproductorUnreal>[2];
    let numero = 1;
    const canal: jasmine.SpyObj<CanalPixelStreaming> = jasmine.createSpyObj('PixelStreaming', [
      'emitUIInteraction',
      'addResponseEventListener',
      'removeResponseEventListener',
      'disconnect',
    ]);
    canal.addResponseEventListener.and.callFake((_nombre, receptor) => {
      responder = receptor;
    });
    canal.emitUIInteraction.and.callFake((descriptor) => {
      const orden = descriptor as Mensaje;
      queueMicrotask(() =>
        responder(
          JSON.stringify({
            v: 1,
            tipo: 'orden.ack',
            id: `u-${String(++numero).padStart(6, '0')}`,
            correlacion: orden.id,
            sesion: asignacion.sesion,
            ts: 1,
            origen: 'unreal',
            datos: {},
          }),
        ),
      );
      return true;
    });
    const transporte = new TransportePixelStreaming(canal);
    const reproductor: ReproductorUnreal = {
      transporte,
      conectar: jasmine.createSpy('conectar'),
      reproducir: jasmine.createSpy('reproducir'),
      permitirEntrada: jasmine.createSpy('permitirEntrada'),
      cerrar: jasmine.createSpy('cerrar').and.callFake(() => transporte.cerrar()),
    };
    const fabrica = jasmine
      .createSpy('fabrica')
      .and.callFake(async (_contenedor, _asignacion, callback) => {
        informar = callback;
        return reproductor;
      });
    const cargar = jasmine.createSpy('cargar').and.resolveTo(esquemas);
    TestBed.configureTestingModule({
      imports: [SimuladorUnrealPage],
      providers: [
        provideRouter([]),
        { provide: SESION_VISUAL_UNREAL, useValue: sesion },
        { provide: CARGAR_ESQUEMAS_UNREAL, useValue: cargar },
        { provide: FABRICA_REPRODUCTOR_UNREAL, useValue: fabrica },
        ...(retardos ? [{ provide: RETARDOS_RECONEXION_UNREAL, useValue: retardos }] : []),
      ],
    });
    const fixture = TestBed.createComponent(SimuladorUnrealPage);
    fixture.detectChanges();
    const emitir = (tipo: string, datos: object = {}) =>
      responder(
        JSON.stringify({
          v: 1,
          tipo,
          id: `u-${String(++numero).padStart(6, '0')}`,
          correlacion: null,
          sesion: asignacion.sesion,
          ts: 1,
          origen: 'unreal',
          datos,
        }),
      );
    return {
      fixture,
      pagina: fixture.componentInstance,
      fabrica,
      cargar,
      reproductor,
      canal,
      emitir,
      informar: (estado: Parameters<typeof informar>[0]) => informar(estado),
    };
  }

  it('sin servidor muestra disponibilidad pendiente y no solicita conexión ni esquemas', async () => {
    const prueba = preparar(null);
    await prueba.pagina.conectar();
    expect(prueba.fixture.nativeElement.textContent).toContain(
      'Ciudad 3D pendiente de habilitación',
    );
    expect(prueba.fabrica).not.toHaveBeenCalled();
    expect(prueba.cargar).not.toHaveBeenCalled();
    expect(prueba.fixture.nativeElement.querySelector('video')).toBeNull();
  });

  it('un canal abierto y video no habilitan navegación sin mundo.listo y ack de inicio', async () => {
    const prueba = preparar();
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    prueba.informar('canal-abierto');
    prueba.informar('video-listo');
    expect(prueba.pagina.conectado()).toBeFalse();
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    expect(prueba.pagina.conectado()).toBeTrue();
    expect((prueba.canal.emitUIInteraction.calls.first().args[0] as Mensaje).tipo).toBe(
      'sesion.iniciar',
    );
    prueba.pagina.desconectar();
  });

  it('observa conexión, foco y conversación aunque el reproductor no exista en el primer renderizado', async () => {
    const prueba = preparar(); // El primer detectChanges ocurre sin reproductor.
    const entrada = prueba.reproductor.permitirEntrada as jasmine.Spy;
    prueba.pagina.foco.set(true);
    prueba.fixture.detectChanges();
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    prueba.informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    expect(entrada.calls.mostRecent().args[0]).toBeTrue();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-puerta',
      categoria: 'puerta',
    });
    await prueba.fixture.whenStable();
    expect(entrada.calls.mostRecent().args[0]).toBeFalse();
    prueba.emitir('edificio.entro', { zoneId: 'hospital_entrada' });
    await prueba.fixture.whenStable();
    expect(entrada.calls.mostRecent().args[0]).toBeTrue();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-npc-doctor',
      categoria: 'npc',
    });
    await prueba.fixture.whenStable();
    expect(entrada.calls.mostRecent().args[0]).toBeFalse();
    await prueba.pagina.hospital.cerrarConversacion();
    await prueba.fixture.whenStable();
    expect(entrada.calls.mostRecent().args[0]).toBeTrue();
    prueba.pagina.foco.set(false);
    await prueba.fixture.whenStable();
    expect(entrada.calls.mostRecent().args[0]).toBeFalse();
    prueba.pagina.foco.set(true);
    await prueba.fixture.whenStable();
    expect(entrada.calls.mostRecent().args[0]).toBeTrue();
    prueba.pagina.desconectar();
  });

  it('recibe zonas semánticas sin inventar coordenadas ni iniciar un cuestionario', async () => {
    const prueba = preparar();
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    prueba.informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    prueba.emitir('zona.entro', { zoneId: 'hospital_entrada' });
    expect(prueba.pagina.ubicacion()).toBe('Entrada de Hospital');
    prueba.emitir('zona.entro', { zoneId: 'zona_desconocida' });
    expect(prueba.pagina.ubicacion()).toBe('Entrada de Hospital');
    await prueba.pagina.caminarA('zona_desconocida');
    expect(prueba.canal.emitUIInteraction).toHaveBeenCalledTimes(1);
    await prueba.pagina.caminarA('plaza_central');
    expect((prueba.canal.emitUIInteraction.calls.mostRecent().args[0] as Mensaje).tipo).toBe(
      'avatar.irA',
    );
    expect(prueba.pagina.estado()).toContain('Esperando confirmación');
    prueba.emitir('zona.entro', { zoneId: 'plaza_central' });
    expect(prueba.pagina.ubicacion()).toBe('Plaza Central');
    expect(prueba.fixture.nativeElement.textContent).not.toContain(
      'Confirmar e iniciar cuestionario',
    );
    prueba.pagina.desconectar();
  });

  it('al destruir la página desconecta y no procesa eventos tardíos', async () => {
    const prueba = preparar();
    await prueba.pagina.conectar();
    prueba.fixture.destroy();
    expect(prueba.canal.disconnect).toHaveBeenCalledTimes(1);
    prueba.informar('video-listo');
    expect(prueba.pagina.videoReproduciendo()).toBeFalse();
  });

  it('conecta puerta y NPC con el panel Angular y muestra la pista en la libreta (canal simulado)', async () => {
    const prueba = preparar();
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    prueba.informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-puerta',
      categoria: 'puerta',
    });
    await prueba.fixture.whenStable();
    prueba.emitir('edificio.entro', { zoneId: 'hospital_entrada' });
    await prueba.fixture.whenStable();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-npc-doctor',
      categoria: 'npc',
    });
    await prueba.fixture.whenStable();
    prueba.fixture.detectChanges();
    expect(prueba.fixture.nativeElement.textContent).toContain('Bienvenido al Hospital Central');
    const pulsar = async (texto: string) => {
      const botones = Array.from(
        prueba.fixture.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[];
      const boton = botones.find((b) => b.textContent?.trim() === texto)!;
      expect(boton).toBeTruthy();
      boton.click();
      await prueba.fixture.whenStable();
      prueba.fixture.detectChanges();
    };
    await pulsar('Siguiente diálogo');
    await pulsar('Siguiente diálogo');
    await pulsar('Solicitar informe de ingreso del paciente');
    expect(prueba.fixture.nativeElement.textContent).toContain('Historia Clínica de Emergencia');
    expect(prueba.fixture.nativeElement.textContent).toContain('Libreta (1)');
    await pulsar('Continuar conversación');
    await pulsar('Siguiente diálogo');
    await pulsar('Cerrar conversación');
    prueba.emitir('edificio.salio', { zoneId: 'hospital_entrada' });
    await prueba.fixture.whenStable();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-puerta',
      categoria: 'puerta',
    });
    await prueba.fixture.whenStable();
    prueba.emitir('edificio.entro', { zoneId: 'hospital_entrada' });
    await prueba.fixture.whenStable();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-npc-doctor',
      categoria: 'npc',
    });
    await prueba.fixture.whenStable();
    prueba.fixture.detectChanges();
    expect(prueba.fixture.nativeElement.textContent).toContain('Conversación completada');
    expect(prueba.fixture.nativeElement.textContent).toContain('Libreta (1)');
    expect(prueba.pagina.hospital.vista()?.terminado).toBeTrue();
    prueba.pagina.desconectar();
  });

  for (const interior of [
    {
      puerta: 'pol-puerta',
      zona: 'policia_entrada',
      npc: 'pol-npc-oficial',
      titulo: 'Comisaría Sectorial',
      dialogo: 'Comisaría Sectorial.',
      decision: 'Revisar la minuta de intervención policial',
      pista: 'pista-informe-policial',
    },
    {
      puerta: 'fis-puerta',
      zona: 'fiscalia_entrada',
      npc: 'fis-npc-fiscal',
      titulo: 'Fiscalía de Turno',
      dialogo: 'Estamos ordenando los indicios',
      decision: 'Preguntar por la calificación jurídica provisional',
      pista: 'pista-acusacion-fiscal',
    },
  ]) {
    it(`presenta ${interior.titulo}, su decisión y su pista; conserva el bloqueo durante el diálogo (canal simulado)`, async () => {
      const prueba = preparar();
      await prueba.pagina.conectar();
      prueba.reproductor.transporte.abrir();
      prueba.informar('video-listo');
      prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
      await prueba.fixture.whenStable();
      prueba.pagina.foco.set(true);
      prueba.fixture.detectChanges();
      prueba.emitir('interactuable.activado', {
        interactuableId: interior.puerta,
        categoria: 'puerta',
      });
      await prueba.fixture.whenStable();
      prueba.emitir('edificio.entro', { zoneId: interior.zona });
      await prueba.fixture.whenStable();
      expect(prueba.pagina.ubicacion()).toBe(`Interior: ${interior.titulo}`);
      prueba.emitir('edificio.entro', { zoneId: 'hospital_entrada' });
      await prueba.fixture.whenStable();
      prueba.emitir('zona.salio', { zoneId: interior.zona });
      await prueba.fixture.whenStable();
      expect(prueba.pagina.ubicacion()).toBe(`Interior: ${interior.titulo}`);
      prueba.emitir('interactuable.activado', { interactuableId: interior.npc, categoria: 'npc' });
      await prueba.fixture.whenStable();
      prueba.fixture.detectChanges();
      expect(prueba.fixture.nativeElement.querySelector('#hospital-titulo').textContent).toContain(
        interior.titulo,
      );
      expect(prueba.fixture.nativeElement.textContent).toContain(interior.dialogo);
      expect(
        (prueba.reproductor.permitirEntrada as jasmine.Spy).calls.mostRecent().args[0],
      ).toBeFalse();
      const pulsar = async (texto: string) => {
        const botones = Array.from(
          prueba.fixture.nativeElement.querySelectorAll('button'),
        ) as HTMLButtonElement[];
        const boton = botones.find((b) => b.textContent?.trim() === texto)!;
        expect(boton).toBeTruthy();
        boton.click();
        await prueba.fixture.whenStable();
        prueba.fixture.detectChanges();
      };
      await pulsar('Siguiente diálogo');
      await pulsar(interior.decision);
      expect(prueba.pagina.hospital.vista()?.estado.transicion).toBeTruthy();
      expect(prueba.fixture.nativeElement.textContent).toContain('Libreta (1)');
      expect(
        prueba.fixture.debugElement.injector
          .get(LibretaStore)
          .estado()
          .pistas.map((p) => p.id),
      ).toEqual([interior.pista]);
      await pulsar('Cerrar conversación');
      expect(
        (prueba.reproductor.permitirEntrada as jasmine.Spy).calls.mostRecent().args[0],
      ).toBeTrue();
      prueba.emitir('edificio.salio', { zoneId: interior.zona });
      await prueba.fixture.whenStable();
      expect(prueba.pagina.ubicacion()).toBe(`Exterior: ${interior.titulo}`);
      prueba.pagina.desconectar();
    });
  }

  it('abre la libreta desde el exterior y guarda una nota sin iniciar una conversación (canal simulado)', async () => {
    const prueba = preparar();
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    prueba.informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    prueba.fixture.detectChanges();
    const botones = Array.from(
      prueba.fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    botones.find((b) => b.textContent?.trim() === 'Libreta (0)')!.click();
    await prueba.fixture.whenStable();
    prueba.fixture.detectChanges();
    expect(prueba.pagina.hospital.libretaAbierta()).toBeTrue();
    const editor = prueba.fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    editor.value = 'Comparar los tiempos de los tres edificios';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await prueba.fixture.whenStable();
    prueba.fixture.nativeElement
      .querySelector('dialog form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await prueba.fixture.whenStable();
    prueba.fixture.detectChanges();
    expect(prueba.fixture.debugElement.injector.get(LibretaStore).estado().notas[0].texto).toBe(
      'Comparar los tiempos de los tres edificios',
    );
    prueba.fixture.nativeElement.querySelector('button[aria-label="Cerrar libreta"]').click();
    await prueba.fixture.whenStable();
    prueba.fixture.detectChanges();
    expect(prueba.pagina.hospital.libretaAbierta()).toBeFalse();
    expect(prueba.pagina.hospital.conversacion()).toBe('cerrada');
    prueba.pagina.desconectar();
  });

  it('reconecta, restaura el acceso y conserva investigación antes de habilitar el control (canal simulado)', async () => {
    const prueba = preparar();
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    prueba.informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-puerta',
      categoria: 'puerta',
    });
    await prueba.fixture.whenStable();
    prueba.emitir('edificio.entro', { zoneId: 'hospital_entrada' });
    await prueba.fixture.whenStable();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-npc-doctor',
      categoria: 'npc',
    });
    await prueba.fixture.whenStable();
    prueba.pagina.hospital.avanzarDialogo();
    prueba.pagina.hospital.avanzarDialogo();
    prueba.pagina.hospital.elegir('consultar-expediente');
    const libreta = prueba.fixture.debugElement.injector.get(LibretaStore);
    libreta.crearNota('Retomar el recorrido tras reconectar');
    prueba.pagina.desconectar();
    const transporte = new TransportePixelStreaming(prueba.canal);
    const siguiente: ReproductorUnreal = {
      ...prueba.reproductor,
      transporte,
      cerrar: jasmine.createSpy('cerrar-siguiente').and.callFake(() => transporte.cerrar()),
    };
    let informar!: Parameters<FabricaReproductorUnreal>[2];
    prueba.fabrica.and.callFake(async (_contenedor, _sesion, callback) => {
      informar = callback;
      return siguiente;
    });
    await prueba.pagina.conectar();
    transporte.abrir();
    informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    expect(prueba.pagina.conectado()).toBeFalse();
    const ordenes = prueba.canal.emitUIInteraction.calls
      .allArgs()
      .map((args) => args[0] as Mensaje);
    expect(ordenes.find((m) => m.tipo === 'estado.restaurar')?.datos['zonaActual']).toBe(
      'hospital_entrada',
    );
    // Tiempo de quietud del contrato con MUNDO-24: no habilitar controles durante su supresión de hechos.
    await new Promise<void>((resolver) => setTimeout(resolver, 1200));
    await prueba.fixture.whenStable();
    expect(prueba.pagina.conectado()).toBeTrue();
    expect(prueba.pagina.ubicacion()).toBe('Acceso recuperado: Hospital');
    expect(prueba.pagina.hospital.enInterior()).toBeFalse();
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().notas.length).toBe(1);
    expect(prueba.pagina.hospital.recorrido()[0].visitado).toBeTrue();
    prueba.pagina.desconectar();
  });

  /** Caída del canal de datos como la notifica `crearReproductorUnreal` (dataChannelClose / webRtcDisconnected / webRtcFailed). */
  function caerCanal(prueba: ReturnType<typeof preparar>) {
    prueba.reproductor.transporte.notificarDesconexion();
    prueba.informar('desconectado');
  }

  /** Reconexión manual con un transporte nuevo sobre el mismo canal simulado, hasta superar la ventana de quietud. */
  async function reconectar(prueba: ReturnType<typeof preparar>) {
    const transporte = new TransportePixelStreaming(prueba.canal);
    const siguiente: ReproductorUnreal = {
      ...prueba.reproductor,
      transporte,
      cerrar: jasmine.createSpy('cerrar-siguiente').and.callFake(() => transporte.cerrar()),
    };
    let informar!: Parameters<FabricaReproductorUnreal>[2];
    prueba.fabrica.and.callFake(async (_contenedor, _sesion, callback) => {
      informar = callback;
      return siguiente;
    });
    await prueba.pagina.conectar();
    transporte.abrir();
    informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    await new Promise<void>((resolver) => setTimeout(resolver, 1200));
    await prueba.fixture.whenStable();
  }

  async function entrarAlDoctor(prueba: ReturnType<typeof preparar>) {
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    prueba.informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    prueba.emitir('zona.entro', { zoneId: 'plaza_central' });
    await prueba.fixture.whenStable();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-puerta',
      categoria: 'puerta',
    });
    await prueba.fixture.whenStable();
    prueba.emitir('edificio.entro', { zoneId: 'hospital_entrada' });
    await prueba.fixture.whenStable();
    prueba.emitir('interactuable.activado', {
      interactuableId: 'hosp-npc-doctor',
      categoria: 'npc',
    });
    await prueba.fixture.whenStable();
    expect(prueba.pagina.hospital.conversacion()).toBe('abierta');
  }

  /** Prepara el reproductor que entregará la fábrica en la próxima conexión (manual o automática). */
  function siguienteReproductor(prueba: ReturnType<typeof preparar>) {
    const transporte = new TransportePixelStreaming(prueba.canal);
    const control: { informar: Parameters<FabricaReproductorUnreal>[2] | null } = { informar: null };
    prueba.fabrica.and.callFake(async (_contenedor, _sesion, callback) => {
      control.informar = callback;
      return {
        ...prueba.reproductor,
        transporte,
        cerrar: jasmine.createSpy('cerrar-siguiente').and.callFake(() => transporte.cerrar()),
      };
    });
    return { transporte, control };
  }

  async function esperarHasta(condicion: () => boolean, limiteMs = 3000) {
    const inicio = Date.now();
    while (!condicion()) {
      if (Date.now() - inicio > limiteMs) throw new Error('Condición no alcanzada');
      await new Promise<void>((resolver) => setTimeout(resolver, 5));
    }
  }

  async function conectarConfirmado(prueba: ReturnType<typeof preparar>) {
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    prueba.informar('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    await esperarHasta(() => prueba.pagina.conectado());
  }

  it('tras una caída real del canal de datos reconecta sola y envía estado.restaurar con el progreso (canal simulado)', async () => {
    const prueba = preparar(asignacion, [10, 10, 10]);
    const hospital = prueba.pagina.hospital;
    const libreta = prueba.fixture.debugElement.injector.get(LibretaStore);
    await entrarAlDoctor(prueba);
    hospital.avanzarDialogo();
    hospital.avanzarDialogo();
    hospital.elegir('consultar-expediente');
    hospital.completarTransicion();
    hospital.avanzarDialogo();
    expect(hospital.vista()?.terminado).toBeTrue();
    await hospital.cerrarConversacion();
    await prueba.fixture.whenStable();
    expect(hospital.conversacion()).toBe('cerrada');
    libreta.crearNota('Retomar tras la caída del canal');
    const n0 = prueba.canal.emitUIInteraction.calls.count();
    const { transporte, control } = siguienteReproductor(prueba);

    caerCanal(prueba);
    expect(prueba.pagina.conectado()).toBeFalse();
    expect(prueba.pagina.reintento()).toEqual({ intento: 1, total: 3 });
    expect(prueba.pagina.estado()).toContain('Reintento automático 1 de 3');
    expect(prueba.pagina.avisoConexion()?.texto).toContain('Reintentando (1 de 3)');
    expect(prueba.pagina.error()).toBeNull();
    expect(prueba.canal.emitUIInteraction.calls.count()).toBe(n0);
    expect(hospital.ultimaZona()).toBe('hospital_entrada');
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().notas.length).toBe(1);

    await esperarHasta(() => (prueba.reproductor.conectar as jasmine.Spy).calls.count() === 2);
    expect(prueba.fabrica).toHaveBeenCalledTimes(2);
    transporte.abrir();
    control.informar!('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await prueba.fixture.whenStable();
    // Tiempo de quietud del contrato con MUNDO-24 antes de habilitar controles.
    await esperarHasta(() => prueba.pagina.conectado());
    const nuevas = prueba.canal.emitUIInteraction.calls
      .allArgs()
      .slice(n0)
      .map((args) => args[0] as Mensaje);
    expect(nuevas.map((m) => m.tipo)).toEqual([
      'sesion.iniciar',
      'estado.restaurar',
      'camara.liberar',
    ]);
    for (const mensaje of nuevas)
      expect(validarObjeto(esquemas, mensaje).ok).withContext(mensaje.tipo).toBeTrue();
    expect(nuevas[1].datos).toEqual({
      zonaActual: 'hospital_entrada',
      exploracionBloqueada: false,
      edificiosVisitados: ['hospital_entrada'],
      interactuables: [
        { interactuableId: 'hosp-npc-doctor', estado: 'completado' },
        { interactuableId: 'hosp-npc-paciente-01', estado: 'disponible' },
        { interactuableId: 'pol-npc-oficial', estado: 'disponible' },
        { interactuableId: 'fis-npc-fiscal', estado: 'disponible' },
      ],
    });
    expect(prueba.pagina.reintento()).toBeNull();
    expect(prueba.pagina.estado()).toBe('Conexión recuperada. Sesión visual confirmada.');
    expect(prueba.pagina.avisoConexion()).toBeNull();
    expect(prueba.pagina.ubicacion()).toBe('Acceso recuperado: Hospital');
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().notas.length).toBe(1);
    prueba.pagina.desconectar();
  });

  it('agota los reintentos automáticos acotados y vuelve al botón manual sin perder el progreso', async () => {
    const prueba = preparar(asignacion, [5, 5, 5]);
    await conectarConfirmado(prueba);
    prueba.fabrica.and.rejectWith(new Error('Servidor de señalización caído'));

    caerCanal(prueba);
    await esperarHasta(() => prueba.pagina.error() !== null);
    expect(prueba.fabrica).toHaveBeenCalledTimes(4);
    expect(prueba.pagina.reintento()).toBeNull();
    expect(prueba.pagina.error()).toContain('3 intentos automáticos');
    expect(prueba.pagina.estado()).toBe('Conexión no recuperada.');
    expect(prueba.pagina.avisoConexion()?.tipo).toBe('problema');
    await new Promise<void>((resolver) => setTimeout(resolver, 40));
    expect(prueba.fabrica).toHaveBeenCalledTimes(4);

    // El botón manual vuelve a empezar la cuenta.
    const { transporte, control } = siguienteReproductor(prueba);
    const conexion = prueba.pagina.conectar();
    expect(prueba.pagina.error()).toBeNull();
    await conexion;
    transporte.abrir();
    control.informar!('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await esperarHasta(() => prueba.pagina.conectado());
    expect(prueba.pagina.estado()).toBe('Ciudad 3D conectada. Sesión visual confirmada.');
    prueba.pagina.desconectar();
  });

  it('desconectar durante la espera de un reintento lo anula', async () => {
    const prueba = preparar(asignacion, [30, 30, 30]);
    await conectarConfirmado(prueba);
    caerCanal(prueba);
    expect(prueba.pagina.reintento()).not.toBeNull();
    prueba.pagina.desconectar();
    expect(prueba.pagina.reintento()).toBeNull();
    await new Promise<void>((resolver) => setTimeout(resolver, 80));
    expect(prueba.fabrica).toHaveBeenCalledTimes(1);
    expect(prueba.pagina.estado()).toBe('Desconectado del simulador 3D.');
  });

  it('una caída antes de confirmar la sesión no reintenta sola', async () => {
    const prueba = preparar(asignacion, [5, 5, 5]);
    await prueba.pagina.conectar();
    prueba.reproductor.transporte.abrir();
    caerCanal(prueba);
    expect(prueba.pagina.reintento()).toBeNull();
    await new Promise<void>((resolver) => setTimeout(resolver, 40));
    expect(prueba.fabrica).toHaveBeenCalledTimes(1);
    expect(prueba.pagina.estado()).toContain('Se perdió la conexión');
  });

  it('una caída real con la conversación abierta restaura al doctor como disponible (canal simulado)', async () => {
    const prueba = preparar();
    const hospital = prueba.pagina.hospital;
    await entrarAlDoctor(prueba);
    hospital.avanzarDialogo();
    expect(
      hospital.recorrido()[0].npcs.find((n) => n.espacialId === 'hosp-npc-doctor')?.estado,
    ).toBe('en_curso');
    const n0 = prueba.canal.emitUIInteraction.calls.count();

    caerCanal(prueba);
    await prueba.fixture.whenStable();
    expect(prueba.pagina.conectado()).toBeFalse();
    expect(hospital.conversacion()).toBe('cerrada');
    expect(prueba.canal.emitUIInteraction.calls.count()).toBe(n0);

    await reconectar(prueba);
    const nuevas = prueba.canal.emitUIInteraction.calls
      .allArgs()
      .slice(n0)
      .map((args) => args[0] as Mensaje);
    expect(nuevas.map((m) => m.tipo)).toEqual([
      'sesion.iniciar',
      'estado.restaurar',
      'camara.liberar',
    ]);
    const interactuables = nuevas[1].datos['interactuables'] as {
      interactuableId: string;
      estado: string;
    }[];
    expect(interactuables.find((i) => i.interactuableId === 'hosp-npc-doctor')?.estado).toBe(
      'disponible',
    );
    expect(nuevas[1].datos['zonaActual']).toBe('hospital_entrada');
    prueba.pagina.desconectar();
  });

  it('cerrar durante la carga impide crear una conexión después de abandonar la página', async () => {
    const prueba = preparar();
    let resolver!: (esquemas: Esquemas) => void;
    prueba.cargar.and.returnValue(
      new Promise<Esquemas>((resolve) => {
        resolver = resolve;
      }),
    );
    const conexion = prueba.pagina.conectar();
    prueba.fixture.destroy();
    resolver(esquemas);
    await conexion;
    expect(prueba.fabrica).not.toHaveBeenCalled();
  });

  describe('FE-UX-09 · panel de conversación (R07-IMP)', () => {
    const raiz = (prueba: ReturnType<typeof preparar>) => prueba.fixture.nativeElement as HTMLElement;
    const refrescar = async (prueba: ReturnType<typeof preparar>) => {
      await prueba.fixture.whenStable();
      prueba.fixture.detectChanges();
      await new Promise<void>((r) => setTimeout(r, 0));
      prueba.fixture.detectChanges();
    };

    it('identifica al personaje y el edificio, muestra el estado en texto y lleva el foco al personaje', async () => {
      const prueba = preparar();
      await entrarAlDoctor(prueba);
      await refrescar(prueba);
      const panel = raiz(prueba).querySelector('[data-prueba="panel-conversacion"]') as HTMLElement;
      expect(panel).toBeTruthy();
      expect(panel.getAttribute('aria-labelledby')).toBe('conversacion-titulo');
      expect(panel.querySelector('#conversacion-titulo')!.textContent).toContain('Dr. Mendoza');
      expect(panel.querySelector('.lugar')!.textContent).toContain('Hospital Central');
      expect(panel.querySelector('[data-prueba="estado-conversacion"]')!.textContent!.trim()).toBe('En curso');
      expect(document.activeElement).toBe(panel.querySelector('#conversacion-titulo'));
      const dialogo = panel.querySelector('[data-prueba="dialogo"]')!;
      expect(dialogo.getAttribute('aria-live')).toBe('polite');
      expect(dialogo.querySelector('.hablante')!.textContent!.trim()).toBeTruthy();
      // Mientras conversa, las indicaciones de cómo moverse no compiten con el diálogo.
      expect(raiz(prueba).querySelector('.indicacion')).toBeNull();
      prueba.pagina.desconectar();
    });

    it('anuncia la pista obtenida en esta conversación y marca la conversación como completada', async () => {
      const prueba = preparar();
      const hospital = prueba.pagina.hospital;
      await entrarAlDoctor(prueba);
      await refrescar(prueba);
      expect(raiz(prueba).querySelector('[data-prueba="pista-nueva"]')).toBeNull();
      hospital.avanzarDialogo();
      hospital.avanzarDialogo();
      hospital.elegir('consultar-expediente');
      await refrescar(prueba);
      const aviso = raiz(prueba).querySelector('[data-prueba="pista-nueva"]') as HTMLElement;
      expect(aviso.getAttribute('role')).toBe('status');
      expect(aviso.textContent).toContain('Guardado en tu libreta');
      expect(aviso.textContent).toContain('Historia Clínica de Emergencia');
      hospital.completarTransicion();
      hospital.avanzarDialogo();
      await refrescar(prueba);
      const panel = raiz(prueba).querySelector('[data-prueba="panel-conversacion"]') as HTMLElement;
      expect(panel.classList).toContain('completada');
      expect(panel.querySelector('[data-prueba="estado-conversacion"]')!.textContent!.trim()).toBe('Completada');
      expect(panel.textContent).toContain('Conversación completada');
      prueba.pagina.desconectar();
    });

    it('Esc cierra la conversación y el foco vuelve al visor para seguir caminando', async () => {
      const prueba = preparar();
      await entrarAlDoctor(prueba);
      await refrescar(prueba);
      const panel = raiz(prueba).querySelector('[data-prueba="panel-conversacion"]') as HTMLElement;
      panel.querySelector('#conversacion-titulo')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await refrescar(prueba);
      await new Promise<void>((r) => setTimeout(r, 20));
      await refrescar(prueba);
      expect(prueba.pagina.hospital.conversacion()).toBe('cerrada');
      expect(raiz(prueba).querySelector('[data-prueba="panel-conversacion"]')).toBeNull();
      expect(document.activeElement).toBe(raiz(prueba).querySelector('.visor'));
      expect(prueba.pagina.foco()).toBeTrue();
      prueba.pagina.desconectar();
    });

    it('estados críticos: preparando, sin confirmar con su recuperación, y cierre en curso sin repetir el cierre', async () => {
      const prueba = preparar();
      const hospital = prueba.pagina.hospital;
      await entrarAlDoctor(prueba);
      await refrescar(prueba);
      const estado = () => raiz(prueba).querySelector('[data-prueba="estado-conversacion"]')!.textContent!.trim();
      const cerrar = () =>
        Array.from(raiz(prueba).querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cerrar conversación')!;
      hospital.conversacion.set('abriendo');
      prueba.fixture.detectChanges();
      expect(estado()).toBe('Preparando…');
      expect(raiz(prueba).querySelector('.espera')!.textContent).toContain('Preparando la conversación con Dr. Mendoza');
      expect(cerrar().disabled).toBeTrue();
      hospital.conversacion.set('error');
      prueba.fixture.detectChanges();
      expect(estado()).toBe('Sin confirmar');
      expect(raiz(prueba).querySelector('.recuperacion')!.textContent).toContain('vuelve a pulsar');
      expect(cerrar().disabled).toBeFalse();
      hospital.conversacion.set('cerrando');
      prueba.fixture.detectChanges();
      expect(estado()).toBe('Cerrando…');
      expect(cerrar().disabled).toBeTrue();
      prueba.pagina.desconectar();
    });
  });

  it('sin conexiones simultáneas: el botón durante la espera sustituye al reintento y durante un intento no abre otro', async () => {
    const prueba = preparar(asignacion, [40, 40, 40]);
    await conectarConfirmado(prueba);
    caerCanal(prueba);
    const { transporte, control } = siguienteReproductor(prueba);
    const manual = prueba.pagina.conectar(); // anula el temporizador pendiente
    expect(prueba.pagina.reintento()).toBeNull();
    void prueba.pagina.conectar(); // ocupado: no abre una segunda conexión
    await manual;
    await new Promise<void>((resolver) => setTimeout(resolver, 90)); // más que el retardo anulado
    expect(prueba.fabrica).toHaveBeenCalledTimes(2);
    transporte.abrir();
    control.informar!('video-listo');
    prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
    await esperarHasta(() => prueba.pagina.conectado());
    expect(prueba.fabrica).toHaveBeenCalledTimes(2);
    prueba.pagina.desconectar();
  });

  it('restauración idempotente: dos caídas seguidas envían el mismo estado.restaurar y no pierden lo confirmado', async () => {
    const prueba = preparar(asignacion, [5, 5, 5]);
    const libreta = prueba.fixture.debugElement.injector.get(LibretaStore);
    await entrarAlDoctor(prueba);
    prueba.pagina.hospital.avanzarDialogo();
    prueba.pagina.hospital.avanzarDialogo();
    prueba.pagina.hospital.elegir('consultar-expediente');
    libreta.crearNota('Nota confirmada antes de las caídas');
    const restauraciones: Mensaje[] = [];
    let caer = () => caerCanal(prueba);
    for (let ciclo = 0; ciclo < 2; ciclo++) {
      const n0 = prueba.canal.emitUIInteraction.calls.count();
      const { transporte, control } = siguienteReproductor(prueba);
      caer();
      await esperarHasta(() => control.informar !== null);
      await esperarHasta(() => (prueba.reproductor.conectar as jasmine.Spy).calls.count() === ciclo + 2);
      transporte.abrir();
      control.informar!('video-listo');
      prueba.emitir('mundo.listo', { versionContenido: 'prototipo-0.1.2' });
      await esperarHasta(() => prueba.pagina.conectado());
      const nuevas = prueba.canal.emitUIInteraction.calls.allArgs().slice(n0).map((a) => a[0] as Mensaje);
      expect(nuevas.filter((m) => m.tipo === 'estado.restaurar').length).withContext(`ciclo ${ciclo}`).toBe(1);
      restauraciones.push(nuevas.find((m) => m.tipo === 'estado.restaurar')!);
      caer = () => {
        transporte.notificarDesconexion();
        control.informar!('desconectado');
      };
    }
    expect(restauraciones[1].datos).toEqual(restauraciones[0].datos);
    expect(restauraciones[0].datos['zonaActual']).toBe('hospital_entrada');
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().notas.length).toBe(1);
    expect(prueba.fabrica).toHaveBeenCalledTimes(3);
    prueba.pagina.desconectar();
  });
});
