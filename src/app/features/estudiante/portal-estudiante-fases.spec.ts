import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { SOLICITUD_ACADEMICA } from '../academico/academico-http';
import { FalloPortal, PortalEstudianteApi } from './portal-estudiante.api';

const B = '/api-prueba';
const I = '11111111-1111-4111-8111-111111111111';
const G = '22222222-2222-4222-8222-222222222222';
const HASH = 'a'.repeat(64);
const GUION = { formato: 'prisaly-guion-1', inicio: 'hospital', espacios: [{ idEspacio: 'hospital', titulo: 'Hospital', recursoVisual: 'edificio:hospital' }] };

/** CB-07 (DC-CB-AVANCE-08): clientes P1-P3 de M5 con los contratos reales de `FasesIntentoDto`. */
describe('PortalEstudianteApi · fases del intento (M5 P1-P3)', () => {
  let http: HttpTestingController;
  let api: PortalEstudianteApi;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)] });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(PortalEstudianteApi);
  });
  afterEach(() => http.verify());

  /** Cookie estudiantil, nunca el Bearer del personal: sin marca académica, sin Authorization y con credenciales. */
  function esDeEstudiante(r: TestRequest): void {
    expect(r.request.withCredentials).toBeTrue();
    expect(r.request.headers.has('Authorization')).toBeFalse();
    expect(r.request.context.get(SOLICITUD_ACADEMICA)).toBeFalse();
  }

  it('P1 lee la narrativa fijada con su versión y huella', () => {
    let n: unknown;
    api.narrativa(I).subscribe((v) => (n = v));
    const r = http.expectOne({ method: 'GET', url: `${B}/v1/estudiantes/intentos/${I}/narrativa` });
    esDeEstudiante(r);
    r.flush({ idIntento: I, idGuion: G, version: 2, hashDefinicion: HASH, definicion: GUION });
    expect(n).toEqual({ idIntento: I, idGuion: G, version: 2, hashDefinicion: HASH, definicion: GUION as never });
  });

  it('P1 rechaza una narrativa de otro intento, sin huella o que no es prisaly-guion-1', () => {
    const casos: Record<string, unknown>[] = [
      { idIntento: G, idGuion: G, version: 1, hashDefinicion: HASH, definicion: GUION },
      { idIntento: I, idGuion: G, version: 1, hashDefinicion: 'corta', definicion: GUION },
      { idIntento: I, idGuion: G, version: 0, hashDefinicion: HASH, definicion: GUION },
      { idIntento: I, idGuion: G, version: 1, hashDefinicion: HASH, definicion: { formato: 'otro', espacios: [] } },
      { idIntento: I, idGuion: 'no-uuid', version: 1, hashDefinicion: HASH, definicion: GUION },
    ];
    for (const cuerpo of casos) {
      let error: unknown;
      api.narrativa(I).subscribe({ error: (e) => (error = e) });
      http.expectOne(`${B}/v1/estudiantes/intentos/${I}/narrativa`).flush(cuerpo);
      expect((error as FalloPortal).codigo).withContext(JSON.stringify(cuerpo)).toBe('RESPUESTA_INVALIDA');
    }
  });

  it('P1 propaga EXPLORACION_CERRADA y los rechazos de titularidad sin inventar una narrativa', () => {
    for (const [estado, code] of [[409, 'EXPLORACION_CERRADA'], [403, 'ACCESO_DENEGADO'], [401, 'NO_AUTENTICADO']] as const) {
      let error: unknown;
      api.narrativa(I).subscribe({ error: (e) => (error = e) });
      http.expectOne(`${B}/v1/estudiantes/intentos/${I}/narrativa`).flush({ code }, { status: estado, statusText: 'x' });
      expect(error).toEqual(jasmine.objectContaining({ estado, codigo: code }));
    }
  });

  it('P2 lee la fase persistida y rechaza valores desconocidos', () => {
    let f: unknown;
    api.fase(I).subscribe((v) => (f = v));
    const r = http.expectOne({ method: 'GET', url: `${B}/v1/estudiantes/intentos/${I}/fase` });
    esDeEstudiante(r);
    r.flush({ idIntento: I, estadoIntento: 'EnCurso', fase: 'EXPLORACION', fechaInicioExploracion: '2026-11-26T20:00:00Z',
      fechaInicioCuestionario: null, limiteTemporal: '2026-11-26T21:00:00Z', ahoraServidor: '2026-11-26T20:10:00Z' });
    expect(f).toEqual(jasmine.objectContaining({ estadoIntento: 'EnCurso', fase: 'EXPLORACION', fechaInicioCuestionario: null }));
    let error: unknown;
    api.fase(I).subscribe({ error: (e) => (error = e) });
    http.expectOne(`${B}/v1/estudiantes/intentos/${I}/fase`).flush({ idIntento: I, estadoIntento: 'Abierto', fase: 'EXPLORACION' });
    expect((error as FalloPortal).codigo).toBe('RESPUESTA_INVALIDA');
  });

  it('P3 entra al cuestionario por POST y reconoce el reintento idempotente', () => {
    let c: unknown;
    api.iniciarCuestionario(I).subscribe((v) => (c = v));
    const r = http.expectOne({ method: 'POST', url: `${B}/v1/estudiantes/intentos/${I}/cuestionario` });
    esDeEstudiante(r);
    expect(r.request.body).toBeNull();
    r.flush({ idIntento: I, fase: 'CUESTIONARIO', fechaInicioCuestionario: '2026-11-26T20:30:00Z', yaIniciado: true });
    expect(c).toEqual({ idIntento: I, fechaInicioCuestionario: '2026-11-26T20:30:00Z', yaIniciado: true });
  });

  it('no llama al servidor con un identificador que no es UUID', () => {
    let errores = 0;
    const contar = { error: (e: FalloPortal) => { if (e.codigo === 'IDENTIFICADOR_INVALIDO') errores++; } };
    api.narrativa('x').subscribe(contar);
    api.fase('../admin').subscribe(contar);
    api.iniciarCuestionario('').subscribe(contar);
    expect(errores).toBe(3);
    http.expectNone(() => true);
  });
});
