import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { aFalloAcademico, mensajeFallo, UUID_RE } from './academico-http';
import { CasosSesionStore } from './casos-sesion.store';
import { CasoDocente, CasosM3Api, Versionado } from './casos-m3.api';
import { EMPTY, Observable, of, switchMap } from 'rxjs';
import { PanelParticipacionesDc92 } from './panel-participaciones-dc92';
import {
  PARAM_CASO,
  PARAM_SESION,
  ParametroRecorrido,
  SELECCION_INVALIDADA,
  uuidDeParametro,
} from './contexto-recorrido';
import {
  admiteCambios,
  EstadoSesion,
  SesionAcademica,
  SesionesM4Api,
  SIGUIENTE_ESTADO,
} from './sesiones-m4.api';

type Aviso = { tipo: 'exito' | 'error' | 'info'; texto: string } | null;

/**
 * FE-55. Códigos publicados por `M4ExceptionHandler` (Backend 773818c). Solo traducen el motivo
 * que ya decidió el servidor; ningún código se infiere en Angular.
 */
export const MENSAJES_M4: Readonly<Record<string, string>> = {
  'M4-NO-AUTENTICADO': 'La sesión no es válida o expiró. Inicia sesión de nuevo.',
  'M4-SIN-PERMISO': 'El servidor denegó la operación: la identidad no tiene el permiso requerido.',
  'M4-SESION-AJENA': 'La sesión pertenece a otro docente.',
  'M4-SESION-NO-ENCONTRADA': 'La sesión no existe o no es accesible.',
  'M4-CASO-NO-PUBLICADO':
    'El caso no existe o no está publicado: solo se programan casos publicados.',
  'M4-SESION-DUPLICADA': 'Ya existe una sesión con el mismo caso, docente y rango de fechas.',
  'M4-ESTADO-INVALIDO': 'La transición de estado no está permitida para la sesión.',
  // FE-57: `SesionOperacionNoPermitidaException` (409), observado en QA real al pedir una
  // transición que el estado actual no admite (por ejemplo, si otra pestaña ya la cambió).
  'M4-OPERACION-NO-PERMITIDA':
    'La sesión no admite esa operación en su estado actual. Vuelve a consultarla.',
  'M4-CONVOCATORIA-DUPLICADA': 'El estudiante ya está convocado a esta sesión.',
  'M4-CONVOCATORIA-NO-PERMITIDA': 'La sesión ya no admite convocatorias en su estado actual.',
  'M4-SESION-CON-CONVOCATORIAS': 'La sesión ya tiene convocatorias y no admite ese cambio.',
  'M4-SESION-CON-PARTICIPACIONES': 'La sesión ya tiene participaciones y no admite ese cambio.',
  'M4-FECHA-INVALIDA': 'La fecha de fin debe ser posterior a la de inicio.',
  'M4-DURACION-INVALIDA': 'La duración máxima de participación debe ser positiva.',
  'M4-VALIDACION': 'Los datos no cumplen las validaciones del servidor.',
  'M4-REFERENCIA-NO-VALIDA': 'Algún identificador enviado no es válido o no existe.',
  'M4-BLOQUEO-ACADEMICO-NO-CONFIRMADO':
    'El servidor no pudo confirmar el bloqueo académico del caso; la sesión no se programó.',
  'M4-PROVEEDOR-NO-DISPONIBLE': 'Un servicio requerido por M4 no está disponible.',
};

/** Texto de error de M4: mensaje del código publicado o, si no hay código, el genérico. */
export function mensajeM4(e: unknown, generico409: string): string {
  const fallo = aFalloAcademico(e);
  const texto =
    (fallo.codigo && MENSAJES_M4[fallo.codigo]) ||
    (fallo.estado === 409 ? generico409 : mensajeFallo(fallo));
  return `${texto}${fallo.estado > 0 ? ` (HTTP ${fallo.estado}${fallo.codigo ? ` · ${fallo.codigo}` : ''})` : ''}`;
}

/** `datetime-local` (hora local del navegador) → instante ISO-8601 UTC que espera `Instant`. */
export function aInstante(local: string): string | null {
  if (!local) return null;
  const fecha = new Date(local);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/** Instante ISO → valor para `datetime-local` en hora local. */
export function aLocal(instante: string): string {
  const fecha = new Date(instante);
  if (Number.isNaN(fecha.getTime())) return '';
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}

function rangoFechas(grupo: AbstractControl): ValidationErrors | null {
  const inicio = aInstante(grupo.get('fechaInicio')?.value ?? '');
  const fin = aInstante(grupo.get('fechaFin')?.value ?? '');
  return inicio && fin && fin <= inicio ? { rango: true } : null;
}

/** Solo presenta el valor publicado por M4; no traduce ni infiere reglas. */
export const ETIQUETA_ESTADO: Readonly<Record<EstadoSesion, string>> = {
  SinIniciar: 'Sin iniciar',
  EnCurso: 'En curso',
  Finalizado: 'Finalizado',
};

/**
 * FE-53-D. Programación académica en M4. Las transiciones de estado, la exigencia de caso
 * publicado y el permiso `GESTIONAR_SESION` los aplica el Backend; Angular solo envía la solicitud
 * y muestra la respuesta real (incluidos los 409 de transición inválida).
 */
@Component({
  selector: 'app-panel-sesiones-m4',
  imports: [ReactiveFormsModule, PanelParticipacionesDc92],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-sesiones-m4.html',
  styleUrl: './panel-academico.css',
})
export class PanelSesionesM4 {
  private readonly api = inject(SesionesM4Api);
  private readonly apiCasos = inject(CasosM3Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly casos = inject(CasosSesionStore);

  protected readonly siguiente = SIGUIENTE_ESTADO;
  protected readonly admiteCambios = admiteCambios;
  protected readonly etiqueta = ETIQUETA_ESTADO;
  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');
  protected readonly sesiones = signal<readonly SesionAcademica[] | null>(null);
  protected readonly seleccionada = signal<SesionAcademica | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  /** FE-55: caso y sesión activos compartidos por URL con casos y convocatorias. */
  private readonly paramCaso = new ParametroRecorrido(PARAM_CASO);
  private readonly paramSesion = new ParametroRecorrido(PARAM_SESION);
  private sesionPendiente: string | null = null;

  /** Casos recordados en la sesión; solo los PUBLICADOS los acepta M4 (lo valida el servidor). */
  protected readonly casosPublicados = computed(() =>
    this.casos.casos().filter((c) => c.estado === 'PUBLICADO'),
  );
  protected readonly casosNoPublicados = computed(() =>
    this.casos.casos().filter((c) => c.estado !== 'PUBLICADO'),
  );

  constructor() {
    this.paramSesion
      .invalidaciones()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.ocupado()) this.sesionPendiente = SELECCION_INVALIDADA;
        else this.sesionPendiente = null;
        this.seleccionada.set(null);
      });

    // El caso de la URL solo rellena el campo: no se consulta M3 ni se presupone publicado.
    this.paramCaso
      .cambios()
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        const campo = this.formCrear.controls.casoId;
        if (uuidDeParametro(campo.value) !== id) campo.setValue(id);
      });
    this.paramCaso
      .invalidaciones()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.formCrear.controls.casoId.setValue(''));
    this.paramSesion
      .cambios()
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        if (this.ocupado()) {
          this.sesionPendiente = id;
          if (this.seleccionada()?.id.toLowerCase() !== id) this.seleccionada.set(null);
        } else if (this.seleccionada()?.id.toLowerCase() !== id) this.consultar(id);
      });
  }

  protected readonly formCrear = new FormGroup(
    {
      casoId: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(UUID_RE)],
      }),
      titulo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(150)],
      }),
      mensajePersonalizado: new FormControl('', { nonNullable: true }),
      fechaInicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      fechaFin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      minutosMaximos: new FormControl<number | null>(30, {
        validators: [Validators.required, Validators.min(1)],
      }),
      lugarFisico: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(200)],
      }),
    },
    { validators: rangoFechas },
  );

  protected readonly casoParaProgramar = toSignal(this.formCrear.controls.casoId.valueChanges, {
    initialValue: this.formCrear.controls.casoId.value,
  });

  protected readonly formEditar = new FormGroup(
    {
      titulo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(150)],
      }),
      mensajePersonalizado: new FormControl('', { nonNullable: true }),
      fechaInicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      fechaFin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      lugarFisico: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(200)],
      }),
    },
    { validators: rangoFechas },
  );

  protected listar(avisoFinal: Aviso = null): void {
    this.iniciar();
    this.api
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.sesiones.set(lista);
          const sel = this.seleccionada();
          if (sel) this.seleccionar(lista.find((s) => s.id === sel.id) ?? null);
          this.terminar(avisoFinal);
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected consultar(id: string): void {
    if (this.seleccionada()?.id.toLowerCase() !== id.toLowerCase()) this.seleccionada.set(null);
    this.iniciar();
    this.api
      .consultar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.seleccionar(s);
          this.terminar(null);
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected crear(): void {
    this.formCrear.markAllAsTouched();
    if (this.formCrear.invalid || this.ocupado()) return;
    const v = this.formCrear.getRawValue();
    const inicio = aInstante(v.fechaInicio);
    const fin = aInstante(v.fechaFin);
    if (!inicio || !fin) return;
    this.iniciar();
    const idCaso = v.casoId.trim();
    const recordado = this.casos.casos().some((caso) => caso.idCaso === idCaso.toLowerCase());
    const verificarCaso: Observable<Versionado<CasoDocente> | null> = recordado
      ? this.apiCasos.consultar(idCaso)
      : of(null);
    verificarCaso
      .pipe(
        switchMap((version) => {
          if (version) {
            this.casos.recordar(version.datos);
            if (version.datos.estado !== 'PUBLICADO') {
              this.terminar({
                tipo: 'error',
                texto: 'El caso ya no está publicado. Elige otro caso para programar la sesión.',
              });
              return EMPTY;
            }
          }
          return this.api.crear({
            casoId: idCaso,
            titulo: v.titulo.trim(),
            mensajePersonalizado: v.mensajePersonalizado.trim() || null,
            fechaInicio: inicio,
            fechaFin: fin,
            tiempoMaximoParticipacionSegundos: Math.round((v.minutosMaximos ?? 0) * 60),
            lugarFisico: v.lugarFisico.trim() || null,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (s) => {
          this.seleccionar(s);
          this.formCrear.reset({
            casoId: '',
            titulo: '',
            mensajePersonalizado: '',
            fechaInicio: '',
            fechaFin: '',
            minutosMaximos: 30,
            lugarFisico: '',
          });
          // Persistencia: se recarga el listado del servidor.
          this.listar({
            tipo: 'exito',
            texto: `Sesión programada en estado ${ETIQUETA_ESTADO[s.estado]}.`,
          });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected guardarEdicion(): void {
    const s = this.seleccionada();
    this.formEditar.markAllAsTouched();
    if (!s || this.formEditar.invalid || this.ocupado() || !admiteCambios(s.estado)) return;
    const v = this.formEditar.getRawValue();
    const inicio = aInstante(v.fechaInicio);
    const fin = aInstante(v.fechaFin);
    if (!inicio || !fin) return;
    this.iniciar();
    this.api
      .actualizar(s.id, {
        titulo: v.titulo.trim(),
        mensajePersonalizado: v.mensajePersonalizado.trim() || null,
        fechaInicio: inicio,
        fechaFin: fin,
        lugarFisico: v.lugarFisico.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.listar({ tipo: 'exito', texto: 'Programación actualizada por el servidor.' }),
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected cambiarEstado(nuevo: EstadoSesion): void {
    const s = this.seleccionada();
    if (!s || this.ocupado() || SIGUIENTE_ESTADO[s.estado] !== nuevo) return;
    this.iniciar();
    this.api
      .cambiarEstado(s.id, nuevo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) =>
          this.listar({
            tipo: 'exito',
            texto: `Estado actualizado por el servidor: ${ETIQUETA_ESTADO[r.estado]}.`,
          }),
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected seleccionar(s: SesionAcademica | null): void {
    if (this.sesionPendiente && s?.id.toLowerCase() !== this.sesionPendiente) return;
    this.seleccionada.set(s);
    if (!s) return;
    this.paramSesion.fijar(s.id);
    this.formEditar.reset({
      titulo: s.titulo,
      mensajePersonalizado: s.mensajePersonalizado ?? '',
      fechaInicio: aLocal(s.fechaInicio),
      fechaFin: aLocal(s.fechaFin),
      lugarFisico: s.lugarFisico ?? '',
    });
  }

  protected usarCaso(idCaso: string): void {
    if (this.ocupado() || this.formCrear.controls.casoId.value === idCaso) return;
    if (
      this.hayDatosSinGuardar() &&
      !window.confirm('Hay datos sin guardar. ¿Quieres cambiar el caso de la sesión?')
    ) return;
    this.formCrear.controls.casoId.setValue(idCaso);
    this.formCrear.controls.casoId.markAsDirty();
    this.paramCaso.fijar(idCaso);
  }

  private hayDatosSinGuardar(): boolean {
    return Object.entries(this.formCrear.controls).some(([nombre, campo]) => nombre !== 'casoId' && campo.dirty);
  }

  @HostListener('window:beforeunload', ['$event'])
  protected protegerFormulario(evento: BeforeUnloadEvent): void {
    if (this.hayDatosSinGuardar() || this.formEditar.dirty) evento.preventDefault();
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
      this.consultar(pendiente);
      return;
    }
    this.aviso.set(aviso);
  }

  private fallar(e: unknown): void {
    this.terminar({
      tipo: 'error',
      texto: mensajeM4(
        e,
        'El servidor rechazó la operación por una regla académica (por ejemplo, caso no publicado o transición de estado no permitida).',
      ),
    });
  }
}
