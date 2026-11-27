import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Única credencial de personal. No se expone en estados de UI ni determina la vigencia en Backend.
 * DC-114: para sobrevivir a una recarga se conserva SOLO el token de acceso en `sessionStorage` (ámbito de la
 * pestaña, se borra al cerrarla). Nunca se guarda la contraseña. Al restaurar, la sesión se revalida con
 * `GET /v1/personal/me` antes de considerarse válida, y se borra al cerrar sesión o ante un 401.
 */
const CLAVE_SESION = 'prisaly.personal.sesion';

function almacen(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class CredencialPersonalMemoria {
  #token: string | null = null;
  private readonly cambio = signal(0);
  readonly revision = this.cambio.asReadonly();

  constructor() {
    const guardado = almacen()?.getItem(CLAVE_SESION) ?? null;
    if (esTokenPersonal(guardado)) this.#token = guardado;
    inject(DestroyRef).onDestroy(() => this.limpiar());
  }

  /** Hay una credencial restaurada o vigente que aún debe confirmarse con `/me`. */
  hayCredencial(): boolean {
    return this.#token !== null;
  }

  guardar(token: string): void {
    if (!esTokenPersonal(token)) throw new Error('Credencial de personal no válida.');
    this.#token = token;
    almacen()?.setItem(CLAVE_SESION, token);
    this.cambio.update((valor) => valor + 1);
  }

  /** Exclusivamente para el transporte HTTP M1; no usar como prueba de autorización. */
  leerParaHttp(): string | null {
    return this.#token;
  }

  limpiar(): void {
    almacen()?.removeItem(CLAVE_SESION);
    if (this.#token === null) return;
    this.#token = null;
    this.cambio.update((valor) => valor + 1);
  }
}

export function esTokenPersonal(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0 && !/[\s\u0000-\u001f\u007f]/.test(valor);
}
