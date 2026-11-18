import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoPanel } from './estado-panel';
import { EstructuraDocente } from './estructura-docente';
import { VISTAS_DOCENTES } from './docente-vistas';

/** Presentación demostrativa: sin servicios, eventos ni datos académicos consultados. */
@Component({
  selector: 'app-dashboard-sesiones',
  imports: [RouterLink, EstadoPanel, EstructuraDocente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-sesiones.html',
  styleUrls: ['./dashboard-sesiones.css', './dashboard-sesiones-paneles.css'],
})
export class DashboardSesiones {
  protected readonly vista = VISTAS_DOCENTES['sesiones'];
}
