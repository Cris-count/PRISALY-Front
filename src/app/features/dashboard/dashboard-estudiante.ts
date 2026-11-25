import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoRecorridoEstudiantilPanel } from './estado-recorrido-estudiantil';

/** Panel de presentación sin identidad, intentos ni dependencias de participación. */
@Component({
  selector: 'app-dashboard-estudiante',
  imports: [RouterLink, EstadoRecorridoEstudiantilPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-estudiante.html',
  styleUrl: './dashboard-estudiante.css',
})
export class DashboardEstudiante {}
