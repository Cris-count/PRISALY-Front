import { TestBed } from '@angular/core/testing';
import { LibretaStore } from '../investigacion/libreta.store';
import { AdaptadorPistasNarrativas } from '../services/adaptador-pistas-narrativas';
import { CoordinadorNarrativoInteriores } from '../services/coordinador-narrativo-interiores';
import { HospitalUnreal } from './hospital-unreal';
import { cargarEsquemasBrowser } from './protocolo/cargar-esquemas-browser';
import { Esquemas, Mensaje } from './protocolo/validador-mensaje';
import { PuenteUnreal } from './puente/puente-unreal';
import { CanalMemoria, vaciarCola } from './puente/transporte';

describe('HospitalUnreal con narrativa y libreta reales, transporte simulado', () => {
  let esquemas: Esquemas;
  let hospital: HospitalUnreal, libreta: LibretaStore, narrativa: CoordinadorNarrativoInteriores;
  let puente: PuenteUnreal, canal: CanalMemoria, ordenes: Mensaje[], numero: number;
  let rechazar: string | null, retener: string | null;
  const sesion = { sesion: 'ses-hospital-0001', casoId: 'caso-demo-01', streamerId: 'prueba', urlSenalizacion: 'ws://127.0.0.1:8888' };
  const emitir = (tipo: string, datos: Record<string, unknown>, extras: Partial<Mensaje> = {}) => {
    canal.unreal.enviar(JSON.stringify({ v: 1, tipo, datos, id: `u-${String(++numero).padStart(6, '0')}`, correlacion: null, sesion: sesion.sesion, ts: 1, origen: 'unreal', ...extras }));
  };
  const activarPuerta = () => emitir('interactuable.activado', { interactuableId: 'hosp-puerta', categoria: 'puerta' });
  const activarDoctor = () => emitir('interactuable.activado', { interactuableId: 'hosp-npc-doctor', categoria: 'npc' });
  const contar = (tipo: string) => ordenes.filter(m => m.tipo === tipo).length;
  async function entrar(): Promise<void> {
    activarPuerta(); await vaciarCola();
    emitir('edificio.entro', { zoneId: 'hospital_entrada' }); await vaciarCola();
  }
  async function conversar(): Promise<void> { await entrar(); activarDoctor(); await vaciarCola(); }
  async function entrarA(puertaId: string, zoneId: string): Promise<void> {
    emitir('interactuable.activado', { interactuableId: puertaId, categoria: 'puerta' }); await vaciarCola();
    emitir('edificio.entro', { zoneId }); await vaciarCola();
  }
  async function activarNpc(interactuableId: string): Promise<void> {
    emitir('interactuable.activado', { interactuableId, categoria: 'npc' }); await vaciarCola();
  }
  async function salirDe(zoneId: string): Promise<void> {
    await hospital.cerrarConversacion();
    emitir('edificio.salio', { zoneId }); await vaciarCola();
  }
  function obtenerPista(): void {
    hospital.avanzarDialogo(); hospital.avanzarDialogo(); hospital.elegir('consultar-expediente');
  }

  beforeAll(async () => { esquemas = await cargarEsquemasBrowser(); });
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [HospitalUnreal, LibretaStore, AdaptadorPistasNarrativas, CoordinadorNarrativoInteriores] });
    hospital = TestBed.inject(HospitalUnreal); libreta = TestBed.inject(LibretaStore); narrativa = TestBed.inject(CoordinadorNarrativoInteriores);
    numero = 0; ordenes = []; rechazar = retener = null;
    canal = new CanalMemoria();
    puente = new PuenteUnreal(canal.angular, esquemas, { sesion: sesion.sesion });
    hospital.vincular(puente, sesion);
    puente.suscribir(m => { void hospital.procesar(m); });
    canal.unreal.alRecibir(texto => {
      const orden = JSON.parse(texto) as Mensaje; ordenes.push(orden);
      if (retener === orden.tipo) return;
      emitir(rechazar === orden.tipo ? 'orden.error' : 'orden.ack', rechazar === orden.tipo ? { codigo: 'ORDEN_NO_SOPORTADA' } : {}, { correlacion: orden.id });
    });
  });
  afterEach(() => { hospital.desvincular(); puente.destruir(); });

  it('una zona o un objeto desconocido no abren puertas ni entregan pistas', async () => {
    emitir('zona.entro', { zoneId: 'hospital_entrada' });
    emitir('interactuable.activado', { interactuableId: 'desconocido', categoria: 'npc' });
    await vaciarCola();
    expect(ordenes.length).toBe(0); expect(libreta.estado().pistas.length).toBe(0);
  });

  it('envía puerta.abrir una vez y espera edificio.entro, no solo el ack', async () => {
    activarPuerta(); activarPuerta(); await vaciarCola();
    expect(contar('puerta.abrir')).toBe(1);
    expect(ordenes[0].datos).toEqual({ zoneId: 'hospital_entrada' });
    expect(hospital.enInterior()).toBeFalse();
    emitir('edificio.entro', { zoneId: 'policia_entrada' }); await vaciarCola();
    expect(hospital.enInterior()).toBeFalse();
    emitir('edificio.entro', { zoneId: 'hospital_entrada' }); await vaciarCola();
    expect(hospital.enInterior()).toBeTrue();
  });

  it('ignora el doctor fuera del interior y los eventos de otra sesión', async () => {
    activarDoctor();
    emitir('interactuable.activado', { interactuableId: 'hosp-puerta', categoria: 'puerta' }, { sesion: 'ses-ajena-0001' });
    await vaciarCola(); expect(ordenes.length).toBe(0); expect(hospital.vista()).toBeNull();
  });

  it('abre el guion real después de confirmar enfoque y animación, sin pistas anticipadas', async () => {
    await conversar();
    expect(hospital.vista()?.dialogo?.texto).toContain('Bienvenido al Hospital Central');
    expect(hospital.puedeDialogar()).toBeTrue();
    expect(libreta.estado().pistas.length).toBe(0);
    expect(ordenes.find(m => m.tipo === 'camara.enfocar')?.datos).toEqual({ objetivoId: 'hosp-npc-doctor', modo: 'conversacion' });
    activarDoctor(); await vaciarCola(); expect(contar('camara.enfocar')).toBe(1);
  });

  it('la decisión autorizada entrega la pista real y rechaza opciones inválidas', async () => {
    await conversar(); hospital.elegir('consultar-expediente');
    expect(libreta.estado().pistas.length).toBe(0);
    hospital.avanzarDialogo(); hospital.avanzarDialogo(); hospital.elegir('inventada'); hospital.elegir('consultar-expediente');
    expect(libreta.estado().pistas.map(p => p.id)).toEqual(['pista-historial-clinico']);
    expect(narrativa.pausarYGuardar('hospital-prueba')?.opcionesElegidas).toEqual(['consultar-expediente']);
  });

  it('salir y reingresar conserva una transición pendiente, la nota y una sola pista', async () => {
    await conversar(); obtenerPista();
    const transicion = hospital.vista()!.estado.transicion;
    libreta.crearNota('Contrastar el horario');
    await hospital.cerrarConversacion();
    expect(contar('interactuable.estado')).toBe(0); // La historia aún no terminó.
    emitir('edificio.salio', { zoneId: 'hospital_entrada' }); await vaciarCola();
    await conversar();
    expect(hospital.vista()?.estado.transicion).toEqual(transicion);
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().notas[0].texto).toBe('Contrastar el horario');
    expect(contar('puerta.abrir')).toBe(2);
  });

  it('marca completado solo al terminar el guion y libera la cámara tras guardar', async () => {
    await conversar(); obtenerPista(); hospital.completarTransicion(); hospital.avanzarDialogo();
    expect(hospital.vista()?.terminado).toBeTrue();
    await hospital.cerrarConversacion();
    expect(ordenes.find(m => m.tipo === 'interactuable.estado')?.datos).toEqual({ interactuableId: 'hosp-npc-doctor', estado: 'completado' });
    expect(ordenes.at(-1)?.tipo).toBe('camara.liberar'); expect(hospital.modal()).toBeFalse();
    expect(narrativa.pausarYGuardar('hospital-prueba')?.terminado).toBeTrue();
  });

  it('un rechazo de puerta no anuncia entrada y permite volver a solicitarla', async () => {
    rechazar = 'puerta.abrir'; activarPuerta(); await vaciarCola();
    expect(hospital.enInterior()).toBeFalse(); expect(hospital.error()).toContain('No se confirmó');
    rechazar = null; await entrar(); expect(hospital.enInterior()).toBeTrue(); expect(contar('puerta.abrir')).toBe(2);
  });

  it('un rechazo de enfoque no inicia narrativa ni concede pistas', async () => {
    rechazar = 'camara.enfocar'; await conversar();
    expect(hospital.vista()).toBeNull(); expect(libreta.estado().pistas.length).toBe(0);
    expect(hospital.conversacion()).toBe('error');
    rechazar = null; await hospital.cerrarConversacion(); expect(hospital.modal()).toBeFalse();
  });

  it('una salida durante un enfoque pendiente invalida su ack tardío', async () => {
    await entrar(); retener = 'camara.enfocar'; activarDoctor(); await vaciarCola();
    const orden = ordenes.at(-1)!;
    emitir('edificio.salio', { zoneId: 'hospital_entrada' }); await vaciarCola();
    emitir('orden.ack', {}, { correlacion: orden.id }); await vaciarCola();
    expect(hospital.modal()).toBeFalse(); expect(hospital.vista()).toBeNull();
    expect(contar('npc.reproducirAnimacion')).toBe(0);
  });

  it('un fallo de animación no impide liberar la cámara al cerrar', async () => {
    rechazar = 'npc.reproducirAnimacion'; await conversar();
    expect(hospital.conversacion()).toBe('error');
    await hospital.cerrarConversacion();
    expect(contar('camara.liberar')).toBe(1); expect(hospital.modal()).toBeFalse();
    expect(hospital.error()).toContain('estado visual');
  });

  it('un fallo al liberar cámara conserva progreso y admite reintentar el cierre', async () => {
    await conversar(); obtenerPista(); rechazar = 'camara.liberar';
    await hospital.cerrarConversacion(); expect(hospital.conversacion()).toBe('error');
    expect(libreta.estado().pistas.length).toBe(1);
    rechazar = null; await hospital.cerrarConversacion();
    expect(hospital.modal()).toBeFalse(); expect(libreta.estado().pistas.length).toBe(1);
  });

  it('reconectar la misma sesión conserva progreso y una sesión distinta lo aísla', async () => {
    await conversar(); obtenerPista();
    const estado = hospital.vista()!.estado;
    hospital.vincular(puente, sesion); await conversar();
    expect(hospital.vista()?.estado).toBe(estado); expect(libreta.estado().pistas.length).toBe(1);
    hospital.vincular(puente, { ...sesion, sesion: 'ses-hospital-0002' });
    expect(hospital.vista()).toBeNull(); expect(libreta.estado().pistas.length).toBe(0);
  });

  it('mantiene independiente el seguimiento de visita y de cada conversación', async () => {
    expect(hospital.totalConversaciones()).toBe(4);
    activarPuerta(); await vaciarCola();
    expect(hospital.recorrido().find(e => e.edificioId === 'hospital-prueba')?.visitado).toBeFalse();
    emitir('edificio.entro', { zoneId: 'hospital_entrada' }); await vaciarCola();
    expect(hospital.recorrido().find(e => e.edificioId === 'hospital-prueba')?.visitado).toBeTrue();
    await activarNpc('hosp-npc-doctor'); obtenerPista(); hospital.completarTransicion(); hospital.avanzarDialogo();
    expect(hospital.conversacionesTerminadas()).toBe(1);
    expect(hospital.recorrido()[0].npcs.map(n => n.estado)).toEqual(['completado', 'pendiente']);
    await salirDe('hospital_entrada');
    hospital.vincular(puente, { ...sesion, casoId: 'otro-caso-demo' });
    expect(hospital.conversacionesTerminadas()).toBe(0);
    expect(hospital.recorrido().some(e => e.visitado)).toBeFalse();
    expect(hospital.ultimaZona()).toBeNull();
  });

  it('permite tomar notas en el exterior sin enviar interacción del mundo mientras la libreta está abierta', async () => {
    hospital.abrirLibreta();
    expect(hospital.libretaAbierta()).toBeTrue(); expect(hospital.ocupado()).toBeTrue();
    libreta.crearNota('Revisar los horarios en Fiscalía');
    activarPuerta(); await vaciarCola();
    expect(contar('puerta.abrir')).toBe(0);
    hospital.cerrarLibreta(); await conversar();
    expect(libreta.estado().notas[0].texto).toBe('Revisar los horarios en Fiscalía');
  });

  it('restaura el último acceso y los estados visuales tras reconectar sin borrar pistas ni notas', async () => {
    await conversar(); obtenerPista();
    libreta.crearNota('Continuar la entrevista');
    hospital.vincular(puente, sesion);
    expect(hospital.ultimaZona()).toBe('hospital_entrada');
    expect(await hospital.restaurarEstadoVisual()).toBe('hospital_entrada');
    expect(ordenes.find(m => m.tipo === 'estado.restaurar')?.datos).toEqual({
      zonaActual: 'hospital_entrada', exploracionBloqueada: false, edificiosVisitados: ['hospital_entrada'],
      interactuables: [
        { interactuableId: 'hosp-npc-doctor', estado: 'disponible' },
        { interactuableId: 'hosp-npc-paciente-01', estado: 'disponible' },
        { interactuableId: 'pol-npc-oficial', estado: 'disponible' },
        { interactuableId: 'fis-npc-fiscal', estado: 'disponible' },
      ],
    });
    expect(ordenes.at(-1)?.tipo).toBe('camara.liberar');
    expect(hospital.enInterior()).toBeFalse(); expect(hospital.recuperando()).toBeFalse();
    expect(libreta.estado().pistas.length).toBe(1); expect(libreta.estado().notas.length).toBe(1);
    await conversar();
    expect(hospital.vista()?.estado.transicion).toBeTruthy();
  });

  it('un rechazo de recuperación no borra la investigación ni anuncia una entrada', async () => {
    await conversar(); obtenerPista(); hospital.vincular(puente, sesion);
    rechazar = 'estado.restaurar';
    await expectAsync(hospital.restaurarEstadoVisual()).toBeRejected();
    expect(hospital.recuperando()).toBeFalse(); expect(hospital.enInterior()).toBeFalse();
    expect(libreta.estado().pistas.length).toBe(1);
  });

  const otrosInteriores = [
    { puerta: 'pol-puerta', zona: 'policia_entrada', edificio: 'policia-prueba', npc: 'pol-npc-oficial', personaje: 'oficial', dialogo: 'Comisaría Sectorial.', decision: 'solicitar-atestado', pista: 'pista-informe-policial' },
    { puerta: 'fis-puerta', zona: 'fiscalia_entrada', edificio: 'fiscalia-prueba', npc: 'fis-npc-fiscal', personaje: 'fiscal', dialogo: 'Estamos ordenando los indicios', decision: 'consultar-calificacion', pista: 'pista-acusacion-fiscal' },
  ];
  for (const interior of otrosInteriores) {
    it(`${interior.edificio}: confirma su puerta y NPC, y entrega la pista solo por decisión (canal simulado)`, async () => {
      emitir('interactuable.activado', { interactuableId: interior.puerta, categoria: 'puerta' }); await vaciarCola();
      expect(ordenes[0].datos).toEqual({ zoneId: interior.zona });
      expect(hospital.enInterior()).toBeFalse();
      await activarNpc(interior.npc);
      expect(contar('camara.enfocar')).toBe(0);
      expect(hospital.vista()).toBeNull();
      emitir('edificio.entro', { zoneId: 'hospital_entrada' }); await vaciarCola();
      expect(hospital.enInterior()).toBeFalse();
      await activarNpc(interior.npc);
      expect(contar('camara.enfocar')).toBe(0);
      emitir('edificio.entro', { zoneId: interior.zona }); await vaciarCola();
      activarDoctor(); await vaciarCola();
      expect(contar('camara.enfocar')).toBe(0);
      await activarNpc(interior.npc);
      expect(ordenes.find(m => m.tipo === 'camara.enfocar')?.datos).toEqual({ objetivoId: interior.npc, modo: 'conversacion' });
      expect(ordenes.find(m => m.tipo === 'npc.reproducirAnimacion')?.datos).toEqual({ npcId: interior.npc, animacion: 'hablar' });
      expect(hospital.vista()?.dialogo?.personajeId).toBe(interior.personaje);
      expect(hospital.vista()?.dialogo?.texto).toContain(interior.dialogo);
      expect(libreta.estado().pistas.length).toBe(0);
      hospital.elegir(interior.decision); // Aún falta leer el diálogo.
      expect(libreta.estado().pistas.length).toBe(0);
      hospital.avanzarDialogo(); hospital.elegir(interior.decision);
      expect(libreta.estado().pistas.map(p => p.id)).toEqual([interior.pista]);
      expect(libreta.estado().pistas[0].origen.espacioId).toBe(interior.edificio);
      hospital.completarTransicion(); hospital.avanzarDialogo();
      expect(hospital.vista()?.terminado).toBeTrue();
      await hospital.cerrarConversacion();
      expect(ordenes.find(m => m.tipo === 'interactuable.estado')?.datos).toEqual({ interactuableId: interior.npc, estado: 'completado' });
      expect(ordenes.at(-1)?.tipo).toBe('camara.liberar');
    });
  }

  it('visitar los tres edificios conserva cada transición y reúne pistas sin duplicarlas', async () => {
    await conversar(); obtenerPista();
    const hospitalGuardado = hospital.vista()!.estado;
    libreta.crearNota('Comparar las tres fuentes');
    await salirDe('hospital_entrada');
    const estados = new Map<string, typeof hospitalGuardado>();
    for (const interior of otrosInteriores) {
      await entrarA(interior.puerta, interior.zona); await activarNpc(interior.npc);
      hospital.avanzarDialogo(); hospital.elegir(interior.decision);
      estados.set(interior.edificio, hospital.vista()!.estado);
      emitir('edificio.salio', { zoneId: 'hospital_entrada' }); await vaciarCola();
      expect(hospital.enInterior()).toBeTrue(); // La salida ajena no cierra esta sala.
      await salirDe(interior.zona);
    }
    await conversar();
    expect(hospital.vista()?.estado).toEqual(hospitalGuardado);
    await salirDe('hospital_entrada');
    for (const interior of otrosInteriores) {
      await entrarA(interior.puerta, interior.zona); await activarNpc(interior.npc);
      expect(hospital.vista()?.estado).toEqual(estados.get(interior.edificio));
      hospital.elegir(interior.decision); // No se repite una decisión durante la transición.
      await salirDe(interior.zona);
    }
    expect(libreta.estado().pistas.map(p => p.id)).toEqual(['pista-historial-clinico', 'pista-informe-policial', 'pista-acusacion-fiscal']);
    expect(libreta.estado().notas[0].texto).toBe('Comparar las tres fuentes');
  });

  it('el paciente conserva su guion separado del doctor al visitar otro edificio', async () => {
    await conversar(); hospital.avanzarDialogo();
    const estadoDoctor = hospital.vista()!.estado;
    await hospital.cerrarConversacion();
    await activarNpc('hosp-npc-paciente-01');
    expect(hospital.vista()?.dialogo?.personajeId).toBe('paciente-01');
    hospital.avanzarDialogo(); hospital.avanzarDialogo(); hospital.elegir('registrar-entrevista-paciente-demo');
    const estadoPaciente = hospital.vista()!.estado;
    await salirDe('hospital_entrada');
    await entrarA('pol-puerta', 'policia_entrada'); await activarNpc('pol-npc-oficial');
    await salirDe('policia_entrada');
    await conversar();
    expect(hospital.vista()?.estado).toEqual(estadoDoctor);
    await hospital.cerrarConversacion(); await activarNpc('hosp-npc-paciente-01');
    expect(hospital.vista()?.estado).toEqual(estadoPaciente);
    expect(libreta.estado().pistas.map(p => p.id)).toEqual(['demo-entrevista-paciente-01']);
  });

  it('una salida real invalida el enfoque pendiente del oficial y no afecta la siguiente sala', async () => {
    await entrarA('pol-puerta', 'policia_entrada');
    retener = 'camara.enfocar'; await activarNpc('pol-npc-oficial');
    const orden = ordenes.at(-1)!;
    emitir('edificio.salio', { zoneId: 'policia_entrada' }); await vaciarCola();
    await entrarA('fis-puerta', 'fiscalia_entrada');
    emitir('orden.ack', {}, { correlacion: orden.id }); await vaciarCola();
    expect(hospital.edificioActivo()?.edificioId).toBe('fiscalia-prueba');
    expect(hospital.modal()).toBeFalse(); expect(hospital.vista()).toBeNull();
    expect(contar('npc.reproducirAnimacion')).toBe(0);
    retener = null; await activarNpc('fis-npc-fiscal');
    expect(hospital.vista()?.dialogo?.personajeId).toBe('fiscal');
  });

  it('otro caso en la misma sesión visual reinicia los tres guiones y la libreta', async () => {
    await conversar(); obtenerPista(); await salirDe('hospital_entrada');
    await entrarA('pol-puerta', 'policia_entrada'); await activarNpc('pol-npc-oficial');
    hospital.avanzarDialogo(); hospital.elegir('solicitar-atestado');
    hospital.vincular(puente, { ...sesion, casoId: 'otro-caso-demo' });
    expect(narrativa.obtenerMotor('hospital-prueba')).toBeNull();
    expect(narrativa.obtenerMotor('policia-prueba')).toBeNull();
    expect(hospital.edificioActivo()).toBeNull(); expect(libreta.estado().pistas.length).toBe(0);
    await entrarA('pol-puerta', 'policia_entrada'); await activarNpc('pol-npc-oficial');
    expect(hospital.vista()?.estado.escenaId).toBe('atencion-policial');
    expect(hospital.vista()?.dialogo?.personajeId).toBe('oficial');
  });
});
