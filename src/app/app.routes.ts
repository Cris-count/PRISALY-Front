import { requiereAccesoSimulador } from './features/simulador/unreal/acceso-simulador';
import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { M1_PERSONAL_LOCAL } from './features/autenticacion/m1-personal-http';
import { requiereEntornoDemostracion } from './features/autenticacion/entorno-demostracion';

/**
 * El único simulador es MUNDO-24 (Unreal Engine 5.8 por Pixel Streaming 2), en `/simulador-unreal`. Su guard
 * (`requiereAccesoSimulador`) actúa en el Router, también ante URL directa, recarga o historial; si deniega, el
 * visor no se monta. El simulador 2D/2.5D (Phaser) se retiró en DC-SIM-LIMPIEZA-01; su código está en el
 * historial de Git (etiqueta `historico/simulador-2d5-20261126`).
 */
export const routes: Routes = [
  {
    path: 'acceso',
    title: 'Acceso por roles · PRISALY',
    loadComponent: () => import('./features/autenticacion/acceso-roles').then((m) => m.AccesoRoles),
  },
  { path: '', pathMatch: 'full', redirectTo: 'acceso' },
  {
    path: 'login',
    title: 'Iniciar sesión · PRISALY',
    loadComponent: () => import('./features/autenticacion/login-page').then((m) => m.LoginPage),
  },
  {
    // DC-FE-60: acceso estudiantil real por código (DD-02 B). Solo en builds QA de integración;
    // el servidor responde 501 mientras DD-02 no esté activado.
    path: 'estudiante/acceso',
    title: 'Acceso estudiantil · PRISALY',
    canActivate: [() => inject(M1_PERSONAL_LOCAL) || inject(Router).createUrlTree(['/login'])],
    loadComponent: () =>
      import('./features/autenticacion/acceso-estudiante-real').then((m) => m.AccesoEstudianteReal),
  },
  {
    // DC-DEMO-112: portal del estudiante (convocatorias, intento M5 y resultado N2) tras validar el código.
    // Mismo alcance que `estudiante/acceso`: solo builds QA de integración; el Backend decide identidad y titularidad.
    path: 'estudiante/portal',
    title: 'Portal del estudiante · PRISALY',
    canActivate: [() => inject(M1_PERSONAL_LOCAL) || inject(Router).createUrlTree(['/login'])],
    loadComponent: () =>
      import('./features/estudiante/portal-estudiante').then((m) => m.PortalEstudiante),
  },
  {
    // FE-61 · D-05 (Backend DC-99): pantalla pública de activación docente por token de invitación.
    // Sin guard de sesión (el docente aún no tiene contraseña). La propia pantalla queda deshabilitada
    // y no envía nada mientras `capacidadesBackend.activacionDocente` no sea `true` en el entorno.
    path: 'activacion-docente',
    title: 'Activar cuenta docente · PRISALY',
    loadComponent: () =>
      import('./features/autenticacion/activacion-docente').then((m) => m.ActivacionDocente),
  },
  {
    // DC-FULLSTACK-DEMO-ESTUDIANTE-04: solo en el entorno demo; fuera de él el guard redirige.
    path: 'acceso-estudiante',
    title: 'Entrar como estudiante · PRISALY',
    canActivate: [requiereEntornoDemostracion],
    loadComponent: () =>
      import('./features/autenticacion/acceso-estudiante-demo').then((m) => m.AccesoEstudianteDemo),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  // DC-SIM-LIMPIEZA-01: MUNDO-24 es el único simulador. Las direcciones antiguas (incluidas las del
  // simulador 2D/2.5D retirado) llevan al visor oficial, cuyo guard decide el acceso.
  ...['simulador', 'simulador-tecnico-2d5', 'simulador-integrado'].map((path) => ({
    path,
    pathMatch: 'full' as const,
    redirectTo: 'simulador-unreal',
  })),
  {
    path: 'simulador-unreal',
    title: 'Ciudad 3D · PRISALY',
    canActivate: [requiereAccesoSimulador],
    loadComponent: () =>
      import('./features/simulador/unreal/simulador-unreal-page').then(
        (m) => m.SimuladorUnrealPage,
      ),
  },
  { path: '**', redirectTo: 'login' },
];
