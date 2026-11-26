import { requiereAccesoSimulador } from '../simulador/unreal/acceso-simulador';
import {
  HttpClient,
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterOutlet,
  RouterStateSnapshot,
  Routes,
} from '@angular/router';
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { routes as rutasApp } from '../../app.routes';
import { provideApiConfig } from '../../core/config/api.config';
import { contextoAcademico, personalAcademicoInterceptor } from '../academico/academico-http';
import { requiereEntornoDemostracion } from './entorno-demostracion';
import { EstadoVerificacionAcceso } from './estado-verificacion-acceso';
import {
  MAPEO_RUTAS_PERSONAL,
  MAPEO_RUTAS_PERSONAL_OFICIAL,
  MapeoRutaPersonal,
} from './m1-mapeo-rutas';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { requiereMapeoPersonalQa } from './m1-personal-rutas-qa';
import { SesionPersonalM1 } from './m1-personal-sesion';
import {
  INTERVALO_REVALIDACION_ACCESO_MS,
  VigilanciaAccesoPersonal,
} from './vigilancia-acceso-personal';

/**
 * FE-58 · DC-FE-58-RESOLUCION-FINAL-08 (H-58-02). Revalidación de `/me` con vistas protegidas
 * activas. Tiempo simulado con `jasmine.clock()` (sin esperas reales) y HTTP simulado.
 * Las rutas «habilitadas» son SIMULACIONES identificadas: el mapeo oficial no habilita ninguna.
 */
const B = '/api-prueba';
const YO = '11111111-1111-4111-8111-111111111111';
const OTRO = '55555555-5555-4555-8555-555555555555';
const URL_ME = `${B}/v1/personal/me`;
const MINUTO = 60_000;

@Component({ template: '<p data-prueba="datos-protegidos">Datos protegidos del docente</p>' })
class PantallaProtegida {}
@Component({ template: '<p>pública</p>' })
class PantallaPublica {}
@Component({
  imports: [RouterOutlet, EstadoVerificacionAcceso],
  template: '<app-estado-verificacion-acceso /><router-outlet />',
})
class Raiz {}

// SIMULACIÓN: dos rutas habilitadas solo dentro de esta prueba.
const SIMULADO: Record<string, MapeoRutaPersonal> = {
  ...MAPEO_RUTAS_PERSONAL_OFICIAL,
  sesiones: { ...MAPEO_RUTAS_PERSONAL_OFICIAL['sesiones'], habilitada: true },
  configuracion: { ...MAPEO_RUTAS_PERSONAL_OFICIAL['configuracion'], habilitada: true },
};
const RUTAS: Routes = [
  { path: 'login', component: PantallaPublica },
  {
    path: 'dashboard',
    children: [
      { path: '', component: PantallaPublica },
      { path: 'sesiones', canActivate: [requiereMapeoPersonalQa], component: PantallaProtegida },
      {
        path: 'configuracion',
        canActivate: [requiereMapeoPersonalQa],
        component: PantallaProtegida,
      },
      { path: 'rubricas', canActivate: [requiereMapeoPersonalQa], component: PantallaProtegida },
    ],
  },
];

let http: HttpTestingController;
let llamadasMe = 0;
const contador: HttpInterceptorFn = (req, next) => {
  if (req.url === URL_ME) llamadasMe++;
  return next(req);
};

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
const flushMe = (permisos: string[], rol = 'DOCENTE', userId = YO) =>
  http.expectOne(URL_ME).flush({ ...respuesta(permisos, rol, userId), accessToken: null });

/** Deja correr promesas (navegación) sin temporizadores reales. */
async function microtareas(): Promise<void> {
  for (let i = 0; i < 60; i++) await Promise.resolve();
  TestBed.tick();
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
/** Avanza el tiempo simulado y ejecuta efectos. */
async function avanzar(ms: number): Promise<void> {
  jasmine.clock().tick(ms);
  await microtareas();
}

let fixture: ComponentFixture<Raiz>;
let visibilidad: 'visible' | 'hidden' = 'visible';

function preparar(): SesionPersonalM1 {
  llamadasMe = 0;
  visibilidad = 'visible';
  spyOnProperty(document, 'visibilityState', 'get').and.callFake(() => visibilidad);
  TestBed.configureTestingModule({
    providers: [
      provideRouter(RUTAS),
      provideApiConfig(B),
      provideM1PersonalLocal(),
      provideHttpClient(
        withInterceptors([contador, personalM1Interceptor, personalAcademicoInterceptor]),
      ),
      provideHttpClientTesting(),
      { provide: MAPEO_RUTAS_PERSONAL, useValue: SIMULADO },
      { provide: INTERVALO_REVALIDACION_ACCESO_MS, useValue: MINUTO },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  fixture = TestBed.createComponent(Raiz);
  return TestBed.inject(SesionPersonalM1);
}

function entrar(sesion: SesionPersonalM1, permisos: string[], rol = 'DOCENTE', userId = YO): void {
  sesion.autenticar({ correo: 'personal@example.invalid', password: 'solo-prueba' }).subscribe();
  http.expectOne(`${B}/v1/personal/autenticar`).flush(respuesta(permisos, rol, userId));
  flushMe(permisos, rol, userId);
}

async function abrir(ruta: string, permisosMe: string[] | null): Promise<void> {
  const nav = TestBed.inject(Router).navigateByUrl(ruta);
  await microtareas();
  if (permisosMe) flushMe(permisosMe);
  await nav;
  await microtareas();
  fixture.detectChanges();
}

const url = () => TestBed.inject(Router).url;
const vigilada = () => TestBed.inject(VigilanciaAccesoPersonal).rutaVigilada();
const datosVisibles = () =>
  !!(fixture.nativeElement as HTMLElement).querySelector('[data-prueba="datos-protegidos"]');
function ocultar(): void {
  visibilidad = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
}
function mostrar(): void {
  visibilidad = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('focus'));
}

describe('FE-58 H-58-02 revalidación periódica de /me (tiempo simulado)', () => {
  beforeEach(() => {
    http = undefined as unknown as HttpTestingController;
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-23T10:00:00Z'));
  });
  afterEach(() => {
    http?.verify();
    jasmine.clock().uninstall();
  });
  it('1 y 11: revocación con la pantalla abierta retira la vista y sus datos sin interacción', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    expect(url()).toBe('/dashboard/sesiones');
    expect(datosVisibles()).toBeTrue();
    await avanzar(MINUTO);
    flushMe([]); // revocado en el servidor
    await microtareas();
    fixture.detectChanges();
    expect(url()).toBe('/dashboard?aviso=acceso-retirado');
    expect(datosVisibles()).toBeFalse();
    expect(vigilada()).toBeNull();
  });

  it('2: tras la revocación, volver a la ruta se deniega sin reabrir la vista', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO);
    flushMe([]);
    await microtareas();
    await abrir('/dashboard/sesiones', null); // identidad recién confirmada: sin nueva consulta
    expect(url()).toBe('/dashboard?aviso=permiso-insuficiente');
  });

  it('3: con el documento oculto no consulta; al recuperar el foco revalida una vez', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    const antes = llamadasMe;
    ocultar();
    await microtareas();
    await avanzar(5 * MINUTO);
    expect(llamadasMe).toBe(antes);
    mostrar(); // visibilitychange y focus: una sola consulta compartida
    await microtareas();
    expect(llamadasMe).toBe(antes + 1);
    flushMe([]);
    await microtareas();
    expect(url()).toBe('/dashboard?aviso=acceso-retirado');
  });

  it('4 y 5: una respuesta /me iniciada antes de un 403 no restaura permisos', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO); // revalidación periódica en curso
    const anterior = http.expectOne(URL_ME);
    const cliente = TestBed.inject(HttpClient);
    const op = firstValueFrom(
      cliente.post(`${B}/m4/sesiones`, {}, { context: contextoAcademico() }),
    ).catch((e: unknown) => e);
    http
      .expectOne({ method: 'POST', url: `${B}/m4/sesiones` })
      .flush({ code: 'M4-SIN-PERMISO' }, { status: 403, statusText: 'Forbidden' });
    await op;
    await microtareas();
    expect(url()).toBe('/dashboard?aviso=acceso-retirado'); // confirmación pendiente: vista retirada
    const posterior = http.expectOne(URL_ME);
    anterior.flush({ ...respuesta(['GESTIONAR_SESION']), accessToken: null }); // tardía
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
    posterior.flush({ ...respuesta([]), accessToken: null });
    await microtareas();
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
    http.expectNone({ method: 'POST', url: `${B}/m4/sesiones` }); // sin reintento
  });

  it('6: un cambio de usuario durante la consulta no hereda permisos anteriores', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO);
    const anterior = http.expectOne(URL_ME);
    sesion.autenticar({ correo: 'otro@example.invalid', password: 'solo-prueba' }).subscribe();
    http.expectOne(`${B}/v1/personal/autenticar`).flush(respuesta([], 'DOCENTE', OTRO));
    flushMe([], 'DOCENTE', OTRO);
    anterior.flush({ ...respuesta(['GESTIONAR_SESION']), accessToken: null });
    await microtareas();
    const e = sesion.estado();
    expect(e.tipo === 'valida' ? e.identidad.userId : null).toBe(OTRO);
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
    expect(vigilada()).toBeNull();
    // La vista se retira: la nueva identidad no tiene el permiso de la anterior.
    expect(url()).toBe('/dashboard?aviso=acceso-retirado');
  });

  it('7: dos guards simultáneos comparten una consulta y no duplican la vigilancia', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    const ruta = { routeConfig: { path: 'sesiones' } } as unknown as ActivatedRouteSnapshot;
    const ejecutar = () =>
      TestBed.runInInjectionContext(() => requiereMapeoPersonalQa(ruta, {} as RouterStateSnapshot));
    const a = ejecutar();
    const b = ejecutar();
    const resultados: unknown[] = [];
    for (const r of [a, b])
      if (isObservable(r)) (r as Observable<unknown>).subscribe((v) => resultados.push(v));
    flushMe(['GESTIONAR_SESION']); // expectOne: una sola consulta
    expect(resultados).toEqual([true, true]);
    await microtareas();
    const antes = llamadasMe;
    await avanzar(MINUTO);
    expect(llamadasMe).toBe(antes + 1); // un único temporizador
    flushMe(['GESTIONAR_SESION']);
  });

  it('8: un fallo temporal avisa sin retirar la vista; si se repite, la retira', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO);
    http
      .expectOne(URL_ME)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await microtareas();
    fixture.detectChanges();
    expect(url()).toBe('/dashboard/sesiones');
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('[data-prueba="verificacion-temporal"]')).not.toBeNull();
    expect(sesion.estado().tipo).toBe('valida');
    await avanzar(MINUTO);
    http
      .expectOne(URL_ME)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await microtareas();
    expect(url()).toBe('/dashboard?aviso=verificacion-no-disponible');
    expect(vigilada()).toBeNull();
  });

  it('8b: tras un fallo temporal, una confirmación correcta restaura el estado visual', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO);
    http
      .expectOne(URL_ME)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await avanzar(MINUTO);
    flushMe(['GESTIONAR_SESION']);
    await microtareas();
    fixture.detectChanges();
    expect(url()).toBe('/dashboard/sesiones');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-prueba="verificacion-temporal"]'),
    ).toBeNull();
  });

  it('una consulta compartida con dos eventos de foco cuenta como un solo fallo', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    ocultar();
    await microtareas();
    await avanzar(MINUTO);
    mostrar();
    await microtareas();
    http
      .expectOne(URL_ME)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await microtareas();
    expect(url()).toBe('/dashboard/sesiones');
    expect(vigilada()).toBe('sesiones');
  });

  it('una revalidación sin respuesta vence y no deja la vista abierta indefinidamente', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO);
    const primera = http.expectOne(URL_ME);
    await avanzar(MINUTO);
    expect(primera.cancelled).toBeTrue();
    expect(url()).toBe('/dashboard/sesiones');
    await avanzar(MINUTO);
    const segunda = http.expectOne(URL_ME);
    await avanzar(MINUTO);
    expect(segunda.cancelled).toBeTrue();
    expect(url()).toBe('/dashboard?aviso=verificacion-no-disponible');
  });

  it('9: un 401 en la revalidación lleva a login sin conservar acceso', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO);
    http
      .expectOne(URL_ME)
      .flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'Unauthorized' });
    await microtareas();
    expect(url()).toBe('/login');
    expect(sesion.tienePermisos(['GESTIONAR_SESION'])).toBeFalse();
  });

  it('10: un 403 de /me deja la identidad inutilizable; un 403 de operación no cierra la sesión', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO);
    http
      .expectOne(URL_ME)
      .flush({ code: 'USER_INACTIVE' }, { status: 403, statusText: 'Forbidden' });
    await microtareas();
    expect(sesion.estado().tipo).toBe('acceso-denegado');
    expect(url()).toBe('/login');
  });

  it('12: tras retirar la vista no hay ciclos de revalidación', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await avanzar(MINUTO);
    flushMe([]);
    await microtareas();
    const antes = llamadasMe;
    await avanzar(10 * MINUTO);
    expect(llamadasMe).toBe(antes);
  });

  it('13: en páginas públicas no hay consultas periódicas', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard', null);
    const antes = llamadasMe;
    await avanzar(10 * MINUTO);
    mostrar();
    await microtareas();
    expect(llamadasMe).toBe(antes);
  });

  it('14: el cierre de sesión detiene la vigilancia', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    sesion.cerrarSesion().subscribe();
    http
      .expectOne(`${B}/v1/personal/cerrar-sesion`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await microtareas();
    expect(vigilada()).toBeNull();
    const antes = llamadasMe;
    await avanzar(10 * MINUTO);
    expect(llamadasMe).toBe(antes);
  });

  it('15: abandonar la ruta protegida detiene la vigilancia; los parámetros de la misma ruta no', async () => {
    const sesion = preparar();
    entrar(sesion, ['GESTIONAR_SESION']);
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']);
    await TestBed.inject(Router).navigateByUrl('/dashboard/sesiones?sesion=' + OTRO);
    await microtareas();
    expect(vigilada()).toBe('sesiones');
    await abrir('/dashboard', null);
    expect(vigilada()).toBeNull();
    const antes = llamadasMe;
    await avanzar(10 * MINUTO);
    expect(llamadasMe).toBe(antes);
  });

  it('18: el mapeo oficial conserva las seis rutas sin habilitar', () => {
    for (const ruta of [
      'usuarios-docentes',
      'configuracion',
      'casos-academicos',
      'rubricas',
      'sesiones',
      'convocatorias',
    ])
      expect(MAPEO_RUTAS_PERSONAL_OFICIAL[ruta].habilitada).withContext(ruta).toBeFalse();
  });

  it('medición: llamadas a /me en un recorrido representativo simulado', async () => {
    const sesion = preparar();
    const hitos: string[] = [];
    const hito = (nombre: string) => hitos.push(`${nombre}: ${llamadasMe}`);
    entrar(sesion, ['GESTIONAR_SESION']); // inicio de sesión: 1 (/me del propio login)
    hito('inicio de sesión');
    await abrir('/dashboard/sesiones', ['GESTIONAR_SESION']); // entrada: confirmación del guard
    hito('entrada a ruta protegida');
    for (let i = 0; i < 3; i++) {
      await avanzar(MINUTO);
      flushMe(['GESTIONAR_SESION']);
      await microtareas();
    }
    hito('permanencia 3 min');
    ocultar();
    await microtareas();
    await avanzar(4 * MINUTO);
    hito('4 min en segundo plano');
    mostrar();
    await microtareas();
    flushMe(['GESTIONAR_SESION']);
    await microtareas();
    hito('recuperación del foco');
    await TestBed.inject(Router).navigateByUrl('/dashboard/sesiones?sesion=' + OTRO);
    await microtareas();
    hito('navegación dentro de la sección');
    await abrir('/dashboard/configuracion', null); // identidad confirmada hace < 15 s: reutilizada
    hito('navegación a otra ruta protegida');
    await abrir('/dashboard', null);
    await avanzar(5 * MINUTO);
    hito('salida a página pública (5 min)');
    sesion.cerrarSesion().subscribe();
    http
      .expectOne(`${B}/v1/personal/cerrar-sesion`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await avanzar(5 * MINUTO);
    hito('cierre de sesión (5 min)');
    console.log('MEDICION /me FE-58\n' + hitos.join('\n'));
    expect(llamadasMe).toBe(6);
  });
});

// FE-58 H-58-01-12: la caracterización «sin guard» se sustituye por la matriz ratificada por
// Dirección Central (DC-FE-58-H58-01-IMPLEMENTACION-11). Detalle en fe58-simulador.spec.ts.
describe('FE-58 H-58-01 rutas del simulador (matriz ratificada)', () => {
  it('16 y 17: las rutas del simulador exigen el entorno demo; /simulador redirige al destino protegido', () => {
    const simulador = rutasApp.filter((r) => r.path?.startsWith('simulador'));
    expect(simulador.map((r) => r.path)).toEqual([
      'simulador',
      'simulador-tecnico-2d5',
      'simulador-integrado',
      'simulador-unreal',
    ]);
    const [redireccion, ...destinos] = simulador;
    expect(redireccion.redirectTo).toBe('simulador-unreal');
    for (const r of destinos)
      expect(r.canActivate)
        .withContext(r.path ?? '')
        .toEqual([
          r.path === 'simulador-unreal' ? requiereAccesoSimulador : requiereEntornoDemostracion,
        ]);
  });
});
