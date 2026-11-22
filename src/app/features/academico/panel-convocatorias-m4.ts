import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { aFalloAcademico, UUID_RE } from './academico-http';
import { PARAM_SESION, ParametroRecorrido, SELECCION_INVALIDADA } from './contexto-recorrido';
import { ETIQUETA_ESTADO, MENSAJES_M4, mensajeM4 } from './panel-sesiones-m4';
import { admiteCambios, Convocatoria, SesionAcademica, SesionesM4Api } from './sesiones-m4.api';

type Aviso = { tipo: 'exito' | 'error' | 'info'; texto: string } | null;

/**
 * FE-53-E. Convocatorias de una sesión (M4). M4 no publica un listado de estudiantes: el
 * identificador del estudiante se introduce explícitamente. No incorpora M5 ni el acceso estudiantil.
 */
@Component({
  selector: 'app-panel-convocatorias-m4',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-convocatorias-m4.html',
  styleUrl: './panel-academico.css',
})
export class PanelConvocatoriasM4 {
  private readonly api = inject(SesionesM4Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly etiqueta = ETIQUETA_ESTADO;
  protected readonly admiteCambios = admiteCambios;
  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');
  protected readonly sesiones = signal<readonly SesionAcademica[] | null>(null);
  protected readonly seleccionada = signal<SesionAcademica | null>(null);
  protected readonly convocatorias = signal<readonly Convocatoria[] | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  /** FE-55: sesión activa compartida por URL con el panel de sesiones. */
  private readonly paramSesion = new ParametroRecorrido(PARAM_SESION);
  private sesionPendiente: string | null = null;

  constructor() {
    this.paramSesion
      .invalidaciones()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.ocupado()) this.sesionPendiente = SELECCION_INVALIDADA;
        else this.sesionPendiente = null;
        this.seleccionada.set(null);
        this.convocatorias.set(null);
      });

    // La sesión de la URL se vuelve a consultar en M4 antes de mostrar sus convocatorias.
    this.paramSesion
      .cambios()
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        if (this.ocupado()) {
          this.sesionPendiente = id;
          if (this.seleccionada()?.id.toLowerCase() !== id) {
            this.seleccionada.set(null);
            this.convocatorias.set(null);
          }
        } else if (this.seleccionada()?.id.toLowerCase() !== id) this.consultarSesion(id);
      });
  }

  protected readonly form = new FormGroup({
    estudianteId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(UUID_RE)],
    }),
  });

  protected cargarSesiones(): void {
    this.iniciar();
    this.api
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.sesiones.set(lista);
          this.terminar(null);
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  private consultarSesion(id: string): void {
    if (this.seleccionada()?.id.toLowerCase() !== id.toLowerCase()) {
      this.seleccionada.set(null);
      this.convocatorias.set(null);
    }
    this.iniciar();
    this.api
      .consultar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.seleccionar(s),
        error: (e: unknown) => {
          this.seleccionada.set(null);
          this.convocatorias.set(null);
          this.fallar(e);
        },
      });
  }

  protected seleccionar(s: SesionAcademica, avisoFinal: Aviso = null): void {
    if (this.sesionPendiente && this.sesionPendiente !== s.id.toLowerCase()) {
      this.terminar(null);
      return;
    }
    this.seleccionada.set(s);
    this.paramSesion.fijar(s.id);
    this.iniciar();
    this.api
      .convocatorias(s.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          if (!this.sesionPendiente || this.sesionPendiente === s.id.toLowerCase()) {
            this.convocatorias.set(lista);
          }
          this.terminar(avisoFinal);
        },
        error: (e: unknown) => {
          this.convocatorias.set(null);
          this.fallar(e);
        },
      });
  }

  protected convocar(): void {
    const s = this.seleccionada();
    this.form.markAllAsTouched();
    if (!s || this.form.invalid || this.ocupado() || !admiteCambios(s.estado)) return;
    this.iniciar();
    this.api
      .convocar(s.id, this.form.controls.estudianteId.value.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.form.reset({ estudianteId: '' });
          // Persistencia: se vuelve a consultar el listado del servidor.
          this.seleccionar(s, {
            tipo: 'exito',
            texto: 'Estudiante convocado y verificado en el servidor.',
          });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected fecha(instante: string | null): string {
    if (!instante) return '—';
    const f = new Date(instante);
    return Number.isNaN(f.getTime()) ? instante : f.toLocaleString();
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.aviso.set(null);
  }

  private terminar(aviso: Aviso): void {
    this.ocupado.set(false);
    const pendiente = this.sesionPendiente;
    this.sesionPendiente = null;
    if (pendiente === SELECCION_INVALIDADA) return;
    if (pendiente && this.seleccionada()?.id.toLowerCase() !== pendiente) {
      this.consultarSesion(pendiente);
      return;
    }
    this.aviso.set(aviso);
  }

  private fallar(e: unknown): void {
    const fallo = aFalloAcademico(e);
    const texto =
      fallo.estado === 404 && !(fallo.codigo && MENSAJES_M4[fallo.codigo])
        ? `La sesión o el estudiante no existen. (HTTP 404${fallo.codigo ? ` · ${fallo.codigo}` : ''})`
        : mensajeM4(
            e,
            'El servidor rechazó la convocatoria por una regla académica (por ejemplo, estudiante ya convocado o sesión iniciada).',
          );
    this.terminar({ tipo: 'error', texto });
  }
}
