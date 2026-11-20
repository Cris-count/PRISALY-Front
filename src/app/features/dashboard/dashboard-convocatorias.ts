import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoPanel } from './estado-panel';
import { EstructuraDocente } from './estructura-docente';
import { VISTAS_DOCENTES } from './docente-vistas';

/** Presentación estática de muestra; sin operaciones ni registros académicos. */
@Component({
  selector: 'app-dashboard-convocatorias',
  imports: [RouterLink, EstadoPanel, EstructuraDocente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-convocatorias.html',
  styleUrls: [
    './dashboard-convocatorias.css',
    './dashboard-convocatorias-paneles.css',
    './dashboard-convocatorias-preparacion.css',
  ],
})
export class DashboardConvocatorias {
  protected readonly vista = VISTAS_DOCENTES['convocatorias'];
}
