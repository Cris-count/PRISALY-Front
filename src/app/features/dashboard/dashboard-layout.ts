import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
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
import { MAPEO_RUTAS_PERSONAL } from '../autenticacion/m1-mapeo-rutas';
import { SesionEstudianteDemo } from '../autenticacion/acceso-estudiante-demo';
import {
  hayRutasHabilitadas,
  NAVEGACION_ESTUDIANTE,
  NAVEGACION_PRESENTACION,
  seccionesPorRol,
} from './navegacion-rol';

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
  private readonly destroyRef = inject(DestroyRef);
  protected cerrarSesion(): void {
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
  private readonly mapeo = inject(MAPEO_RUTAS_PERSONAL);
  /** DC-FE-UX-ROLES-24: banner técnico solo en QA ordinario (sin rutas efectivamente habilitadas). */
  protected readonly avisoTecnicoQa = this.qaPersonal && !hayRutasHabilitadas(this.mapeo);
  /** Menú por rol efectivo de `/me`; se vacía al cerrar sesión o cambiar de identidad. */
  protected readonly secciones = computed(() =>
    this.sesion ? seccionesPorRol(this.sesion.estado(), this.mapeo) : NAVEGACION_PRESENTACION,
  );
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

  /** Ruta hija activa (p. ej. `estudiante`). */
  private readonly rutaHija = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map(() => this.ruta.firstChild?.snapshot?.routeConfig?.path ?? ''),
    ),
    { initialValue: this.ruta.firstChild?.snapshot?.routeConfig?.path ?? '' },
  );
  /**
   * DC-FE-UX-ROLES-24: en «Mi espacio de aprendizaje» sin sesión de personal válida, el menú
   * lateral muestra solo las opciones estudiantiles (demostración, sin sesión M1).
   */
  protected readonly espacioEstudiante = computed(
    () =>
      this.sesion?.estado().tipo !== 'valida' &&
      (this.rutaHija() === 'estudiante' ||
        (this.rutaHija() === 'perfil' && this.estudianteDemo.activa() !== null)),
  );
  protected readonly opcionesEstudiante = NAVEGACION_ESTUDIANTE;
  /** Sesión estudiantil demostrativa (solo memoria, solo entorno demo; no es M1). */
  protected readonly estudianteDemo = inject(SesionEstudianteDemo);

  protected salirDemoEstudiante(): void {
    this.estudianteDemo.cerrar();
    void this.router.navigateByUrl('/login');
  }

  protected irASeccion(ancla: string): void {
    document.getElementById(ancla)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  @HostListener('document:keydown.escape')
  protected cerrarMenu(): void {
    if (!this.menuAbierto()) return;
    this.menuAbierto.set(false);
    this.botonMenu()?.nativeElement.focus({ preventScroll: true });
  }
}
