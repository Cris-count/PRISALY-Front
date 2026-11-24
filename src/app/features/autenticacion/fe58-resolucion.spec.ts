import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  Routes,
  UrlTree,
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { provideApiConfig } from '../../core/config/api.config';
import { environment as entornoProduccion } from '../../../environments/environment';
import { environment as entornoDemo } from '../../../environments/environment.demo';
import { environment as entornoDesarrollo } from '../../../environments/environment.development';
import { environment as entornoQa } from '../../../environments/environment.qa';
import { contextoAcademico, personalAcademicoInterceptor } from '../academico/academico-http';
import { DASHBOARD_ROUTES } from '../dashboard/dashboard.routes';
import {
  DEMOSTRACIONES_HABILITADAS,
  provideEntornoDemostracionAutorizado,
  requiereEntornoDemostracion,
} from './entorno-demostracion';
import {
  avisoDeDecision,
  decidirRuta,
  MAPEO_RUTAS_PERSONAL,
  MAPEO_RUTAS_PERSONAL_OFICIAL,
  MapeoRutaPersonal,
  RequisitoRutaAprobado,
} from './m1-mapeo-rutas';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { requiereMapeoPersonalQa } from './m1-personal-rutas-qa';
import { SesionPersonalM1, VIGENCIA_IDENTIDAD_MS } from './m1-personal-sesion';
import { VigilanciaAccesoPersonal } from './vigilancia-acceso-personal';

/**
 * FE-58-05 (DC-FE-58-IMPLEMENTACION-CONTROLADA-05). Toda ruta «habilitada» de este archivo es una
 * SIMULACIÓN identificada; DC-FE-59 habilitó el mapeo oficial para QA. HTTP simulado en todas las pruebas.
 */
const B = '/api-prueba';
const YO = '11111111-1111-4111-8111-111111111111';
const OTRO = '55555555-5555-4555-8555-555555555555';
const todos = () => true;
const ninguno = () => false;

const simulada = (aprobado: unknown, ruta = 'x'): MapeoRutaPersonal => ({
  ruta,
  permisosBackend: [],
  rolBackend: null,
  aprobado: aprobado as RequisitoRutaAprobado,
  habilitada: true,
  resolucion: null,
  verificacionQa: 'no-aplica',
});

describe('FE-58-05 tres modalidades de requisito (unitarias)', () => {
  it('sesión explícita: autoriza cualquier identidad válida, nunca a un anónimo', () => {
    const req = simulada({ sesion: true, permisos: [] });
    expect(decidirRuta(req, true, ninguno, ninguno)).toBe('autorizada');
    expect(decidirRuta(req, false, todos, todos)).toBe('sin-sesion');
  });

  it('el requisito «solo sesión» debe ser explícito y no combinable', () => {
    for (const aprobado of [
      { permisos: [] },
      { sesion: 'true', permisos: [] },
      { sesion: false, permisos: [] },
      { sesion: 1, permisos: [] },
      { sesion: true, permisos: ['CONSULTAR_CASO'] },
      { sesion: true, rol: 'ADMINISTRADOR', permisos: [] },
      { sesion: true },
      { publico: true, permisos: [] },
      { publico: true, permisos: ['CONSULTAR_CASO'] },
      { sesion: true, permisos: [], extra: true },
    ])
      expect(decidirRuta(simulada(aprobado), true, todos, todos))
        .withContext(JSON.stringify(aprobado))
        .toBe('pendiente');
  });

  it('permiso: el rol administrativo no lo sustituye', () => {
    const req = simulada({ permisos: ['CONSULTAR_CASO'] });
    expect(decidirRuta(req, true, ninguno, todos)).toBe('insuficiente');
    expect(decidirRuta(req, true, todos, ninguno)).toBe('autorizada');
  });

  it('rol: un permiso no lo sustituye', () => {
    const req = simulada({ rol: 'ADMINISTRADOR', permisos: [] });
    expect(decidirRuta(req, true, todos, ninguno)).toBe('rol-insuficiente');
    expect(decidirRuta(req, true, ninguno, (r) => r === 'ADMINISTRADOR')).toBe('autorizada');
  });

  it('un requisito válido sin habilitación efectiva queda preparado, nunca autorizado', () => {
    const req = { ...simulada({ permisos: ['CONSULTAR_CASO'] }), habilitada: false };
    expect(decidirRuta(req, true, todos, todos)).toBe('preparada');
    const noBooleano = { ...req, habilitada: 'true' as unknown as boolean };
    expect(decidirRuta(noBooleano, true, todos, todos)).toBe('preparada');
  });

  it('cada decisión denegada tiene su aviso', () => {
    expect(avisoDeDecision('preparada')).toBe('habilitacion-pendiente');
    expect(avisoDeDecision('pendiente')).toBe('permisos-pendientes');
    expect(avisoDeDecision('insuficiente')).toBe('permiso-insuficiente');
    expect(avisoDeDecision('rol-insuficiente')).toBe('rol-insuficiente');
  });
});

describe('FE-58-05 matriz aprobada habilitada en QA (DC-FE-59)', () => {
  it('refleja los requisitos FE-58 y la habilitación FE-59', () => {
    const m = MAPEO_RUTAS_PERSONAL_OFICIAL;
    expect(m['usuarios-docentes'].aprobado).toEqual({ rol: 'ADMINISTRADOR', permisos: [] });
    expect(m['configuracion'].aprobado).toEqual({ sesion: true, permisos: [] });
    expect(m['casos-academicos'].aprobado).toEqual({ permisos: ['CONSULTAR_CASO'] });
    expect(m['rubricas'].aprobado).toEqual({ permisos: ['CONSULTAR_CASO'] });
    expect(m['sesiones'].aprobado).toEqual({ permisos: ['GESTIONAR_SESION'] });
    expect(m['convocatorias'].aprobado).toEqual({ permisos: ['GESTIONAR_SESION'] });
    expect(m['estudiantes'].aprobado).toEqual({ rol: 'ADMINISTRADOR', permisos: [] });
    expect(m['vista-general'].aprobado).toEqual({ rol: 'ADMINISTRADOR', permisos: [] });
    expect(m['mi-perfil'].aprobado).toEqual({ sesion: true, permisos: [] });
    for (const entrada of Object.values(m)) {
      expect(entrada.habilitada).withContext(entrada.ruta).toBeTrue();
      expect(decidirRuta(entrada, true, todos, todos))
        .withContext(entrada.ruta)
        .toBe('autorizada');
    }
  });
});

const respuesta = (permisos: string[], rol = 'DOCENTE', userId = YO) => ({
  accessToken: `token-${userId}`,
  tokenType: 'Bearer',
  userId,
  correo: 'personal@example.invalid',
  nombre: 'Personal prueba',
  rol,
  permisos,
  authPrototype: 'TD-M1-AUTH-PROVISIONAL',
});

let http: HttpTestingController;
beforeEach(() => (http = undefined as unknown as HttpTestingController));
afterEach(() => http?.verify());

function preparar(extra: unknown[] = [], rutas: Routes = []): SesionPersonalM1 {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(rutas),
      provideApiConfig(B),
      provideM1PersonalLocal(),
      provideHttpClient(withInterceptors([personalM1Interceptor, personalAcademicoInterceptor])),
      provideHttpClientTesting(),
      ...(extra as never[]),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  return TestBed.inject(SesionPersonalM1);
}

function entrar(sesion: SesionPersonalM1, permisos: string[], rol = 'DOCENTE', userId = YO): void {
  sesion.autenticar({ correo: 'personal@example.invalid', password: 'solo-prueba' }).subscribe();
  http.expectOne(`${B}/v1/personal/autenticar`).flush(respuesta(permisos, rol, userId));
  http
    .expectOne(`${B}/v1/personal/me`)
    .flush({ ...respuesta(permisos, rol, userId), accessToken: null });
}
const me = () => http.expectOne(`${B}/v1/personal/me`);
/** Deja correr la navegación hasta que el guard emite la consulta. */
const pausa = () => new Promise((r) => setTimeout(r, 20));
/** Simula el paso del tiempo más allá de la ventana de reutilización de identidad. */
const envejecer = () => {
  const futuro = Date.now() + VIGENCIA_IDENTIDAD_MS + 1_000;
  spyOn(Date, 'now').and.returnValue(futuro);
};
const flushMe = (permisos: string[], rol = 'DOCENTE', userId = YO) =>
  me().flush({ ...respuesta(permisos, rol, userId), accessToken: null });

describe('FE-58-05 actualización controlada de /me (HTTP simulado)', () => {
  it('refleja permisos concedidos y revocados', async () => {
    const sesion = preparar();
    entrar(sesion, []);
    const r1 = firstValueFrom(sesion.actualizarIdentidad(true));
    flushMe(['GESTIONAR_SESION']);
    expect(await r1).toBe('vigente');
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeTrue();
    const r2 = firstValueFrom(sesion.actualizarIdentidad(true));
    flushMe([]);
    expect(await r2).toBe('vigente');
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
  });

  it('refleja un cambio de rol', async () => {
    const sesion = preparar();
    entrar(sesion, [], 'ADMINISTRADOR');
    const r = firstValueFrom(sesion.actualizarIdentidad(true));
    flushMe([], 'DOCENTE');
    expect(await r).toBe('vigente');
    expect(sesion.tieneRol('ADMINISTRADOR')).toBeFalse();
  });

  it('peticiones concurrentes comparten una sola consulta', async () => {
    const sesion = preparar();
    entrar(sesion, []);
    const a = firstValueFrom(sesion.actualizarIdentidad(true));
    const b = firstValueFrom(sesion.actualizarIdentidad(true));
    const c = firstValueFrom(sesion.actualizarIdentidad());
    flushMe(['CONSULTAR_CASO']);
    expect(await Promise.all([a, b, c])).toEqual(['vigente', 'vigente', 'vigente']);
  });

  it('una identidad recién confirmada se reutiliza sin consultas innecesarias', async () => {
    const sesion = preparar();
    entrar(sesion, []);
    const r = firstValueFrom(sesion.actualizarIdentidad(true));
    flushMe([]);
    await r;
    expect(await firstValueFrom(sesion.actualizarIdentidad())).toBe('vigente');
    http.expectNone(`${B}/v1/personal/me`);
  });

  it('401: la sesión queda expirada y no se concede acceso', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    const r = firstValueFrom(sesion.actualizarIdentidad(true));
    me().flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'Unauthorized' });
    expect(await r).toBe('no-vigente');
    expect(sesion.estado().tipo).toBe('expirada');
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
  });

  it('403 de /me: la identidad deja de ser utilizable', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    const r = firstValueFrom(sesion.actualizarIdentidad(true));
    me().flush({ code: 'USER_INACTIVE' }, { status: 403, statusText: 'Forbidden' });
    expect(await r).toBe('no-vigente');
    expect(sesion.estado().tipo).toBe('acceso-denegado');
  });

  it('error de red: no disponible, conserva la sesión y vuelve a consultar después', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    const r = firstValueFrom(sesion.actualizarIdentidad());
    me().error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    expect(await r).toBe('no-disponible');
    expect(sesion.estado().tipo).toBe('valida');
    // Sin vigencia reutilizable: la siguiente decisión vuelve a consultar.
    const r2 = firstValueFrom(sesion.actualizarIdentidad());
    flushMe(['GESTIONAR_SESION']);
    expect(await r2).toBe('vigente');
  });

  it('/me con otro usuario invalida la sesión', async () => {
    const sesion = preparar();
    entrar(sesion, []);
    const r = firstValueFrom(sesion.actualizarIdentidad(true));
    flushMe([], 'DOCENTE', OTRO);
    expect(await r).toBe('no-vigente');
    expect(sesion.estado().tipo).toBe('expirada');
  });

  it('una respuesta tardía de una sesión anterior no sobrescribe la nueva', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION'], 'DOCENTE', YO);
    const tardia = firstValueFrom(sesion.actualizarIdentidad(true));
    // Nuevo inicio de sesión de otra identidad mientras la consulta anterior sigue abierta.
    sesion.autenticar({ correo: 'otro@example.invalid', password: 'solo-prueba' }).subscribe();
    http.expectOne(`${B}/v1/personal/autenticar`).flush(respuesta([], 'ADMINISTRADOR', OTRO));
    const [anterior, nueva] = http.match(`${B}/v1/personal/me`);
    nueva.flush({ ...respuesta([], 'ADMINISTRADOR', OTRO), accessToken: null });
    anterior.flush({ ...respuesta(['GESTIONAR_SESION'], 'DOCENTE', YO), accessToken: null });
    expect(await tardia).toBe('no-vigente');
    const e = sesion.estado();
    expect(e.tipo === 'valida' ? e.identidad.userId : null).toBe(OTRO);
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
  });

  it('una invalidación local cancela la consulta en curso', () => {
    const sesion = preparar();
    entrar(sesion, []);
    sesion.actualizarIdentidad(true).subscribe();
    const pendiente = me();
    sesion.invalidarSesion();
    expect(pendiente.cancelled).toBeTrue();
    expect(sesion.estado().tipo).toBe('expirada');
  });

  it('sin sesión válida no consulta', async () => {
    const sesion = preparar();
    expect(await firstValueFrom(sesion.actualizarIdentidad(true))).toBe('no-vigente');
    http.expectNone(() => true);
  });
});

@Component({ template: '<p>pantalla protegida</p>' })
class Pantalla {}

describe('FE-58-05 guard y vigilancia con ruta habilitada (SIMULACIÓN)', () => {
  const SIMULADO: Record<string, MapeoRutaPersonal> = {
    ...MAPEO_RUTAS_PERSONAL_OFICIAL,
    sesiones: { ...MAPEO_RUTAS_PERSONAL_OFICIAL['sesiones'], habilitada: true },
    configuracion: { ...MAPEO_RUTAS_PERSONAL_OFICIAL['configuracion'], habilitada: true },
    // SIMULACIÓN: ruta aprobada pero no habilitada, para probar el estado «preparada».
    rubricas: { ...MAPEO_RUTAS_PERSONAL_OFICIAL['rubricas'], habilitada: false },
  };
  const rutas: Routes = [
    { path: 'login', component: Pantalla },
    {
      path: 'dashboard',
      children: [
        { path: '', component: Pantalla },
        { path: 'sesiones', canActivate: [requiereMapeoPersonalQa], component: Pantalla },
        { path: 'configuracion', canActivate: [requiereMapeoPersonalQa], component: Pantalla },
        { path: 'rubricas', canActivate: [requiereMapeoPersonalQa], component: Pantalla },
      ],
    },
  ];
  const conMapeo = () => preparar([{ provide: MAPEO_RUTAS_PERSONAL, useValue: SIMULADO }], rutas);

  it('ruta preparada no habilitada: no consulta /me y avisa habilitación pendiente', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['CONSULTAR_CASO']);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard/rubricas');
    expect(router.url).toBe('/dashboard?aviso=habilitacion-pendiente');
    http.expectNone(`${B}/v1/personal/me`);
  });

  it('confirma /me antes de entrar y decide con los permisos vigentes', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['GESTIONAR_SESION']);
    envejecer(); // la identidad del inicio de sesión ya no está dentro de la ventana de vigencia
    const router = TestBed.inject(Router);
    const nav = router.navigateByUrl('/dashboard/sesiones');
    await pausa();
    flushMe([]); // revocado en el servidor
    await nav;
    expect(router.url).toBe('/dashboard?aviso=permiso-insuficiente');
  });

  it('entra con permiso vigente y no depende de parámetros de URL', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['GESTIONAR_SESION']);
    envejecer(); // la identidad del inicio de sesión ya no está dentro de la ventana de vigencia
    const router = TestBed.inject(Router);
    const nav = router.navigateByUrl(
      '/dashboard/sesiones?permiso=GESTIONAR_SESION&rol=ADMINISTRADOR',
    );
    await pausa();
    flushMe(['GESTIONAR_SESION']);
    await nav;
    expect(router.url.startsWith('/dashboard/sesiones')).toBeTrue();
    expect(TestBed.inject(VigilanciaAccesoPersonal).rutaVigilada()).toBe('sesiones');
  });

  it('sin verificación disponible deniega la entrada', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['GESTIONAR_SESION']);
    envejecer(); // la identidad del inicio de sesión ya no está dentro de la ventana de vigencia
    const router = TestBed.inject(Router);
    const nav = router.navigateByUrl('/dashboard/sesiones');
    await pausa();
    me().error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await nav;
    expect(router.url).toBe('/dashboard?aviso=verificacion-no-disponible');
    expect(sesion.estado().tipo).toBe('valida');
  });

  it('solo sesión (configuración simulada habilitada): cualquier identidad válida entra', async () => {
    const sesion = conMapeo();
    entrar(sesion, []);
    envejecer(); // la identidad del inicio de sesión ya no está dentro de la ventana de vigencia
    const router = TestBed.inject(Router);
    const nav = router.navigateByUrl('/dashboard/configuracion');
    await pausa();
    flushMe([]);
    await nav;
    expect(router.url).toBe('/dashboard/configuracion');
  });

  it('pérdida de acceso con la pantalla abierta: se cierra y se retiran los datos', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['GESTIONAR_SESION']);
    envejecer(); // la identidad del inicio de sesión ya no está dentro de la ventana de vigencia
    const router = TestBed.inject(Router);
    const nav = router.navigateByUrl('/dashboard/sesiones');
    await pausa();
    flushMe(['GESTIONAR_SESION']);
    await nav;
    // Una operación es denegada: se confirma /me una sola vez y revela la revocación.
    const cliente = TestBed.inject(HttpClient);
    const op = firstValueFrom(
      cliente.post(`${B}/m4/sesiones`, {}, { context: contextoAcademico() }),
    ).catch((e: unknown) => e);
    http
      .expectOne({ method: 'POST', url: `${B}/m4/sesiones` })
      .flush({ code: 'M4-SIN-PERMISO' }, { status: 403, statusText: 'Forbidden' });
    await op;
    flushMe([]);
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    await new Promise((r) => setTimeout(r));
    expect(router.url).toBe('/dashboard?aviso=acceso-retirado');
    // La operación denegada no se reintenta.
    http.expectNone({ method: 'POST', url: `${B}/m4/sesiones` });
  });

  it('dos denegaciones seguidas comparten una única consulta /me', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['GESTIONAR_SESION']);
    const cliente = TestBed.inject(HttpClient);
    for (let i = 0; i < 2; i++) {
      const op = firstValueFrom(cliente.get(`${B}/m4/sesiones`, { context: contextoAcademico() }));
      http
        .expectOne({ method: 'GET', url: `${B}/m4/sesiones` })
        .flush({ code: 'M4-SIN-PERMISO' }, { status: 403, statusText: 'Forbidden' });
      await op.catch(() => undefined);
    }
    flushMe(['GESTIONAR_SESION']);
    expect(sesion.estado().tipo).toBe('valida');
  });

  it('un 403 durante una consulta anterior no permite reutilizar su respuesta obsoleta', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['GESTIONAR_SESION']);
    sesion.actualizarIdentidad(true).subscribe();
    const anterior = me();
    const cliente = TestBed.inject(HttpClient);
    const op = firstValueFrom(cliente.get(`${B}/m4/sesiones`, { context: contextoAcademico() }));
    http
      .expectOne({ method: 'GET', url: `${B}/m4/sesiones` })
      .flush({ code: 'M4-SIN-PERMISO' }, { status: 403, statusText: 'Forbidden' });
    await op.catch(() => undefined);
    anterior.flush({ ...respuesta(['GESTIONAR_SESION']), accessToken: null });
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
    flushMe([]);
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
  });

  it('un 403 seguido de fallo de red conserva la sesión sin restaurar permisos', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['GESTIONAR_SESION']);
    const cliente = TestBed.inject(HttpClient);
    const op = firstValueFrom(cliente.get(`${B}/m4/sesiones`, { context: contextoAcademico() }));
    http
      .expectOne({ method: 'GET', url: `${B}/m4/sesiones` })
      .flush({ code: 'M4-SIN-PERMISO' }, { status: 403, statusText: 'Forbidden' });
    await op.catch(() => undefined);
    me().error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    expect(sesion.estado().tipo).toBe('valida');
    expect(sesion.identidadRequiereConfirmacion()).toBeTrue();
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
    const revalidacion = firstValueFrom(sesion.actualizarIdentidad());
    flushMe([]);
    expect(await revalidacion).toBe('vigente');
    expect(sesion.identidadRequiereConfirmacion()).toBeFalse();
  });

  it('retira la pantalla protegida mientras una denegación no puede confirmarse', async () => {
    const sesion = conMapeo();
    entrar(sesion, ['GESTIONAR_SESION']);
    const router = TestBed.inject(Router);
    const nav = router.navigateByUrl('/dashboard/sesiones');
    await pausa();
    flushMe(['GESTIONAR_SESION']);
    await nav;
    TestBed.tick();
    const cliente = TestBed.inject(HttpClient);
    const op = firstValueFrom(cliente.get(`${B}/m4/sesiones`, { context: contextoAcademico() }));
    http
      .expectOne({ method: 'GET', url: `${B}/m4/sesiones` })
      .flush({ code: 'M4-SIN-PERMISO' }, { status: 403, statusText: 'Forbidden' });
    await op.catch(() => undefined);
    me().error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    TestBed.tick();
    await new Promise((r) => setTimeout(r));
    expect(router.url).toBe('/dashboard?aviso=acceso-retirado');
    expect(sesion.estado().tipo).toBe('valida');
  });
});

describe('FE-58-05 demostraciones restringidas por entorno (H-58-01)', () => {
  it('solo el entorno demo las habilita; producción, desarrollo y QA las bloquean', () => {
    expect(entornoDemo.demostracionesHabilitadas).toBeTrue();
    expect(entornoDemo.personalQaHabilitado).toBeFalse();
    expect(entornoDemo.apiBaseUrl).toBe('/api');
    expect(entornoProduccion.demostracionesHabilitadas).toBeFalse();
    expect(entornoDesarrollo.demostracionesHabilitadas).toBeFalse();
    expect(entornoQa.demostracionesHabilitadas).toBeFalse();
  });

  it('el valor efectivo en esta compilación (producción) está bloqueado', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    expect(TestBed.inject(DEMOSTRACIONES_HABILITADAS)).toBeFalse();
  });

  function decidirDemo(extra: unknown[]) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...(extra as never[])] });
    const r = TestBed.runInInjectionContext(() =>
      requiereEntornoDemostracion({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return r === true ? true : TestBed.inject(Router).serializeUrl(r as UrlTree);
  }

  it('fuera del entorno demo: login sin QA, aviso con QA; en demo: acceso', () => {
    expect(decidirDemo([])).toBe('/login');
    TestBed.resetTestingModule();
    expect(decidirDemo([provideM1PersonalLocal()])).toBe(
      '/dashboard?aviso=demostracion-no-autorizada',
    );
    TestBed.resetTestingModule();
    expect(decidirDemo([provideEntornoDemostracionAutorizado()])).toBeTrue();
  });

  it('el acceso directo por URL al espacio estudiantil demostrativo se bloquea en producción', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Pantalla },
          { path: 'dashboard', children: DASHBOARD_ROUTES },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard/estudiante?demo=true&demostracionesHabilitadas=true');
    expect(router.url).toBe('/login');
    await router.navigateByUrl('/dashboard/casos-academicos');
    expect(router.url).toBe('/login');
    await router.navigateByUrl('/dashboard');
    expect(router.url).toBe('/login');
    http.expectNone(() => true);
  });

  it('la ruta estudiantil declara el guard de entorno de demostración', () => {
    const hijos = DASHBOARD_ROUTES[0].children ?? [];
    const estudiante = hijos.find((r) => r.path === 'estudiante');
    expect(estudiante?.canActivate).toContain(requiereEntornoDemostracion);
  });
});
