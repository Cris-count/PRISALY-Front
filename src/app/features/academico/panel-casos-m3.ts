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
import { switchMap } from 'rxjs';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { aFalloAcademico, esUuid, mensajeFallo, UUID_RE } from './academico-http';
import { CambiosSinGuardarService } from './cambios-sin-guardar';
import { CasoDocente, CasoPatch, CasosM3Api } from './casos-m3.api';
import { CasosSesionStore } from './casos-sesion.store';
import { ConstructorCasoVisual } from './constructor-caso-visual';
import { PARAM_CASO, ParametroRecorrido, SELECCION_INVALIDADA } from './contexto-recorrido';

type Aviso = { tipo: 'exito' | 'error' | 'info'; texto: string } | null;

const MENSAJES_M3: Readonly<Record<string, string>> = {
  CASE_CONFLICT: 'Ya existe un caso con ese identificador.',
  CASE_INCOMPLETE:
    'El caso no cumple los requisitos de publicación (contenido o rúbrica incompletos).',
  INCOMPLETE_RUBRIC: 'La rúbrica del caso está incompleta.',
  ALREADY_PUBLISHED: 'El caso ya está publicado.',
  CASE_NOT_EDITABLE: 'El caso no es editable en su estado actual.',
  EVALUABLE_CONTENT_LOCKED: 'El contenido evaluable está bloqueado.',
  STALE_CASE: 'Otra persona o pestaña modificó el caso. Vuelve a consultarlo antes de guardar.',
  IF_MATCH_REQUIRED: 'Falta la versión del caso. Consúltalo antes de guardar.',
};

/**
 * FE-53-B. Casos académicos en M3. El caso nace en BORRADOR (lo decide el Backend); la
 * publicación solo se solicita: el Backend aplica sus reglas y Angular muestra el resultado real.
 */
@Component({
  selector: 'app-panel-casos-m3',
  imports: [ReactiveFormsModule, ConstructorCasoVisual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-casos-m3.html',
  styleUrl: './panel-academico.css',
})
export class PanelCasosM3 {
  private readonly api = inject(CasosM3Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(CasosSesionStore);

  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');
  protected readonly caso = signal<CasoDocente | null>(null);
  /** CB-05A: el constructor visual (y su consulta de narrativa) solo se abre a petición del docente para ese caso. */
  protected readonly constructorDe = signal<string | null>(null);
  protected readonly etag = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  /** Tras un 412/428 la edición se bloquea hasta volver a consultar: no hay reintento automático. */
  protected readonly requiereReconsulta = signal(false);
  /** FE-55: caso activo compartido por URL con contenido, rúbrica y sesiones. */
  private readonly paramCaso = new ParametroRecorrido(PARAM_CASO);
  private readonly cambiosSinGuardar = inject(CambiosSinGuardarService);
  private casoPendiente: string | null = null;

  /** Siguiente paso del recorrido según el estado leído del servidor (solo orientación). */
  protected readonly siguientePaso = computed(() => {
    const estado = this.caso()?.estado;
    if (estado === 'BORRADOR')
      return 'Siguiente paso: añade escenarios, preguntas y opciones en «Contenido del caso», configura la rúbrica y después solicita la publicación.';
    if (estado === 'PUBLICADO')
      return 'Caso publicado: ya puede programarse una sesión en «Sesiones». El contenido evaluable queda bloqueado.';
    if (estado === 'ARCHIVADO') return 'Caso archivado: no admite cambios ni nuevas sesiones.';
    return null;
  });

  constructor() {
    this.cambiosSinGuardar.vincularFormularios('casos-m3', [this.formCrear, this.formEditar]);
    this.paramCaso
      .invalidaciones()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.ocupado()) this.casoPendiente = SELECCION_INVALIDADA;
        else this.casoPendiente = null;
        this.caso.set(null);
        this.etag.set(null);
      });

    this.paramCaso
      .cambios()
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        if (this.ocupado()) {
          this.casoPendiente = id;
          if (this.caso()?.idCaso.toLowerCase() !== id) {
            this.caso.set(null);
            this.etag.set(null);
          }
        } else if (this.caso()?.idCaso.toLowerCase() !== id) {
          this.consultar(id);
        }
      });
  }

  protected readonly formCrear = new FormGroup({
    titulo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    minutos: new FormControl<number | null>(30, {
      validators: [Validators.required, Validators.min(1), Validators.max(1440)],
    }),
    historia: new FormControl('', { nonNullable: true }),
    desarrolloSituacional: new FormControl('', { nonNullable: true }),
  });

  protected readonly formConsultar = new FormGroup({
    idCaso: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(UUID_RE)],
    }),
  });

  protected readonly formEditar = new FormGroup({
    titulo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    minutos: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(1440)],
    }),
  });

  protected crear(): void {
    this.formCrear.markAllAsTouched();
    if (this.formCrear.invalid || this.ocupado()) return;
    const v = this.formCrear.getRawValue();
    const idCaso = crypto.randomUUID();
    this.iniciar();
    this.api
      .crear({
        idCaso,
        titulo: v.titulo.trim(),
        tiempoEstimadoSegundos: Math.round((v.minutos ?? 0) * 60),
        historia: v.historia.trim() || null,
        desarrolloSituacional: v.desarrolloSituacional.trim() || null,
      })
      // Persistencia: se vuelve a leer el caso creado en lugar de confiar en el formulario.
      .pipe(
        switchMap((r) => this.api.consultar(r.idCaso)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ datos, etag }) => {
          this.mostrar(datos, etag);
          this.formCrear.reset({
            titulo: '',
            minutos: 30,
            historia: '',
            desarrolloSituacional: '',
          });
          this.terminar({
            tipo: 'exito',
            texto: `Caso creado en estado ${datos.estado} y verificado en el servidor.`,
          });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected consultarPorId(): void {
    this.formConsultar.markAllAsTouched();
    if (this.formConsultar.invalid) return;
    this.consultar(this.formConsultar.controls.idCaso.value.trim());
  }

  protected consultar(idCaso: string, avisoFinal: Aviso = null): void {
    if (!esUuid(idCaso)) return;
    if (!this.cambiosSinGuardar.confirmarCambioCaso(this.caso()?.idCaso, idCaso)) return;
    if (this.caso()?.idCaso.toLowerCase() !== idCaso.toLowerCase()) {
      this.caso.set(null);
      this.etag.set(null);
    }
    this.iniciar();
    this.api
      .consultar(idCaso)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ datos, etag }) => {
          this.mostrar(datos, etag);
          this.terminar(avisoFinal);
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected guardarEdicion(): void {
    const caso = this.caso();
    const etag = this.etag();
    this.formEditar.markAllAsTouched();
    if (!caso || this.formEditar.invalid || this.ocupado() || this.requiereReconsulta()) return;
    if (!etag) {
      this.aviso.set({ tipo: 'error', texto: MENSAJES_M3['IF_MATCH_REQUIRED'] });
      return;
    }
    const v = this.formEditar.getRawValue();
    const cambios: CasoPatch = {};
    if (v.titulo.trim() !== caso.titulo) cambios.titulo = v.titulo.trim();
    const segundos = Math.round((v.minutos ?? 0) * 60);
    if (segundos !== caso.tiempoEstimadoSegundos) cambios.tiempoEstimadoSegundos = segundos;
    if (Object.keys(cambios).length === 0) {
      this.aviso.set({ tipo: 'info', texto: 'No hay cambios que guardar.' });
      return;
    }
    this.iniciar();
    this.api
      .actualizar(caso.idCaso, cambios, etag)
      .pipe(
        switchMap(() => this.api.consultar(caso.idCaso)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ datos, etag: nuevo }) => {
          this.mostrar(datos, nuevo);
          this.terminar({
            tipo: 'exito',
            texto: 'Cambios guardados y verificados en el servidor.',
          });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected publicar(): void {
    const caso = this.caso();
    const etag = this.etag();
    if (!caso || !etag || this.ocupado() || this.requiereReconsulta()) return;
    this.iniciar();
    this.api
      .publicar(caso.idCaso, etag)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ datos }) =>
          this.consultar(caso.idCaso, {
            tipo: 'exito',
            texto: `Publicación aceptada por el servidor: estado ${datos.estado}.`,
          }),
        error: (e: unknown) => this.fallar(e),
      });
  }

  private mostrar(datos: CasoDocente, etag: string | null): void {
    if (this.casoPendiente && this.casoPendiente !== datos.idCaso.toLowerCase()) return;
    this.caso.set(datos);
    this.etag.set(etag);
    this.requiereReconsulta.set(false);
    this.store.recordar(datos);
    this.paramCaso.fijar(datos.idCaso);
    this.formEditar.reset({
      titulo: datos.titulo,
      minutos: Math.round(datos.tiempoEstimadoSegundos / 60),
    });
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.aviso.set(null);
  }

  private terminar(aviso: Aviso): void {
    this.ocupado.set(false);
    const pendiente = this.casoPendiente;
    this.casoPendiente = null;
    if (pendiente === SELECCION_INVALIDADA) return;
    if (pendiente && this.caso()?.idCaso.toLowerCase() !== pendiente) {
      this.consultar(pendiente);
      return;
    }
    this.aviso.set(aviso);
  }

  private fallar(e: unknown): void {
    const fallo = aFalloAcademico(e);
    if (fallo.estado === 412 || fallo.estado === 428) this.requiereReconsulta.set(true);
    const texto = (fallo.codigo && MENSAJES_M3[fallo.codigo]) || mensajeFallo(fallo);
    this.terminar({
      tipo: 'error',
      texto: `${texto}${fallo.estado > 0 ? ` (HTTP ${fallo.estado}${fallo.codigo ? ` · ${fallo.codigo}` : ''})` : ''}`,
    });
  }
}
