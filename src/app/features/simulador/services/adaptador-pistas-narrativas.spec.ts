import { TestBed } from '@angular/core/testing';
import { AdaptadorPistasNarrativas, PISTAS_DEMOSTRATIVAS_CATALOGO } from './adaptador-pistas-narrativas';
import { LibretaStore } from '../investigacion/libreta.store';
import { EstadoNarrativo } from '../narrativa/narrativa.models';

describe('AdaptadorPistasNarrativas', () => {
  let adaptador: AdaptadorPistasNarrativas;
  let libreta: LibretaStore;

  const crearEstadoMock = (marcas: Record<string, boolean>): EstadoNarrativo => ({
    escenaId: 'prueba',
    dialogo: 0,
    marcas,
    personajes: [],
    visitadas: ['prueba'],
    transicion: null,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LibretaStore, AdaptadorPistasNarrativas],
    });
    adaptador = TestBed.inject(AdaptadorPistasNarrativas);
    libreta = TestBed.inject(LibretaStore);
  });

  it('registra una pista cuando la marca asociada se activa', () => {
    const estado = crearEstadoMock({ pista_historial_clinico: true });
    const agregadas = adaptador.sincronizarConEstado(estado);

    expect(agregadas).toEqual(['pista-historial-clinico']);
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().pistas[0].id).toBe('pista-historial-clinico');
    expect(libreta.estado().pistas[0].titulo).toBe('Historia Clínica de Emergencia');
  });

  it('no registra pistas si la marca es falsa o inexistente', () => {
    const estado = crearEstadoMock({ pista_historial_clinico: false, otra_marca: true });
    const agregadas = adaptador.sincronizarConEstado(estado);

    expect(agregadas).toEqual([]);
    expect(libreta.estado().pistas.length).toBe(0);
  });

  it('es estrictamente idempotente y no duplica pistas registradas', () => {
    const estado = crearEstadoMock({ pista_historial_clinico: true });
    adaptador.sincronizarConEstado(estado);
    const reintento = adaptador.sincronizarConEstado(estado);

    expect(reintento).toEqual([]);
    expect(libreta.estado().pistas.length).toBe(1);
  });

  it('mantiene intactas las notas personales del usuario al incorporar pistas', () => {
    const notaId = libreta.crearNota('Observación preliminar de prueba.');
    expect(libreta.estado().notas.length).toBe(1);

    const estado = crearEstadoMock({ pista_informe_policial: true });
    adaptador.sincronizarConEstado(estado);

    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().notas.length).toBe(1);
    expect(libreta.estado().notas[0].id).toBe(notaId!);
  });

  it('limpia su registro al llamar a reiniciar()', () => {
    const estado = crearEstadoMock({ pista_historial_clinico: true });
    adaptador.sincronizarConEstado(estado);
    expect(adaptador.tienePista('pista-historial-clinico')).toBeTrue();

    adaptador.reiniciar();
    libreta.reiniciarDemostracion();
    expect(adaptador.tienePista('pista-historial-clinico')).toBeFalse();

    const segundas = adaptador.sincronizarConEstado(estado);
    expect(segundas).toEqual(['pista-historial-clinico']);
  });
});
