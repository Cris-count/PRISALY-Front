import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvisoAccesoPersonal } from '../autenticacion/aviso-acceso-personal';
import { MAPEO_RUTAS_PERSONAL } from '../autenticacion/m1-mapeo-rutas';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { NAVEGACION_PRESENTACION, seccionesPorRol } from './navegacion-rol';

@Component({
  selector: 'app-dashboard-inicio',
  imports: [RouterLink, AvisoAccesoPersonal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-inicio.html',
  styleUrls: ['./dashboard-inicio.css', './dashboard-inicio-escena.css'],
})
export class DashboardInicio {
  private readonly sesion = inject(M1_PERSONAL_LOCAL) ? inject(SesionPersonalM1) : null;
  private readonly mapeo = inject(MAPEO_RUTAS_PERSONAL);
  /** DC-FE-UX-ROLES-24: mismas secciones que el menú lateral según la identidad de `/me`. */
  protected readonly secciones = computed(() =>
    this.sesion ? seccionesPorRol(this.sesion.estado(), this.mapeo) : NAVEGACION_PRESENTACION,
  );
}
