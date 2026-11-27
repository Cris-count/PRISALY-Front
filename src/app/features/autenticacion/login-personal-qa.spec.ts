import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideApiConfig } from '../../core/config/api.config';
import { LoginPage } from './login-page';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { SesionPersonalM1 } from './m1-personal-sesion';

describe('Formulario personal QA con HTTP simulado, sin Backend real', () => {
  const respuesta = {
    accessToken: 'token-solo-prueba',
    tokenType: 'Bearer',
    userId: 'personal-prueba',
    correo: 'personal@example.invalid',
    nombre: 'Personal de prueba',
    rol: 'DOCENTE',
    permisos: [],
    authPrototype: 'TD-M1-AUTH-PROVISIONAL',
  };
  let http: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<LoginPage>>;
  let navegar: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideM1PersonalLocal(),
        provideApiConfig('/api-qa-prueba'),
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });
  function enviar(clave = 'clave-solo-prueba'): void {
    const raiz = fixture.nativeElement as HTMLElement;
    for (const [id, valor] of [
      ['correo', respuesta.correo],
      ['clave', clave],
    ]) {
      const input = raiz.querySelector<HTMLInputElement>('#' + id)!;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    }
    raiz
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }
  it('no inicia HTTP al abrir; exige validaciones y no ofrece bypass de demostración en QA', () => {
    expect(fixture.nativeElement.querySelector('.explorar-demo')).toBeNull();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    http.expectNone(() => true);
    expect(navegar).not.toHaveBeenCalled();
  });
  it('limpia la contraseña y navega únicamente tras me válido sin conceder permisos por rol', () => {
    enviar();
    const login = http.expectOne('/api-qa-prueba/v1/personal/autenticar');
    expect(login.request.body).toEqual({ correo: respuesta.correo, password: 'clave-solo-prueba' });
    expect(login.request.headers.has('Authorization')).toBeFalse();
    expect(fixture.nativeElement.querySelector('#clave').value).toBe('');
    expect(fixture.nativeElement.querySelector('.iniciar').disabled).toBeTrue();
    login.flush(respuesta);
    expect(navegar).not.toHaveBeenCalled();
    const me = http.expectOne('/api-qa-prueba/v1/personal/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer token-solo-prueba');
    me.flush({ ...respuesta, accessToken: null });
    expect(navegar).toHaveBeenCalledOnceWith('/dashboard');
    expect(TestBed.inject(SesionPersonalM1).tienePermisos(['ADMINISTRAR'])).toBeFalse();
  });
  for (const status of [400, 401, 403, 429, 503]) {
    it(`presenta el fallo ${status} sin navegar, filtrar detalles ni reintentar`, () => {
      enviar();
      http
        .expectOne('/api-qa-prueba/v1/personal/autenticar')
        .flush(
          { message: 'detalle-privado' },
          { status, statusText: 'Fallo de prueba', headers: { 'Retry-After': '30' } },
        );
      fixture.detectChanges();
      const aviso = fixture.nativeElement.querySelector('[role="status"]').textContent;
      expect(aviso.trim()).not.toBe('');
      expect(aviso).not.toContain('detalle-privado');
      if (status === 429) expect(fixture.nativeElement.querySelector('[role=timer]').textContent).toContain('30 segundos');
      expect(navegar).not.toHaveBeenCalled();
      http.expectNone(() => true);
    });
  }
  it('preserva una clave de 40 caracteres y bloquea el envío solo durante Retry-After', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate();
    try {
      const clave = 'a'.repeat(36) + 'Az#1';
      enviar(clave);
      const login = http.expectOne('/api-qa-prueba/v1/personal/autenticar');
      expect(login.request.body.password).toBe(clave);
      login.flush({}, { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '2' } });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.iniciar').disabled).toBeTrue();
      enviar(clave);
      http.expectNone(() => true);
      jasmine.clock().tick(1000);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role=timer]').textContent).toContain('1 segundos');
      jasmine.clock().tick(1000);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.iniciar').disabled).toBeFalse();
      expect(fixture.nativeElement.querySelector('[role=timer]')).toBeNull();
      http.expectNone(() => true);
    } finally {
      jasmine.clock().uninstall();
    }
  });
  it('no permite acceso si falla me después del POST exitoso', () => {
    enviar();
    http.expectOne('/api-qa-prueba/v1/personal/autenticar').flush(respuesta);
    http
      .expectOne('/api-qa-prueba/v1/personal/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navegar).not.toHaveBeenCalled();
    expect(TestBed.inject(SesionPersonalM1).estado().tipo).toBe('expirada');
  });
  it('cancela la consulta pendiente al destruir la pantalla', () => {
    enviar();
    http.expectOne('/api-qa-prueba/v1/personal/autenticar').flush(respuesta);
    const me = http.expectOne('/api-qa-prueba/v1/personal/me');
    fixture.destroy();
    expect(me.cancelled).toBeTrue();
    expect(navegar).not.toHaveBeenCalled();
  });
});
