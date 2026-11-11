import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TokenStore } from '../core/auth/token.store';

// Notice for personnel operations; it does not block the call so 401 can be observed.
@Component({
  selector: 'app-requires-session',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tokens.token() !== null) {
      <p class="notice notice--info" data-testid="session-active">
        Operando como <strong>{{ tokens.user()?.nombre ?? 'personal autenticado' }}</strong>
        @if (tokens.user(); as user) {
          · {{ user.rol }}
        }
      </p>
    } @else {
      <p class="notice notice--warn" data-testid="session-missing">
        No hay sesión del personal: el servidor responderá 401. <a routerLink="/personal">Iniciar sesión</a>
      </p>
    }
  `,
})
export class RequiresSession {
  protected readonly tokens = inject(TokenStore);
}
