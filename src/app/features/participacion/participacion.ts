import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiAction } from '../../core/api/api-action';
import { ApiClient } from '../../core/api/api-client.service';
import { endpoints, pendingOperations } from '../../core/api/catalog';
import { IntentoResponse, RespuestaGuardada } from '../../core/api/types';
import { fieldError, nonNegativeIntValidator, uuidValidator } from '../../core/forms';
import { Panel } from '../../shared/panel';
import { PendingList } from '../../shared/pending-list';
import { ResultView } from '../../shared/result-view';

type IntentoField = 'idIntento' | 'idPregunta' | 'idOpcion' | 'revision';

// Screen F: M5 routes need a student identity (DD-02). Requests go without credentials,
// never with the personnel token. No correct answers or protected explanations are shown.
@Component({
  selector: 'app-participacion',
  imports: [ReactiveFormsModule, Panel, PendingList, ResultView],
  templateUrl: './participacion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Participacion {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly endpoints = endpoints;
  protected readonly pendientes = pendingOperations.filter(
    (operation) => operation.module === 'M5' || operation.module === 'M6',
  );
  protected readonly consultaSubmitted = signal(false);
  protected readonly guardarSubmitted = signal(false);
  protected readonly consultar = new ApiAction<IntentoResponse>();
  protected readonly guardar = new ApiAction<RespuestaGuardada>();

  readonly form = this.formBuilder.nonNullable.group({
    idIntento: ['', [Validators.required, uuidValidator]],
    idPregunta: ['', [Validators.required, uuidValidator]],
    idOpcion: ['', [Validators.required, uuidValidator]],
    revision: ['0', [Validators.required, nonNegativeIntValidator]],
  });

  protected error(name: IntentoField, label: string, hint: string, submitted: boolean): string | null {
    return fieldError(this.form.controls[name], label, hint, submitted);
  }

  protected consultarIntento(): void {
    this.consultaSubmitted.set(true);
    const control = this.form.controls.idIntento;
    if (control.invalid) {
      control.markAsTouched();
      return;
    }
    void this.consultar.run(() => this.api.consultarIntento(control.value.trim()));
  }

  protected guardarRespuesta(): void {
    this.guardarSubmitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    void this.guardar.run(() =>
      this.api.guardarRespuesta(value.idIntento.trim(), value.idPregunta.trim(), {
        idOpcionSeleccionada: value.idOpcion.trim(),
        revisionEsperada: Number(value.revision),
      }),
    );
  }
}
