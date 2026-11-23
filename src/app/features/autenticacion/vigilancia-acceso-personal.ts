import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  InjectionToken,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, finalize, of, timeout } from 'rxjs';
import { avisoDeDecision, decidirRuta, MAPEO_RUTAS_PERSONAL } from './m1-mapeo-rutas';
import { SesionPersonalM1, VerificacionIdentidad } from './m1-personal-sesion';

/**
 * H-58-02 (DC-FE-58-RESOLUCION-FINAL-08). Intervalo de revalidación de `/me` mientras una vista
 * protegida autorizada permanece abierta y visible. Valor inicial aprobado: 60 segundos.
 */
export const INTERVALO_REVALIDACION_ACCESO_MS = new InjectionToken<number>(
  'INTERVALO_REVALIDACION_ACCESO_MS',
  { providedIn: 'root', factory: () => 60_000 },
);

/**
 * Fallos temporales consecutivos (red o servicio) tras los que se retira la vista protegida. El
 * primero solo avisa; no se reintenta antes del siguiente intervalo.
 */
export const FALLOS_TEMPORALES_TOLERADOS = 1;

/**
 * H-58-02. Única estrategia de vigilancia de acceso para las vistas de personal autorizadas.
 *
 * - El guard registra la ruta al autorizarla; al salir de esa sección se deja de vigilar.
 * - Mientras hay ruta vigilada, sesión válida y documento visible, revalida `/me` cada
 *   `INTERVALO_REVALIDACION_ACCESO_MS` con un único temporizador. Sin ruta vigilada no hay
 *   temporizador: las páginas públicas nunca consultan `/me` periódicamente.
 * - Al recuperar visibilidad o foco revalida una vez (consulta compartida y ventana de vigencia).
 * - Si la identidad deja de cumplir el requisito (revocación, cambio de rol, sesión expirada o
 *   confirmación pendiente tras un 403), cierra la pantalla navegando al aviso correspondiente: así
 *   se retiran los datos mostrados.
 * - Un fallo temporal muestra un aviso; si se repite en el intervalo siguiente, retira la vista.
 * - Una denegación 403 de una operación solicita una confirmación posterior al rechazo (sin
 *   reintentar la operación ni cerrar la sesión).
 */
@Injectable({ providedIn: 'root' })
export class VigilanciaAccesoPersonal {
  private readonly sesion = inject(SesionPersonalM1);
  private readonly mapeo = inject(MAPEO_RUTAS_PERSONAL);
  private readonly router = inject(Router);
  private readonly documento = inject(DOCUMENT);
  private readonly intervalo = inject(INTERVALO_REVALIDACION_ACCESO_MS);
  private readonly destruccion = inject(DestroyRef);
  private revalidacionEnCurso = false;
  private readonly vigilada = signal<string | null>(null);
  private readonly visible = signal(true);
  private readonly fallosTemporales = signal(0);
  private readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');

  /** Fallo temporal de comunicación (no es pérdida confirmada de permisos). */
  readonly verificacionNoDisponible = computed(
    () => this.vigilada() !== null && this.fallosTemporales() > 0,
  );

  constructor() {
    const destruir = this.destruccion;
    this.visible.set(this.documento.visibilityState !== 'hidden');

    // Al salir de la sección vigilada se deja de vigilar. Los cambios de parámetros dentro de la
    // misma sección (p. ej. `?caso=`) no reejecutan el guard, así que la vigilancia se conserva.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(destruir),
      )
      .subscribe((e) => {
        const ruta = this.vigilada();
        const camino = e.urlAfterRedirects.split(/[?#]/, 1)[0];
        if (ruta && camino !== `/dashboard/${ruta}`) this.detener();
      });

    // Visibilidad y foco: pausar en segundo plano y revalidar una vez al volver.
    const alCambiarVisibilidad = () => {
      const ahora = this.documento.visibilityState !== 'hidden';
      const volvio = ahora && !this.visible();
      this.visible.set(ahora);
      if (volvio) this.revalidar();
    };
    const alRecuperarFoco = () => {
      if (this.documento.visibilityState !== 'hidden') this.revalidar();
    };
    const ventana = this.documento.defaultView;
    this.documento.addEventListener('visibilitychange', alCambiarVisibilidad);
    ventana?.addEventListener('focus', alRecuperarFoco);
    destruir.onDestroy(() => {
      this.documento.removeEventListener('visibilitychange', alCambiarVisibilidad);
      ventana?.removeEventListener('focus', alRecuperarFoco);
    });

    // Un único temporizador, solo con ruta vigilada, sesión válida y documento visible.
    effect((alLimpiar) => {
      if (!this.vigilada() || !this.sesionValida() || !this.visible()) return;
      const id = setInterval(() => this.revalidar(), this.intervalo);
      alLimpiar(() => clearInterval(id));
    });

    // Cierre de la vista cuando la identidad ya no cumple el requisito.
    effect(() => {
      const ruta = this.vigilada();
      if (!ruta) return;
      const estado = this.sesion.estado();
      const confirmacionPendiente = this.sesion.identidadRequiereConfirmacion();
      const decision = decidirRuta(
        this.mapeo[ruta],
        estado.tipo === 'valida',
        (p) => this.sesion.tienePermisos(p),
        (r) => this.sesion.tieneRol(r),
      );
      if (decision === 'autorizada' && !confirmacionPendiente) return;
      untracked(() =>
        this.cerrar(
          decision === 'sin-sesion'
            ? null
            : decision === 'preparada'
              ? avisoDeDecision(decision)
              : 'acceso-retirado',
        ),
      );
    });
  }

  /** Lo llama el guard al autorizar la entrada. Idempotente: no duplica temporizadores. */
  vigilar(ruta: string): void {
    if (this.vigilada() !== ruta) this.fallosTemporales.set(0);
    this.vigilada.set(ruta);
  }

  /** Ruta vigilada actualmente (para pruebas y diagnóstico). */
  rutaVigilada(): string | null {
    return this.vigilada();
  }

  /** Una operación fue denegada (403): confirma la identidad una sola vez, sin reintentarla. */
  operacionDenegada(): void {
    if (this.sesion.estado().tipo !== 'valida') return;
    this.sesion.confirmarTrasDenegacion().subscribe();
  }

  /** Revalidación compartida; sin ruta vigilada no consulta. */
  private revalidar(): void {
    const ruta = this.vigilada();
    if (!ruta || !this.sesionValida() || this.revalidacionEnCurso) return;
    this.revalidacionEnCurso = true;
    this.sesion
      .actualizarIdentidad()
      .pipe(
        timeout({ first: this.intervalo }),
        catchError(() => of('no-disponible' as const)),
        finalize(() => (this.revalidacionEnCurso = false)),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => this.registrar(ruta, resultado));
  }

  private registrar(ruta: string, resultado: VerificacionIdentidad): void {
    if (this.vigilada() !== ruta) return;
    if (resultado === 'vigente') {
      this.fallosTemporales.set(0);
      return;
    }
    if (resultado === 'no-disponible') {
      const fallos = this.fallosTemporales() + 1;
      this.fallosTemporales.set(fallos);
      if (fallos > FALLOS_TEMPORALES_TOLERADOS) this.cerrar('verificacion-no-disponible');
    }
    // `no-vigente`: el efecto de cierre actúa con el estado de sesión ya actualizado.
  }

  private detener(): void {
    this.vigilada.set(null);
    this.fallosTemporales.set(0);
  }

  private cerrar(aviso: string | null): void {
    this.detener();
    void this.router.navigate(
      aviso === null ? ['/login'] : ['/dashboard'],
      aviso === null ? { replaceUrl: true } : { queryParams: { aviso }, replaceUrl: true },
    );
  }
}
