import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { asapScheduler, from, isObservable, map, Observable, observeOn, of, switchMap } from 'rxjs';
import { DEMOSTRACIONES_HABILITADAS, salidaSinDemostracion } from './entorno-demostracion';
import { M1_PERSONAL_LOCAL } from './m1-personal-http';
import { requiereSesionPersonalM1 } from './m1-personal-guards';
import { avisoDeDecision, decidirRuta, MAPEO_RUTAS_PERSONAL } from './m1-mapeo-rutas';
import { SesionPersonalM1 } from './m1-personal-sesion';
import { VigilanciaAccesoPersonal } from './vigilancia-acceso-personal';

/**
 * Fuera del opt-in QA las pantallas de personal solo existen como demostración, y únicamente en el
 * entorno de demostración autorizado (H-58-01, opción B). En producción redirige a `/login`.
 */
export const requiereSesionPersonalQa: CanActivateFn = (ruta, estado) => {
  if (!inject(M1_PERSONAL_LOCAL))
    return inject(DEMOSTRACIONES_HABILITADAS) || salidaSinDemostracion();
  return requiereSesionPersonalM1(ruta, estado);
};

/**
 * Navegación de personal según el mapeo oficial (`MAPEO_RUTAS_PERSONAL`).
 *
 * - Sin aprobación o con requisito mal formado: `aviso=permisos-pendientes`.
 * - Aprobada pero no habilitada: `aviso=habilitacion-pendiente`, sin consultar el servidor.
 * - Habilitada: confirma la identidad con `/me` (H-58-02) y decide con los datos vigentes; si no
 *   puede confirmarse, deniega (`aviso=verificacion-no-disponible`). Al autorizar, deja la ruta
 *   vigilada para cerrarla si el acceso se pierde con la pantalla abierta.
 *
 * La autorización nunca depende de parámetros de URL: solo de la ruta configurada y de `/me`.
 */
export const requiereMapeoPersonalQa: CanActivateFn = (ruta, estado) => {
  if (!inject(M1_PERSONAL_LOCAL))
    return inject(DEMOSTRACIONES_HABILITADAS) || salidaSinDemostracion();
  const sesionOk = requiereSesionPersonalM1(ruta, estado);
  if (isObservable(sesionOk)) {
    // DC-114: sesión restaurada tras recarga; una vez confirmada por `/me`, se aplica el mapeo completo.
    const injector = inject(EnvironmentInjector);
    return sesionOk.pipe(
      // DC-121: la revalidación libera la sesión al terminar; sin esperar, la comprobación de `/me` del mapeo
      // la encontraba ocupada («no vigente») y la recarga de una sección acababa en `/login`.
      observeOn(asapScheduler),
      switchMap((r) => {
        if (r !== true) return of(r);
        const otra = runInInjectionContext(injector, () => requiereMapeoPersonalQa(ruta, estado));
        return isObservable(otra) ? otra : otra instanceof Promise ? from(otra) : of(otra);
      }),
    );
  }
  if (sesionOk !== true) return sesionOk;
  const sesion = inject(SesionPersonalM1);
  const router = inject(Router);
  const vigilancia = inject(VigilanciaAccesoPersonal);
  const camino = ruta.routeConfig?.path ?? '';
  const mapeo = inject(MAPEO_RUTAS_PERSONAL)[camino];
  const decidir = () =>
    decidirRuta(
      mapeo,
      sesion.estado().tipo === 'valida',
      (permisos) => sesion.tienePermisos(permisos),
      (rol) => sesion.tieneRol(rol),
    );
  const salida = (decision: ReturnType<typeof decidir>): UrlTree =>
    decision === 'sin-sesion'
      ? router.createUrlTree(['/login'])
      : router.createUrlTree(['/dashboard'], { queryParams: { aviso: avisoDeDecision(decision) } });

  const previa = decidir();
  // Pendiente, preparada o sin sesión: la identidad vigente no cambia el resultado; no se consulta.
  if (previa === 'sin-sesion' || previa === 'pendiente' || previa === 'preparada')
    return salida(previa);

  const verificada: Observable<boolean | UrlTree> = sesion.actualizarIdentidad().pipe(
    map((verificacion) => {
      if (verificacion === 'no-disponible')
        return router.createUrlTree(['/dashboard'], {
          queryParams: { aviso: 'verificacion-no-disponible' },
        });
      const decision = decidir();
      if (verificacion !== 'vigente' || decision !== 'autorizada')
        return salida(decision === 'autorizada' ? 'sin-sesion' : decision);
      vigilancia.vigilar(camino);
      return true;
    }),
  );
  return verificada;
};
