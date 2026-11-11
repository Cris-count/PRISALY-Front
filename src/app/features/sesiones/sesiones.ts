import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiAction } from '../../core/api/api-action';
import { ApiClient } from '../../core/api/api-client.service';
import { CasosCreadosStore } from '../../core/api/casos-creados.store';
import { endpoints } from '../../core/api/catalog';
import { ConvocatoriaResponse, ESTADOS_SESION, EstadoSesion, SesionResponse } from '../../core/api/types';
import {
  blankToNull, dateRangeValidator, fieldError, isoToLocal, localToIso, positiveIntValidator, uuidValidator,
} from '../../core/forms';
import { Panel } from '../../shared/panel';
import { RequiresSession } from '../../shared/requires-session';
import { ResultView } from '../../shared/result-view';

// Screen D: M4 scheduling. Teacher identity always comes from the token; X-Docente-Id is never sent.
@Component({
  selector: 'app-sesiones',
  imports: [ReactiveFormsModule, Panel, RequiresSession, ResultView],
  templateUrl: './sesiones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sesiones {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly endpoints = endpoints;
  protected readonly estados = ESTADOS_SESION;
  protected readonly casosCreados = inject(CasosCreadosStore).casos;

  protected readonly listar = new ApiAction<SesionResponse[]>();
  protected readonly consultar = new ApiAction<SesionResponse>();
  protected readonly crear = new ApiAction<SesionResponse>();
  protected readonly actualizar = new ApiAction<SesionResponse>();
  protected readonly estado = new ApiAction<SesionResponse>();
  protected readonly convocatorias = new ApiAction<ConvocatoriaResponse[]>();
  protected readonly convocar = new ApiAction<ConvocatoriaResponse>();

  protected readonly seleccion = signal<SesionResponse | null>(null);
  protected readonly crearSubmitted = signal(false);
  protected readonly editSubmitted = signal(false);
  protected readonly convocarSubmitted = signal(false);
  protected readonly consultaSubmitted = signal(false);

  protected readonly lista = computed(() => {
    const result = this.listar.result();
    return result !== null && result.ok ? result.data : null;
  });
  protected readonly convocados = computed(() => {
    const result = this.convocatorias.result();
    return result !== null && result.ok ? result.data : null;
  });
  protected readonly listarError = computed(() => {
    const result = this.listar.result();
    return result !== null && !result.ok ? result : null;
  });
  protected readonly convocatoriasError = computed(() => {
    const result = this.convocatorias.result();
    return result !== null && !result.ok ? result : null;
  });
  protected readonly consultarError = computed(() => {
    const result = this.consultar.result();
    return result !== null && !result.ok ? result : null;
  });

  readonly crearForm = this.formBuilder.nonNullable.group(
    {
      casoId: ['', [Validators.required, uuidValidator]],
      titulo: ['', [Validators.required, Validators.maxLength(150)]],
      mensaje: [''],
      inicio: ['', [Validators.required]],
      fin: ['', [Validators.required]],
      tiempoMax: ['1800', [Validators.required, positiveIntValidator]],
    },
    { validators: dateRangeValidator },
  );

  readonly editForm = this.formBuilder.nonNullable.group(
    {
      titulo: ['', [Validators.required, Validators.maxLength(150)]],
      mensaje: [''],
      inicio: ['', [Validators.required]],
      fin: ['', [Validators.required]],
    },
    { validators: dateRangeValidator },
  );

  readonly estadoForm = this.formBuilder.nonNullable.group({
    nuevoEstado: ['EnCurso' as EstadoSesion],
  });

  readonly convocarForm = this.formBuilder.nonNullable.group({
    estudianteId: ['', [Validators.required, uuidValidator]],
  });

  readonly consultaForm = this.formBuilder.nonNullable.group({
    sesionId: ['', [Validators.required, uuidValidator]],
  });

  protected error(form: FormGroup, name: string, label: string, hint: string, submitted: boolean): string | null {
    const control = form.get(name);
    if (control === null) {
      throw new Error(`Control inexistente: ${name}`);
    }
    return fieldError(control, label, hint, submitted);
  }

  protected rangeError(form: FormGroup, submitted: boolean): string | null {
    return submitted && form.hasError('rangoFechas') ? 'El fin debe ser posterior al inicio.' : null;
  }

  protected formatInstant(iso: string | null): string {
    return iso === null ? '—' : new Date(iso).toLocaleString('es');
  }

  protected listarSesiones(): Promise<unknown> {
    return this.listar.run(() => this.api.listarSesiones());
  }

  protected seleccionar(sesion: SesionResponse): void {
    this.seleccion.set(sesion);
    this.editForm.setValue({
      titulo: sesion.titulo,
      mensaje: sesion.mensajePersonalizado ?? '',
      inicio: isoToLocal(sesion.fechaInicio),
      fin: isoToLocal(sesion.fechaFin),
    });
    this.convocatorias.reset();
    void this.convocatorias.run(() => this.api.listarConvocatorias(sesion.id));
  }

  // Keeps the table consistent with the server after a write, only if it was already loaded.
  private refrescarLista(): void {
    if (this.listar.result() !== null) {
      void this.listarSesiones();
    }
  }

  async crearSesion(): Promise<void> {
    this.crearSubmitted.set(true);
    if (this.crearForm.invalid) {
      this.crearForm.markAllAsTouched();
      return;
    }
    const value = this.crearForm.getRawValue();
    const outcome = await this.crear.run(() =>
      this.api.crearSesion({
        casoId: value.casoId.trim(),
        titulo: value.titulo.trim(),
        mensajePersonalizado: blankToNull(value.mensaje),
        fechaInicio: localToIso(value.inicio) ?? '',
        fechaFin: localToIso(value.fin) ?? '',
        tiempoMaximoParticipacionSegundos: Number(value.tiempoMax),
      }),
    );
    if (outcome.ok) {
      this.crearSubmitted.set(false);
      this.seleccionar(outcome.data);
      this.refrescarLista();
    }
  }

  async consultarSesion(): Promise<void> {
    this.consultaSubmitted.set(true);
    if (this.consultaForm.invalid) {
      return;
    }
    const outcome = await this.consultar.run(() => this.api.consultarSesion(this.consultaForm.getRawValue().sesionId.trim()));
    if (outcome.ok) {
      this.seleccionar(outcome.data);
    }
  }

  async actualizarSesion(): Promise<void> {
    const actual = this.seleccion();
    this.editSubmitted.set(true);
    if (actual === null || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const value = this.editForm.getRawValue();
    const outcome = await this.actualizar.run(() =>
      this.api.actualizarSesion(actual.id, {
        titulo: value.titulo.trim(),
        mensajePersonalizado: blankToNull(value.mensaje),
        fechaInicio: localToIso(value.inicio) ?? '',
        fechaFin: localToIso(value.fin) ?? '',
      }),
    );
    if (outcome.ok) {
      this.editSubmitted.set(false);
      this.seleccion.set(outcome.data);
      this.refrescarLista();
    }
  }

  async cambiarEstado(): Promise<void> {
    const actual = this.seleccion();
    if (actual === null) {
      return;
    }
    const outcome = await this.estado.run(() =>
      this.api.cambiarEstadoSesion(actual.id, this.estadoForm.getRawValue().nuevoEstado),
    );
    if (outcome.ok) {
      this.seleccion.set(outcome.data);
      this.refrescarLista();
    }
  }

  async convocarEstudiante(): Promise<void> {
    const actual = this.seleccion();
    this.convocarSubmitted.set(true);
    if (actual === null || this.convocarForm.invalid) {
      return;
    }
    const outcome = await this.convocar.run(() =>
      this.api.convocarEstudiante(actual.id, this.convocarForm.getRawValue().estudianteId.trim()),
    );
    if (outcome.ok) {
      this.convocarSubmitted.set(false);
      this.convocarForm.reset();
      void this.convocatorias.run(() => this.api.listarConvocatorias(actual.id));
    }
  }
}
