import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DashboardSeccion } from './dashboard-secciones';

@Component({
  selector: 'app-dashboard-seccion',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-seccion.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardSeccionPage {
  private readonly ruta = inject(ActivatedRoute);
  protected readonly seccion = toSignal(
    this.ruta.data.pipe(map((data) => data['seccion'] as DashboardSeccion)),
    {
      initialValue: this.ruta.snapshot.data['seccion'] as DashboardSeccion,
    },
  );
}
