import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { AccesoEstudianteApi, AccesoEstudianteReal } from './acceso-estudiante-real';
import { M1_PERSONAL_LOCAL } from './m1-personal-http';

/** DC-FE-60: contrato DD-02 B (solicitar/validar). Sin respuesta del servidor no hay sesión. */
@Component({ template: '' })
class LoginPrueba {}
// Solo la ruta bajo prueba (configuración real) y un login sin carga perezosa.
const RUTAS = [
  ...routes.filter((r) => r.path === 'estudiante/acceso'),
  { path: 'login', component: LoginPrueba },
];
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
function configurar(qa = true) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(RUTAS),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: M1_PERSONAL_LOCAL, useValue: qa },
    ],
  });
  return TestBed.inject(HttpTestingController);
}
const pendiente = {
  status: 501,
  statusText: 'Not Implemented',
};

describe('DC-FE-60 acceso estudiantil real (DD-02 B)', () => {
  it('solicitar envía solo el correo, sin credenciales, y entrega el challengeId', () => {
    const http = configurar();
    let r: unknown;
    TestBed.inject(AccesoEstudianteApi)
      .solicitar(' e@uni.edu ')
      .subscribe((x) => (r = x));
    const req = http.expectOne((q) => q.url.endsWith('v1/acceso-estudiante/solicitar'));
    expect(req.request.body).toEqual({ correo: 'e@uni.edu' });
    expect(req.request.withCredentials).toBeFalse();
    req.flush(
      { challengeId: ID, mensaje: 'Si el correo corresponde…' },
      { status: 202, statusText: 'Accepted' },
    );
    expect(r).toEqual({
      tipo: 'codigo-enviado',
      challengeId: ID,
      mensaje: 'Si el correo corresponde…',
    });
  });

  it('501 del servidor se muestra como DD-02 pendiente, sin sesión', () => {
    const http = configurar();
    const f = TestBed.createComponent(AccesoEstudianteReal);
    f.detectChanges();
    const raiz = f.nativeElement as HTMLElement;
    const i = raiz.querySelector<HTMLInputElement>('#correo-acceso')!;
    i.value = 'e@uni.edu';
    i.dispatchEvent(new Event('input'));
    raiz.querySelector('form')!.dispatchEvent(new Event('submit'));
    http
      .expectOne((q) => q.url.endsWith('solicitar'))
      .flush({ code: 'ESTUDIANTE_ACCESS_PENDING_CONTRACT' }, pendiente);
    f.detectChanges();
    expect(raiz.querySelector('[data-prueba="error-acceso"]')?.textContent).toContain('DD-02');
    expect(raiz.querySelector('[data-prueba="cuenta-activada"]')).toBeNull();
  });

  it('código: 204 abre sesión; 401 incorrecto/caducado; 429 intentos agotados; 400 formato', () => {
    const http = configurar();
    const api = TestBed.inject(AccesoEstudianteApi);
    const casos: [number, string][] = [
      [204, 'sesion-abierta'],
      [401, 'denegado'],
      [429, 'demasiados-intentos'],
      [400, 'datos-invalidos'],
    ];
    for (const [status, tipo] of casos) {
      let r: { tipo: string } | undefined;
      api.validar(ID, '12345678').subscribe((x) => (r = x));
      const req = http.expectOne((q) => q.url.endsWith('v1/acceso-estudiante/validar'));
      expect(req.request.body).toEqual({ challengeId: ID, codigo: '12345678' });
      // La cookie de sesión estudiantil exige credenciales en la validación.
      expect(req.request.withCredentials).toBeTrue();
      if (status === 204) req.flush(null, { status: 204, statusText: 'No Content' });
      else req.flush({ code: 'X' }, { status, statusText: 'E' });
      expect(r?.tipo).withContext(String(status)).toBe(tipo);
    }
  });

  it('FE-UX-03: un 429 al SOLICITAR es la espera de reenvío (con Retry-After), no intentos agotados', () => {
    const http = configurar();
    const api = TestBed.inject(AccesoEstudianteApi);
    const casos: [Record<string, string>, unknown][] = [
      [{ 'Retry-After': '60' }, { tipo: 'espera-reenvio', segundos: 60 }],
      [{}, { tipo: 'espera-reenvio', segundos: null }],
      [{ 'Retry-After': 'mañana' }, { tipo: 'espera-reenvio', segundos: null }],
    ];
    for (const [headers, esperado] of casos) {
      let r: unknown;
      api.solicitar('estudiante@example.invalid').subscribe((x) => (r = x));
      http
        .expectOne((q) => q.url.endsWith('v1/acceso-estudiante/solicitar'))
        .flush({ code: 'AUTH_RATE_LIMITED' }, { status: 429, statusText: 'Too Many Requests', headers });
      expect(r).withContext(JSON.stringify(headers)).toEqual(esperado);
    }
  });

  it('la ruta no existe fuera de los builds QA', async () => {
    configurar(false);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/estudiante/acceso');
    expect(router.url).toBe('/login');
  });
});
