import { HttpContextToken } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { PersonalAuthResponse } from './auth.models';

// Requests marked with this flag never receive the personnel Bearer token
// (student routes, public routes, or the diagnostics panel with the token unticked).
export const SKIP_PERSONAL_TOKEN = new HttpContextToken<boolean>(() => false);

// Personnel session for the test run, kept in memory only: a reload discards it.
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly currentToken = signal<string | null>(null);
  private readonly currentUser = signal<PersonalAuthResponse | null>(null);

  readonly token = this.currentToken.asReadonly();
  readonly user = this.currentUser.asReadonly();

  setToken(token: string): void {
    this.currentToken.set(token);
  }

  setUser(user: PersonalAuthResponse): void {
    this.currentUser.set(user);
  }

  clear(): void {
    this.currentToken.set(null);
    this.currentUser.set(null);
  }
}
