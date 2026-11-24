import { inject, InjectionToken, Provider } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AccesoDemoLocal } from './acceso-demo-local';
import { M1_PERSONAL_LOCAL } from './m1-personal-http';

/**
 * H-58-01 (opción B, DC-FE-58-RESOLUCION-04). Las demostraciones solo existen en un entorno
 * identificado expresamente (`environment.demo.ts`). El valor se fija al compilar: no depende de la
 * URL, de parámetros ni de almacenamiento del navegador. Ante cualquier valor distinto de `true`,
 * las demostraciones quedan bloqueadas.
 */
export const DEMOSTRACIONES_HABILITADAS = new InjectionToken<boolean>(
  'DEMOSTRACIONES_HABILITADAS',
  {
    providedIn: 'root',
    factory: () =>
      (environment as { demostracionesHabilitadas?: unknown }).demostracionesHabilitadas === true,
  },
);

/** Solo para pruebas del entorno de demostración. No se registra en `app.config`. */
export function provideEntornoDemostracionAutorizado(): Provider {
  return { provide: DEMOSTRACIONES_HABILITADAS, useValue: true };
}

/** Destino cuando una demostración no está autorizada en el entorno actual. */
export function salidaSinDemostracion() {
  return inject(M1_PERSONAL_LOCAL)
    ? inject(Router).createUrlTree(['/dashboard'], {
        queryParams: { aviso: 'demostracion-no-autorizada' },
      })
    : inject(Router).createUrlTree(['/login']);
}

/**
 * Rutas que solo son demostración (presentación sin datos reales ni sesión).
 * La cuenta local de estudiante abre únicamente `/dashboard/estudiante`.
 * El simulador sigue exigiendo el entorno demo.
 */
export const requiereEntornoDemostracion: CanActivateFn = (ruta) => {
  if (inject(DEMOSTRACIONES_HABILITADAS) === true) return true;
  if (
    ruta.routeConfig?.path === 'estudiante' &&
    inject(AccesoDemoLocal).actual()?.rol === 'ESTUDIANTE'
  ) {
    return true;
  }
  return salidaSinDemostracion();
};
