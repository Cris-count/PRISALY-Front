import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoRecorridoEstudiantilPanel } from './estado-recorrido-estudiantil';

/** Panel de presentación sin identidad, intentos ni dependencias de participación. */
@Component({
  selector: 'app-dashboard-estudiante',
  imports: [RouterLink, EstadoRecorridoEstudiantilPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-estudiante.html',
  styleUrls: [
    './dashboard-estudiante.css',
    './dashboard-modulos.css',
    './dashboard-estudiante-portal.css',
    './dashboard-estudiante-estados.css',
  ],
})
export class DashboardEstudiante {}
