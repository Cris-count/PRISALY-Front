import { LibretaStore } from './libreta.store';
import { EventoPistaObtenida } from './investigacion.models';

describe('libreta demostrativa en memoria', () => {
  it('crea, edita y elimina una nota conservando identidad y fecha de creación', () => {
    const store = new LibretaStore();
    const id = store.crearNota('  Observación propia  ')!;
    const original = store.estado().notas[0];
    expect(original.texto).toBe('Observación propia');
    expect(store.actualizarNota(id, 'Observación revisada')).toBeTrue();
    expect(store.estado().notas[0].id).toBe(id);
    expect(store.estado().notas[0].creadaEn).toBe(original.creadaEn);
    expect(store.estado().notas[0].modificadaEn >= original.modificadaEn).toBeTrue();
    expect(store.actualizarNota('otra-nota', 'ajena')).toBeFalse();
    expect(store.eliminarNota(id)).toBeTrue();
    expect(store.estado().notas).toEqual([]);
    expect(store.eliminarNota(id)).toBeFalse();
  });
  it('rechaza notas vacías o excesivas sin alterar el estado', () => {
    const store = new LibretaStore();
    expect(store.crearNota('  ')).toBeNull();
    expect(store.crearNota('x'.repeat(4001))).toBeNull();
    const id = store.crearNota('Válida')!;
    expect(store.actualizarNota(id, ' ')).toBeFalse();
    expect(store.estado().notas[0].texto).toBe('Válida');
  });
  it('recibe pistas explícitas, evita duplicados y las mantiene separadas de notas', () => {
    const store = new LibretaStore();
    const evento: EventoPistaObtenida = { tipo: 'pista-obtenida', contexto: store.estado().contexto, pista: { id: 'pista-1', titulo: 'Información', descripcion: 'Dato explícito del ejemplo', origen: { espacioId: 'hospital-demo', interaccionId: 'dialogo-1', personajeId: 'enfermera-demo', lugar: 'Hospital de ejemplo' } } };
    expect(store.registrarPista(evento)).toBeTrue();
    expect(store.registrarPista(evento)).toBeFalse();
    store.crearNota('Mi interpretación');
    expect(store.estado().pistas.length).toBe(1);
    expect(store.estado().notas.length).toBe(1);
    expect(store.estado().pistas[0].origen.personajeId).toBe('enfermera-demo');
    expect('respuestas' in store.estado()).toBeFalse();
  });
  it('rechaza contextos académicos y eventos de una demostración anterior', () => {
    const store = new LibretaStore();
    const evento: EventoPistaObtenida = { tipo: 'pista-obtenida', contexto: store.estado().contexto, pista: { id: 'pista-1', titulo: 'Título', descripcion: 'Dato', origen: { espacioId: 'hospital-demo', interaccionId: 'demo-1', lugar: 'Ejemplo' } } };
    store.crearNota('No debe cruzar contextos'); store.registrarPista(evento);
    store.reiniciarDemostracion();
    expect(store.estado().pistas).toEqual([]); expect(store.estado().notas).toEqual([]);
    expect(store.registrarPista(evento)).toBeFalse();
    expect(store.registrarPista({ ...evento, contexto: { modo: 'academico', intentoId: 'no-autorizado', casoId: 'no-autorizado', versionPublicadaId: 'no-autorizada' } })).toBeFalse();
    expect(new LibretaStore().estado().notas).toEqual([]);
  });
});
