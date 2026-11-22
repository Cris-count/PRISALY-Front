import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DashboardSeccion } from './dashboard-secciones';
import { VISTAS_DOCENTES } from './docente-vistas';
import { DashboardSesiones } from './dashboard-sesiones';
import { DashboardConvocatorias } from './dashboard-convocatorias';
import { EstadoPanel } from './estado-panel';
import { EstructuraDocente } from './estructura-docente';
import { PanelCasosM3 } from '../academico/panel-casos-m3';
import { PanelRubricaM3 } from '../academico/panel-rubrica-m3';
import { PanelContenidoM3 } from '../academico/panel-contenido-m3';

@Component({
  selector: 'app-dashboard-docente',
  imports: [
    RouterLink,
    EstadoPanel,
    EstructuraDocente,
    DashboardSesiones,
    DashboardConvocatorias,
    PanelCasosM3,
    PanelRubricaM3,
    PanelContenidoM3,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-docente.html',
  styleUrls: [
    './dashboard-docente.css',
    './dashboard-modulos.css',
    './dashboard-casos.css',
    './dashboard-casos-paneles.css',
    './dashboard-casos-responsive.css',
    './dashboard-rubricas.css',
    './dashboard-rubricas-paneles.css',
    './dashboard-rubricas-estados.css',
  ],
})
export class DashboardDocente {
  private readonly ruta = inject(ActivatedRoute);
  protected readonly seccion = toSignal(
    this.ruta.data.pipe(map((data) => data['seccion'] as DashboardSeccion)),
    { initialValue: this.ruta.snapshot.data['seccion'] as DashboardSeccion },
  );
  protected readonly vista = computed(() => VISTAS_DOCENTES[this.seccion().ruta]);
}
