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
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { aFalloAcademico, mensajeFallo } from './academico-http';
import { AdministracionM1Api, EstudianteRegistrado } from './administracion-m1.api';
import { CAPACIDADES_DC99 } from './capacidades-dc99';

type Aviso = { tipo: 'exito' | 'error' | 'info'; texto: string } | null;

/** Mensaje de interfaz para un fallo de P-78; no reproduce el mensaje del servidor. */
export function mensajeFalloEstudiantes(e: unknown): string {
  const fallo = aFalloAcademico(e);
  let detalle: string;
  if (fallo.estado === 404 && fallo.codigo === null) {
    // Sin el interruptor PRISALY_M1_ALTA_ESTUDIANTES_ENABLED el controlador no existe.
    detalle = 'El servidor no tiene habilitada la administración de estudiantes (P-78).';
  } else if (fallo.codigo === 'DUPLICATE_EMAIL') {
    detalle = 'Ya existe un usuario con ese correo.';
  } else if (fallo.codigo === 'ADMIN_REQUIRED') {
    detalle = 'La operación requiere un administrador activo.';
  } else if (fallo.codigo === 'STUDENT_ROLE_NOT_CONFIGURED' || fallo.codigo === 'ROLE_NOT_FOUND') {
    detalle = 'El rol ESTUDIANTE no está configurado en el servidor (PD-01).';
  } else {
    detalle = mensajeFallo(fallo);
  }
  return `${detalle}${fallo.estado > 0 ? ` (HTTP ${fallo.estado})` : ''}`;
}

/**
 * DC-121 · DD-02 B no tiene activación separada ni contraseña: el estudiante con cuenta activa y registro de
 * estudiante pide un código de un solo uso con su correo (`POST /v1/acceso-estudiante/solicitar`) y lo valida.
 * «Activo» es el estado de la cuenta; el acceso se describe aparte.
 */
export function accesoEstudianteHabilitado(estado: string): boolean {
  return estado === 'Activo';
}

export function textoAccesoEstudiante(estado: string): string {
  return accesoEstudianteHabilitado(estado)
    ? 'Acceso habilitado (DD-02): el estudiante entra en «Ingresar como estudiante» con este correo y recibe allí un código de un solo uso. No hay contraseña.'
    : `Acceso no disponible: la cuenta está en estado «${estado}».`;
}

/**
 * FE-61 · P-78 (Backend DC-99, `AdministracionEstudiantesController`, candidato QA): alta
 * administrativa de estudiantes y búsqueda por correo EXACTO. No existe listado general,
 * paginación ni filtros en el Backend, y esta interfaz no los simula.
 *
 * Dar de alta un estudiante NO activa su acceso: no se crea ni se devuelve credencial y no se envía
 * correo. El acceso estudiantil sigue siendo exclusivamente el contrato DD-02.
 *
 * Deshabilitado mientras `capacidadesBackend.altaEstudiantes` no sea `true` en el entorno (hoy en
 * ninguno): en ese caso no realiza ninguna solicitud. Aun habilitado, el Backend decide: 404 si su
 * interruptor está apagado, 401/403 según la sesión.
 */
@Component({
  selector: 'app-panel-estudiantes-m1',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-estudiantes-m1.html',
  styleUrl: './panel-academico.css',
})
export class PanelEstudiantesM1 {
  readonly soloAlta = input(false);
  private readonly api = inject(AdministracionM1Api);
  private readonly sesion = inject(SesionPersonalM1);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly habilitada = inject(CAPACIDADES_DC99).altaEstudiantes;
  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');

  protected readonly estudianteCreado = signal<EstudianteRegistrado | null>(null);
  protected readonly resultados = signal<readonly EstudianteRegistrado[] | null>(null);
  protected readonly correoBuscado = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  protected readonly habilitado = accesoEstudianteHabilitado;

  protected readonly formAlta = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(150),
        (control) =>
          typeof control.value === 'string' && control.value.trim() === '' ? { texto: true } : null,
      ],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
  });

  protected readonly formBusqueda = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
  });

  protected crearEstudiante(): void {
    this.formAlta.markAllAsTouched();
    if (
      !this.habilitada ||
      this.formAlta.invalid ||
      this.formAlta.controls.nombre.value.trim() === '' ||
      this.ocupado()
    )
      return;
    this.iniciar();
    this.api
      .altaEstudiante(this.formAlta.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estudiante) => {
          this.estudianteCreado.set(estudiante);
          this.formAlta.reset();
          this.terminar({
            tipo: 'exito',
            texto: `Estudiante registrado. ${textoAccesoEstudiante(estudiante.estado)}`,
          });
        },
        error: (e: unknown) => this.terminar({ tipo: 'error', texto: mensajeFalloEstudiantes(e) }),
      });
  }

  protected buscar(): void {
    this.formBusqueda.markAllAsTouched();
    if (!this.habilitada || this.formBusqueda.invalid || this.ocupado()) return;
    const correo = this.formBusqueda.controls.correo.value.trim();
    this.iniciar();
    this.api
      .buscarEstudiantePorCorreo(correo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.correoBuscado.set(correo);
          this.resultados.set(lista);
          this.terminar(null);
        },
        error: (e: unknown) => {
          this.correoBuscado.set(null);
          this.resultados.set(null);
          this.terminar({ tipo: 'error', texto: mensajeFalloEstudiantes(e) });
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
}
