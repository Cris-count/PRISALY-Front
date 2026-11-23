import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  convertToParamMap,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { BehaviorSubject, isObservable, of } from 'rxjs';
import { provideApiConfig } from '../../core/config/api.config';
import { AvisoAccesoPersonal } from './aviso-acceso-personal';
import {
  decidirRuta,
  MAPEO_RUTAS_PERSONAL,
  MAPEO_RUTAS_PERSONAL_OFICIAL,
  MapeoRutaPersonal,
} from './m1-mapeo-rutas';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { EstadoSesionPersonal } from './m1-personal.models';
import { requiereMapeoPersonalQa } from './m1-personal-rutas-qa';
import { SesionPersonalM1 } from './m1-personal-sesion';

/**
 * FE-58. Requisito de rol en el mapeo ruta–permiso. Todas las aprobaciones de este archivo son
 * SIMULACIONES identificadas para probar el mecanismo; no modifican `MAPEO_RUTAS_PERSONAL_OFICIAL`.
 * FE-58-05: las simulaciones fijan `habilitada: true`; el mapeo oficial incorpora la matriz aprobada
 * por Dirección Central pero mantiene todas las rutas sin habilitar.
 */
const conRequisito = (
  aprobado: MapeoRutaPersonal['aprobado'],
  base: MapeoRutaPersonal = MAPEO_RUTAS_PERSONAL_OFICIAL['usuarios-docentes'],
): MapeoRutaPersonal => ({ ...base, aprobado, habilitada: true });

const todos = () => true;
const ninguno = () => false;

describe('FE-58 decidirRuta con requisito de rol (unitarias, aprobaciones simuladas)', () => {
  it('el mapeo oficial no habilita ninguna ruta: administración queda preparada, no abierta', () => {
    for (const m of Object.values(MAPEO_RUTAS_PERSONAL_OFICIAL))
      expect(m.habilitada).withContext(m.ruta).toBeFalse();
    expect(MAPEO_RUTAS_PERSONAL_OFICIAL['usuarios-docentes'].aprobado).toEqual({
      rol: 'ADMINISTRADOR',
      permisos: [],
    });
    expect(decidirRuta(MAPEO_RUTAS_PERSONAL_OFICIAL['usuarios-docentes'], true, todos, todos)).toBe(
      'preparada',
    );
  });

  it('un permiso individual nunca sustituye al rol exigido', () => {
    const soloRol = conRequisito({ rol: 'ADMINISTRADOR', permisos: [] });
    expect(decidirRuta(soloRol, true, todos, ninguno)).toBe('rol-insuficiente');
    const rolYPermiso = conRequisito({ rol: 'ADMINISTRADOR', permisos: ['PERMISO_SIMULADO'] });
    expect(decidirRuta(rolYPermiso, true, todos, ninguno)).toBe('rol-insuficiente');
  });

  it('con rol y permisos exige ambos', () => {
    const req = conRequisito({ rol: 'ADMINISTRADOR', permisos: ['PERMISO_SIMULADO'] });
    expect(decidirRuta(req, true, ninguno, todos)).toBe('insuficiente');
    expect(decidirRuta(req, true, todos, todos)).toBe('autorizada');
  });

  it('un requisito solo de rol autoriza únicamente con ese rol', () => {
    const req = conRequisito({ rol: 'ADMINISTRADOR', permisos: [] });
    expect(decidirRuta(req, true, ninguno, (r) => r === 'ADMINISTRADOR')).toBe('autorizada');
  });

  it('sin comprobador de rol, un requisito de rol se deniega (restrictivo por defecto)', () => {
    expect(decidirRuta(conRequisito({ rol: 'ADMINISTRADOR', permisos: [] }), true, todos)).toBe(
      'rol-insuficiente',
    );
  });

  it('requisitos vacíos o mal formados quedan pendientes', () => {
    for (const aprobado of [
      { permisos: [] },
      { rol: null, permisos: [] },
      { rol: '', permisos: [] },
      { rol: ' ADMINISTRADOR', permisos: [] },
      { rol: 'ADMINISTRADOR', permisos: [''] },
      { permisos: ['PERMISO_SIMULADO', ' '] },
      { permisos: 'CREAR_CASO' as unknown as string[] },
    ])
      expect(decidirRuta(conRequisito(aprobado), true, todos, todos))
        .withContext(JSON.stringify(aprobado))
        .toBe('pendiente');
  });

  it('rechaza una lista dispersa de permisos aunque el comprobador acepte la lista', () => {
    const permisos = new Array<string>(1);
    expect(decidirRuta(conRequisito({ permisos }), true, todos, todos)).toBe('pendiente');
  });

  it('sin sesión la decisión es siempre login, con o sin requisito', () => {
    expect(
      decidirRuta(conRequisito({ rol: 'ADMINISTRADOR', permisos: [] }), false, todos, todos),
    ).toBe('sin-sesion');
    expect(decidirRuta(undefined, false, todos, todos)).toBe('sin-sesion');
  });
});

describe('FE-58 SesionPersonalM1.tieneRol (HTTP simulado)', () => {
  let http: HttpTestingController;
  const respuesta = (rol: string, permisos: string[]) => ({
    accessToken: 'token-prueba',
    tokenType: 'Bearer',
    userId: 'personal-prueba',
    correo: 'personal@example.invalid',
    nombre: 'Personal prueba',
    rol,
    permisos,
    authPrototype: 'TD-M1-AUTH-PROVISIONAL',
  });
  function entrar(rol: string, permisos: string[]): SesionPersonalM1 {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
        provideApiConfig('/api-prueba'),
        provideM1PersonalLocal(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const sesion = TestBed.inject(SesionPersonalM1);
    sesion.autenticar({ correo: 'personal@example.invalid', password: 'solo-prueba' }).subscribe();
    http.expectOne('/api-prueba/v1/personal/autenticar').flush(respuesta(rol, permisos));
    http
      .expectOne('/api-prueba/v1/personal/me')
      .flush({ ...respuesta(rol, permisos), accessToken: null });
    return sesion;
  }
  afterEach(() => http.verify());

  it('compara el rol de /me de forma exacta', () => {
    const sesion = entrar('ADMINISTRADOR', []);
    expect(sesion.tieneRol('ADMINISTRADOR')).toBeTrue();
    expect(sesion.tieneRol('administrador')).toBeFalse();
    expect(sesion.tieneRol('')).toBeFalse();
  });

  it('no deduce el rol de los permisos', () => {
    const sesion = entrar('DOCENTE', ['ADMINISTRADOR', 'CREAR_CASO']);
    expect(sesion.tieneRol('ADMINISTRADOR')).toBeFalse();
  });

  it('tras cerrar sesión no conserva el rol', () => {
    const sesion = entrar('ADMINISTRADOR', []);
    sesion.cerrarSesion().subscribe();
    http
      .expectOne('/api-prueba/v1/personal/cerrar-sesion')
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(sesion.tieneRol('ADMINISTRADOR')).toBeFalse();
  });
});

describe('FE-58 guard con requisito de rol (sesión y mapeo simulados)', () => {
  let estado: WritableSignal<EstadoSesionPersonal>;
  const sesionCon = (rol: string, permisos: string[]): EstadoSesionPersonal =>
    ({
      tipo: 'valida',
      identidad: {
        userId: 'personal-prueba',
        correo: 'personal@example.invalid',
        nombre: 'Personal prueba',
        rol,
        permisos,
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    }) as EstadoSesionPersonal;

  // SIMULACIÓN: administración aprobada solo por rol, para probar el mecanismo.
  const SIMULADO: Record<string, MapeoRutaPersonal> = {
    ...MAPEO_RUTAS_PERSONAL_OFICIAL,
    'usuarios-docentes': conRequisito({ rol: 'ADMINISTRADOR', permisos: [] }),
    sesiones: conRequisito(
      { permisos: ['GESTIONAR_SESION'] },
      MAPEO_RUTAS_PERSONAL_OFICIAL['sesiones'],
    ),
  };

  function preparar(mapeo: Record<string, MapeoRutaPersonal> | null): void {
    estado = signal<EstadoSesionPersonal>({ tipo: 'no-autenticada' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideM1PersonalLocal(),
        ...(mapeo ? [{ provide: MAPEO_RUTAS_PERSONAL, useValue: mapeo }] : []),
        {
          provide: SesionPersonalM1,
          useValue: {
            estado,
            tienePermisos: (p: readonly string[]) => {
              const e = estado();
              return (
                e.tipo === 'valida' &&
                p.length > 0 &&
                p.every((x) => e.identidad.permisos.includes(x))
              );
            },
            tieneRol: (r: string) => {
              const e = estado();
              return e.tipo === 'valida' && e.identidad.rol === r;
            },
            // SIMULACIÓN: `/me` confirma la identidad mostrada.
            actualizarIdentidad: () => of(estado().tipo === 'valida' ? 'vigente' : 'no-vigente'),
          },
        },
      ],
    });
  }
  const ruta = (path: string) => ({ routeConfig: { path } }) as unknown as ActivatedRouteSnapshot;
  const decidir = (path: string) => {
    const r = TestBed.runInInjectionContext(() =>
      requiereMapeoPersonalQa(ruta(path), {} as RouterStateSnapshot),
    );
    if (!isObservable(r)) return r;
    let valor: unknown;
    r.subscribe((v) => (valor = v));
    return valor;
  };
  const url = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('con el mapeo oficial, un ADMINISTRADOR real queda en habilitación pendiente', () => {
    preparar(null);
    estado.set(sesionCon('ADMINISTRADOR', []));
    expect(url(decidir('usuarios-docentes'))).toBe('/dashboard?aviso=habilitacion-pendiente');
  });

  it('administración simulada por rol: un docente con todos los permisos recibe rol-insuficiente', () => {
    preparar(SIMULADO);
    estado.set(
      sesionCon('DOCENTE', [
        'CREAR_CASO',
        'CONSULTAR_CASO',
        'MODIFICAR_CASO',
        'PUBLICAR_CASO',
        'GESTIONAR_SESION',
      ]),
    );
    expect(url(decidir('usuarios-docentes'))).toBe('/dashboard?aviso=rol-insuficiente');
  });

  it('administración simulada por rol: el rol exacto autoriza la navegación', () => {
    preparar(SIMULADO);
    estado.set(sesionCon('ADMINISTRADOR', []));
    expect(decidir('usuarios-docentes')).toBeTrue();
  });

  it('el rol ADMINISTRADOR no abre una ruta docente aprobada por permiso (simulada)', () => {
    preparar(SIMULADO);
    estado.set(sesionCon('ADMINISTRADOR', []));
    expect(url(decidir('sesiones'))).toBe('/dashboard?aviso=permiso-insuficiente');
  });

  it('revocación: al perder el permiso en /me, la ruta simulada deja de autorizarse', () => {
    preparar(SIMULADO);
    estado.set(sesionCon('DOCENTE', ['GESTIONAR_SESION']));
    expect(decidir('sesiones')).toBeTrue();
    estado.set(sesionCon('DOCENTE', []));
    expect(url(decidir('sesiones'))).toBe('/dashboard?aviso=permiso-insuficiente');
  });

  it('ruta desconocida o sin sesión: pendiente o login', () => {
    preparar(SIMULADO);
    expect(url(decidir('usuarios-docentes'))).toBe('/login');
    estado.set(sesionCon('ADMINISTRADOR', []));
    expect(url(decidir('ruta-inexistente'))).toBe('/dashboard?aviso=permisos-pendientes');
  });
});

describe('FE-58 aviso de rol insuficiente', () => {
  function montar(aviso: string, rol = 'DOCENTE') {
    const q = new BehaviorSubject(convertToParamMap({ aviso }));
    TestBed.configureTestingModule({
      imports: [AvisoAccesoPersonal],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: q } },
        {
          provide: SesionPersonalM1,
          useValue: {
            estado: signal({
              tipo: 'valida',
              identidad: {
                userId: 'p',
                correo: 'p@example.invalid',
                nombre: 'P',
                rol,
                permisos: ['CREAR_CASO'],
                authPrototype: 'TD-M1-AUTH-PROVISIONAL',
              },
            }),
          },
        },
      ],
    });
    const f = TestBed.createComponent(AvisoAccesoPersonal);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('explica que los permisos no sustituyen al rol y muestra el rol real', () => {
    const el = montar('rol-insuficiente');
    expect(el.textContent).toContain('Los permisos individuales no sustituyen al rol');
    expect(el.querySelector('[data-prueba="rol-sesion"]')?.textContent).toContain('DOCENTE');
  });

  it('no muestra el rol en otros avisos', () => {
    const el = montar('permisos-pendientes');
    expect(el.querySelector('[data-prueba="rol-sesion"]')).toBeNull();
  });
});
