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
import { forkJoin } from 'rxjs';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { aFalloAcademico, esUuid, FalloAcademico, mensajeFallo, UUID_RE } from './academico-http';
import {
  AdministracionM1Api,
  PermisoResumen,
  RolResumen,
  UsuarioDocente,
} from './administracion-m1.api';

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
  private readonly api = inject(AdministracionM1Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');
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
          this.terminar({
            tipo: 'exito',
            texto: `Docente registrado (${docente.estado}). Sin credencial utilizable: la entrega segura de la contraseña está pendiente (D-05).`,
          });
        },
        error: (e: unknown) => this.fallar(e),
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
              : mensajeFallo(fallo);
    this.terminar({
      tipo: 'error',
      texto: `${detalle}${fallo.estado > 0 ? ` (HTTP ${fallo.estado})` : ''}`,
    });
  }
}
