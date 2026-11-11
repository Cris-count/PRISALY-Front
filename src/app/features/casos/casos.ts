import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiAction } from '../../core/api/api-action';
import { ApiClient } from '../../core/api/api-client.service';
import { CasosCreadosStore } from '../../core/api/casos-creados.store';
import { endpoints, pendingOperations } from '../../core/api/catalog';
import { CrearCasoResponse } from '../../core/api/types';
import { blankToNull, fieldError, newUuid, positiveIntValidator, uuidValidator } from '../../core/forms';
import { Panel } from '../../shared/panel';
import { PendingList } from '../../shared/pending-list';
import { RequiresSession } from '../../shared/requires-session';
import { ResultView } from '../../shared/result-view';

type CasoField = 'idCaso' | 'titulo' | 'tiempo';

// Screen C: M3 exposes only draft creation; the other operations have no route.
@Component({
  selector: 'app-casos',
  imports: [ReactiveFormsModule, Panel, PendingList, RequiresSession, ResultView],
  templateUrl: './casos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Casos {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(CasosCreadosStore);
  protected readonly creados = this.store.casos;

  protected readonly endpoints = endpoints;
  protected readonly pendientes = pendingOperations.filter((operation) => operation.module === 'M3');
  protected readonly submitted = signal(false);
  protected readonly crear = new ApiAction<CrearCasoResponse>();

  readonly form = this.formBuilder.nonNullable.group({
    idCaso: [newUuid(), [Validators.required, uuidValidator]],
    titulo: ['', [Validators.required, Validators.maxLength(150)]],
    tiempo: ['600', [Validators.required, positiveIntValidator]],
    historia: [''],
    desarrollo: [''],
  });

  protected error(name: CasoField, label: string, hint: string): string | null {
    return fieldError(this.form.controls[name], label, hint, this.submitted());
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const outcome = await this.crear.run(() =>
      this.api.crearCaso({
        idCaso: value.idCaso.trim(),
        titulo: value.titulo.trim(),
        tiempoEstimadoSegundos: Number(value.tiempo),
        historia: blankToNull(value.historia),
        desarrolloSituacional: blankToNull(value.desarrollo),
      }),
    );
    if (outcome.ok) {
      this.store.add(outcome.data.idCaso);
      this.form.controls.idCaso.setValue(newUuid());
      this.submitted.set(false);
    }
  }
}
