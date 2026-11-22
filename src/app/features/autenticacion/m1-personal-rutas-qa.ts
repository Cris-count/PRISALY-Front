import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { M1_PERSONAL_LOCAL } from './m1-personal-http';
import { requiereSesionPersonalM1 } from './m1-personal-guards';
import { decidirRuta, MAPEO_RUTAS_PERSONAL } from './m1-mapeo-rutas';
import { SesionPersonalM1 } from './m1-personal-sesion';

/** Las demostraciones existentes permanecen públicas fuera del opt-in QA. */
export const requiereSesionPersonalQa: CanActivateFn = (ruta, estado) =>
  inject(M1_PERSONAL_LOCAL) ? requiereSesionPersonalM1(ruta, estado) : true;

/**
 * Navegación de personal según el mapeo oficial ruta–permiso (`MAPEO_RUTAS_PERSONAL`).
 * Mientras una ruta no tenga asociación aprobada se redirige con `aviso=permisos-pendientes`:
 * no se habilitan operaciones por nombre de rol ni por permisos supuestos.
 */
export const requiereMapeoPersonalQa: CanActivateFn = (ruta, estado) => {
  if (!inject(M1_PERSONAL_LOCAL)) return true;
  const sesionOk = requiereSesionPersonalM1(ruta, estado);
  if (sesionOk !== true) return sesionOk;
  const sesion = inject(SesionPersonalM1);
  const decision = decidirRuta(
    inject(MAPEO_RUTAS_PERSONAL)[ruta.routeConfig?.path ?? ''],
    sesion.estado().tipo === 'valida',
    (permisos) => sesion.tienePermisos(permisos),
  );
  if (decision === 'autorizada') return true;
  if (decision === 'sin-sesion') return inject(Router).createUrlTree(['/login']);
  return inject(Router).createUrlTree(['/dashboard'], {
    queryParams: {
      aviso: decision === 'insuficiente' ? 'permiso-insuficiente' : 'permisos-pendientes',
    },
  });
};
