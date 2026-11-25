import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  InjectionToken,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { CAPACIDADES_DC99 } from './capacidades-dc99';
import {
  ETIQUETA_EVALUACION,
  ETIQUETA_PARTICIPACION,
  etiqueta,
  FilaParticipacion,
  mensajeFalloParticipaciones,
  ParticipacionesDc92Api,
} from './participaciones-dc92.api';

/** Guarda en el equipo un archivo recibido del Backend, solo tras una acción del usuario. */
export type GuardarArchivo = (nombre: string, contenido: Blob) => void;

export const GUARDAR_ARCHIVO = new InjectionToken<GuardarArchivo>('GUARDAR_ARCHIVO', {
  providedIn: 'root',
  factory: () => {
    const documento = inject(DOCUMENT);
    return (nombre, contenido) => {
      const vista = documento.defaultView;
      if (!vista) return;
      const url = vista.URL.createObjectURL(contenido);
      const enlace = documento.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      enlace.rel = 'noopener';
      documento.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      vista.setTimeout(() => vista.URL.revokeObjectURL(url), 0);
    };
  },
});

type Aviso = { tipo: 'exito' | 'error'; texto: string } | null;

/**
 * FE-61 Fase 2 · DD-09 (consulta de participaciones) y DD-11 (reporte CSV) de UNA sesión, dentro
 * del detalle de la sesión (Inicio → Sesiones → detalle → Participaciones).
 *
 * - La sesión llega del detalle ya consultado en M4: no se escribe a mano ningún identificador.
 * - No consulta al montarse: el docente pulsa «Consultar participaciones» (y «Actualizar»).
 * - Deshabilitado salvo `capacidadesBackend.consultaParticipaciones` / `reporteParticipacion` (hoy
 *   en ningún entorno). La titularidad la decide el Backend (403 `M4-SESION-AJENA`).
 * - El CSV es el cuerpo exacto de la respuesta; solo se guarda tras pulsar «Descargar CSV».
 */
@Component({
  selector: 'app-panel-participaciones-dc92',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-participaciones-dc92.html',
  styleUrl: './panel-academico.css',
})
export class PanelParticipacionesDc92 {
  /** Identificador de la sesión del detalle (respuesta de M4). */
  readonly idSesion = input.required<string>();

  private readonly api = inject(ParticipacionesDc92Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly guardar = inject(GUARDAR_ARCHIVO);
  private readonly destroyRef = inject(DestroyRef);
  private readonly capacidades = inject(CAPACIDADES_DC99);

  protected readonly consultaHabilitada = this.capacidades.consultaParticipaciones;
  protected readonly reporteHabilitado = this.capacidades.reporteParticipacion;
  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');

  protected readonly filas = signal<readonly FilaParticipacion[] | null>(null);
  protected readonly cargando = signal(false);
  protected readonly descargando = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  protected readonly avisoReporte = signal<Aviso>(null);

  protected readonly etiquetaParticipacion = (v: string) => etiqueta(ETIQUETA_PARTICIPACION, v);
  protected readonly etiquetaEvaluacion = (v: string) => etiqueta(ETIQUETA_EVALUACION, v);

  private consulta: Subscription | null = null;
  private descarga: Subscription | null = null;

  constructor() {
    // Otra sesión en el detalle: se descartan los datos y solicitudes de la anterior.
    effect(() => {
      this.idSesion();
      untracked(() => this.reiniciar());
    });
  }

  protected consultar(): void {
    if (!this.consultaHabilitada || !this.sesionValida() || this.cargando()) return;
    const id = this.idSesion();
    this.cargando.set(true);
    this.aviso.set(null);
    this.consulta = this.api
      .participaciones(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.filas.set(lista);
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.filas.set(null);
          this.cargando.set(false);
          this.aviso.set({ tipo: 'error', texto: mensajeFalloParticipaciones(e, 'consulta') });
        },
      });
  }

  protected descargar(): void {
    if (!this.reporteHabilitado || !this.sesionValida() || this.descargando()) return;
    const id = this.idSesion();
    this.descargando.set(true);
    this.avisoReporte.set(null);
    this.descarga = this.api
      .reporte(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.descargando.set(false);
          this.guardar(r.nombreArchivo, r.contenido);
          this.avisoReporte.set({
            tipo: 'exito',
            texto: `Reporte generado por el servidor: ${r.nombreArchivo}.`,
          });
        },
        error: (e: unknown) => {
          this.descargando.set(false);
          this.avisoReporte.set({
            tipo: 'error',
            texto: mensajeFalloParticipaciones(e, 'reporte'),
          });
        },
      });
  }

  protected fecha(instante: string | null): string {
    if (!instante) return '—';
    const f = new Date(instante);
    return Number.isNaN(f.getTime()) ? instante : f.toLocaleString();
  }

  private reiniciar(): void {
    this.consulta?.unsubscribe();
    this.descarga?.unsubscribe();
    this.filas.set(null);
    this.cargando.set(false);
    this.descargando.set(false);
    this.aviso.set(null);
    this.avisoReporte.set(null);
  }
}
