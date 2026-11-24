import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { AccesoDemoLocal } from '../autenticacion/acceso-demo-local';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { EstadoAccesoPersonalPanel } from '../autenticacion/estado-acceso-personal';
import { EstadoVerificacionAcceso } from '../autenticacion/estado-verificacion-acceso';
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
import { EntradaExperiencia, MENU_ESTUDIANTE_DEMO, menuDeRol } from './experiencias-navegacion';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    EstadoAccesoPersonalPanel,
    EstadoVerificacionAcceso,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-layout.html',
  styleUrls: [
    './dashboard-layout.css',
    './dashboard-fondo.css',
    './dashboard-tipografia.css',
    './dashboard-identidad.css',
    './dashboard-menu.css',
    './dashboard-inicio-shell.css',
  ],
})
export class DashboardLayout {
  protected readonly qaPersonal = inject(M1_PERSONAL_LOCAL);
  protected readonly sesion = this.qaPersonal ? inject(SesionPersonalM1) : null;
  protected readonly demo = inject(AccesoDemoLocal);
  private readonly destroyRef = inject(DestroyRef);
  protected cerrarSesion(): void {
    if (this.demo.actual()) {
      this.demo.salir();
      void this.router.navigateByUrl('/login');
      return;
    }
    this.sesion
      ?.cerrarSesion()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estado) => {
          if (estado.tipo === 'cierre-confirmado') void this.router.navigateByUrl('/login');
        },
        error: () => {}, // El servicio conserva el estado seguro; no afirma revocación remota.
      });
  }

  protected mostrarContenido(): boolean {
    // El recorrido estudiantil sigue siendo demostrativo; no usa autoridad de personal.
    return (
      !this.qaPersonal ||
      this.ruta.firstChild?.snapshot.routeConfig?.path === 'estudiante' ||
      this.sesion?.estado().tipo === 'valida'
    );
  }
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');
  protected readonly secciones = DASHBOARD_NAVEGACION;
  protected readonly menuEstudiante = MENU_ESTUDIANTE_DEMO;
  /**
   * Con sesión de personal, el menú es solo el de su rol. Sin rol reconocido no se listan
   * secciones de otra experiencia. La demostración pública conserva el recorrido visual existente.
   */
  protected menuDeSesion(): readonly EntradaExperiencia[] | null {
    if (this.qaPersonal && this.sesion) {
      const estado = this.sesion.estado();
      if (estado.tipo !== 'valida') return [];
      return menuDeRol(estado.identidad.rol);
    }
    const rol = this.demo.actual()?.rol;
    if (rol === 'ADMINISTRADOR' || rol === 'DOCENTE') return menuDeRol(rol);
    return null;
  }
  protected readonly menuAbierto = signal(false);
  protected readonly menuContraido = signal(false);
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
