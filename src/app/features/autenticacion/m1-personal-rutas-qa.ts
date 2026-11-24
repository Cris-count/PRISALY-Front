import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, Observable } from 'rxjs';
import { AccesoDemoLocal } from './acceso-demo-local';
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
  if (!inject(M1_PERSONAL_LOCAL)) {
    if (inject(DEMOSTRACIONES_HABILITADAS)) return true;
    const demo = inject(AccesoDemoLocal);
    if (demo.esPersonal()) return true;
    if (demo.actual()?.rol === 'ESTUDIANTE')
      return inject(Router).createUrlTree(['/dashboard/estudiante']);
    return salidaSinDemostracion();
  }
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
  if (!inject(M1_PERSONAL_LOCAL)) {
    if (inject(DEMOSTRACIONES_HABILITADAS)) return true;
    const demo = inject(AccesoDemoLocal).actual();
    const router = inject(Router);
    if (!demo) return salidaSinDemostracion();
    if (demo.rol === 'ESTUDIANTE') return router.createUrlTree(['/dashboard/estudiante']);
    const camino = ruta.routeConfig?.path ?? '';
    const decision = decidirRuta(
      inject(MAPEO_RUTAS_PERSONAL)[camino],
      true,
      (permisos) => permisos.every((codigo) => demo.permisos.includes(codigo)),
      (rolExigido) => demo.rol === rolExigido,
    );
    return decision === 'autorizada'
      ? true
      : router.createUrlTree(['/dashboard'], { queryParams: { aviso: avisoDeDecision(decision) } });
  }
  const sesionOk = requiereSesionPersonalM1(ruta, estado);
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
