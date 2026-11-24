import { Routes } from '@angular/router';
import { DASHBOARD_ESTUDIANTE, DASHBOARD_SECCIONES } from './dashboard-secciones';
import { VISTAS_DOCENTES } from './docente-vistas';
import { requiereEntornoDemostracion } from '../autenticacion/entorno-demostracion';
import {
  requiereMapeoPersonalQa,
  requiereSesionPersonalQa,
} from '../autenticacion/m1-personal-rutas-qa';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [requiereSesionPersonalQa],
        title: 'Inicio · Dashboard PRISALY',
        data: { titulo: 'Inicio' },
        loadComponent: () => import('./dashboard-inicio').then((m) => m.DashboardInicio),
      },
      {
        path: DASHBOARD_ESTUDIANTE.ruta,
        // H-58-01: presentación estudiantil demostrativa, solo en el entorno de demostración.
        canActivate: [requiereEntornoDemostracion],
        title: `${DASHBOARD_ESTUDIANTE.titulo} · PRISALY`,
        data: { titulo: DASHBOARD_ESTUDIANTE.titulo },
        loadComponent: () => import('./dashboard-estudiante').then((m) => m.DashboardEstudiante),
      },
      {
        // DC-FE-60: «Mi perfil». Mismo requisito que Inicio (sesión de personal válida, o el
        // entorno demo); solo muestra la identidad de `/me`, sin operaciones.
        path: 'perfil',
        canActivate: [requiereSesionPersonalQa],
        title: 'Mi perfil · PRISALY',
        data: { titulo: 'Mi perfil' },
        loadComponent: () => import('./dashboard-perfil').then((m) => m.DashboardPerfil),
      },
      ...DASHBOARD_SECCIONES.map((seccion) => ({
        path: seccion.ruta,
        canActivate: [requiereMapeoPersonalQa],
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
