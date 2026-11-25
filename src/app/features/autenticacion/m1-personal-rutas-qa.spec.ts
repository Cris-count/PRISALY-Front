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
import { requiereMapeoPersonalQa, requiereSesionPersonalQa } from './m1-personal-rutas-qa';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { SesionPersonalM1 } from './m1-personal-sesion';

describe('Guards QA sin mapeo oficial de permisos (HTTP simulado)', () => {
  let http: HttpTestingController;
  const ruta = {} as ActivatedRouteSnapshot;
  const destino = {} as RouterStateSnapshot;
  function preparar(qa = true): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideApiConfig('/api-prueba'),
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
        ...(qa ? [provideM1PersonalLocal()] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }
  function url(resultado: unknown): string {
    return TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  }
  afterEach(() => http.verify());
  it('conserva la navegación de demostración fuera de QA sin iniciar sesión ni HTTP', () => {
    preparar(false);
    expect(TestBed.runInInjectionContext(() => requiereSesionPersonalQa(ruta, destino))).toBeTrue();
    expect(TestBed.runInInjectionContext(() => requiereMapeoPersonalQa(ruta, destino))).toBeTrue();
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
