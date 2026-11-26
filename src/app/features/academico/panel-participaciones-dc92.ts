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
import { Subscription, switchMap } from 'rxjs';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { CAPACIDADES_DC99 } from './capacidades-dc99';
import { CasosM3Api } from './casos-m3.api';
import { EvaluacionM6Api, mensajeEvaluacion } from './evaluacion-m6.api';
import { AccionesDc92Api, mensajeAccionDc92 } from './acciones-dc92.api';
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
  /** DC-DEMO-112: caso de la sesión (respuesta de M4), para resolver la rúbrica con la que evaluar. */
  readonly idCaso = input<string | null>(null);

  private readonly api = inject(ParticipacionesDc92Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly guardar = inject(GUARDAR_ARCHIVO);
  private readonly destroyRef = inject(DestroyRef);
  private readonly capacidades = inject(CAPACIDADES_DC99);
  private readonly evaluacion = inject(EvaluacionM6Api);
  private readonly casos = inject(CasosM3Api);
  private readonly acciones = inject(AccionesDc92Api);

  /** DC-118: fila en gestión (retroalimentación RF-26, ausencia RF-24, retiro RF-21, repetición RF-25). */
  protected readonly gestionando = signal<string | null>(null);
  protected readonly textoGestion = signal('');
  protected readonly ocupadoGestion = signal(false);

  /** DC-DEMO-112: acción M6 en curso (por intento), nota calculada visible para el docente y aviso. */
  protected readonly accionEnCurso = signal<string | null>(null);
  protected readonly notas = signal<Readonly<Record<string, number>>>({});
  protected readonly avisoEvaluacion = signal<Aviso>(null);

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

  /** M6: calcula la nota con la rúbrica del caso (inmutable una vez registrada). */
  protected evaluar(idIntento: string): void {
    const idCaso = this.idCaso();
    if (!idCaso || this.accionEnCurso()) return;
    this.accionEnCurso.set(idIntento);
    this.avisoEvaluacion.set(null);
    this.casos
      .rubrica(idCaso)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((r) => this.evaluacion.evaluar(idIntento, r.datos.idRubrica)),
      )
      .subscribe({
        next: (c) => {
          this.notas.update((n) => ({ ...n, [idIntento]: c.valor }));
          this.accionEnCurso.set(null);
          this.avisoEvaluacion.set({
            tipo: 'exito',
            texto: `Intento evaluado: ${c.valor.toFixed(1)} (escala ${c.escala}). Aún no es visible para el estudiante.`,
          });
          this.consultarDeNuevo();
        },
        error: (e: unknown) => {
          this.accionEnCurso.set(null);
          this.avisoEvaluacion.set({ tipo: 'error', texto: mensajeEvaluacion(e) });
        },
      });
  }

  /** N2: publica la calificación al estudiante (idempotente). */
  protected liberar(idIntento: string): void {
    if (this.accionEnCurso()) return;
    this.accionEnCurso.set(idIntento);
    this.avisoEvaluacion.set(null);
    this.evaluacion
      .liberar(idIntento)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.accionEnCurso.set(null);
          this.avisoEvaluacion.set({
            tipo: 'exito',
            texto: `Calificación ${c.valor.toFixed(1)} publicada. El estudiante ya puede consultarla.`,
          });
          this.consultarDeNuevo();
        },
        error: (e: unknown) => {
          this.accionEnCurso.set(null);
          this.avisoEvaluacion.set({ tipo: 'error', texto: mensajeEvaluacion(e) });
        },
      });
  }

  protected gestionar(f: FilaParticipacion): void {
    if (this.gestionando() === f.idConvocatoria) {
      this.gestionando.set(null);
      return;
    }
    this.gestionando.set(f.idConvocatoria);
    this.textoGestion.set('');
    if (f.idParticipacion) {
      this.acciones
        .consultarRetroalimentacion(f.idParticipacion)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (t) => this.textoGestion.set(t ?? ''), error: () => undefined });
    }
  }

  protected escribir(evento: Event): void {
    this.textoGestion.set((evento.target as HTMLTextAreaElement).value);
  }

  protected ejecutar(
    tipo: 'retroalimentacion' | 'justificada' | 'no-justificada' | 'retiro' | 'repeticion',
    f: FilaParticipacion,
  ): void {
    if (this.ocupadoGestion()) return;
    const texto = this.textoGestion().trim();
    const exito: Record<typeof tipo, string> = {
      retroalimentacion: 'Retroalimentación guardada. El estudiante la verá junto con su nota publicada.',
      justificada: 'Ausencia clasificada como justificada.',
      'no-justificada': 'Ausencia clasificada como no justificada.',
      retiro: 'Estudiante retirado de la convocatoria. Se registraron los avisos.',
      repeticion: 'Repetición excepcional autorizada. El estudiante puede iniciar su segundo intento.',
    };
    const operacion =
      tipo === 'retroalimentacion'
        ? this.acciones.guardarRetroalimentacion(f.idParticipacion!, texto)
        : tipo === 'justificada' || tipo === 'no-justificada'
          ? this.acciones.clasificarAusencia(f.idConvocatoria, tipo === 'justificada', texto)
          : tipo === 'retiro'
            ? this.acciones.retirar(f.idConvocatoria, texto, f.estadoParticipacion === 'PARTICIPACION_INICIADA')
            : this.acciones.autorizarRepeticion(f.idParticipacion!, texto);
    this.ocupadoGestion.set(true);
    this.avisoEvaluacion.set(null);
    operacion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.ocupadoGestion.set(false);
        this.avisoEvaluacion.set({ tipo: 'exito', texto: exito[tipo] });
        if (tipo !== 'retroalimentacion') this.gestionando.set(null);
        this.consultarDeNuevo();
      },
      error: (e: unknown) => {
        this.ocupadoGestion.set(false);
        this.avisoEvaluacion.set({ tipo: 'error', texto: mensajeAccionDc92(e) });
      },
    });
  }

  private consultarDeNuevo(): void {
    this.cargando.set(false);
    this.consultar();
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
    this.avisoEvaluacion.set(null);
    this.notas.set({});
  }
}
