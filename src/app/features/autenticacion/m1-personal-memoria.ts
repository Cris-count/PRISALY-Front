import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Única credencial de personal en memoria. No se serializa ni se expone en estados de UI.
 * Se pierde al destruir el inyector o recargar. No determina la vigencia en Backend.
 */
@Injectable({ providedIn: 'root' })
export class CredencialPersonalMemoria {
  #token: string | null = null;
  private readonly cambio = signal(0);
  readonly revision = this.cambio.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.limpiar());
  }

  guardar(token: string): void {
    if (!esTokenPersonal(token)) throw new Error('Credencial de personal no válida.');
    this.#token = token;
    this.cambio.update((valor) => valor + 1);
  }

  /** Exclusivamente para el transporte HTTP M1; no usar como prueba de autorización. */
  leerParaHttp(): string | null {
    return this.#token;
  }

  limpiar(): void {
    if (this.#token === null) return;
    this.#token = null;
    this.cambio.update((valor) => valor + 1);
  }
}

export function esTokenPersonal(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0 && !/[\s\u0000-\u001f\u007f]/.test(valor);
}
