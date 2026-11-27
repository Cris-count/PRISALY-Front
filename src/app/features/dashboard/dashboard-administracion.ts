import { crearModoDocenteOperativo } from './navegacion-rol';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PanelAdministracionM1 } from '../academico/panel-administracion-m1';
import { PanelEstudiantesM1 } from '../academico/panel-estudiantes-m1';

type Pestana = 'docentes' | 'estudiantes' | 'permisos';

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
  protected readonly pestanas: readonly { id: Pestana; etiqueta: string }[] = [
    { id: 'docentes', etiqueta: 'Docentes' },
    { id: 'estudiantes', etiqueta: 'Estudiantes' },
    { id: 'permisos', etiqueta: 'Roles y permisos' },
  ];
  /** FE-UX-04B: los accesos del Inicio abren directamente su pestaña con `?vista=`. Un valor desconocido se ignora. */
  protected readonly pestana = signal<Pestana>(
    this.pestanas.find((p) => p.id === inject(ActivatedRoute).snapshot.queryParamMap.get('vista'))?.id ?? 'docentes',
  );
  /** DC-FE-UX-ROLES-24: solo el panel real con sesión verificada en `qa-navegacion`. */
  protected readonly operativo = crearModoDocenteOperativo();
}
