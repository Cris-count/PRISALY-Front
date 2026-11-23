import { Routes } from '@angular/router';
import { requiereEntornoDemostracion } from './features/autenticacion/entorno-demostracion';

/**
 * H-58-01 (DC-FE-58-H58-01-IMPLEMENTACION-11): las rutas del simulador son demostración técnica
 * (categoría A) y solo se activan en el entorno `demo`. El guard actúa en el Router, también ante
 * URL directa, recarga o historial; si deniega, el componente no se monta (ni Phaser ni Unreal).
 * `/simulador-integrado` es A/B: aquí solo existe su modalidad demostrativa; la académica sigue
 * deshabilitada (sin enlace de entradas desde la URL y con `ParticipacionPendienteGateway`).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Iniciar sesión · PRISALY',
    loadComponent: () => import('./features/autenticacion/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    // Redirección conservada; el destino exige el entorno demo, así que fuera de él no se monta.
    path: 'simulador',
    pathMatch: 'full',
    redirectTo: 'simulador-unreal',
  },
  {
    path: 'simulador-tecnico-2d5',
    title: 'Simulador técnico anterior · PRISALY',
    canActivate: [requiereEntornoDemostracion],
    loadComponent: () =>
      import('./features/simulador/pages/simulador-temporal').then((m) => m.SimuladorTemporal),
  },
  {
    path: 'simulador-integrado',
    title: 'Acceso al simulador · PRISALY',
    canActivate: [requiereEntornoDemostracion],
    loadComponent: () =>
      import('./features/simulador/pages/simulador-integrado-page').then(
        (m) => m.SimuladorIntegradoPage
      ),
  },
  {
    path: 'simulador-unreal',
    title: 'Ciudad 3D · PRISALY',
    canActivate: [requiereEntornoDemostracion],
    loadComponent: () => import('./features/simulador/unreal/simulador-unreal-page').then((m) => m.SimuladorUnrealPage),
  },
  { path: '**', redirectTo: 'login' },
];
