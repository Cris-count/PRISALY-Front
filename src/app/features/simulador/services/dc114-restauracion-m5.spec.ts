import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../../core/config/api.config';
import { IntentoM5 } from '../models/participacion.models';
import { ParticipacionCoordinador } from './participacion.coordinador';
import { FalloParticipacionError, provideParticipacionHttp } from './participacion-http.gateway';

/**
 * DC-DEV-114. Restauración del intento con los GET/PUT ya publicados.
 * El gateway HTTP solo se registra en este módulo de prueba.
 */
const ID = '11111111-1111-4111-8111-111111111111';
const PREGUNTA = '22222222-2222-4222-8222-222222222222';
const OPCION = '33333333-3333-4333-8333-333333333333';
const OTRA = '44444444-4444-4444-8444-444444444444';
const base: IntentoM5 = {
  idIntento: ID,
  estado: 'EnCurso',
  inicio: '2026-11-25T10:00:00Z',
  limiteTemporal: '2026-11-25T11:00:00Z',
  ahoraServidor: '2026-11-25T10:10:00Z',
  motivoFinalizacion: null,
  respuestas: [],
};

describe('DC-114 restauración del intento M5', () => {
  let coordinador: ParticipacionCoordinador;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig('/api'),
        provideParticipacionHttp(),
        ParticipacionCoordinador,
      ],
    });
    coordinador = TestBed.inject(ParticipacionCoordinador);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function leer(cuerpo: IntentoM5 = base): void {
    http.expectOne({ method: 'GET', url: `/api/v1/estudiantes/intentos/${ID}` }).flush(cuerpo);
  }

  it('el primer ingreso deja el intento en curso y no escribe respuestas', () => {
    coordinador.cargar(ID);
    expect(coordinador.estado()).toBe('cargando');
    leer();
    expect(coordinador.estado()).toBe('disponible');
    expect(coordinador.intento()?.respuestas).toEqual([]);
    http.expectNone(() => true);
  });

  it('una recarga reconstruye las respuestas persistidas y no repite el PUT', () => {
    coordinador.cargar(ID);
    leer({ ...base, respuestas: [{ idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 2 }] });
    coordinador.cerrar();
    coordinador.cargar(ID);
    leer({ ...base, respuestas: [{ idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 2 }] });
    coordinador.guardar({ idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION });
    expect(coordinador.estado()).toBe('guardada');
    expect(coordinador.intento()?.respuestas).toEqual([
      { idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 2 },
    ]);
    http.expectNone(() => true);
  });

  it('acepta el mismo intento aunque el servidor cambie las mayúsculas del UUID', () => {
    coordinador.cargar(ID);
    leer({ ...base, idIntento: ID.toUpperCase() });
    expect(coordinador.estado()).toBe('disponible');
    expect(coordinador.intento()?.idIntento).toBe(ID.toUpperCase());
  });

  it('si la consulta repite una pregunta conserva la revisión más alta', () => {
    coordinador.cargar(ID);
    leer({
      ...base,
      respuestas: [
        { idPregunta: PREGUNTA, idOpcionSeleccionada: OTRA, revision: 1 },
        { idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 4 },
      ],
    });
    expect(coordinador.intento()?.respuestas).toEqual([
      { idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 4 },
    ]);
  });

  it('tras un 500 conserva la respuesta pendiente y la reconcilia al volver a consultar', () => {
    coordinador.cargar(ID);
    leer();
    coordinador.guardar({ idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION });
    http
      .expectOne({ method: 'PUT', url: `/api/v1/estudiantes/intentos/${ID}/respuestas/${PREGUNTA}` })
      .flush({ code: 'M5_ERROR' }, { status: 500, statusText: 'Error' });
    expect(coordinador.estado()).toBe('por-verificar');
    expect(coordinador.seleccionPendiente()).toEqual({
      idPregunta: PREGUNTA,
      idOpcionSeleccionada: OPCION,
    });
    coordinador.verificar();
    leer({
      ...base,
      respuestas: [{ idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 1 }],
    });
    expect(coordinador.estado()).toBe('guardada');
    expect(coordinador.seleccionPendiente()).toBeNull();
    http.expectNone(() => true);
  });

  it('un intento finalizado restaura las respuestas y no admite otra escritura', () => {
    coordinador.cargar(ID);
    leer({
      ...base,
      estado: 'Finalizado',
      motivoFinalizacion: 'CIERRE_ESTUDIANTE',
      respuestas: [{ idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 1 }],
    });
    expect(coordinador.estado()).toBe('finalizado');
    coordinador.guardar({ idPregunta: PREGUNTA, idOpcionSeleccionada: OTRA });
    expect(coordinador.intento()?.respuestas[0].idOpcionSeleccionada).toBe(OPCION);
    http.expectNone(() => true);
  });

  it('un 500 al entrar no presenta un intento y conserva el estado HTTP', () => {
    coordinador.cargar(ID);
    http
      .expectOne({ method: 'GET', url: `/api/v1/estudiantes/intentos/${ID}` })
      .flush({ code: 'M5_ERROR', message: 'detalle-interno' }, { status: 500, statusText: 'Error' });
    expect(coordinador.estado()).toBe('error');
    expect(coordinador.intento()).toBeNull();
    expect((coordinador.error() as FalloParticipacionError).estado).toBe(500);
    expect(String(coordinador.error())).not.toContain('detalle-interno');
  });
});
