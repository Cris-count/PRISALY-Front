import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { CredencialPersonalMemoria } from './m1-personal-memoria';
import { SesionPersonalM1 } from './m1-personal-sesion';

/**
 * No sustituye la autorización del Backend. DC-114: tras una recarga, si la pestaña conserva una credencial,
 * se revalida con `GET /v1/personal/me` antes de decidir; sin confirmación del servidor se va a `/login`.
 */
export const requiereSesionPersonalM1: CanActivateFn = () => {
  const sesion = inject(SesionPersonalM1);
  const router = inject(Router);
  if (sesion.estado().tipo === 'valida') return true;
  if (!inject(CredencialPersonalMemoria).hayCredencial()) return router.createUrlTree(['/login']);
  return sesion
    .verificarSesion()
    .pipe(map((e) => (e.tipo === 'valida' ? true : router.createUrlTree(['/login']))));
};

/** El integrador deberá recibir el mapeo aprobado por ruta. No deriva permisos del rol. */
export function requierePermisosPersonalM1(...permisos: string[]): CanActivateFn {
  return () => {
    const sesion = inject(SesionPersonalM1);
    if (sesion.estado().tipo !== 'valida') return inject(Router).createUrlTree(['/login']);
    return sesion.tienePermisos(permisos);
  };
}
