import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { routes } from '../../app.routes';
import { personalM1Interceptor, provideM1PersonalLocal } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';

describe('FE-59 navegación por rol', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideApiConfig('/api-prueba'),
        provideM1PersonalLocal(),
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const cuerpo = (rol: string) => ({
    accessToken: 'token-prueba',
    tokenType: 'Bearer',
    userId: '11111111-1111-4111-8111-111111111111',
    correo: 'personal@example.invalid',
    nombre: 'Persona de prueba',
    rol,
    permisos: ['CONSULTAR_CASO', 'CREAR_CASO', 'GESTIONAR_SESION'],
    authPrototype: 'TD-M1-AUTH-PROVISIONAL',
  });

  function entrar(rol: string): void {
    TestBed.inject(SesionPersonalM1)
      .autenticar({ correo: 'personal@example.invalid', password: 'solo-prueba' })
      .subscribe();
    http.expectOne('/api-prueba/v1/personal/autenticar').flush(cuerpo(rol));
    http.expectOne('/api-prueba/v1/personal/me').flush({ ...cuerpo(rol), accessToken: null });
  }

  /** Flusha la consulta /me que el guard emite al navegar a una ruta habilitada. */
  const flushMe = (rol: string): void =>
    http.expectOne('/api-prueba/v1/personal/me').flush({ ...cuerpo(rol), accessToken: null });
  const pausa = (): Promise<void> => new Promise((r) => setTimeout(r, 20));

  it('el administrador ve su menú navegable y no el del docente', async () => {
    entrar('ADMINISTRADOR');
    await harness.navigateByUrl('/dashboard');
    const texto = harness.routeNativeElement!.textContent ?? '';
    const menu = harness.routeNativeElement!.querySelector('nav')!.textContent ?? '';
    expect(texto).toContain('Gestión de docentes');
    expect(texto).toContain('Gestión de estudiantes');
    expect(texto).toContain('Vista general');
    expect(menu).not.toContain('Casos académicos');
    expect(menu).not.toContain('No disponible');
    expect(harness.routeNativeElement!.querySelector('a[href*="usuarios-docentes"]')).not.toBeNull();
  });

  it('el docente con CONSULTAR_CASO abre casos académicos', async () => {
    entrar('DOCENTE');
    const nav = harness.navigateByUrl('/dashboard/casos-academicos');
    await pausa();
    flushMe('DOCENTE');
    await nav;
    expect(TestBed.inject(Router).url).toContain('/dashboard/casos-academicos');
    const texto = harness.routeNativeElement!.textContent ?? '';
    expect(texto).toContain('Casos académicos');
    expect(texto).not.toContain('Gestión de docentes');
  });

  it('el ADMINISTRADOR abre la gestión de estudiantes', async () => {
    entrar('ADMINISTRADOR');
    const nav = harness.navigateByUrl('/dashboard/estudiantes');
    await pausa();
    flushMe('ADMINISTRADOR');
    await nav;
    expect(TestBed.inject(Router).url).toContain('/dashboard/estudiantes');
  });

  it('un rol sin experiencia no muestra menús ajenos', async () => {
    entrar('ESTUDIANTE');
    await harness.navigateByUrl('/dashboard');
    const nav = harness.routeNativeElement!.querySelector('nav')!.textContent ?? '';
    expect(nav).not.toContain('Gestión de docentes');
    expect(nav).not.toContain('Casos académicos');
  });

  it('el espacio estudiantil no se monta fuera del entorno de demostración', async () => {
    entrar('DOCENTE');
    await harness.navigateByUrl('/dashboard/estudiante');
    expect(TestBed.inject(Router).url).not.toContain('/dashboard/estudiante');
    expect(harness.routeNativeElement!.querySelector('app-dashboard-estudiante')).toBeNull();
  });
});
