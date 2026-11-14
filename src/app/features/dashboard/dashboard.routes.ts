import { Routes } from '@angular/router';
import { DASHBOARD_ESTUDIANTE, DASHBOARD_SECCIONES } from './dashboard-secciones';
import { VISTAS_DOCENTES } from './docente-vistas';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Inicio · Dashboard PRISALY',
        data: { titulo: 'Inicio' },
        loadComponent: () => import('./dashboard-inicio').then((m) => m.DashboardInicio),
      },
      {
        path: DASHBOARD_ESTUDIANTE.ruta,
        title: `${DASHBOARD_ESTUDIANTE.titulo} · PRISALY`,
        data: { titulo: DASHBOARD_ESTUDIANTE.titulo },
        loadComponent: () => import('./dashboard-estudiante').then((m) => m.DashboardEstudiante),
      },
      ...DASHBOARD_SECCIONES.map((seccion) => ({
        path: seccion.ruta,
        title: `${seccion.titulo} · PRISALY`,
        data: { titulo: seccion.titulo, seccion },
        loadComponent:
          seccion.ruta === 'usuarios-docentes'
            ? () => import('./dashboard-administracion').then((m) => m.DashboardAdministracion)
            : Object.hasOwn(VISTAS_DOCENTES, seccion.ruta)
              ? () => import('./dashboard-docente').then((m) => m.DashboardDocente)
              : () => import('./dashboard-seccion').then((m) => m.DashboardSeccionPage),
      })),
    ],
  },
];
