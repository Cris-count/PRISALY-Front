import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionPersonalM1 } from './m1-personal-sesion';

/** Preparados, sin registro en rutas. No sustituyen la autorización del Backend. */
export const requiereSesionPersonalM1: CanActivateFn = () =>
  inject(SesionPersonalM1).estado().tipo === 'valida' || inject(Router).createUrlTree(['/login']);

/** El integrador deberá recibir el mapeo aprobado por ruta. No deriva permisos del rol. */
export function requierePermisosPersonalM1(...permisos: string[]): CanActivateFn {
  return () => {
    const sesion = inject(SesionPersonalM1);
    if (sesion.estado().tipo !== 'valida') return inject(Router).createUrlTree(['/login']);
    return sesion.tienePermisos(permisos);
  };
}
