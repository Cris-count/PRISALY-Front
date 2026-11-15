import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideApiConfig } from '../../core/config/api.config';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { requierePermisosPersonalM1, requiereSesionPersonalM1 } from './m1-personal-guards';
import { CredencialPersonalMemoria } from './m1-personal-memoria';
import { SesionPersonalM1 } from './m1-personal-sesion';

describe('Guards M1 preparados sin asignación a rutas', () => {
  let sesion: SesionPersonalM1;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
        provideApiConfig('/api-prueba'),
        provideM1PersonalLocal(),
      ],
    });
    sesion = TestBed.inject(SesionPersonalM1);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.expectNone(() => true);
    http.verify();
  });
  function ejecutar(guard: CanActivateFn) {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }
  function verificar(permisos: string[], rol = 'DOCENTE'): void {
    const dto = {
      accessToken: 'token-de-prueba',
      tokenType: 'Bearer',
      userId: 'prueba',
      correo: 'personal@example.invalid',
      nombre: 'Personal de prueba',
      rol,
      permisos,
      authPrototype: 'TD-M1-AUTH-PROVISIONAL',
    };
    sesion.autenticar({ correo: dto.correo, password: 'prueba' }).subscribe();
    http.expectOne('/api-prueba/v1/personal/autenticar').flush(dto);
    http.expectOne('/api-prueba/v1/personal/me').flush({ ...dto, accessToken: null });
  }
  it('sin sesión verificada devuelve destino login sin iniciar consultas', () => {
    const resultado = ejecutar(requiereSesionPersonalM1);
    expect(resultado instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/login');
  });
  it('permite sesión únicamente después de la verificación me', () => {
    verificar([]);
    expect(ejecutar(requiereSesionPersonalM1)).toBeTrue();
  });
  it('el rol ADMINISTRADOR sin permiso no autoriza CREAR_CASO', () => {
    verificar([], 'ADMINISTRADOR');
    expect(ejecutar(requierePermisosPersonalM1('CREAR_CASO'))).toBeFalse();
  });
  it('consulta permisos efectivos y falla cerrado ante mapeos vacíos o incompletos', () => {
    verificar(['CREAR_CASO']);
    expect(ejecutar(requierePermisosPersonalM1('CREAR_CASO'))).toBeTrue();
    expect(ejecutar(requierePermisosPersonalM1())).toBeFalse();
    expect(ejecutar(requierePermisosPersonalM1(''))).toBeFalse();
    expect(
      ejecutar(requierePermisosPersonalM1('CREAR_CASO', 'NO_CONCEDIDO_EN_PRUEBA')),
    ).toBeFalse();
  });
  it('la invalidación de la credencial retira el acceso inmediatamente', () => {
    verificar(['CREAR_CASO']);
    TestBed.inject(CredencialPersonalMemoria).limpiar();
    expect(ejecutar(requiereSesionPersonalM1) instanceof UrlTree).toBeTrue();
    expect(sesion.tienePermisos(['CREAR_CASO'])).toBeFalse();
  });
});
