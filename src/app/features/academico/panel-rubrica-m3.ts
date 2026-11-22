import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, map, of, switchMap, throwError } from 'rxjs';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { aFalloAcademico, esUuid, mensajeFallo, UUID_RE } from './academico-http';
import {
  CasoContenido,
  CasosM3Api,
  GuardarRubrica,
  PreguntaContenido,
  Rubrica,
} from './casos-m3.api';
import { CasosSesionStore } from './casos-sesion.store';

type Aviso = { tipo: 'exito' | 'error' | 'info'; texto: string } | null;

const MENSAJES_RUBRICA: Readonly<Record<string, string>> = {
  RUBRIC_SAVE_REQUIRES_DRAFT: 'La rúbrica solo puede guardarse mientras el caso está en borrador.',
  INCOMPLETE_RUBRIC: 'La rúbrica está incompleta.',
  INVALID_QUESTION: 'Alguna pregunta asociada no pertenece al caso.',
  ELEMENT_NOT_IN_CASE: 'Algún elemento no pertenece al caso.',
  STALE_CASE:
    'El caso cambió desde la última consulta. Vuelve a cargar la rúbrica antes de guardar.',
  IF_MATCH_REQUIRED: 'Falta la versión del caso. Carga la rúbrica antes de guardar.',
  EVALUABLE_CONTENT_LOCKED: 'El contenido evaluable está bloqueado.',
};

function criterioForm(c?: {
  id: string;
  descripcion: string;
  puntaje: number;
  ponderacion: number | null;
}) {
  return new FormGroup({
    id: new FormControl(c?.id ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    descripcion: new FormControl(c?.descripcion ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    puntaje: new FormControl<number | null>(c?.puntaje ?? null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    ponderacion: new FormControl<number | null>(c?.ponderacion ?? null),
  });
}

/**
 * FE-53-C. Rúbrica de un caso. Guarda con `If-Match` y conserva el ETag devuelto; un 412 o 428
 * bloquea el guardado hasta recargar (no se sobrescriben cambios concurrentes).
 */
@Component({
  selector: 'app-panel-rubrica-m3',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-rubrica-m3.html',
  styleUrl: './panel-academico.css',
})
export class PanelRubricaM3 {
  private readonly api = inject(CasosM3Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(CasosSesionStore);

  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');
  protected readonly idCaso = signal<string | null>(null);
  protected readonly contenido = signal<CasoContenido | null>(null);
  protected readonly rubrica = signal<Rubrica | null>(null);
  protected readonly etag = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  protected readonly requiereRecarga = signal(false);

  protected readonly preguntas = computed<readonly PreguntaContenido[]>(
    () => this.contenido()?.escenarios.flatMap((e) => e.preguntas) ?? [],
  );

  protected readonly formCaso = new FormGroup({
    idCaso: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(UUID_RE)],
    }),
  });

  protected readonly form = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    descripcion: new FormControl('', { nonNullable: true }),
    puntajeTotal: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    criterios: new FormArray<ReturnType<typeof criterioForm>>([]),
    /** Por pregunta: criterio asociado y valor. Vacío = sin asociar. */
    asociaciones: new FormArray<
      FormGroup<{
        idPregunta: FormControl<string>;
        criterio: FormControl<string>;
        valor: FormControl<number | null>;
      }>
    >([]),
  });

  protected cargarPorId(): void {
    this.formCaso.markAllAsTouched();
    if (this.formCaso.invalid) return;
    this.cargar(this.formCaso.controls.idCaso.value.trim());
  }

  protected cargar(idCaso: string): void {
    if (!esUuid(idCaso) || this.ocupado()) return;
    this.iniciar();
    const rubrica$ = this.api.rubrica(idCaso).pipe(
      map((r) => ({ rubrica: r.datos as Rubrica | null, etag: r.etag })),
      catchError((e: unknown) => {
        const f = aFalloAcademico(e);
        return f.codigo === 'RUBRIC_NOT_FOUND'
          ? of({ rubrica: null, etag: null })
          : throwError(() => f);
      }),
    );
    // El contenido aporta las preguntas y la versión del caso (mismo ETag que exige el guardado).
    this.api
      .contenido(idCaso)
      .pipe(switchMap((contenido) => rubrica$.pipe(map((rubrica) => ({ contenido, rubrica })))))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ contenido, rubrica }) => {
          if (
            rubrica.rubrica &&
            (!contenido.etag || !rubrica.etag || contenido.etag !== rubrica.etag)
          ) {
            this.requiereRecarga.set(true);
            this.terminar({
              tipo: 'error',
              texto: 'El caso cambi? durante la consulta. Vuelve a cargar la r?brica.',
            });
            return;
          }
          this.idCaso.set(idCaso);
          this.contenido.set(contenido.datos);
          this.store.recordar(contenido.datos);
          this.aplicar(rubrica.rubrica, rubrica.etag ?? contenido.etag);
          this.terminar(
            rubrica.rubrica
              ? null
              : {
                  tipo: 'info',
                  texto: 'El caso todavía no tiene rúbrica. Puedes definirla y guardarla.',
                },
          );
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected agregarCriterio(): void {
    this.form.controls.criterios.push(criterioForm());
  }

  protected quitarCriterio(i: number): void {
    this.form.controls.criterios.removeAt(i);
  }

  protected guardar(): void {
    const idCaso = this.idCaso();
    const etag = this.etag();
    this.form.markAllAsTouched();
    if (!idCaso || this.form.invalid || this.ocupado() || this.requiereRecarga()) return;
    if (!etag) {
      this.aviso.set({ tipo: 'error', texto: MENSAJES_RUBRICA['IF_MATCH_REQUIRED'] });
      return;
    }
    const v = this.form.getRawValue();
    const cuerpo: GuardarRubrica = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      puntajeTotal: v.puntajeTotal,
      criterios: v.criterios.map((c) => ({
        id: c.id.trim(),
        descripcion: c.descripcion.trim(),
        puntaje: c.puntaje ?? 0,
        ponderacion: c.ponderacion,
      })),
      preguntas: v.asociaciones
        .filter((a) => a.criterio !== '' && a.valor !== null)
        .map((a) => ({
          idPregunta: a.idPregunta,
          criterio: a.criterio,
          valorPregunta: a.valor as number,
        })),
    };
    this.iniciar();
    this.api
      .guardarRubrica(idCaso, cuerpo, etag)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ datos, etag: nuevo }) => {
          this.aplicar(datos, nuevo);
          this.terminar({
            tipo: 'exito',
            texto: `Rúbrica guardada por el servidor (${datos.completa ? 'completa' : 'incompleta'}).`,
          });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected nombrePregunta(id: string): string {
    return this.preguntas().find((p) => p.idPregunta === id)?.enunciado ?? id;
  }

  private aplicar(rubrica: Rubrica | null, etag: string | null): void {
    this.rubrica.set(rubrica);
    this.etag.set(etag);
    this.requiereRecarga.set(false);
    this.form.controls.criterios.clear();
    (rubrica?.criterios ?? []).forEach((c) => this.form.controls.criterios.push(criterioForm(c)));
    this.form.controls.asociaciones.clear();
    for (const p of this.preguntas()) {
      const a = rubrica?.preguntas.find((x) => x.idPregunta === p.idPregunta);
      this.form.controls.asociaciones.push(
        new FormGroup({
          idPregunta: new FormControl(p.idPregunta, { nonNullable: true }),
          criterio: new FormControl(a?.criterio ?? '', { nonNullable: true }),
          valor: new FormControl<number | null>(a?.valorPregunta ?? null, {
            validators: [Validators.min(0)],
          }),
        }),
      );
    }
    this.form.patchValue({
      nombre: rubrica?.nombre ?? '',
      descripcion: rubrica?.descripcion ?? '',
      puntajeTotal: rubrica?.puntajeTotal ?? null,
    });
    this.form.markAsUntouched();
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.aviso.set(null);
  }

  private terminar(aviso: Aviso): void {
    this.ocupado.set(false);
    this.aviso.set(aviso);
  }

  private fallar(e: unknown): void {
    const fallo = aFalloAcademico(e);
    if (fallo.estado === 412 || fallo.estado === 428) this.requiereRecarga.set(true);
    const texto = (fallo.codigo && MENSAJES_RUBRICA[fallo.codigo]) || mensajeFallo(fallo);
    this.terminar({
      tipo: 'error',
      texto: `${texto}${fallo.estado > 0 ? ` (HTTP ${fallo.estado}${fallo.codigo ? ` · ${fallo.codigo}` : ''})` : ''}`,
    });
  }
}
