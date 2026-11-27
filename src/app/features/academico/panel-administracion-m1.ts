import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { CAPACIDADES_DC99 } from './capacidades-dc99';
import { aFalloAcademico, esUuid, FalloAcademico, mensajeFallo, UUID_RE } from './academico-http';
import {
  AdministracionM1Api,
  PermisoResumen,
  RolResumen,
  UsuarioDocente,
  UsuarioAdministrativo,
} from './administracion-m1.api';

/** FE-61 · D-05: códigos de `ActivacionDocenteExceptionHandler` en las operaciones del administrador. */
export function mensajeFalloActivacionAdmin(fallo: FalloAcademico): string | null {
  switch (fallo.codigo) {
    case 'USER_NOT_FOUND':
      return 'No existe un usuario con ese identificador.';
    case 'ACTIVATION_NOT_ALLOWED':
      return 'Ese usuario no admite una invitación de activación.';
    case 'ACTIVATION_CONFLICT':
      return 'La invitación cambió al mismo tiempo en otra solicitud. Vuelve a intentarlo.';
    case 'ACTIVATION_DELIVERY_FAILED':
      return 'El servidor no pudo entregar la invitación al servicio de correo.';
    default:
      return null;
  }
}

type Aviso = { tipo: 'exito' | 'error' | 'info'; texto: string } | null;

/**
 * Reflejo de `PoliticaPermisos.exigeSeparacionDeFunciones` (M1, DM1-02): un administrador no puede
 * asignarse estos permisos a sí mismo. El Backend sigue siendo quien decide (403 en cualquier caso).
 */
export const PERMISOS_SEPARACION_FUNCIONES: readonly string[] = ['PUBLICAR_CASO', 'ARCHIVAR_CASO'];

/**
 * FE-53-A. Consulta de catálogo, permisos efectivos, asignación/revocación y alta de docente
 * contra `/v1/admin`. Ninguna acción se presenta como exitosa sin respuesta 2xx del Backend.
 */
@Component({
  selector: 'app-panel-administracion-m1',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-administracion-m1.html',
  styleUrl: './panel-academico.css',
})
export class PanelAdministracionM1 {
  readonly vista = input<'docentes' | 'estudiantes' | 'permisos'>('docentes');
  /** FE-UX-04B: en el Inicio se muestra solo la consulta (búsqueda, tabla y detalle); el alta vive en Gestión de usuarios. */
  readonly resumen = input(false);
  protected readonly busqueda = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(120)],
  });
  protected readonly usuarios = signal<readonly UsuarioAdministrativo[] | null>(null);
  protected readonly seleccionado = signal<UsuarioAdministrativo | null>(null);
  protected readonly hayMas = signal(false);
  protected readonly pagina = signal(0);
  protected buscarUsuarios(reiniciar = true): void {
    if (!this.sesionValida() || this.busqueda.invalid || this.ocupado()) return;
    if (reiniciar) this.pagina.set(0);
    this.iniciar();
    this.api
      .buscarUsuarios(
        this.busqueda.value,
        this.vista() === 'estudiantes' ? 'ESTUDIANTE' : 'DOCENTE',
        this.pagina() * 25,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.usuarios.set(result.items);
          this.hayMas.set(result.hayMas);
          const actual = this.seleccionado();
          if (actual)
            this.seleccionado.set(
              result.items.find((u) => u.idUsuario === actual.idUsuario) ?? null,
            );
          this.terminar(null);
        },
        error: (e) => this.fallar(e),
      });
  }
  protected moverPagina(delta: number): void {
    this.pagina.update((p) => Math.max(0, p + delta));
    this.buscarUsuarios(false);
  }
  protected seleccionarUsuario(u: UsuarioAdministrativo): void {
    this.usuarioConsultado.set(null);
    this.efectivos.set(null);
    this.seleccionado.set(u);
    this.formUsuario.controls.idUsuario.setValue(u.idUsuario);
    this.formActivacion.controls.idUsuario.setValue(u.idUsuario);
    if (u.rol === 'DOCENTE') this.cargarEfectivos(u.idUsuario);
  }
  protected invitacionLegible(estado: string): string {
    return (
      (
        {
          VIGENTE: 'Invitación vigente',
          CONSUMIDA: 'Invitación utilizada',
          REVOCADA: 'Invitación revocada',
          VENCIDA: 'Invitación vencida',
          NO_EMITIDA: 'Sin invitación',
          NO_DISPONIBLE: 'Estado no confirmado',
          NO_APLICA: 'No corresponde',
        } as Record<string, string>
      )[estado] ?? 'Estado no confirmado'
    );
  }

  private readonly api = inject(AdministracionM1Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');
  /** FE-61 · D-05: (re)emisión y revocación solo con la capacidad explícita del entorno. */
  protected readonly activacionHabilitada = inject(CAPACIDADES_DC99).activacionDocente;
  protected readonly miUsuario = computed(() => {
    const e = this.sesion.estado();
    return e.tipo === 'valida' ? e.identidad.userId : null;
  });

  protected readonly roles = signal<readonly RolResumen[] | null>(null);
  protected readonly permisos = signal<readonly PermisoResumen[] | null>(null);
  protected readonly usuarioConsultado = signal<string | null>(null);
  protected readonly efectivos = signal<readonly PermisoResumen[] | null>(null);
  protected readonly docenteCreado = signal<UsuarioDocente | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<Aviso>(null);

  protected readonly esPropio = computed(() => {
    const consultado = this.usuarioConsultado();
    return consultado !== null && consultado.toLowerCase() === this.miUsuario()?.toLowerCase();
  });

  protected readonly formUsuario = new FormGroup({
    idUsuario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(UUID_RE)],
    }),
  });

  protected readonly formDocente = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
  });

  protected readonly formActivacion = new FormGroup({
    idUsuario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(UUID_RE)],
    }),
  });

  protected tienePermiso(idPermiso: number): boolean {
    return this.efectivos()?.some((p) => p.idPermiso === idPermiso) ?? false;
  }

  /** Asignarse a uno mismo un permiso sujeto a separación de funciones. */
  protected autoasignacionProhibida(permiso: PermisoResumen): boolean {
    return this.esPropio() && PERMISOS_SEPARACION_FUNCIONES.includes(permiso.codigo);
  }

  protected consultarCatalogo(): void {
    this.iniciar();
    forkJoin({ roles: this.api.roles(), permisos: this.api.permisos() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ roles, permisos }) => {
          this.roles.set(roles);
          this.permisos.set(permisos);
          this.terminar(null);
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected consultarUsuario(): void {
    this.formUsuario.markAllAsTouched();
    if (this.formUsuario.invalid) return;
    const id = this.formUsuario.controls.idUsuario.value.trim();
    this.cargarEfectivos(id);
  }

  protected asignar(permiso: PermisoResumen): void {
    const id = this.usuarioConsultado();
    if (!id || this.autoasignacionProhibida(permiso) || this.ocupado()) return;
    this.iniciar();
    this.api
      .asignarPermiso(id, permiso.idPermiso)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          if (!r.habilitado) {
            this.terminar({
              tipo: 'error',
              texto: `El servidor no confirmó la habilitación de ${permiso.codigo}.`,
            });
            return;
          }
          this.cargarEfectivos(id, { tipo: 'exito', texto: `Permiso ${permiso.codigo} asignado.` });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected revocar(permiso: PermisoResumen): void {
    const id = this.usuarioConsultado();
    if (!id || this.ocupado()) return;
    this.iniciar();
    this.api
      .revocarPermiso(id, permiso.idPermiso)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.cargarEfectivos(id, { tipo: 'exito', texto: `Permiso ${permiso.codigo} revocado.` }),
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected crearDocente(): void {
    this.formDocente.markAllAsTouched();
    if (this.formDocente.invalid || this.ocupado()) return;
    this.iniciar();
    this.api
      .altaDocente(this.formDocente.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (docente) => {
          this.docenteCreado.set(docente);
          this.formDocente.reset();
          this.formUsuario.controls.idUsuario.setValue(docente.idUsuario);
          this.formActivacion.controls.idUsuario.setValue(docente.idUsuario);
          this.terminar({
            tipo: 'exito',
            texto: this.activacionHabilitada
              ? `Docente registrado (cuenta ${docente.estado}). Acceso pendiente de habilitación: la invitación debe confirmarse en el correo de ${docente.correo}. El docente abre el enlace del correo, define su contraseña en «Activar cuenta docente» y después inicia sesión. Para que vea las secciones docentes, asígnale permisos en «Roles y permisos» (su identificador ya está cargado). Si la invitación no le llega, usa «Emitir invitación».`
              : `Docente registrado (${docente.estado}). El alta no devuelve contraseña; la activación D-05 no está habilitada en este entorno.`,
          });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  /** D-05 `POST /v1/admin/docentes/{id}/activacion` (202: emisión aceptada, entrega no verificada). */
  protected emitirActivacion(): void {
    this.operarActivacion('emitir');
  }

  /** D-05 `DELETE /v1/admin/docentes/{id}/activacion` (204). */
  protected revocarActivacion(): void {
    this.operarActivacion('revocar');
  }

  private operarActivacion(accion: 'emitir' | 'revocar'): void {
    this.formActivacion.markAllAsTouched();
    if (!this.activacionHabilitada || this.formActivacion.invalid || this.ocupado()) return;
    const id = this.formActivacion.controls.idUsuario.value.trim();
    this.iniciar();
    const operacion =
      accion === 'emitir'
        ? this.api.emitirActivacionDocente(id)
        : this.api.revocarActivacionDocente(id);
    operacion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () =>
        this.terminar({
          tipo: 'exito',
          texto:
            accion === 'emitir'
              ? 'El servidor aceptó la emisión de la invitación (202). La entrega del correo no se verifica desde esta interfaz.'
              : 'Invitación revocada por el servidor.',
        }),
      error: (e: unknown) => {
        const fallo = aFalloAcademico(e);
        // Sin PRISALY_M1_ACTIVACION_DOCENTE_ENABLED la ruta no existe: 404 sin código de dominio.
        if (fallo.estado === 404 && fallo.codigo === null) {
          this.terminar({
            tipo: 'error',
            texto: 'El servidor no tiene habilitada la activación docente (D-05). (HTTP 404)',
          });
          return;
        }
        this.fallar(fallo);
      },
    });
  }

  private cargarEfectivos(id: string, avisoFinal: Aviso = null): void {
    if (!esUuid(id)) return;
    this.iniciar();
    this.api
      .permisosDeUsuario(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.usuarioConsultado.set(id);
          this.efectivos.set(lista);
          this.terminar(avisoFinal);
        },
        error: (e: unknown) => {
          this.usuarioConsultado.set(null);
          this.efectivos.set(null);
          this.fallar(e);
        },
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
    const fallo: FalloAcademico = aFalloAcademico(e);
    const detalle =
      fallo.codigo === 'PERMISSION_SELF_ASSIGNMENT_NOT_ALLOWED'
        ? 'La política vigente no permite asignarse permisos a uno mismo.'
        : fallo.codigo === 'DUPLICATE_EMAIL'
          ? 'Ya existe un usuario con ese correo.'
          : fallo.codigo === 'DUPLICATE_ASSIGNMENT'
            ? 'El permiso ya estaba asignado.'
            : fallo.codigo === 'PERMISSION_NOT_ALLOWED_FOR_STUDENT'
              ? 'Ese permiso no puede asignarse a un estudiante.'
              : (mensajeFalloActivacionAdmin(fallo) ?? mensajeFallo(fallo));
    this.terminar({
      tipo: 'error',
      texto: `${detalle}${fallo.estado > 0 ? ` (HTTP ${fallo.estado})` : ''}`,
    });
  }
}
