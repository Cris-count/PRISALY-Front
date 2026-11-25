import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../../core/config/api.config';
import { IntentoM5 } from '../models/participacion.models';
import { ParticipacionCoordinador } from './participacion.coordinador';
import { FalloParticipacionError, provideParticipacionHttp } from './participacion-http.gateway';

const ID = '11111111-1111-4111-8111-111111111111';
const PREGUNTA = '22222222-2222-4222-8222-222222222222';
const OPCION = '33333333-3333-4333-8333-333333333333';
const OTRA = '44444444-4444-4444-8444-444444444444';
const seleccion = { idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION };
const base: IntentoM5 = {
  idIntento: ID,
  estado: 'EnCurso',
  inicio: '2026-11-13T10:00:00Z',
  limiteTemporal: '2026-11-13T11:00:00Z',
  ahoraServidor: '2026-11-13T10:10:00Z',
  motivoFinalizacion: null,
  respuestas: [],
};

describe('ParticipacionCoordinador con N9', () => {
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

  function consultar(cuerpo: IntentoM5 = base): void {
    http.expectOne(`/api/v1/estudiantes/intentos/${ID}`).flush(cuerpo);
  }
  function put() {
    return http.expectOne(`/api/v1/estudiantes/intentos/${ID}/respuestas/${PREGUNTA}`);
  }
  function iniciar(): void {
    coordinador.cargar(ID);
    consultar();
  }

  it('no inicia HTTP al crearse y bloquea guardar sin contexto', () => {
    coordinador.guardar(seleccion);
    expect(coordinador.estado()).toBe('inactivo');
    http.expectNone(() => true);
  });

  it('confirma antes de avanzar y usa la revisión del servidor en la siguiente escritura', () => {
    iniciar();
    const avanzar = jasmine.createSpy('avanzar');
    coordinador.guardar(seleccion, avanzar);
    coordinador.guardar(seleccion, avanzar);
    const req = put();
    expect(req.request.body.revisionEsperada).toBe(0);
    expect(req.request.withCredentials).toBeTrue();
    expect(coordinador.estado()).toBe('guardando');
    expect(coordinador.intento()?.respuestas).toEqual([]);
    expect(avanzar).not.toHaveBeenCalled();
    req.flush({ ...seleccion, revision: 3 });
    expect(avanzar).toHaveBeenCalledTimes(1);
    expect(coordinador.estado()).toBe('guardada');
    coordinador.guardar({ ...seleccion, idOpcionSeleccionada: OTRA });
    const cambio = put();
    expect(cambio.request.body.revisionEsperada).toBe(3);
    cambio.flush({ ...seleccion, idOpcionSeleccionada: OTRA, revision: 4 });
  });

  it('no repite un PUT para una opción ya confirmada', () => {
    coordinador.cargar(ID);
    consultar({ ...base, respuestas: [{ ...seleccion, revision: 2 }] });
    coordinador.guardar(seleccion);
    expect(coordinador.estado()).toBe('guardada');
    http.expectNone(() => true);
  });

  it('reconcilia una respuesta perdida sin repetir escritura ni ejecutar la transición antigua', () => {
    iniciar();
    const avanzar = jasmine.createSpy('avanzar');
    coordinador.guardar(seleccion, avanzar);
    put().error(new ProgressEvent('error'), { status: 0 });
    expect(coordinador.estado()).toBe('por-verificar');
    coordinador.guardar(seleccion);
    http.expectNone(() => true);
    coordinador.verificar();
    consultar({ ...base, respuestas: [{ ...seleccion, revision: 1 }] });
    expect(coordinador.estado()).toBe('guardada');
    expect(coordinador.seleccionPendiente()).toBeNull();
    expect(avanzar).not.toHaveBeenCalled();
  });

  it('conserva una intención diferente tras conflicto y exige un nuevo guardado explícito', () => {
    iniciar();
    coordinador.guardar(seleccion);
    put().flush({ code: 'REVISION_OBSOLETA' }, { status: 409, statusText: 'Conflict' });
    expect(coordinador.estado()).toBe('conflicto');
    expect(coordinador.error()).toBeInstanceOf(FalloParticipacionError);
    coordinador.guardar(seleccion);
    http.expectNone(() => true);
    coordinador.verificar();
    consultar({ ...base, respuestas: [{ ...seleccion, idOpcionSeleccionada: OTRA, revision: 5 }] });
    expect(coordinador.seleccionPendiente()).toEqual(seleccion);
    http.expectNone(() => true);
    coordinador.guardar(seleccion);
    const req = put();
    expect(req.request.body.revisionEsperada).toBe(5);
    req.flush({ ...seleccion, revision: 6 });
  });

  it('mantiene bloqueada la escritura si también falla la reconciliación', () => {
    iniciar();
    coordinador.guardar(seleccion);
    put().flush({}, { status: 503, statusText: 'Unavailable' });
    coordinador.verificar();
    http.expectOne(() => true).error(new ProgressEvent('error'), { status: 0 });
    expect(coordinador.estado()).toBe('por-verificar');
    expect(coordinador.seleccionPendiente()).toEqual(seleccion);
    coordinador.guardar(seleccion);
    http.expectNone(() => true);
  });

  it('no acepta la confirmación de otra opción ni una revisión que no avanzó', () => {
    iniciar();
    const avanzar = jasmine.createSpy('avanzar');
    coordinador.guardar(seleccion, avanzar);
    put().flush({ ...seleccion, idOpcionSeleccionada: OTRA, revision: 1 });
    expect(coordinador.estado()).toBe('por-verificar');
    expect(avanzar).not.toHaveBeenCalled();
    coordinador.verificar();
    consultar();
    coordinador.guardar(seleccion, avanzar);
    put().flush({ ...seleccion, revision: 0 });
    expect(coordinador.estado()).toBe('por-verificar');
    expect(avanzar).not.toHaveBeenCalled();
  });

  it('bloquea un intento finalizado y rechaza el ID de otro intento', () => {
    coordinador.cargar(ID);
    consultar({ ...base, estado: 'Finalizado' });
    coordinador.guardar(seleccion);
    expect(coordinador.estado()).toBe('finalizado');
    http.expectNone(() => true);
    coordinador.cargar(ID);
    consultar({ ...base, idIntento: OTRA });
    expect(coordinador.estado()).toBe('error');
    expect(coordinador.intento()).toBeNull();
  });

  for (const status of [401, 403, 404]) {
    it(`conserva el error ${status} y bloquea nuevos guardados`, () => {
      iniciar();
      coordinador.guardar(seleccion);
      put().flush({}, { status, statusText: 'Error' });
      expect(coordinador.estado()).toBe('error');
      expect((coordinador.error() as FalloParticipacionError).estado).toBe(status);
      coordinador.guardar(seleccion);
      http.expectNone(() => true);
    });
  }

  it('reconciliar un intento finalizado conserva la intención y bloquea la edición', () => {
    iniciar();
    coordinador.guardar(seleccion);
    put().flush({}, { status: 409, statusText: 'Conflict' });
    coordinador.verificar();
    consultar({ ...base, estado: 'Finalizado' });
    expect(coordinador.estado()).toBe('finalizado');
    expect(coordinador.seleccionPendiente()).toEqual(seleccion);
    coordinador.guardar(seleccion);
    http.expectNone(() => true);
  });

  it('cambiar de contexto cancela la consulta anterior y no conserva sus datos', () => {
    coordinador.cargar(ID);
    const anterior = http.expectOne(() => true);
    coordinador.cargar(OTRA);
    expect(anterior.cancelled).toBeTrue();
    expect(coordinador.intento()).toBeNull();
    http.expectOne(`/api/v1/estudiantes/intentos/${OTRA}`).flush({ ...base, idIntento: OTRA });
    expect(coordinador.intento()?.idIntento).toBe(OTRA);
  });

  it('salir cancela el guardado y no aplica su transición', () => {
    iniciar();
    const avanzar = jasmine.createSpy('avanzar');
    coordinador.guardar(seleccion, avanzar);
    const req = put();
    coordinador.cerrar();
    expect(req.cancelled).toBeTrue();
    expect(coordinador.estado()).toBe('inactivo');
    expect(coordinador.intento()).toBeNull();
    expect(avanzar).not.toHaveBeenCalled();
  });
});
