import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'simulador' },
  {
    path: 'simulador',
    title: 'Simulador · PRISALY',
    loadComponent: () =>
      import('./features/simulador/pages/simulador-page').then((m) => m.SimuladorPage),
  },
  { path: '**', redirectTo: 'simulador' },
];
