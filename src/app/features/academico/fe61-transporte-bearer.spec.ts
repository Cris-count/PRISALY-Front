import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { AccesoEstudianteApi } from '../autenticacion/acceso-estudiante-real';
import { ActivacionDocenteApi } from '../autenticacion/activacion-docente';
import { personalM1Interceptor, provideM1PersonalLocal } from '../autenticacion/m1-personal-http';
import { CredencialPersonalMemoria } from '../autenticacion/m1-personal-memoria';
import {
  contextoAcademico,
  esRutaAcademicaAutorizada,
  esRutaSinBearer,
  personalAcademicoInterceptor,
} from './academico-http';
import { AdministracionM1Api } from './administracion-m1.api';

/**
 * FE-61 Fase 1. Qué peticiones llevan Bearer y cuáles no, con los dos interceptores registrados
 * igual que en `app.config` (QA). Todas las respuestas son DOBLES HTTP (HttpTestingController):
 * no hay Backend DC-99 QA en ejecución y nada de esto acredita integración E2E.
 */
const B = '/api-prueba';
const U = '11111111-1111-4111-8111-111111111111';
// Doble de prueba; no es una credencial real.
const TOKEN = 'token-de-prueba-no-real';
// Doble de prueba con el formato del token D-05 (43 caracteres Base64url); no es un token real.
const TOKEN_ACTIVACION = 'A'.repeat(43);

describe('FE-61 lista de rutas de personal (controladores DC-99 32922bb)', () => {
  const rutasDc99: readonly [string, string][] = [
    ['POST', 'v1/admin/estudiantes'],
    ['GET', 'v1/admin/estudiantes'],
    ['POST', `v1/admin/docentes/${U}/activacion`],
    ['DELETE', `v1/admin/docentes/${U}/activacion`],
    ['GET', `v1/docente/sesiones/${U}/participaciones`],
    ['GET', `v1/docente/sesiones/${U}/reporte-participacion`],
    ['POST', `v1/docente/convocatorias/${U}/ausencia`],
    ['GET', `v1/docente/convocatorias/${U}/ausencia`],
    ['POST', `v1/docente/convocatorias/${U}/retiro`],
    ['GET', `v1/docente/convocatorias/${U}/retiro`],
    ['POST', `v1/docente/participaciones/${U}/repeticion`],
    ['GET', `v1/docente/participaciones/${U}/repeticion`],
    ['POST', `v1/docente/participaciones/${U}/intento-valido`],
    ['POST', `v1/docente/participaciones/${U}/retroalimentacion`],
    ['PUT', `v1/docente/participaciones/${U}/retroalimentacion`],
    ['GET', `v1/docente/participaciones/${U}/retroalimentacion`],
    ['POST', `v1/evaluacion/intentos/${U}`],
    ['GET', `v1/evaluacion/intentos/${U}`],
    ['POST', `v1/evaluacion/intentos/${U}/liberacion`],
  ];

  it('admite cada ruta de personal publicada en DC-99 con su método exacto', () => {
    for (const [metodo, ruta] of rutasDc99) {
      expect(esRutaAcademicaAutorizada(metodo, ruta)).withContext(`${metodo} ${ruta}`).toBeTrue();
    }
  });

  it('conserva las rutas previas (FE-53/54/60)', () => {
    expect(esRutaAcademicaAutorizada('POST', 'v1/admin/docentes')).toBeTrue();
    expect(esRutaAcademicaAutorizada('GET', `m4/sesiones/${U}/convocatorias`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('PUT', `v1/casos/${U}/rubrica`)).toBeTrue();
  });

  it('rechaza métodos no publicados, identificadores inválidos y rutas inventadas', () => {
    expect(esRutaAcademicaAutorizada('DELETE', 'v1/admin/estudiantes')).toBeFalse();
    expect(esRutaAcademicaAutorizada('GET', `v1/admin/estudiantes/${U}`)).toBeFalse();
    expect(esRutaAcademicaAutorizada('GET', `v1/admin/docentes/${U}/activacion`)).toBeFalse();
    expect(
      esRutaAcademicaAutorizada('DELETE', `v1/docente/participaciones/${U}/retroalimentacion`),
    ).toBeFalse();
    expect(esRutaAcademicaAutorizada('GET', `v1/evaluacion/intentos/${U}/liberacion`)).toBeFalse();
    expect(
      esRutaAcademicaAutorizada('GET', 'v1/docente/sesiones/no-uuid/participaciones'),
    ).toBeFalse();
    expect(esRutaAcademicaAutorizada('GET', 'v1/docente/sesiones')).toBeFalse();
    expect(esRutaAcademicaAutorizada('GET', 'v1/admin/estudiantes/listado')).toBeFalse();
  });

  it('nunca admite rutas públicas ni estudiantiles por cookie', () => {
    for (const [metodo, ruta] of [
      ['POST', 'v1/personal/activar'],
      ['POST', 'v1/personal/autenticar'],
      ['POST', 'v1/acceso-estudiante/solicitar'],
      ['POST', 'v1/acceso-estudiante/validar'],
      ['POST', 'v1/acceso-estudiante/cerrar-sesion'],
      ['GET', `v1/estudiantes/intentos/${U}`],
      ['GET', `v1/estudiantes/intentos/${U}/calificacion`],
      ['GET', 'v1/estudiantes/convocatorias'],
    ] as const) {
      expect(esRutaSinBearer(ruta)).withContext(ruta).toBeTrue();
      expect(esRutaAcademicaAutorizada(metodo, ruta)).withContext(ruta).toBeFalse();
    }
    expect(esRutaSinBearer('v1/personal/me')).toBeFalse();
  });
});

describe('FE-61 transporte de Bearer con los interceptores de QA (doble HTTP)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideApiConfig(B),
        provideM1PersonalLocal(),
        provideHttpClient(withInterceptors([personalM1Interceptor, personalAcademicoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(CredencialPersonalMemoria).guardar(TOKEN);
  });
  afterEach(() => http.verify());

  it('P-78: alta y búsqueda de estudiantes llevan Bearer y no cookies', () => {
    const api = TestBed.inject(AdministracionM1Api);
    api
      .altaEstudiante({ nombre: 'Est QA', correo: 'e@example.invalid' })
      .subscribe({ error: () => undefined });
    api.buscarEstudiantePorCorreo('e@example.invalid').subscribe({ error: () => undefined });
    const alta = http.expectOne({ method: 'POST', url: `${B}/v1/admin/estudiantes` });
    const busqueda = http.expectOne(
      (r) => r.method === 'GET' && r.url === `${B}/v1/admin/estudiantes`,
    );
    for (const r of [alta, busqueda]) {
      expect(r.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      expect(r.request.withCredentials).toBeFalse();
    }
    expect(busqueda.request.params.get('correo')).toBe('e@example.invalid');
    alta.flush(null, { status: 404, statusText: 'Not Found' });
    busqueda.flush(null, { status: 404, statusText: 'Not Found' });
  });

  it('D-05 administrador: emisión y revocación llevan Bearer', () => {
    const api = TestBed.inject(AdministracionM1Api);
    api.emitirActivacionDocente(U).subscribe({ error: () => undefined });
    api.revocarActivacionDocente(U).subscribe({ error: () => undefined });
    const reqs = http.match((r) => r.url === `${B}/v1/admin/docentes/${U}/activacion`);
    expect(reqs.map((r) => r.request.method)).toEqual(['POST', 'DELETE']);
    for (const r of reqs) {
      expect(r.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      r.flush(null, { status: 404, statusText: 'Not Found' });
    }
  });

  it('rutas docentes DC-99 marcadas como académicas llevan Bearer', () => {
    const cliente = TestBed.inject(HttpClient);
    const url = `${B}/v1/docente/sesiones/${U}/participaciones`;
    cliente.get(url, { context: contextoAcademico() }).subscribe();
    const req = http.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    req.flush({ items: [] });
  });

  it('D-05 pública: la activación por token no lleva Bearer ni cookies', () => {
    TestBed.inject(ActivacionDocenteApi)
      .activar(TOKEN_ACTIVACION, 'contraseña-de-prueba')
      .subscribe();
    const req = http.expectOne({ method: 'POST', url: `${B}/v1/personal/activar` });
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.withCredentials).toBeFalse();
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('ni siquiera una solicitud marcada por error lleva Bearer a rutas públicas o por cookie', () => {
    const cliente = TestBed.inject(HttpClient);
    const urls = [
      `${B}/v1/personal/activar`,
      `${B}/v1/acceso-estudiante/validar`,
      `${B}/v1/estudiantes/intentos/${U}/calificacion`,
    ];
    for (const url of urls) cliente.post(url, {}, { context: contextoAcademico() }).subscribe();
    for (const url of urls) {
      const req = http.expectOne(url);
      expect(req.request.headers.has('Authorization')).withContext(url).toBeFalse();
      req.flush({});
    }
  });

  it('DD-02: el acceso estudiantil no lleva Bearer (validar usa cookie)', () => {
    const api = TestBed.inject(AccesoEstudianteApi);
    api.solicitar('e@example.invalid').subscribe();
    const solicitar = http.expectOne(`${B}/v1/acceso-estudiante/solicitar`);
    expect(solicitar.request.headers.has('Authorization')).toBeFalse();
    solicitar.flush(null, { status: 501, statusText: 'x' });
    api.validar(U, '12345678').subscribe();
    const validar = http.expectOne(`${B}/v1/acceso-estudiante/validar`);
    expect(validar.request.headers.has('Authorization')).toBeFalse();
    expect(validar.request.withCredentials).toBeTrue();
    validar.flush(null, { status: 501, statusText: 'x' });
  });

  it('/me conserva su Bearer exclusivo del interceptor M1', () => {
    const cliente = TestBed.inject(HttpClient);
    cliente.get(`${B}/v1/personal/me`, { context: contextoAcademico() }).subscribe();
    // Marcada solo como académica, `/me` no está en la lista académica: sin Bearer por esta vía.
    const req = http.expectOne(`${B}/v1/personal/me`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});
