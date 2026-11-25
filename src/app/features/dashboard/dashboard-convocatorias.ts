import { crearModoDocenteOperativo } from './navegacion-rol';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoPanel } from './estado-panel';
import { EstructuraDocente } from './estructura-docente';
import { VISTAS_DOCENTES } from './docente-vistas';
import { PanelConvocatoriasM4 } from '../academico/panel-convocatorias-m4';
import { RecorridoDocente } from '../academico/recorrido-docente';

/** Presentación estática de muestra; sin operaciones ni registros académicos. */
@Component({
  selector: 'app-dashboard-convocatorias',
  imports: [RouterLink, EstadoPanel, EstructuraDocente, PanelConvocatoriasM4, RecorridoDocente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-convocatorias.html',
  styleUrls: [
    './dashboard-convocatorias.css',
    './dashboard-convocatorias-paneles.css',
    './dashboard-convocatorias-preparacion.css',
  ],
})
export class DashboardConvocatorias {
  /** DC-FE-UX-ROLES-24: solo paneles reales con sesión docente verificada. */
  protected readonly operativo = crearModoDocenteOperativo();
  protected readonly vista = VISTAS_DOCENTES['convocatorias'];
}
