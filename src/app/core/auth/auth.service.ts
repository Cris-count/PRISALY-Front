import { Injectable, computed, inject } from '@angular/core';
import { ApiClient, ApiResult } from '../api/api-client.service';
import { PersonalAuthRequest, PersonalAuthResponse } from './auth.models';
import { TokenStore } from './token.store';

// Personnel session flow over M1: authenticate, load identity (/me), log out.
// The token lives only in memory (TokenStore); nothing is written to localStorage.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly tokens = inject(TokenStore);

  readonly user = this.tokens.user;
  readonly token = this.tokens.token;
  readonly isAuthenticated = computed(() => this.tokens.token() !== null);

  async login(request: PersonalAuthRequest): Promise<ApiResult<PersonalAuthResponse>> {
    const result = await this.api.autenticarPersonal(request);
    if (result.ok && result.data.accessToken !== null) {
      this.tokens.setToken(result.data.accessToken);
    }
    return result;
  }

  async loadIdentity(): Promise<ApiResult<PersonalAuthResponse>> {
    const result = await this.api.me();
    if (result.ok) {
      this.tokens.setUser(result.data);
    }
    return result;
  }

  // Revokes the token on the server, then drops the local session whatever the answer.
  async logout(): Promise<ApiResult<null>> {
    const result = await this.api.cerrarSesion();
    this.tokens.clear();
    return result;
  }
}
