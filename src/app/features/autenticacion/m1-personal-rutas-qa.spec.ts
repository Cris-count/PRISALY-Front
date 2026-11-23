import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideApiConfig } from '../../core/config/api.config';
import { provideEntornoDemostracionAutorizado } from './entorno-demostracion';
import { requiereMapeoPersonalQa, requiereSesionPersonalQa } from './m1-personal-rutas-qa';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { SesionPersonalM1 } from './m1-personal-sesion';

describe('Guards QA sin mapeo oficial de permisos (HTTP simulado)', () => {
  let http: HttpTestingController;
  const ruta = {} as ActivatedRouteSnapshot;
  const destino = {} as RouterStateSnapshot;
  function preparar(qa = true, demostracion = false): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideApiConfig('/api-prueba'),
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
        ...(qa ? [provideM1PersonalLocal()] : []),
        ...(demostracion ? [provideEntornoDemostracionAutorizado()] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }
  function url(resultado: unknown): string {
    return TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  }
  afterEach(() => http.verify());
  // FE-58-05 (H-58-01): la demostración solo existe en el entorno de demostración autorizado.
  it('conserva la navegación de demostración fuera de QA solo en el entorno de demostración', () => {
    preparar(false, true);
    expect(TestBed.runInInjectionContext(() => requiereSesionPersonalQa(ruta, destino))).toBeTrue();
    expect(TestBed.runInInjectionContext(() => requiereMapeoPersonalQa(ruta, destino))).toBeTrue();
    http.expectNone(() => true);
  });
  it('fuera de QA y sin entorno de demostración redirige a login sin HTTP', () => {
    preparar(false, false);
    expect(url(TestBed.runInInjectionContext(() => requiereSesionPersonalQa(ruta, destino)))).toBe(
      '/login',
    );
    expect(url(TestBed.runInInjectionContext(() => requiereMapeoPersonalQa(ruta, destino)))).toBe(
      '/login',
    );
    http.expectNone(() => true);
  });
  it('rechaza acceso directo sin sesión, también tras recarga', () => {
    preparar();
    expect(url(TestBed.runInInjectionContext(() => requiereSesionPersonalQa(ruta, destino)))).toBe(
      '/login',
    );
    expect(url(TestBed.runInInjectionContext(() => requiereMapeoPersonalQa(ruta, destino)))).toBe(
      '/login',
    );
    http.expectNone(() => true);
  });
  for (const rol of ['ADMINISTRADOR', 'DOCENTE']) {
    it(
      'no habilita rutas sin mapeo por el rol ' +
        rol +
        ', ni siquiera con permisos devueltos por me',
      () => {
        preparar();
        const sesion = TestBed.inject(SesionPersonalM1);
        const datos = { correo: 'personal@example.invalid', password: 'solo-prueba' };
        const respuesta = {
          accessToken: 'token-prueba',
          tokenType: 'Bearer',
          userId: 'personal-prueba',
          correo: datos.correo,
          nombre: 'Personal prueba',
          rol,
          permisos: ['CREAR_CASO'],
          authPrototype: 'TD-M1-AUTH-PROVISIONAL',
        };
        sesion.autenticar(datos).subscribe();
        http.expectOne('/api-prueba/v1/personal/autenticar').flush(respuesta);
        http.expectOne('/api-prueba/v1/personal/me').flush({ ...respuesta, accessToken: null });
        expect(
          TestBed.runInInjectionContext(() => requiereSesionPersonalQa(ruta, destino)),
        ).toBeTrue();
        expect(
          url(TestBed.runInInjectionContext(() => requiereMapeoPersonalQa(ruta, destino))),
        ).toBe('/dashboard?aviso=permisos-pendientes');
        sesion.cerrarSesion().subscribe();
        http
          .expectOne('/api-prueba/v1/personal/cerrar-sesion')
          .flush(null, { status: 204, statusText: 'No Content' });
        expect(
          url(TestBed.runInInjectionContext(() => requiereSesionPersonalQa(ruta, destino))),
        ).toBe('/login');
      },
    );
  }
});
