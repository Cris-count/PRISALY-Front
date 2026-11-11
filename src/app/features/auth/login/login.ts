import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiAction } from '../../../core/api/api-action';
import { ApiClient } from '../../../core/api/api-client.service';
import { endpoints } from '../../../core/api/catalog';
import { PermisoCrearCaso } from '../../../core/api/types';
import { PersonalAuthResponse } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { fieldError } from '../../../core/forms';
import { Panel } from '../../../shared/panel';
import { ResultView } from '../../../shared/result-view';

// Screen B: personnel authentication, identity (/me), CREAR_CASO probe and logout.
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Panel, ResultView],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly endpoints = endpoints;
  protected readonly user = this.auth.user;
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly submitted = signal(false);
  protected readonly loginAction = new ApiAction<PersonalAuthResponse>();
  protected readonly meAction = new ApiAction<PersonalAuthResponse>();
  protected readonly permisoAction = new ApiAction<PermisoCrearCaso>();
  protected readonly logoutAction = new ApiAction<null>();

  readonly form = this.formBuilder.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected error(name: 'correo' | 'password', label: string): string | null {
    return fieldError(this.form.controls[name], label, 'valor no válido.', this.submitted());
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { correo, password } = this.form.getRawValue();
    const outcome = await this.loginAction.run(() => this.auth.login({ correo: correo.trim(), password }));
    // The password leaves the form as soon as the server answers.
    this.form.controls.password.reset('');
    this.submitted.set(false);
    if (outcome.ok) {
      await this.meAction.run(() => this.auth.loadIdentity());
    }
  }

  protected loadIdentity(): Promise<unknown> {
    return this.meAction.run(() => this.auth.loadIdentity());
  }

  protected checkPermission(): Promise<unknown> {
    return this.permisoAction.run(() => this.api.permisoCrearCaso());
  }

  protected async logout(): Promise<void> {
    await this.logoutAction.run(() => this.auth.logout());
    this.meAction.reset();
    this.permisoAction.reset();
  }
}
