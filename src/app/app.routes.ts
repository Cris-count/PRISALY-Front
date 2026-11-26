import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { M1_PERSONAL_LOCAL } from './features/autenticacion/m1-personal-http';
import { requiereEntornoDemostracion } from './features/autenticacion/entorno-demostracion';

/**
 * H-58-01 (DC-FE-58-H58-01-IMPLEMENTACION-11): las rutas del simulador son demostración técnica
 * (categoría A) y solo se activan en el entorno `demo`. El guard actúa en el Router, también ante
 * URL directa, recarga o historial; si deniega, el componente no se monta (ni Phaser ni Unreal).
 * `/simulador-integrado` es A/B: aquí solo existe su modalidad demostrativa; la académica sigue
 * deshabilitada (sin enlace de entradas desde la URL y con `ParticipacionPendienteGateway`).
 */
export const routes: Routes = [
  {
    path: 'acceso',
    title: 'Acceso por roles · PRISALY',
    loadComponent: () => import('./features/autenticacion/acceso-roles').then((m) => m.AccesoRoles),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
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
        (m) => m.SimuladorIntegradoPage,
      ),
  },
  {
    path: 'simulador-unreal',
    title: 'Ciudad 3D · PRISALY',
    canActivate: [requiereEntornoDemostracion],
    loadComponent: () =>
      import('./features/simulador/unreal/simulador-unreal-page').then(
        (m) => m.SimuladorUnrealPage,
      ),
  },
  { path: '**', redirectTo: 'login' },
];
