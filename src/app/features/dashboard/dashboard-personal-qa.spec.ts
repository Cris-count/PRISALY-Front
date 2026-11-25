import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideApiConfig } from '../../core/config/api.config';
import { M1PersonalApi } from '../autenticacion/m1-personal-api';
import { personalM1Interceptor, provideM1PersonalLocal } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { DashboardLayout } from './dashboard-layout';

describe('Dashboard de personal QA con HTTP simulado', () => {
  let http: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<DashboardLayout>>;
  let navegar: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        provideApiConfig('/api-prueba'),
        provideM1PersonalLocal(),
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const respuesta = {
      accessToken: 'token-prueba',
      tokenType: 'Bearer',
      userId: 'personal-prueba',
      correo: 'personal@example.invalid',
      nombre: 'Personal verificado',
      rol: 'DOCENTE',
      permisos: [],
      authPrototype: 'TD-M1-AUTH-PROVISIONAL',
    };
    TestBed.inject(SesionPersonalM1)
      .autenticar({ correo: respuesta.correo, password: 'solo-prueba' })
      .subscribe();
    http.expectOne('/api-prueba/v1/personal/autenticar').flush(respuesta);
    http.expectOne('/api-prueba/v1/personal/me').flush({ ...respuesta, accessToken: null });
    fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });
  function cerrar(): void {
    (fixture.nativeElement.querySelector('button.volver') as HTMLButtonElement).click();
    fixture.detectChanges();
  }
  it('muestra identidad verificada y mantiene el cierre en curso sin cancelarlo al bloquear el contenido', () => {
    expect(fixture.nativeElement.textContent).toContain('Personal verificado');
    cerrar();
    const cierre = http.expectOne('/api-prueba/v1/personal/cerrar-sesion');
    expect(cierre.cancelled).toBeFalse();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    expect(navegar).not.toHaveBeenCalled();
    cierre.flush(null, { status: 204, statusText: 'No Content' });
    expect(navegar).toHaveBeenCalledOnceWith('/login');
  });
  it('bloquea contenido ante cierre fallido sin afirmar revocación, permite reintento manual', () => {
    cerrar();
    http
      .expectOne('/api-prueba/v1/personal/cerrar-sesion')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Personal verificado');
    expect(fixture.nativeElement.querySelector('button.volver').textContent).toContain(
      'Reintentar cierre',
    );
    expect(navegar).not.toHaveBeenCalled();
    http.expectNone(() => true);
    cerrar();
    http
      .expectOne('/api-prueba/v1/personal/cerrar-sesion')
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(navegar).toHaveBeenCalledOnceWith('/login');
  });
  it('un 401 protegido retira inmediatamente identidad y contenido local', () => {
    TestBed.inject(M1PersonalApi)
      .consultarIdentidad()
      .subscribe({ error: () => {} });
    http
      .expectOne('/api-prueba/v1/personal/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Personal verificado');
  });
  it('un 403 protegido no cierra la sesión verificada ni dispara logout automático', () => {
    TestBed.inject(M1PersonalApi)
      .consultarIdentidad()
      .subscribe({ error: () => {} });
    http
      .expectOne('/api-prueba/v1/personal/me')
      .flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(TestBed.inject(SesionPersonalM1).estado().tipo).toBe('valida');
    expect(fixture.nativeElement.textContent).toContain('Personal verificado');
    http.expectNone(() => true);
  });
});
