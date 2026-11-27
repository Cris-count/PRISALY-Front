import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { CanDeactivateFn } from '@angular/router';

/**
 * DC-MVP-09 / DC-MVP-08-R03: protección de cambios sin guardar durante la navegación interna
 * de Angular y al cambiar de caso en el flujo docente.
 */
@Injectable({ providedIn: 'root' })
export class CambiosSinGuardarService {
  private readonly fuentesPendientes = signal<ReadonlySet<string>>(new Set());

  tienePendientes(): boolean {
    return this.fuentesPendientes().size > 0;
  }

  marcar(clave: string, pendiente: boolean): void {
    this.fuentesPendientes.update((actual) => {
      const siguiente = new Set(actual);
      if (pendiente) {
        siguiente.add(clave);
      } else {
        siguiente.delete(clave);
      }
      return siguiente;
    });
  }

  /** Vincula formularios reactivos de un panel; limpia la marca automáticamente al destruirse. */
  vincularFormularios(
    clave: string,
    formularios: readonly AbstractControl[],
    destroyRef = inject(DestroyRef),
  ): void {
    const actualizar = () => {
      this.marcar(
        clave,
        formularios.some((f) => f.dirty),
      );
    };
    const suscripciones = formularios.map((f) => f.events.subscribe(actualizar));
    destroyRef.onDestroy(() => {
      for (const s of suscripciones) s.unsubscribe();
      this.marcar(clave, false);
    });
  }

  confirmarNavegacion(
    mensaje = 'Tienes cambios sin guardar. ¿Deseas salir sin guardarlos?',
  ): boolean {
    if (!this.tienePendientes()) return true;
    const confirmado = typeof window !== 'undefined' ? window.confirm(mensaje) : true;
    if (confirmado) {
      this.fuentesPendientes.set(new Set());
    }
    return confirmado;
  }

  confirmarCambioCaso(idActual: string | null | undefined, idNuevo: string): boolean {
    if (!idActual || idActual.toLowerCase() === idNuevo.toLowerCase()) return true;
    return this.confirmarNavegacion(
      'Tienes cambios sin guardar en el caso actual. ¿Deseas cambiar de caso sin guardarlos?',
    );
  }
}

export const protegerCambiosSinGuardar: CanDeactivateFn<unknown> = () =>
  inject(CambiosSinGuardarService).confirmarNavegacion();
