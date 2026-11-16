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
    title: 'Simulador · PRISALY',
    loadComponent: () =>
      import('./features/simulador/pages/simulador-temporal').then((m) => m.SimuladorTemporal),
  },
  {
    path: 'simulador-integrado',
    title: 'Simulador Integrado · PRISALY',
    loadComponent: () =>
      import('./features/simulador/pages/simulador-integrado-page').then(
        (m) => m.SimuladorIntegradoPage
      ),
  },
  { path: '**', redirectTo: 'login' },
];
