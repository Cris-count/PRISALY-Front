import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DASHBOARD_NAVEGACION } from './dashboard-secciones';

@Component({
  selector: 'app-dashboard-inicio',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-inicio.html',
  styleUrl: './dashboard-inicio.css',
})
export class DashboardInicio {
  protected readonly secciones = DASHBOARD_NAVEGACION;
}
