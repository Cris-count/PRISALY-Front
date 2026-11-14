import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map, tap } from 'rxjs';
import { DASHBOARD_NAVEGACION } from './dashboard-secciones';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-layout.html',
  styleUrls: ['./dashboard-layout.css', './dashboard-fondo.css', './dashboard-tipografia.css'],
})
export class DashboardLayout {
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');
  protected readonly secciones = DASHBOARD_NAVEGACION;
  protected readonly menuAbierto = signal(false);
  protected readonly titulo = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      tap(() => this.cerrarMenu()),
      map(() => (this.ruta.firstChild?.snapshot?.data['titulo'] as string) ?? 'Inicio'),
    ),
    { initialValue: (this.ruta.firstChild?.snapshot?.data['titulo'] as string) ?? 'Inicio' },
  );

  @HostListener('document:keydown.escape')
  protected cerrarMenu(): void {
    if (!this.menuAbierto()) return;
    this.menuAbierto.set(false);
    this.botonMenu()?.nativeElement.focus({ preventScroll: true });
  }
}
