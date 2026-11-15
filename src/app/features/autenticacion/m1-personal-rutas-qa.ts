import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { M1_PERSONAL_LOCAL } from './m1-personal-http';
import { requiereSesionPersonalM1 } from './m1-personal-guards';

/** Las demostraciones existentes permanecen públicas fuera del opt-in QA. */
export const requiereSesionPersonalQa: CanActivateFn = (ruta, estado) =>
  inject(M1_PERSONAL_LOCAL) ? requiereSesionPersonalM1(ruta, estado) : true;

/** No hay mapeo oficial de permisos por ruta: no habilitar operaciones por nombre de rol. */
export const requiereMapeoPersonalQa: CanActivateFn = (ruta, estado) => {
  if (!inject(M1_PERSONAL_LOCAL)) return true;
  const sesion = requiereSesionPersonalM1(ruta, estado);
  if (sesion !== true) return sesion;
  return inject(Router).createUrlTree(['/dashboard'], {
    queryParams: { aviso: 'permisos-pendientes' },
  });
};
