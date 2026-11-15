import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import {
  FalloAutenticacionPersonal,
  M1PersonalApi,
  provideM1PersonalLocal,
} from './m1-personal-api';
import { PersonalAutenticarResponse } from './m1-personal.models';

describe('M1 personal: contrato HTTP local opt-in', () => {
  let http: HttpTestingController;
  const ruta = '/api-prueba/v1/personal/autenticar';
  // Dobles de prueba exclusivamente; no son cuentas ni credenciales reales.
  const solicitud = { correo: 'personal@example.invalid', password: 'clave-de-prueba' };
  const respuesta: PersonalAutenticarResponse = {
    accessToken: 'token-de-prueba-no-real',
    tokenType: 'Bearer',
    userId: '11111111-1111-4111-8111-111111111111',
    correo: solicitud.correo,
    nombre: 'Personal de prueba',
    rol: 'ROL_DE_PRUEBA',
    permisos: [],
    authPrototype: 'TD-M1-AUTH-PROVISIONAL',
  };

  function cliente(habilitar = true): M1PersonalApi {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig('/api-prueba/'),
        ...(habilitar ? [provideM1PersonalLocal()] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(M1PersonalApi);
  }

  afterEach(() => http.verify());

  it('permanece bloqueado por defecto y no realiza HTTP ni acredita una identidad', () => {
    let error: FalloAutenticacionPersonal | undefined;
    cliente(false)
      .autenticar(solicitud)
      .subscribe({ next: () => fail('No debe autenticar'), error: (e) => (error = e) });
    expect(error?.tipo).toBe('integracion-no-habilitada');
    http.expectNone(() => true);
  });

  it('envía POST a la base centralizada con el DTO exacto, sin cookie ni Bearer', () => {
    const api = cliente();
    const flujo = api.autenticar({
      ...solicitud,
      idEstudiante: 'no-transmitir',
    } as typeof solicitud);
    http.expectNone(() => true); // Observable frío: construirlo no envía credenciales.
    let recibido: PersonalAutenticarResponse | undefined;
    flujo.subscribe((r) => (recibido = r));
    const peticion = http.expectOne(ruta);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(solicitud);
    expect(peticion.request.withCredentials).toBeFalse();
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush(respuesta);
    expect(recibido).toEqual(respuesta);
    expect(recibido?.permisos).toEqual([]); // No asigna permisos por el nombre del rol.
  });

  it('no persiste credenciales ni tokens ni modifica la navegación tras la respuesta', () => {
    const guardar = spyOn(Storage.prototype, 'setItem');
    const cookie = spyOnProperty(Document.prototype, 'cookie', 'set');
    const direccion = window.location.href;
    cliente().autenticar(solicitud).subscribe();
    http.expectOne(ruta).flush(respuesta);
    expect(guardar).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
    expect(window.location.href).toBe(direccion);
  });

  it('rechaza credenciales vacías antes de enviar HTTP', () => {
    let error: FalloAutenticacionPersonal | undefined;
    cliente()
      .autenticar({ correo: '', password: '' })
      .subscribe({ error: (e) => (error = e) });
    expect(error?.tipo).toBe('datos-invalidos');
    http.expectNone(() => true);
  });

  for (const [estado, tipo] of [
    [400, 'datos-invalidos'],
    [401, 'credenciales'],
    [403, 'acceso-denegado'],
    [429, 'limite-intentos'],
    [500, 'servidor'],
    [503, 'servidor'],
  ] as const) {
    it(`maneja HTTP ${estado} sin revelar el cuerpo ni reintentar automáticamente`, () => {
      let error: FalloAutenticacionPersonal | undefined;
      cliente()
        .autenticar(solicitud)
        .subscribe({ next: () => fail('No debe autenticar'), error: (e) => (error = e) });
      http.expectOne(ruta).flush(
        { code: 'INTERNO', message: 'detalle-sensible', token: 'secreto' },
        {
          status: estado,
          statusText: 'Error de prueba',
          headers: { 'Retry-After': '60' },
        },
      );
      expect(error instanceof FalloAutenticacionPersonal).toBeTrue();
      expect(error?.tipo).toBe(tipo);
      expect(error?.reintentarEnSegundos).toBe(estado === 429 ? 60 : undefined);
      expect(JSON.stringify(error)).not.toMatch(/detalle-sensible|secreto|clave-de-prueba/);
      expect(error?.message).not.toContain('detalle-sensible');
      http.expectNone(() => true);
    });
  }

  for (const cabecera of [
    undefined,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    'Infinity',
    '9007199254740992',
    'Wed, 21 Oct 2015 07:28:00 GMT',
  ]) {
    it(`no inventa una espera cuando Retry-After no corresponde al contrato M1: ${cabecera}`, () => {
      let error: FalloAutenticacionPersonal | undefined;
      cliente()
        .autenticar(solicitud)
        .subscribe({ error: (e) => (error = e) });
      http.expectOne(ruta).flush(
        { code: 'AUTH_RATE_LIMITED', message: 'detalle-interno' },
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: cabecera === undefined ? {} : { 'Retry-After': cabecera },
        },
      );
      expect(error?.tipo).toBe('limite-intentos');
      expect(error?.reintentarEnSegundos).toBeUndefined();
      expect(error?.message).not.toContain('detalle-interno');
      http.expectNone(() => true);
    });
  }

  it('maneja desconexión sin confirmar autenticación', () => {
    let error: FalloAutenticacionPersonal | undefined;
    cliente()
      .autenticar(solicitud)
      .subscribe({ error: (e) => (error = e) });
    http.expectOne(ruta).error(new ProgressEvent('error'));
    expect(error?.tipo).toBe('sin-conexion');
  });

  for (const parcial of [
    null,
    {},
    { ...respuesta, accessToken: null },
    { ...respuesta, tokenType: 'Otro' },
    { ...respuesta, permisos: [7] },
    { ...respuesta, authPrototype: 'otro-proveedor' },
  ]) {
    it('rechaza una respuesta incompleta o ajena al contrato sin conservar su contenido', () => {
      let error: FalloAutenticacionPersonal | undefined;
      cliente()
        .autenticar(solicitud)
        .subscribe({ next: () => fail('Respuesta inválida'), error: (e) => (error = e) });
      http.expectOne(ruta).flush(parcial);
      expect(error?.tipo).toBe('respuesta-invalida');
      expect(error?.message).not.toContain(respuesta.accessToken);
    });
  }

  it('cancela una petición pendiente al abandonar el consumidor', () => {
    const suscripcion = cliente().autenticar(solicitud).subscribe();
    const peticion = http.expectOne(ruta);
    suscripcion.unsubscribe();
    expect(peticion.cancelled).toBeTrue();
  });
});
