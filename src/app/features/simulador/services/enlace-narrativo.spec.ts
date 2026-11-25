import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../../core/config/api.config';
import { GUION_DEMOSTRACION } from '../demo/guion-demostracion';
import { CASO_DEMOSTRACION } from '../demo/caso-demostracion';
import { PreguntaVista } from '../models/simulador.models';
import { EnlaceNarrativo, VinculoDecisionAcademica } from './enlace-narrativo';
import { ParticipacionCoordinador } from './participacion.coordinador';
import { provideParticipacionHttp } from './participacion-http.gateway';

const ID = '11111111-1111-4111-8111-111111111111';
const P = '22222222-2222-4222-8222-222222222222';
const O = '33333333-3333-4333-8333-333333333333';
const preguntas: readonly PreguntaVista[] = [
  { id: P, enunciado: 'Solo prueba', opciones: [{ id: O, texto: 'Solo prueba' }] },
];
// Fixture exclusivamente de prueba: no es una correspondencia académica aprobada.
const vinculo: VinculoDecisionAcademica = {
  guionId: GUION_DEMOSTRACION.id,
  escenaId: 'bienvenida',
  decisionId: 'conversar',
  idPregunta: P,
  idOpcionSeleccionada: O,
};
const intento = {
  idIntento: ID,
  estado: 'EnCurso',
  inicio: '2026-11-13T10:00:00Z',
  limiteTemporal: '2026-11-13T11:00:00Z',
  ahoraServidor: '2026-11-13T10:10:00Z',
  motivoFinalizacion: null,
  respuestas: [],
};

describe('EnlaceNarrativo con coordinador y N9', () => {
  let coordinador: ParticipacionCoordinador;
  let http: HttpTestingController;
  let enlace: EnlaceNarrativo;
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
    coordinador.cargar(ID);
    http.expectOne(() => true).flush(intento);
    enlace = new EnlaceNarrativo(ID, GUION_DEMOSTRACION, preguntas, [vinculo], coordinador);
  });
  afterEach(() => http.verify());
  function habilitar(): void {
    enlace.avanzarDialogo();
    enlace.avanzarDialogo();
  }
  function put() {
    return http.expectOne(`/api/v1/estudiantes/intentos/${ID}/respuestas/${P}`);
  }

  it('ignora decisiones anticipadas o inexistentes', () => {
    enlace.elegir('conversar');
    habilitar();
    enlace.elegir('ajena');
    expect(enlace.motor.estado.transicion).toBeNull();
    http.expectNone(() => true);
  });

  it('aplica efectos y transición solo después de guardar; bloquea doble clic y retroceso pendiente', () => {
    habilitar();
    const anterior = enlace.motor.estado;
    enlace.elegir('conversar');
    enlace.elegir('conversar');
    enlace.volver();
    enlace.elegir('observar');
    enlace.completarTransicion();
    expect(enlace.motor.estado).toBe(anterior);
    const req = put();
    expect(req.request.body).toEqual({ idOpcionSeleccionada: O, revisionEsperada: 0 });
    req.flush({ idPregunta: P, idOpcionSeleccionada: O, revision: 1 });
    expect(enlace.motor.estado.marcas['conversacion']).toBeTrue();
    expect(enlace.motor.estado.transicion?.destino).toBe('conversacion');
  });

  it('una decisión exclusivamente narrativa avanza sin HTTP', () => {
    habilitar();
    enlace.elegir('observar');
    expect(enlace.motor.estado.transicion?.destino).toBe('observacion');
    http.expectNone(() => true);
  });

  it('retroceder conserva respuestas guardadas y no escribe por sí mismo', () => {
    habilitar();
    enlace.elegir('conversar');
    put().flush({ idPregunta: P, idOpcionSeleccionada: O, revision: 1 });
    enlace.volver();
    expect(enlace.motor.estado.transicion).toBeNull();
    expect(coordinador.intento()?.respuestas[0].revision).toBe(1);
    http.expectNone(() => true);
    enlace.elegir('conversar');
    expect(enlace.motor.estado.transicion?.destino).toBe('conversacion');
    http.expectNone(() => true);
  });

  it('no avanza ante conflicto ni reconciliación; requiere confirmar explícitamente la elección', () => {
    habilitar();
    enlace.elegir('conversar');
    put().flush({ code: 'REVISION_OBSOLETA' }, { status: 409, statusText: 'Conflict' });
    enlace.elegir('observar');
    expect(enlace.motor.estado.transicion).toBeNull();
    coordinador.verificar();
    http
      .expectOne(() => true)
      .flush({ ...intento, respuestas: [{ idPregunta: P, idOpcionSeleccionada: O, revision: 1 }] });
    expect(enlace.motor.estado.transicion).toBeNull();
    enlace.elegir('conversar');
    expect(enlace.motor.estado.transicion?.destino).toBe('conversacion');
    http.expectNone(() => true);
  });

  it('descartar el enlace impide aplicar una confirmación tardía', () => {
    habilitar();
    enlace.elegir('conversar');
    enlace.cerrar();
    put().flush({ idPregunta: P, idOpcionSeleccionada: O, revision: 1 });
    expect(coordinador.estado()).toBe('guardada');
    expect(enlace.motor.estado.transicion).toBeNull();
  });

  it('no reutiliza el enlace en otro intento', () => {
    habilitar();
    coordinador.cargar(O);
    http.expectOne(() => true).flush({ ...intento, idIntento: O });
    enlace.elegir('conversar');
    expect(enlace.motor.estado.transicion).toBeNull();
    http.expectNone(() => true);
  });

  for (const cambio of [
    { guionId: 'otro' },
    { escenaId: 'inexistente' },
    { decisionId: 'inexistente' },
    { idPregunta: O },
    { idOpcionSeleccionada: P },
  ]) {
    it(`rechaza una referencia inválida: ${Object.keys(cambio)[0]}`, () => {
      expect(
        () =>
          new EnlaceNarrativo(
            ID,
            GUION_DEMOSTRACION,
            preguntas,
            [{ ...vinculo, ...cambio }],
            coordinador,
          ),
      ).toThrow();
      http.expectNone(() => true);
    });
  }

  it('rechaza vínculos duplicados y preguntas u opciones ambiguas', () => {
    const crear = (ps: readonly PreguntaVista[], vs = [vinculo]) =>
      new EnlaceNarrativo(ID, GUION_DEMOSTRACION, ps, vs, coordinador);
    expect(() => crear(preguntas, [vinculo, vinculo])).toThrow();
    expect(() => crear([...preguntas, preguntas[0]])).toThrow();
    expect(() =>
      crear([{ ...preguntas[0], opciones: [preguntas[0].opciones[0], preguntas[0].opciones[0]] }]),
    ).toThrow();
  });

  it('rechaza identificadores de preguntas demo y aísla los vínculos de mutaciones externas', () => {
    expect(
      () =>
        new EnlaceNarrativo(ID, GUION_DEMOSTRACION, CASO_DEMOSTRACION.preguntas, [], coordinador),
    ).toThrow();
    const mutable = { ...vinculo };
    enlace = new EnlaceNarrativo(ID, GUION_DEMOSTRACION, preguntas, [mutable], coordinador);
    mutable.idOpcionSeleccionada = P;
    habilitar();
    enlace.elegir('conversar');
    const req = put();
    expect(req.request.body.idOpcionSeleccionada).toBe(O);
    req.flush({ idPregunta: P, idOpcionSeleccionada: O, revision: 1 });
  });
});
