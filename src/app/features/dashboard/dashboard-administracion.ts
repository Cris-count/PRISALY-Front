import { crearModoDocenteOperativo } from './navegacion-rol';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PanelAdministracionM1 } from '../academico/panel-administracion-m1';
import { PanelEstudiantesM1 } from '../academico/panel-estudiantes-m1';

@Component({
  selector: 'app-dashboard-administracion',
  imports: [RouterLink, PanelAdministracionM1, PanelEstudiantesM1],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-administracion.html',
  styleUrls: [
    './dashboard-administracion.css',
    './dashboard-modulos.css',
    './dashboard-administracion-visual.css',
    './dashboard-administracion-estados.css',
  ],
})
export class DashboardAdministracion {
  protected readonly pestana = signal<'docentes' | 'estudiantes' | 'permisos'>('docentes');
  /** DC-FE-UX-ROLES-24: solo el panel real con sesión verificada en `qa-navegacion`. */
  protected readonly operativo = crearModoDocenteOperativo();
}
