import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DashboardSeccion } from './dashboard-secciones';
import { VISTAS_DOCENTES } from './docente-vistas';
import { EstadoPanel } from './estado-panel';
import { EstructuraDocente } from './estructura-docente';

@Component({
  selector: 'app-dashboard-docente',
  imports: [RouterLink, EstadoPanel, EstructuraDocente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-docente.html',
  styleUrl: './dashboard-docente.css',
})
export class DashboardDocente {
  private readonly ruta = inject(ActivatedRoute);
  protected readonly seccion = toSignal(
    this.ruta.data.pipe(map((data) => data['seccion'] as DashboardSeccion)),
    { initialValue: this.ruta.snapshot.data['seccion'] as DashboardSeccion },
  );
  protected readonly vista = computed(() => VISTAS_DOCENTES[this.seccion().ruta]);
}
