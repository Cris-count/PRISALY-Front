import { crearModoDocenteOperativo } from './navegacion-rol';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoPanel } from './estado-panel';
import { EstructuraDocente } from './estructura-docente';
import { VISTAS_DOCENTES } from './docente-vistas';
import { PanelSesionesM4 } from '../academico/panel-sesiones-m4';
import { RecorridoDocente } from '../academico/recorrido-docente';

/** Presentación demostrativa: sin servicios, eventos ni datos académicos consultados. */
@Component({
  selector: 'app-dashboard-sesiones',
  imports: [RouterLink, EstadoPanel, EstructuraDocente, PanelSesionesM4, RecorridoDocente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-sesiones.html',
  styleUrls: ['./dashboard-sesiones.css', './dashboard-sesiones-paneles.css'],
})
export class DashboardSesiones {
  /** DC-FE-UX-ROLES-24: solo paneles reales con sesión docente verificada. */
  protected readonly operativo = crearModoDocenteOperativo();
  protected readonly vista = VISTAS_DOCENTES['sesiones'];
}
