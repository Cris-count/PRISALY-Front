import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiAction } from '../../core/api/api-action';
import { ApiClient } from '../../core/api/api-client.service';
import { endpoints } from '../../core/api/catalog';
import { eightDigitsValidator, fieldError, newUuid } from '../../core/forms';
import { Panel } from '../../shared/panel';
import { ResultView } from '../../shared/result-view';

type Dd02State = 'sin-consultar' | 'bloqueada' | 'inesperada' | 'rechazada';

// Screen E: reads the real DD-02 state. Never creates a student session and never sends
// the personnel token (the endpoint is "none" in the catalog).
@Component({
  selector: 'app-acceso-estudiantil',
  imports: [ReactiveFormsModule, Panel, ResultView],
  templateUrl: './acceso-estudiantil.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccesoEstudiantil {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly endpoints = endpoints;
  protected readonly submitted = signal(false);
  protected readonly validar = new ApiAction<unknown>();

  readonly form = this.formBuilder.nonNullable.group({
    challengeId: [newUuid(), [Validators.required]],
    codigo: ['', [Validators.required, eightDigitsValidator]],
  });

  protected readonly state = computed<Dd02State>(() => {
    const result = this.validar.result();
    if (result === null) {
      return 'sin-consultar';
    }
    if (result.ok) {
      return 'inesperada';
    }
    return result.error.kind === 'not_implemented' ? 'bloqueada' : 'rechazada';
  });

  protected readonly serverCode = computed(() => {
    const result = this.validar.result();
    return result !== null && !result.ok ? result.error.code : null;
  });

  protected error(name: 'challengeId' | 'codigo', label: string, hint: string): string | null {
    return fieldError(this.form.controls[name], label, hint, this.submitted());
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { challengeId, codigo } = this.form.getRawValue();
    await this.validar.run(() => this.api.validarAccesoEstudiante({ challengeId: challengeId.trim(), codigo }));
    this.form.controls.codigo.reset('');
    this.submitted.set(false);
  }
}
