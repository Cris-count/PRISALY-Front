import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvisoAccesoPersonal } from '../autenticacion/aviso-acceso-personal';
import { DASHBOARD_NAVEGACION } from './dashboard-secciones';

@Component({
  selector: 'app-dashboard-inicio',
  imports: [RouterLink, AvisoAccesoPersonal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-inicio.html',
  styleUrls: ['./dashboard-inicio.css', './dashboard-inicio-escena.css'],
})
export class DashboardInicio {
  protected readonly secciones = DASHBOARD_NAVEGACION;
}
