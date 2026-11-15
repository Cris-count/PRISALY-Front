import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { provideApiConfig } from '../../core/config/api.config';
import {
  FalloAutenticacionPersonal,
  M1PersonalApi,
  provideM1PersonalLocal,
} from './m1-personal-api';
import { personalM1Interceptor } from './m1-personal-http';
import { CredencialPersonalMemoria } from './m1-personal-memoria';
import { PersonalAutenticarResponse, PersonalMeResponse } from './m1-personal.models';
import { SesionPersonalM1 } from './m1-personal-sesion';

describe('Ciclo M1 aislado con Backend simulado', () => {
  let http: HttpTestingController;
  let sesion: SesionPersonalM1;
  let memoria: CredencialPersonalMemoria;
  let api: M1PersonalApi;
  const raiz = '/api-prueba/v1/personal';
  const datos = { correo: 'personal@example.invalid', password: 'solo-prueba' };
  const autenticacion: PersonalAutenticarResponse = {
    accessToken: 'credencial-ficticia-solo-en-pruebas',
    tokenType: 'Bearer',
    userId: '11111111-1111-4111-8111-111111111111',
    correo: datos.correo,
    nombre: 'Personal de prueba',
    rol: 'ADMINISTRADOR',
    permisos: ['CREAR_CASO'],
    authPrototype: 'TD-M1-AUTH-PROVISIONAL',
  };
  const identidad: PersonalMeResponse = { ...autenticacion, accessToken: null };

  function preparar(habilitar = true): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
        provideApiConfig('/api-prueba'),
        ...(habilitar ? [provideM1PersonalLocal()] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(SesionPersonalM1);
    memoria = TestBed.inject(CredencialPersonalMemoria);
    api = TestBed.inject(M1PersonalApi);
  }
  function iniciar(): void {
    sesion.autenticar(datos).subscribe();
    const login = http.expectOne(`${raiz}/autenticar`);
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual(datos);
    expect(login.request.headers.has('Authorization')).toBeFalse();
    login.flush(autenticacion);
  }
  function validar(respuesta = identidad): void {
    iniciar();
    http.expectOne(`${raiz}/me`).flush(respuesta);
    expect(sesion.estado().tipo).toBe('valida');
  }
  afterEach(() => http.verify());

  it('no restaura, autentica ni consulta al construirse', () => {
    preparar();
    expect(sesion.estado().tipo).toBe('no-autenticada');
    expect(memoria.leerParaHttp()).toBeNull();
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
    http.expectNone(() => true);
  });
  it('respeta Retry-After antes de otra autenticación sin reintentar automáticamente', () => {
    preparar();
    let ahora = 10000;
    spyOn(Date, 'now').and.callFake(() => ahora);
    api.autenticar(datos).subscribe({ error: () => {} });
    http
      .expectOne(`${raiz}/autenticar`)
      .flush(
        {},
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '60' } },
      );
    ahora += 1000;
    let error: FalloAutenticacionPersonal | undefined;
    api.autenticar(datos).subscribe({ error: (e) => (error = e) });
    expect(error?.reintentarEnSegundos).toBe(59);
    http.expectNone(() => true);
    ahora += 59000;
    http.expectNone(() => true);
    api.autenticar(datos).subscribe();
    http.expectOne(`${raiz}/autenticar`).flush(autenticacion);
    http.expectNone(() => true);
  });
  it('mantiene los tres métodos deshabilitados por defecto incluso con credencial en memoria', () => {
    preparar(false);
    memoria.guardar(autenticacion.accessToken);
    for (const flujo of [
      api.autenticar(datos),
      api.consultarIdentidad(),
      api.cerrarSesion(),
    ] as Observable<unknown>[]) {
      let error: FalloAutenticacionPersonal | undefined;
      flujo.subscribe({ next: () => fail('No debe emitir éxito'), error: (e) => (error = e) });
      expect(error?.tipo).toBe('integracion-no-habilitada');
    }
    http.expectNone(() => true);
  });
  it('exige credencial para me y cierre sin fabricar solicitudes ni éxitos', () => {
    preparar();
    for (const flujo of [api.consultarIdentidad(), api.cerrarSesion()] as Observable<unknown>[]) {
      let error: FalloAutenticacionPersonal | undefined;
      flujo.subscribe({ next: () => fail('No debe emitir éxito'), error: (e) => (error = e) });
      expect(error?.tipo).toBe('sesion-no-valida');
    }
    http.expectNone(() => true);
  });
  it('solo declara sesión válida tras GET me, con Bearer, token nulo y permisos actuales', () => {
    preparar();
    const flujo = sesion.autenticar(datos);
    http.expectNone(() => true);
    flujo.subscribe();
    expect(sesion.estado().tipo).toBe('autenticando');
    http.expectOne(`${raiz}/autenticar`).flush(autenticacion);
    expect(sesion.estado().tipo).toBe('identidad-pendiente');
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
    const me = http.expectOne(`${raiz}/me`);
    expect(me.request.method).toBe('GET');
    expect(me.request.body).toBeNull();
    expect(me.request.headers.get('Authorization')).toBe(`Bearer ${autenticacion.accessToken}`);
    expect(me.request.withCredentials).toBeFalse();
    me.flush({ ...identidad, permisos: [] });
    const estado = sesion.estado();
    expect(estado.tipo).toBe('valida');
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse(); // Rol ADMINISTRADOR no concede permisos.
    if (estado.tipo === 'valida') {
      expect(estado.identidad.permisos).toEqual([]);
      expect(Object.isFrozen(estado.identidad.permisos)).toBeTrue();
    }
    expect(JSON.stringify(estado)).not.toContain(autenticacion.accessToken);
    expect(memoria.leerParaHttp()).toBe(autenticacion.accessToken); // me no rota el token.
  });
  it('rechaza que me corresponda a una identidad distinta de la autenticada', () => {
    preparar();
    iniciar();
    http
      .expectOne(`${raiz}/me`)
      .flush({ ...identidad, userId: '22222222-2222-4222-8222-222222222222' });
    expect(sesion.estado().tipo).toBe('error-servicio');
    expect(memoria.leerParaHttp()).toBeNull();
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
  });
  for (const respuesta of [
    null,
    {},
    { ...identidad, accessToken: 'token-nuevo-no-autorizado' },
    { ...identidad, permisos: ['CREAR_CASO', 3] },
  ]) {
    it('no confirma una identidad con DTO incompleto o renovación no contratada', () => {
      preparar();
      iniciar();
      http.expectOne(`${raiz}/me`).flush(respuesta);
      expect(sesion.estado().tipo).toBe('error-servicio');
      expect(memoria.leerParaHttp()).toBeNull();
    });
  }
  for (const [status, esperado] of [
    [400, 'no-autenticada'],
    [401, 'no-autenticada'],
    [403, 'acceso-denegado'],
    [429, 'error-servicio'],
    [500, 'error-servicio'],
  ] as const) {
    it(`maneja ${status} al autenticar sin sesión exitosa ni reintentos`, () => {
      preparar();
      sesion.autenticar(datos).subscribe();
      http.expectOne(`${raiz}/autenticar`).flush(
        { message: 'detalle-sensible' },
        {
          status,
          statusText: 'Fallo de prueba',
          headers: { 'Retry-After': '60' },
        },
      );
      const estado = sesion.estado();
      expect(estado.tipo).toBe(esperado);
      expect(JSON.stringify(estado)).not.toContain('detalle-sensible');
      if (estado.tipo !== 'valida')
        expect(estado.fallo?.reintentarEnSegundos).toBe(status === 429 ? 60 : undefined);
      expect(memoria.leerParaHttp()).toBeNull();
      http.expectNone(() => true);
    });
  }
  for (const [status, esperado] of [
    [401, 'expirada'],
    [403, 'acceso-denegado'],
    [503, 'error-servicio'],
  ] as const) {
    it(`retira identidad y permisos durante verificación fallida ${status}`, () => {
      preparar();
      validar();
      sesion.verificarSesion().subscribe();
      expect(sesion.estado().tipo).toBe('identidad-pendiente');
      http.expectOne(`${raiz}/me`).flush({}, { status, statusText: 'Fallo de prueba' });
      expect(sesion.estado().tipo).toBe(esperado);
      expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
      expect(JSON.stringify(sesion.estado())).not.toContain('Personal de prueba');
      if (status === 401) expect(memoria.leerParaHttp()).toBeNull();
    });
  }
  it('un 401 consumido directamente por API invalida también la identidad del servicio', () => {
    preparar();
    validar();
    api.consultarIdentidad().subscribe({ error: () => {} });
    http.expectOne(`${raiz}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(sesion.estado().tipo).toBe('expirada');
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
  });
  it('confirma cierre únicamente después de POST sin cuerpo y respuesta 204', () => {
    preparar();
    validar();
    sesion.cerrarSesion().subscribe();
    expect(sesion.estado().tipo).toBe('cerrando');
    const cierre = http.expectOne(`${raiz}/cerrar-sesion`);
    expect(cierre.request.method).toBe('POST');
    expect(cierre.request.body).toBeNull();
    expect(cierre.request.headers.get('Authorization')).toBe(`Bearer ${autenticacion.accessToken}`);
    cierre.flush(null, { status: 204, statusText: 'No Content' });
    expect(sesion.estado().tipo).toBe('cierre-confirmado');
    expect(sesion.estadoPanel().tipo).toBe('cierre-confirmado');
    expect(memoria.leerParaHttp()).toBeNull();
  });
  it('un cierre 503 no confirma revocación ni concede acceso; permite solo reintento explícito', () => {
    preparar();
    validar();
    sesion.cerrarSesion().subscribe();
    http.expectOne(`${raiz}/cerrar-sesion`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(sesion.estado().tipo).toBe('cierre-no-confirmado');
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
    http.expectNone(() => true);
    sesion.cerrarSesion().subscribe();
    http.expectOne(`${raiz}/cerrar-sesion`).flush(null, { status: 204, statusText: 'No Content' });
    expect(sesion.estado().tipo).toBe('cierre-confirmado');
  });
  it('no interpreta un 200 como confirmación del contrato de cierre', () => {
    preparar();
    validar();
    sesion.cerrarSesion().subscribe();
    http.expectOne(`${raiz}/cerrar-sesion`).flush({ exito: true });
    expect(sesion.estado().tipo).toBe('cierre-no-confirmado');
  });
  it('cancela la verificación al invalidar sin resucitar identidad ni afirmar revocación', () => {
    preparar();
    iniciar();
    const me = http.expectOne(`${raiz}/me`);
    sesion.invalidarSesion();
    expect(me.cancelled).toBeTrue();
    expect(sesion.estado().tipo).toBe('expirada');
    expect(memoria.leerParaHttp()).toBeNull();
    http.expectNone(() => true);
  });
  it('una credencial reemplazada durante me impide aceptar la respuesta anterior', () => {
    preparar();
    iniciar();
    const me = http.expectOne(`${raiz}/me`);
    memoria.guardar('otra-credencial-de-prueba');
    me.flush(identidad);
    expect(sesion.estado().tipo).toBe('expirada');
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
    expect(memoria.leerParaHttp()).toBe('otra-credencial-de-prueba');
  });
  for (const operacion of ['me', 'cerrar-sesion'] as const) {
    it(`un 401 tardío de ${operacion} no elimina una credencial posterior`, () => {
      preparar();
      validar();
      (operacion === 'me' ? sesion.verificarSesion() : sesion.cerrarSesion()).subscribe();
      const pendiente = http.expectOne(`${raiz}/${operacion}`);
      memoria.guardar('credencial-posterior-de-prueba');
      pendiente.flush({}, { status: 401, statusText: 'Unauthorized' });
      expect(memoria.leerParaHttp()).toBe('credencial-posterior-de-prueba');
      expect(sesion.estado().tipo).toBe('expirada');
      expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
    });
  }
  it('un cierre tardío no elimina una credencial nueva', () => {
    preparar();
    validar();
    sesion.cerrarSesion().subscribe();
    const cierre = http.expectOne(`${raiz}/cerrar-sesion`);
    memoria.guardar('otra-credencial-de-prueba');
    cierre.flush(null, { status: 204, statusText: 'No Content' });
    expect(sesion.estado().tipo).not.toBe('cierre-confirmado');
    expect(memoria.leerParaHttp()).toBe('otra-credencial-de-prueba');
  });
  it('desuscribir un cierre no confirma su resultado remoto', () => {
    preparar();
    validar();
    const suscripcion = sesion.cerrarSesion().subscribe();
    const cierre = http.expectOne(`${raiz}/cerrar-sesion`);
    suscripcion.unsubscribe();
    expect(cierre.cancelled).toBeTrue();
    expect(sesion.estado().tipo).toBe('cierre-no-confirmado');
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
  });
  it('no abre autenticaciones concurrentes ni guarda contraseñas o tokens en storage/cookies', () => {
    preparar();
    const guardar = spyOn(Storage.prototype, 'setItem');
    const cookie = spyOnProperty(Document.prototype, 'cookie', 'set');
    iniciar();
    let error: FalloAutenticacionPersonal | undefined;
    sesion.autenticar(datos).subscribe({ error: (e) => (error = e) });
    expect(error?.tipo).toBe('operacion-en-curso');
    http.expectOne(`${raiz}/me`).flush(identidad);
    expect(guardar).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
    expect(JSON.stringify(sesion.estado())).not.toMatch(/credencial-ficticia|solo-prueba/);
    expect(JSON.stringify(memoria)).not.toContain(autenticacion.accessToken);
    http.expectNone(() => true);
  });
  it('pierde la credencial al destruir el inyector y comienza sin sesión en el siguiente', () => {
    preparar();
    validar();
    const anterior = memoria;
    TestBed.resetTestingModule();
    expect(anterior.leerParaHttp()).toBeNull();
    preparar();
    expect(memoria.leerParaHttp()).toBeNull();
    expect(sesion.estado().tipo).toBe('no-autenticada');
    http.expectNone(() => true);
  });
  it('rechaza credenciales que no pueden transportarse como Bearer sin revelar su valor', () => {
    preparar();
    expect(() => memoria.guardar('token\r\ninyectado')).toThrowError(
      'Credencial de personal no válida.',
    );
    expect(memoria.leerParaHttp()).toBeNull();
  });
});
