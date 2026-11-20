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
});
