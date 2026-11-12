import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable } from 'rxjs';

import { provideApiConfig } from '../../../core/config/api.config';
import { ContratoPendienteError, ParticipacionGateway } from './participacion.gateway';
import {
  FalloParticipacionError,
  IntentoM5,
  ParticipacionHttpGateway,
  provideParticipacionHttp,
} from './participacion-http.gateway';

const INTENTO = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b';
const PREGUNTA = '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d';
const OPCION = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const BASE = 'http://backend.test/api';

/** Cuerpo real de `GET /v1/estudiantes/intentos/{id}` (IntentosM5Dto.Intento). */
const CUERPO_INTENTO = {
  idIntento: INTENTO,
  estado: 'EnCurso',
  inicio: '2030-11-05T14:00:00Z',
  limiteTemporal: '2030-11-05T15:00:00Z',
  motivoFinalizacion: null,
  respuestas: [{ idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 1 }],
  ahoraServidor: '2030-11-05T14:10:00Z',
};

async function error(o: Observable<unknown>): Promise<unknown> {
  return firstValueFrom(o).then(
    () => fail('no debía emitir un resultado'),
    (e: unknown) => e,
  );
}

describe('ParticipacionHttpGateway', () => {
  let gateway: ParticipacionGateway;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(BASE),
        provideParticipacionHttp(),
      ],
    });
    gateway = TestBed.inject(ParticipacionGateway);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('solo se registra de forma explícita', () => {
    expect(gateway).toBeInstanceOf(ParticipacionHttpGateway);
  });

  it('consulta el intento con la cookie estudiantil y sin cabeceras de identidad', async () => {
    const resultado = firstValueFrom(gateway.consultarIntento(INTENTO) as Observable<IntentoM5>);
    const req = http.expectOne(`${BASE}/v1/estudiantes/intentos/${INTENTO}`);

    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush(CUERPO_INTENTO);

    const intento = await resultado;
    expect(intento.estado).toBe('EnCurso');
    expect(intento.motivoFinalizacion).toBeNull();
    expect(intento.respuestas).toEqual([
      { idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 1 },
    ]);
  });

  it('guarda la respuesta con la revisión esperada (D06)', async () => {
    const resultado = firstValueFrom(gateway.registrarRespuesta(INTENTO, PREGUNTA, OPCION, 1));
    const req = http.expectOne(`${BASE}/v1/estudiantes/intentos/${INTENTO}/respuestas/${PREGUNTA}`);

    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.body).toEqual({ idOpcionSeleccionada: OPCION, revisionEsperada: 1 });
    req.flush({ idPregunta: PREGUNTA, idOpcionSeleccionada: OPCION, revision: 2 });

    expect(await resultado).toEqual({
      idPregunta: PREGUNTA,
      idOpcionSeleccionada: OPCION,
      revision: 2,
    });
  });

  const fallos: [number, string, string][] = [
    [401, 'sesion-no-valida', 'UNAUTHENTICATED'],
    [403, 'acceso-denegado', 'FORBIDDEN'],
    [404, 'no-encontrado', 'INTENTO_NO_ENCONTRADO'],
    [409, 'conflicto', 'REVISION_OBSOLETA'],
  ];
  for (const [estado, tipo, codigo] of fallos) {
    it(`clasifica ${estado} sin exponer el mensaje del servidor`, async () => {
      const pendiente = error(gateway.registrarRespuesta(INTENTO, PREGUNTA, OPCION, 0));
      http
        .expectOne(() => true)
        .flush(
          { code: codigo, message: 'detalle interno uq_respuesta' },
          { status: estado, statusText: 'x' },
        );

      const e = (await pendiente) as FalloParticipacionError;
      expect(e).toBeInstanceOf(FalloParticipacionError);
      expect(e.fallo.tipo).toBe(tipo);
      expect(e.estado).toBe(estado);
      expect(e.codigo).toBe(codigo);
      expect(e.message).not.toContain('uq_respuesta');
    });
  }

  it('un fallo de red es reintentable', async () => {
    const pendiente = error(gateway.consultarIntento(INTENTO));
    http.expectOne(() => true).error(new ProgressEvent('error'), { status: 0 });

    const e = (await pendiente) as FalloParticipacionError;
    expect(e.fallo.tipo).toBe('sin-conexion');
    expect(e.fallo.reintentable).toBeTrue();
  });

  it('un código de error no canónico no se conserva', async () => {
    const pendiente = error(gateway.consultarIntento(INTENTO));
    http
      .expectOne(() => true)
      .flush({ code: '<script>', message: 'x' }, { status: 409, statusText: 'x' });

    expect(((await pendiente) as FalloParticipacionError).codigo).toBeNull();
  });

  it('un cuerpo inesperado nunca se presenta como intento válido', async () => {
    const pendiente = error(gateway.consultarIntento(INTENTO));
    http.expectOne(() => true).flush({ ...CUERPO_INTENTO, estado: 'Calificado' });

    expect(((await pendiente) as FalloParticipacionError).fallo.tipo).toBe('desconocido');
  });

  it('rechaza identificadores o revisiones inválidos sin llamar al servidor', async () => {
    for (const invocar of [
      () => gateway.consultarIntento('../admin'),
      () => gateway.registrarRespuesta(INTENTO, 'p/../x', OPCION, 0),
      () => gateway.registrarRespuesta(INTENTO, PREGUNTA, 'no-uuid', 0),
      () => gateway.registrarRespuesta(INTENTO, PREGUNTA, OPCION, -1),
      () => gateway.registrarRespuesta(INTENTO, PREGUNTA, OPCION, 1.5),
    ]) {
      expect(await error(invocar())).toBeInstanceOf(FalloParticipacionError);
    }
    http.expectNone(() => true);
  });

  it('las operaciones sin contrato aprobado siguen pendientes y no llaman al servidor', async () => {
    for (const invocar of [
      () => gateway.consultarSesionesAutorizadas(),
      () => gateway.iniciarIntento('s'),
      () => gateway.consultarProgreso(INTENTO),
      () => gateway.reanudarIntento(INTENTO),
      () => gateway.finalizarIntento(INTENTO),
    ]) {
      expect(await error(invocar())).toBeInstanceOf(ContratoPendienteError);
    }
    http.expectNone(() => true);
  });
});
