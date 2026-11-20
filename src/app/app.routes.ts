import { Routes } from '@angular/router';

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
    path: 'simulador',
    pathMatch: 'full',
    redirectTo: 'simulador-unreal',
  },
  {
    path: 'simulador-tecnico-2d5',
    title: 'Simulador técnico anterior · PRISALY',
    loadComponent: () =>
      import('./features/simulador/pages/simulador-temporal').then((m) => m.SimuladorTemporal),
  },
  {
    path: 'simulador-integrado',
    title: 'Acceso al simulador · PRISALY',
    loadComponent: () =>
      import('./features/simulador/pages/simulador-integrado-page').then(
        (m) => m.SimuladorIntegradoPage
      ),
  },
  {
    path: 'simulador-unreal',
    title: 'Ciudad 3D · PRISALY',
    loadComponent: () => import('./features/simulador/unreal/simulador-unreal-page').then((m) => m.SimuladorUnrealPage),
  },
  { path: '**', redirectTo: 'login' },
];
