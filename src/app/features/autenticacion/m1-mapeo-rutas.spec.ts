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
import { BehaviorSubject } from 'rxjs';
import { DASHBOARD_SECCIONES } from '../dashboard/dashboard-secciones';
import { AvisoAccesoPersonal } from './aviso-acceso-personal';
import {
  decidirRuta,
  MAPEO_RUTAS_PERSONAL,
  MAPEO_RUTAS_PERSONAL_OFICIAL,
  MapeoRutaPersonal,
} from './m1-mapeo-rutas';
import { provideM1PersonalLocal } from './m1-personal-http';
import { EstadoSesionPersonal } from './m1-personal.models';
import { requiereMapeoPersonalQa } from './m1-personal-rutas-qa';
import { SesionPersonalM1 } from './m1-personal-sesion';

function sesionCon(permisos: string[], rol = 'DOCENTE'): EstadoSesionPersonal {
  return {
    tipo: 'valida',
    identidad: {
      userId: 'personal-prueba',
      correo: 'personal@example.invalid',
      nombre: 'Personal prueba',
      rol,
      permisos,
      authPrototype: 'TD-M1-AUTH-PROVISIONAL',
    },
  } as EstadoSesionPersonal;
}

describe('FE-54 mapeo oficial ruta–permiso', () => {
  it('ninguna ruta tiene asociación aprobada (BLQ-53-01 vigente)', () => {
    for (const s of DASHBOARD_SECCIONES) {
      expect(MAPEO_RUTAS_PERSONAL_OFICIAL[s.ruta]).withContext(s.ruta).toBeDefined();
      expect(MAPEO_RUTAS_PERSONAL_OFICIAL[s.ruta].aprobado).withContext(s.ruta).toBeNull();
    }
  });

  it('decidirRuta nunca autoriza por omisión, rol ni permisos documentados', () => {
    const todos = () => true;
    expect(decidirRuta(undefined, true, todos)).toBe('pendiente');
    expect(decidirRuta(MAPEO_RUTAS_PERSONAL_OFICIAL['sesiones'], true, todos)).toBe('pendiente');
    const vacio: MapeoRutaPersonal = {
      ruta: 'x',
      permisosBackend: [],
      rolBackend: null,
      aprobado: { permisos: [] },
    };
    expect(decidirRuta(vacio, true, todos)).toBe('pendiente');
    expect(decidirRuta(MAPEO_RUTAS_PERSONAL_OFICIAL['sesiones'], false, todos)).toBe('sin-sesion');
  });
});

describe('FE-54 guard de personal con mapeo (sesión y mapeo simulados)', () => {
  let estado: WritableSignal<EstadoSesionPersonal>;
  const destino = {} as RouterStateSnapshot;
  const ruta = (path: string) => ({ routeConfig: { path } }) as unknown as ActivatedRouteSnapshot;

  // SIMULACIÓN: mapeo aprobado ficticio para probar el mecanismo; no es una decisión oficial.
  const SIMULADO: Record<string, MapeoRutaPersonal> = {
    ...MAPEO_RUTAS_PERSONAL_OFICIAL,
    sesiones: {
      ...MAPEO_RUTAS_PERSONAL_OFICIAL['sesiones'],
      aprobado: { permisos: ['PERMISO_SIMULADO'] },
    },
  };

  function preparar(mapeo: Record<string, MapeoRutaPersonal> | null, qa = true): void {
    estado = signal<EstadoSesionPersonal>({ tipo: 'no-autenticada' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ...(qa ? [provideM1PersonalLocal()] : []),
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
          },
        },
      ],
    });
  }
  const decidir = (path: string) =>
    TestBed.runInInjectionContext(() => requiereMapeoPersonalQa(ruta(path), destino));
  const url = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('fuera del opt-in QA conserva la demostración pública', () => {
    preparar(SIMULADO, false);
    expect(decidir('sesiones')).toBeTrue();
  });

  it('sin sesión redirige a login', () => {
    preparar(SIMULADO);
    expect(url(decidir('sesiones'))).toBe('/login');
  });

  it('con el mapeo oficial vigente toda ruta queda pendiente, incluso con permisos y rol ADMINISTRADOR', () => {
    preparar(null);
    estado.set(
      sesionCon(
        ['CREAR_CASO', 'CONSULTAR_CASO', 'MODIFICAR_CASO', 'GESTIONAR_SESION'],
        'ADMINISTRADOR',
      ),
    );
    for (const s of DASHBOARD_SECCIONES)
      expect(url(decidir(s.ruta)))
        .withContext(s.ruta)
        .toBe('/dashboard?aviso=permisos-pendientes');
  });

  it('ruta aprobada (simulada) autoriza con el permiso exigido', () => {
    preparar(SIMULADO);
    estado.set(sesionCon(['PERMISO_SIMULADO']));
    expect(decidir('sesiones')).toBeTrue();
  });

  it('ruta aprobada (simulada) deniega con permisos insuficientes, sin elevar privilegios por rol', () => {
    preparar(SIMULADO);
    estado.set(sesionCon(['GESTIONAR_SESION'], 'ADMINISTRADOR'));
    expect(url(decidir('sesiones'))).toBe('/dashboard?aviso=permiso-insuficiente');
    expect(url(decidir('convocatorias'))).toBe('/dashboard?aviso=permisos-pendientes');
  });

  it('una sesión expirada (p. ej. tras un 401) vuelve a login', () => {
    preparar(SIMULADO);
    estado.set(sesionCon(['PERMISO_SIMULADO']));
    expect(decidir('sesiones')).toBeTrue();
    estado.set({ tipo: 'expirada' });
    expect(url(decidir('sesiones'))).toBe('/login');
  });
});

describe('FE-54 aviso de acceso de personal', () => {
  function montar(aviso: string | null, sesion: EstadoSesionPersonal) {
    const q = new BehaviorSubject(convertToParamMap(aviso ? { aviso } : {}));
    TestBed.configureTestingModule({
      imports: [AvisoAccesoPersonal],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: q } },
        { provide: SesionPersonalM1, useValue: { estado: signal(sesion) } },
      ],
    });
    const f = TestBed.createComponent(AvisoAccesoPersonal);
    f.detectChanges();
    return (f.nativeElement as HTMLElement).textContent ?? '';
  }

  it('explica el mapeo pendiente y muestra los permisos efectivos reales de la sesión', () => {
    const t = montar('permisos-pendientes', sesionCon(['CREAR_CASO']));
    expect(t).toContain('pendiente de aprobación');
    expect(t).toContain('CREAR_CASO');
  });

  it('explica permisos insuficientes', () => {
    expect(montar('permiso-insuficiente', { tipo: 'no-autenticada' })).toContain(
      'no tiene los permisos',
    );
  });

  it('no muestra nada sin aviso o con un aviso desconocido', () => {
    expect(montar(null, sesionCon([])).trim()).toBe('');
    TestBed.resetTestingModule();
    expect(montar('<script>', sesionCon([])).trim()).toBe('');
  });
});
