import { Routes } from '@angular/router';
import { AccesoEstudiantil } from './features/acceso-estudiantil/acceso-estudiantil';
import { Login } from './features/auth/login/login';
import { Casos } from './features/casos/casos';
import { Diagnostico } from './features/diagnostico/diagnostico';
import { Home } from './features/home/home';
import { Participacion } from './features/participacion/participacion';
import { Sesiones } from './features/sesiones/sesiones';

// No route is guarded on purpose: test screens must be able to show the server's 401.
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Home },
  { path: 'personal', component: Login },
  { path: 'casos', component: Casos },
  { path: 'sesiones', component: Sesiones },
  { path: 'acceso-estudiantil', component: AccesoEstudiantil },
  { path: 'participacion', component: Participacion },
  { path: 'diagnostico', component: Diagnostico },
  { path: 'login', redirectTo: 'personal' },
  { path: 'inicio', redirectTo: '' },
  { path: '**', redirectTo: '' },
];
