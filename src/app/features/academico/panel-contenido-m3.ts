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
import { Observable, switchMap } from 'rxjs';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { aFalloAcademico, FalloAcademico, mensajeFallo, UUID_RE } from './academico-http';
import {
  CasoContenido,
  CasosM3Api,
  ElementoCreado,
  PreguntaContenido,
  Versionado,
} from './casos-m3.api';
import { CasosSesionStore } from './casos-sesion.store';

type Aviso = { tipo: 'exito' | 'error' | 'info'; texto: string } | null;

/** Códigos publicados por `CasoGestionExceptionHandler` para contenido (Backend 773818c). */
export const MENSAJES_CONTENIDO: Readonly<Record<string, string>> = {
  INVALID_CASE_REQUEST: 'Los datos no cumplen las validaciones del servidor. Revisa el formulario.',
  UNAUTHENTICATED: 'La sesión no es válida o expiró. Inicia sesión de nuevo.',
  FORBIDDEN:
    'El servidor denegó la operación: requiere ser propietario del caso y los permisos asignados.',
  CASE_NOT_FOUND: 'El caso no existe o no es accesible.',
  ELEMENT_NOT_IN_CASE: 'El escenario o la pregunta no pertenece a este caso.',
  SCENARIO_ID_IN_USE: 'Ya existe un escenario con ese identificador.',
  SCENARIO_ORDER_IN_USE: 'Ya existe un escenario con ese orden en el caso.',
  QUESTION_ID_IN_USE: 'Ya existe una pregunta con ese identificador.',
  QUESTION_ORDER_IN_USE: 'Ya existe una pregunta con ese orden en el escenario.',
  OPTION_ID_IN_USE: 'Ya existe una opción con ese identificador.',
  CONTENT_CONFLICT: 'El contenido entra en conflicto con elementos existentes.',
  SCENARIO_ADD_REQUIRES_DRAFT: 'Solo se pueden añadir escenarios a un caso en borrador.',
  QUESTION_ADD_REQUIRES_DRAFT: 'Solo se pueden añadir preguntas a un caso en borrador.',
  OPTION_ADD_REQUIRES_DRAFT: 'Solo se pueden añadir opciones a un caso en borrador.',
  EVALUABLE_CONTENT_LOCKED: 'El contenido evaluable está bloqueado.',
  CASE_NOT_EDITABLE: 'El caso no es editable en su estado actual.',
  INVALID_QUESTION: 'El servidor rechazó la pregunta por una regla de contenido.',
  INCONSISTENT_OPTIONS: 'El servidor rechazó las opciones por una regla de contenido.',
  STALE_CASE:
    'Otra persona o pestaña modificó el caso. Vuelve a consultar el contenido antes de guardar.',
  IF_MATCH_REQUIRED: 'Falta la versión del caso. Consulta el contenido antes de guardar.',
};

const ENTERO = /^-?\d{1,9}$/;

function entero(valor: string): number {
  return Number.parseInt(valor, 10);
}

/**
 * FE-54-C. Contenido académico de un caso M3: consulta completa (escenarios, preguntas, opciones)
 * y altas en Borrador mediante `CasoContenidoController`. El Backend no publica edición ni
 * eliminación de contenido, por eso la interfaz no las ofrece.
 *
 * Concurrencia: `contenido` y `etag` provienen siempre de la misma respuesta. Tras cada alta se
 * vuelve a consultar el contenido y se reemplazan ambos juntos; nunca se combina el ETag de la
 * respuesta 201 con datos de una versión anterior. Un 412/428 bloquea las altas hasta recargar.
 */
@Component({
  selector: 'app-panel-contenido-m3',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-contenido-m3.html',
  styleUrl: './panel-academico.css',
})
export class PanelContenidoM3 {
  private readonly api = inject(CasosM3Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(CasosSesionStore);

  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');
  protected readonly contenido = signal<CasoContenido | null>(null);
  protected readonly etag = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  protected readonly requiereRecarga = signal(false);

  protected readonly esBorrador = computed(() => this.contenido()?.estado === 'BORRADOR');
  protected readonly editable = computed(
    () => this.esBorrador() && this.etag() !== null && !this.requiereRecarga(),
  );
  protected readonly preguntas = computed<readonly PreguntaContenido[]>(
    () => this.contenido()?.escenarios.flatMap((e) => e.preguntas) ?? [],
  );

  /** Observaciones neutrales de lo que falta; la completitud la decide el Backend al publicar. */
  protected readonly observaciones = computed<readonly string[]>(() => {
    const c = this.contenido();
    if (!c) return [];
    if (c.escenarios.length === 0) return ['El caso no tiene escenarios.'];
    const lista: string[] = [];
    for (const e of c.escenarios) {
      const nombre = e.titulo || e.idEscenario;
      if (e.preguntas.length === 0) lista.push(`El escenario «${nombre}» no tiene preguntas.`);
      for (const p of e.preguntas)
        if ((p.opciones ?? []).length === 0)
          lista.push(`La pregunta «${p.enunciado}» no tiene opciones de respuesta.`);
    }
    return lista;
  });

  protected readonly formConsultar = new FormGroup({
    idCaso: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(UUID_RE)],
    }),
  });

  protected readonly formEscenario = new FormGroup({
    titulo: new FormControl('', { nonNullable: true }),
    contexto: new FormControl('', { nonNullable: true }),
    instrucciones: new FormControl('', { nonNullable: true }),
    orden: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(ENTERO)],
    }),
  });

  protected readonly formPregunta = new FormGroup({
    idEscenario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(UUID_RE)],
    }),
    enunciado: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    textoAyuda: new FormControl('', { nonNullable: true }),
    orden: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(ENTERO)],
    }),
  });

  protected readonly formOpcion = new FormGroup({
    idPregunta: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(UUID_RE)],
    }),
    texto: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    esCorrecta: new FormControl(false, { nonNullable: true }),
    explicacion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    orden: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(ENTERO)],
    }),
  });

  protected consultarPorId(): void {
    this.formConsultar.markAllAsTouched();
    if (this.formConsultar.invalid) return;
    this.consultar(this.formConsultar.controls.idCaso.value.trim());
  }

  protected consultar(idCaso: string, avisoFinal: Aviso = null): void {
    if (this.ocupado()) return;
    this.iniciar();
    this.api
      .contenido(idCaso)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.aplicarVersion(r);
          this.terminar(avisoFinal);
        },
        error: (e: unknown) => {
          this.contenido.set(null);
          this.etag.set(null);
          this.fallar(e);
        },
      });
  }

  protected recargar(): void {
    const c = this.contenido();
    if (c) this.consultar(c.idCaso, { tipo: 'info', texto: 'Contenido recargado del servidor.' });
  }

  protected agregarEscenario(): void {
    this.formEscenario.markAllAsTouched();
    if (this.formEscenario.invalid) return;
    const v = this.formEscenario.getRawValue();
    this.enviar(
      (idCaso, version) =>
        this.api.agregarEscenario(
          idCaso,
          {
            idEscenario: crypto.randomUUID(),
            titulo: v.titulo.trim() || null,
            contexto: v.contexto.trim() || null,
            instrucciones: v.instrucciones.trim() || null,
            orden: entero(v.orden),
          },
          version,
        ),
      (c, id) => c.escenarios.some((e) => e.idEscenario.toLowerCase() === id),
      'Escenario guardado',
      () => this.formEscenario.reset(),
    );
  }

  protected agregarPregunta(): void {
    this.formPregunta.markAllAsTouched();
    if (this.formPregunta.invalid) return;
    const v = this.formPregunta.getRawValue();
    this.enviar(
      (idCaso, version) =>
        this.api.agregarPregunta(
          idCaso,
          v.idEscenario,
          {
            idPregunta: crypto.randomUUID(),
            enunciado: v.enunciado.trim(),
            textoAyuda: v.textoAyuda.trim() || null,
            orden: entero(v.orden),
          },
          version,
        ),
      (c, id) =>
        c.escenarios.some((e) => e.preguntas.some((p) => p.idPregunta.toLowerCase() === id)),
      'Pregunta guardada',
      () => this.formPregunta.reset({ idEscenario: v.idEscenario }),
    );
  }

  protected agregarOpcion(): void {
    this.formOpcion.markAllAsTouched();
    if (this.formOpcion.invalid) return;
    const v = this.formOpcion.getRawValue();
    this.enviar(
      (idCaso, version) =>
        this.api.agregarOpcion(
          idCaso,
          v.idPregunta,
          {
            idOpcion: crypto.randomUUID(),
            texto: v.texto.trim(),
            esCorrecta: v.esCorrecta,
            explicacion: v.explicacion.trim(),
            orden: entero(v.orden),
          },
          version,
        ),
      (c, id) =>
        c.escenarios.some((e) =>
          e.preguntas.some((p) => (p.opciones ?? []).some((o) => o.idOpcion.toLowerCase() === id)),
        ),
      'Opción guardada',
      () => this.formOpcion.reset({ idPregunta: v.idPregunta, esCorrecta: false }),
    );
  }

  /**
   * Alta con la versión leída junto con el contenido mostrado, seguida de una relectura completa.
   * La confirmación solo se muestra si la relectura del servidor contiene el elemento creado.
   */
  private enviar(
    alta: (idCaso: string, version: string) => Observable<Versionado<ElementoCreado>>,
    presente: (c: CasoContenido, idMinusculas: string) => boolean,
    nombre: string,
    limpiar: () => void,
  ): void {
    const c = this.contenido();
    const version = this.etag();
    if (!c || this.ocupado()) return;
    if (!version || this.requiereRecarga()) {
      this.aviso.set({ tipo: 'error', texto: MENSAJES_CONTENIDO['IF_MATCH_REQUIRED'] });
      return;
    }
    let creado: string | null = null;
    this.iniciar();
    alta(c.idCaso, version)
      .pipe(
        switchMap((r) => {
          creado = r.datos.id.toLowerCase();
          return this.api.contenido(c.idCaso);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.aplicarVersion(r);
          limpiar();
          this.terminar(
            creado && presente(r.datos, creado)
              ? { tipo: 'exito', texto: `${nombre} en el servidor (verificado por relectura).` }
              : {
                  tipo: 'error',
                  texto: `El servidor confirmó el alta, pero el elemento no aparece en la relectura. Vuelve a consultar el contenido.`,
                },
          );
        },
        error: (e: unknown) => {
          if (creado) {
            // El alta se aplicó, pero los datos locales son de una versión anterior.
            this.requiereRecarga.set(true);
            const f = aFalloAcademico(e);
            this.terminar({
              tipo: 'error',
              texto: `El servidor creó el elemento, pero no se pudo releer el contenido (${this.detalle(f)}). Recarga antes de continuar.`,
            });
            return;
          }
          this.fallar(e);
        },
      });
  }

  /** Datos y versión siempre de la misma respuesta. */
  private aplicarVersion(r: Versionado<CasoContenido>): void {
    this.contenido.set(r.datos);
    this.etag.set(r.etag);
    this.requiereRecarga.set(false);
    this.store.recordar({
      idCaso: r.datos.idCaso,
      titulo: r.datos.titulo,
      tiempoEstimadoSegundos: r.datos.tiempoEstimadoSegundos,
      estado: r.datos.estado,
    });
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
    const f = aFalloAcademico(e);
    if (f.estado === 412 || f.estado === 428) this.requiereRecarga.set(true);
    const texto =
      (f.codigo && MENSAJES_CONTENIDO[f.codigo]) ||
      (f.estado === 401
        ? MENSAJES_CONTENIDO['UNAUTHENTICATED']
        : f.estado === 403
          ? MENSAJES_CONTENIDO['FORBIDDEN']
          : f.estado === 404
            ? MENSAJES_CONTENIDO['CASE_NOT_FOUND']
            : f.estado === 409
              ? 'El servidor rechazó la operación por una regla del caso.'
              : mensajeFallo(f));
    this.terminar({ tipo: 'error', texto: `${texto} (${this.detalle(f)})` });
  }

  private detalle(f: FalloAcademico): string {
    return f.estado > 0
      ? `HTTP ${f.estado}${f.codigo ? ` · ${f.codigo}` : ''}`
      : 'sin respuesta válida';
  }
}
