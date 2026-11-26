import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { provideM1PersonalLocal } from '../autenticacion/m1-personal-http';
import { CredencialPersonalMemoria } from '../autenticacion/m1-personal-memoria';
import {
  aFalloAcademico,
  contextoAcademico,
  esRutaAcademicaAutorizada,
  mensajeFallo,
  personalAcademicoInterceptor,
  rutaRelativaApi,
} from './academico-http';
import { HttpErrorResponse } from '@angular/common/http';

const ID = '11111111-1111-4111-8111-111111111111';
// Doble de prueba; no es una credencial real.
const TOKEN = 'token-de-prueba-no-real';

describe('Académico: transporte de credencial acotado', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;

  function preparar(habilitar = true): void {
    TestBed.configureTestingModule({
      providers: [
        provideApiConfig('/api-prueba'),
        ...(habilitar ? [provideM1PersonalLocal()] : []),
        provideHttpClient(withInterceptors([personalAcademicoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
    TestBed.inject(CredencialPersonalMemoria).guardar(TOKEN);
  }

  // Algunos casos no crean TestBed: se reinicia para no verificar un controlador anterior.
  beforeEach(() => (http = undefined as unknown as HttpTestingController));
  afterEach(() => http?.verify());

  it('acepta solo las plantillas publicadas por método', () => {
    expect(esRutaAcademicaAutorizada('GET', 'v1/admin/roles')).toBeTrue();
    expect(esRutaAcademicaAutorizada('PUT', `v1/admin/usuarios/${ID}/permisos/3`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('PUT', `v1/casos/${ID}/rubrica`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('PATCH', `m4/sesiones/${ID}/estado`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('DELETE', 'v1/admin/roles')).toBeFalse();
    expect(esRutaAcademicaAutorizada('GET', `v1/estudiantes/intentos/${ID}`)).toBeFalse();
    expect(esRutaAcademicaAutorizada('POST', `v1/casos/${ID}/archivar`)).toBeFalse();
    expect(esRutaAcademicaAutorizada('GET', 'v1/casos/no-uuid')).toBeFalse();
  });

  it('CB-05A: transporta la credencial al borrador de la narrativa, pero no a su publicación', () => {
    expect(esRutaAcademicaAutorizada('GET', `v1/casos/${ID}/narrativa`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('PUT', `v1/casos/${ID}/narrativa`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('POST', `v1/casos/${ID}/narrativa/publicar`)).toBeFalse();
    expect(esRutaAcademicaAutorizada('DELETE', `v1/casos/${ID}/narrativa`)).toBeFalse();
    expect(esRutaAcademicaAutorizada('GET', 'v1/casos/no-uuid/narrativa')).toBeFalse();
  });

  it('calcula la ruta relativa solo dentro de la base configurada', () => {
    expect(rutaRelativaApi('/api', '/api/v1/casos?x=1')).toBe('v1/casos');
    expect(rutaRelativaApi('/api', 'https://otro.example/api/v1/casos')).toBeNull();
    expect(rutaRelativaApi('/api', '/api/../v1/casos')).toBeNull();
  });

  it('añade Bearer a una ruta académica marcada y autorizada', () => {
    preparar();
    cliente.get('/api-prueba/v1/admin/roles', { context: contextoAcademico() }).subscribe();
    const req = http.expectOne('/api-prueba/v1/admin/roles');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(req.request.withCredentials).toBeFalse();
    req.flush({ items: [] });
  });

  it('no añade Bearer sin contexto, fuera de la lista o sin opt-in QA', () => {
    preparar();
    cliente.get('/api-prueba/v1/admin/roles').subscribe();
    expect(
      http.expectOne('/api-prueba/v1/admin/roles').request.headers.has('Authorization'),
    ).toBeFalse();
    cliente
      .get(`/api-prueba/v1/estudiantes/intentos/${ID}`, { context: contextoAcademico() })
      .subscribe();
    expect(
      http
        .expectOne(`/api-prueba/v1/estudiantes/intentos/${ID}`)
        .request.headers.has('Authorization'),
    ).toBeFalse();
    cliente
      .get('https://otro.example/v1/admin/roles', { context: contextoAcademico() })
      .subscribe();
    expect(
      http.expectOne('https://otro.example/v1/admin/roles').request.headers.has('Authorization'),
    ).toBeFalse();
  });

  it('sin opt-in QA no transmite la credencial', () => {
    preparar(false);
    cliente.get('/api-prueba/v1/admin/roles', { context: contextoAcademico() }).subscribe();
    expect(
      http.expectOne('/api-prueba/v1/admin/roles').request.headers.has('Authorization'),
    ).toBeFalse();
  });

  it('un 401 limpia la credencial en memoria', () => {
    preparar();
    const memoria = TestBed.inject(CredencialPersonalMemoria);
    cliente
      .get('/api-prueba/v1/admin/roles', { context: contextoAcademico() })
      .subscribe({ error: () => undefined });
    http
      .expectOne('/api-prueba/v1/admin/roles')
      .flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'x' });
    expect(memoria.leerParaHttp()).toBeNull();
  });

  it('clasifica el fallo conservando estado y código, sin el mensaje del servidor', () => {
    const f = aFalloAcademico(
      new HttpErrorResponse({ status: 412, error: { code: 'STALE_CASE', message: 'interno' } }),
    );
    expect(f.estado).toBe(412);
    expect(f.codigo).toBe('STALE_CASE');
    expect(mensajeFallo(f)).toContain('modificó el caso');
    expect(mensajeFallo(f)).not.toContain('interno');
    expect(mensajeFallo(aFalloAcademico(new HttpErrorResponse({ status: 405 })))).toContain(
      'no está publicada',
    );
    expect(mensajeFallo(aFalloAcademico(new HttpErrorResponse({ status: 501 })))).toContain(
      'pendiente de autorización',
    );
    expect(
      aFalloAcademico(new HttpErrorResponse({ status: 400, error: { code: 'bad code!' } })).codigo,
    ).toBeNull();
  });
});
