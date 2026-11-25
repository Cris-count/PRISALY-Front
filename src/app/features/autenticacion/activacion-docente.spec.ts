import {
  HttpErrorResponse,
  HttpHeaders,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { personalAcademicoInterceptor } from '../academico/academico-http';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { CredencialPersonalMemoria } from './m1-personal-memoria';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideApiConfig } from '../../core/config/api.config';
import { provideCapacidadesDc99 } from '../academico/capacidades-dc99';
import {
  ActivacionDocente,
  ActivacionDocenteApi,
  clasificarErrorActivacion,
  mensajeActivacion,
  problemaContrasenaLocal,
  ResultadoActivacion,
  tokenDesdeFragmento,
} from './activacion-docente';

/**
 * FE-61 Fase 3 · D-05. Respuestas = DOBLES HTTP con la forma de `ActivacionDocenteController` y su
 * `ExceptionHandler` (Backend DC-99 32922bb). D-05 no está activada ni V020 aplicada en ningún QA:
 * estas pruebas no acreditan la activación real ni el envío de correos (M7/SMTP).
 */
const B = '/api-prueba';
// Dobles de prueba con el formato del Backend (43 caracteres Base64url); no son tokens reales.
const TOKEN = 'Ab3_-'.repeat(8) + 'xyz';
const OTRO_TOKEN = 'Z'.repeat(43);
// Contraseña ficticia exclusiva de pruebas unitarias; no corresponde a ninguna cuenta.
const CLAVE = 'clave-de-prueba-larga-2026';

const error = (status: number, cuerpo: unknown, headers?: HttpHeaders) =>
  new HttpErrorResponse({ status, error: cuerpo, headers });

describe('FE-61 D-05 clasificación del contrato', () => {
  it('mapea cada respuesta documentada', () => {
    expect(clasificarErrorActivacion(error(400, { code: 'ACTIVATION_INVALID' }))).toEqual({
      tipo: 'codigo-invalido',
    });
    expect(clasificarErrorActivacion(error(400, { code: 'VALIDATION_ERROR' }))).toEqual({
      tipo: 'datos-invalidos',
    });
    expect(clasificarErrorActivacion(error(409, { code: 'ACTIVATION_CONFLICT' }))).toEqual({
      tipo: 'conflicto',
    });
    expect(clasificarErrorActivacion(error(422, { code: 'PASSWORD_COMMON' }))).toEqual({
      tipo: 'contrasena-rechazada',
      codigo: 'PASSWORD_COMMON',
    });
    expect(clasificarErrorActivacion(error(422, { code: 'OTRO' }))).toEqual({
      tipo: 'contrasena-rechazada',
      codigo: null,
    });
    expect(
      clasificarErrorActivacion(
        error(429, { code: 'ACTIVATION_RATE_LIMITED' }, new HttpHeaders({ 'Retry-After': '120' })),
      ),
    ).toEqual({ tipo: 'demasiados-intentos', reintentarEnSegundos: 120 });
    expect(clasificarErrorActivacion(error(429, null))).toEqual({
      tipo: 'demasiados-intentos',
      reintentarEnSegundos: null,
    });
    // Interruptor apagado: la cadena de seguridad responde 401 (ruta no pública) o 404.
    expect(clasificarErrorActivacion(error(401, { code: 'UNAUTHENTICATED' }))).toEqual({
      tipo: 'no-habilitada',
    });
    expect(clasificarErrorActivacion(error(404, null))).toEqual({ tipo: 'no-habilitada' });
    expect(clasificarErrorActivacion(error(0, null))).toEqual({ tipo: 'no-disponible' });
    expect(clasificarErrorActivacion(error(500, null))).toEqual({ tipo: 'no-disponible' });
  });

  it('los mensajes no incluyen el token ni el texto del servidor', () => {
    const tipos: ResultadoActivacion[] = [
      { tipo: 'codigo-invalido' },
      { tipo: 'contrasena-rechazada', codigo: 'PASSWORD_CONTAINS_EMAIL' },
      { tipo: 'demasiados-intentos', reintentarEnSegundos: 30 },
      { tipo: 'no-habilitada' },
    ];
    for (const t of tipos) expect(mensajeActivacion(t)).not.toContain(TOKEN);
    expect(mensajeActivacion({ tipo: 'demasiados-intentos', reintentarEnSegundos: 30 })).toContain(
      '30',
    );
  });

  it('lee el token del fragmento solo con el formato del Backend', () => {
    expect(tokenDesdeFragmento(`token=${TOKEN}`)).toBe(TOKEN);
    expect(tokenDesdeFragmento('token=corto')).toBeNull();
    expect(tokenDesdeFragmento('')).toBeNull();
    expect(tokenDesdeFragmento(null)).toBeNull();
  });

  it('refleja localmente DM1-08 (12 caracteres, 72 bytes UTF-8)', () => {
    expect(problemaContrasenaLocal('corta')).toBe('PASSWORD_TOO_SHORT');
    expect(problemaContrasenaLocal('ñ'.repeat(12))).toBeNull();
    expect(problemaContrasenaLocal('ñ'.repeat(37))).toBe('PASSWORD_TOO_LONG');
    expect(problemaContrasenaLocal(CLAVE)).toBeNull();
  });
});

describe('FE-61 D-05 ActivacionDocenteApi (doble HTTP)', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envía exactamente {token, password} y solo un 204 cuenta como activada', () => {
    const resultados: ResultadoActivacion[] = [];
    const api = TestBed.inject(ActivacionDocenteApi);
    api.activar(TOKEN, CLAVE).subscribe((r) => resultados.push(r));
    const req = http.expectOne({ method: 'POST', url: `${B}/v1/personal/activar` });
    expect(req.request.body).toEqual({ token: TOKEN, password: CLAVE });
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush(null, { status: 204, statusText: 'No Content' });
    api.activar(TOKEN, CLAVE).subscribe((r) => resultados.push(r));
    http.expectOne(`${B}/v1/personal/activar`).flush(null, { status: 200, statusText: 'OK' });
    expect(resultados).toEqual([{ tipo: 'activada' }, { tipo: 'no-disponible' }]);
  });

  it('declara credentials: omit y withCredentials: false (sin cookies de sesión)', () => {
    TestBed.inject(ActivacionDocenteApi).activar(TOKEN, CLAVE).subscribe();
    const req = http.expectOne(`${B}/v1/personal/activar`);
    expect(req.request.credentials).toBe('omit');
    expect(req.request.withCredentials).toBeFalse();
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});

describe('FE-61 D-05 activación pública con el backend Fetch real (fetch simulado)', () => {
  // Sin HttpTestingController: la petición atraviesa los interceptores de QA y `FetchBackend` de
  // Angular, y se inspecciona el `RequestInit` entregado a `fetch` (respuesta 204 simulada).
  it('fetch recibe credentials: omit y ninguna cabecera Authorization, aun con sesión de personal', async () => {
    const llamada = spyOn(globalThis, 'fetch').and.callFake(() =>
      Promise.resolve(new Response(null, { status: 204, statusText: 'No Content' })),
    );
    TestBed.configureTestingModule({
      providers: [
        provideApiConfig(B),
        provideM1PersonalLocal(),
        provideHttpClient(
          withFetch(),
          withInterceptors([personalM1Interceptor, personalAcademicoInterceptor]),
        ),
      ],
    });
    // Doble de prueba; no es una credencial real.
    TestBed.inject(CredencialPersonalMemoria).guardar('token-de-prueba-no-real');
    const resultado = await firstValueFrom(
      TestBed.inject(ActivacionDocenteApi).activar(TOKEN, CLAVE),
    );
    expect(resultado).toEqual({ tipo: 'activada' });
    expect(llamada).toHaveBeenCalledTimes(1);
    const [destino, init] = llamada.calls.mostRecent().args as [string, RequestInit];
    expect(destino).toBe(`${B}/v1/personal/activar`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(new Headers(init.headers).has('Authorization')).toBeFalse();
  });
});

describe('FE-61 D-05 pantalla pública ActivacionDocente', () => {
  let http: HttpTestingController;
  let location: jasmine.SpyObj<Location>;

  function montar(
    habilitada: boolean,
    fragmento: string | null,
  ): ComponentFixture<ActivacionDocente> {
    location = jasmine.createSpyObj<Location>('Location', ['path', 'replaceState']);
    location.path.and.returnValue('/activacion-docente');
    TestBed.configureTestingModule({
      imports: [ActivacionDocente],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        provideCapacidadesDc99({ activacionDocente: habilitada }),
        { provide: Location, useValue: location },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment: fragmento } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(ActivacionDocente);
    f.detectChanges();
    return f;
  }
  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const campo = (f: ComponentFixture<unknown>, id: string) =>
    raiz(f).querySelector(`#${id}`) as HTMLInputElement;
  function escribir(f: ComponentFixture<unknown>, id: string, valor: string) {
    const el = campo(f, id);
    el.value = valor;
    el.dispatchEvent(new Event('input'));
  }
  function completar(f: ComponentFixture<unknown>, clave = CLAVE, confirmacion = clave) {
    escribir(f, 'contrasena-activacion', clave);
    escribir(f, 'confirmacion-activacion', confirmacion);
    raiz(f).querySelector('form')!.dispatchEvent(new Event('submit'));
    f.detectChanges();
  }

  afterEach(() => http.verify());

  it('deshabilitada: no muestra formulario ni envía, pero retira el token de la URL', () => {
    const f = montar(false, `token=${TOKEN}`);
    expect(raiz(f).querySelector('[data-prueba="activacion-no-habilitada"]')).not.toBeNull();
    expect(raiz(f).querySelector('form')).toBeNull();
    expect(location.replaceState).toHaveBeenCalledWith('/activacion-docente');
    expect(raiz(f).innerHTML).not.toContain(TOKEN);
    http.expectNone(() => true);
  });

  it('toma el token del enlace, lo retira de la URL y no lo registra ni lo persiste', () => {
    const consola = ['log', 'info', 'warn', 'error', 'debug'].map((m) =>
      spyOn(console, m as 'log'),
    );
    const guardado = spyOn(Storage.prototype, 'setItem');
    const f = montar(true, `token=${TOKEN}`);
    expect(location.replaceState).toHaveBeenCalledWith('/activacion-docente');
    expect(raiz(f).querySelector('[data-prueba="codigo-enlace"]')).not.toBeNull();
    expect(campo(f, 'token-activacion').type).toBe('password');
    completar(f);
    const req = http.expectOne({ method: 'POST', url: `${B}/v1/personal/activar` });
    expect(req.request.body).toEqual({ token: TOKEN, password: CLAVE });
    req.flush(null, { status: 204, statusText: 'No Content' });
    f.detectChanges();
    expect(raiz(f).querySelector('[data-prueba="activacion-confirmada"]')).not.toBeNull();
    expect(raiz(f).querySelector('form')).toBeNull();
    for (const s of consola) expect(s).not.toHaveBeenCalled();
    expect(guardado).not.toHaveBeenCalled();
  });

  it('sin fragmento no toca la URL y permite pegar el código', () => {
    const f = montar(true, null);
    expect(location.replaceState).not.toHaveBeenCalled();
    escribir(f, 'token-activacion', OTRO_TOKEN);
    completar(f);
    const req = http.expectOne(`${B}/v1/personal/activar`);
    expect(req.request.body.token).toBe(OTRO_TOKEN);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('validaciones locales: formato de código, longitud y confirmación sin llamar al servidor', () => {
    const f = montar(true, null);
    escribir(f, 'token-activacion', 'corto');
    completar(f);
    expect(raiz(f).textContent).toContain('formato esperado');
    escribir(f, 'token-activacion', OTRO_TOKEN);
    completar(f, 'corta');
    expect(raiz(f).textContent).toContain('al menos 12 caracteres');
    completar(f, CLAVE, CLAVE + 'x');
    expect(raiz(f).textContent).toContain('no coinciden');
    http.expectNone(() => true);
  });

  it('422: conserva el código, borra las contraseñas y explica la política', () => {
    const f = montar(true, `token=${TOKEN}`);
    completar(f);
    http
      .expectOne(`${B}/v1/personal/activar`)
      .flush({ code: 'PASSWORD_COMMON', message: 'x' }, { status: 422, statusText: 'x' });
    f.detectChanges();
    expect(raiz(f).querySelector('[data-prueba="error-activacion"]')?.textContent).toContain(
      'demasiado común',
    );
    expect(campo(f, 'token-activacion').value).toBe(TOKEN);
    expect(campo(f, 'contrasena-activacion').value).toBe('');
  });

  it('400 ACTIVATION_INVALID: descarta el código y pide nueva invitación', () => {
    const f = montar(true, `token=${TOKEN}`);
    completar(f);
    http
      .expectOne(`${B}/v1/personal/activar`)
      .flush({ code: 'ACTIVATION_INVALID', message: 'x' }, { status: 400, statusText: 'x' });
    f.detectChanges();
    expect(raiz(f).textContent).toContain('nueva invitación');
    expect(campo(f, 'token-activacion').value).toBe('');
  });

  it('409 y 429 muestran su estado de error sin presentar éxito', () => {
    const f = montar(true, `token=${TOKEN}`);
    completar(f);
    http
      .expectOne(`${B}/v1/personal/activar`)
      .flush({ code: 'ACTIVATION_CONFLICT' }, { status: 409, statusText: 'x' });
    f.detectChanges();
    expect(raiz(f).textContent).toContain('Vuelve a intentarlo');
    completar(f);
    http
      .expectOne(`${B}/v1/personal/activar`)
      .flush(
        { code: 'ACTIVATION_RATE_LIMITED' },
        { status: 429, statusText: 'x', headers: { 'Retry-After': '60' } },
      );
    f.detectChanges();
    expect(raiz(f).textContent).toContain('Espera 60 segundos');
    expect(raiz(f).querySelector('[data-prueba="activacion-confirmada"]')).toBeNull();
  });

  it('estado de carga: deshabilita el envío mientras espera al servidor', () => {
    const f = montar(true, `token=${TOKEN}`);
    completar(f);
    const boton = raiz(f).querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(boton.disabled).toBeTrue();
    expect(boton.textContent).toContain('Activando');
    http.expectOne(`${B}/v1/personal/activar`).flush({}, { status: 401, statusText: 'x' });
    f.detectChanges();
    expect(raiz(f).textContent).toContain('no está habilitada en el servidor');
  });
});
