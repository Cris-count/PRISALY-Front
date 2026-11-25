import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import {
  personalM1Interceptor,
  provideM1PersonalLocal,
  SOLICITUD_PERSONAL_M1,
} from './m1-personal-http';
import { CredencialPersonalMemoria } from './m1-personal-memoria';

describe('Interceptor personal M1 preparado, sin registro global', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;
  let memoria: CredencialPersonalMemoria;
  function preparar(habilitar = true, base = '/api-prueba'): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
        provideApiConfig(base),
        ...(habilitar ? [provideM1PersonalLocal()] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
    memoria = TestBed.inject(CredencialPersonalMemoria);
    memoria.guardar('token-exclusivo-de-prueba');
  }
  afterEach(() => http.verify());
  const contexto = () => new HttpContext().set(SOLICITUD_PERSONAL_M1, true);

  for (const [metodo, ruta] of [
    ['GET', '/api-prueba/v1/personal/me'],
    ['POST', '/api-prueba/v1/personal/cerrar-sesion'],
  ]) {
    it(`adjunta Bearer únicamente con opt-in, contexto y contrato ${metodo}`, () => {
      preparar();
      cliente.request(metodo, ruta, { context: contexto() }).subscribe();
      const peticion = http.expectOne(ruta);
      expect(peticion.request.headers.get('Authorization')).toBe(
        'Bearer token-exclusivo-de-prueba',
      );
      expect(peticion.request.withCredentials).toBeFalse();
      peticion.flush(null);
    });
  }

  for (const [metodo, ruta] of [
    ['POST', '/api-prueba/v1/personal/autenticar'],
    ['GET', '/images/prisaly-logo.png'],
    ['POST', '/api-prueba/v1/acceso-estudiante/validar'],
    ['GET', '/api-prueba/v1/estudiantes/intentos/prueba'],
    ['GET', 'https://otro.example.invalid/api-prueba/v1/personal/me'],
    ['GET', '/api-prueba/v1/personal/me-extra'],
    ['GET', '/api-prueba/v1/personal/me?destino=otro'],
    ['POST', '/api-prueba/v1/personal/me'],
    ['GET', '/api-prueba/v1/personal/cerrar-sesion'],
    ['GET', '/otro-api/v1/personal/me'],
    ['GET', '/api-prueba/v1/personal/%6de'],
  ]) {
    it(`no filtra credenciales a solicitudes fuera de alcance: ${metodo} ${ruta}`, () => {
      preparar();
      cliente.request(metodo, ruta, { context: contexto() }).subscribe();
      const peticion = http.expectOne(ruta);
      expect(peticion.request.headers.has('Authorization')).toBeFalse();
      peticion.flush(null);
    });
  }

  it('permanece inactivo por defecto incluso con token y contexto', () => {
    preparar(false);
    cliente.get('/api-prueba/v1/personal/me', { context: contexto() }).subscribe();
    const peticion = http.expectOne('/api-prueba/v1/personal/me');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush(null);
  });
  it('exige contexto explícito y no modifica llamadas ajenas al flujo M1', () => {
    preparar();
    cliente.get('/api-prueba/v1/personal/me').subscribe();
    const peticion = http.expectOne('/api-prueba/v1/personal/me');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush(null);
  });
  it('usa exactamente la base absoluta configurada y no un servidor parecido', () => {
    preparar(true, 'https://backend.example.invalid/api');
    cliente
      .get('https://backend.example.invalid/api/v1/personal/me', { context: contexto() })
      .subscribe();
    const peticion = http.expectOne('https://backend.example.invalid/api/v1/personal/me');
    expect(peticion.request.headers.has('Authorization')).toBeTrue();
    peticion.flush(null);
  });
  it('limpia la credencial ante 401 del canal personal', () => {
    preparar();
    cliente
      .get('/api-prueba/v1/personal/me', { context: contexto() })
      .subscribe({ error: () => {} });
    http
      .expectOne('/api-prueba/v1/personal/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(memoria.leerParaHttp()).toBeNull();
  });
  it('un 401 externo no invalida una sesión de personal', () => {
    preparar();
    cliente.get('/recurso-ajeno', { context: contexto() }).subscribe({ error: () => {} });
    http.expectOne('/recurso-ajeno').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(memoria.leerParaHttp()).toBe('token-exclusivo-de-prueba');
  });
});
