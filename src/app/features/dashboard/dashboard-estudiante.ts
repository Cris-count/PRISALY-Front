import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoPanel } from './estado-panel';

/** Panel de presentación sin identidad, intentos ni dependencias de participación. */
@Component({
  selector: 'app-dashboard-estudiante',
  imports: [RouterLink, EstadoPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-estudiante.html',
  styleUrl: './dashboard-estudiante.css',
})
export class DashboardEstudiante {}
