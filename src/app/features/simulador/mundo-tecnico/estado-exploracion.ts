import { computed, Injectable, signal } from '@angular/core';

export type MotivoSuspension = 'interior' | 'libreta' | 'confirmacion-modal' | 'cuestionario';
/** Estado visual local. Cuestionario es un motivo reservado, no una transición académica. */
@Injectable()
export class EstadoExploracion {
  private readonly activos = signal<ReadonlySet<MotivoSuspension>>(new Set());
  readonly motivos = computed(() => [...this.activos()]);
  readonly suspendido = computed(() => this.activos().size > 0);
  establecer(motivo: MotivoSuspension, activo: boolean): void {
    if (this.activos().has(motivo) === activo) return;
    const siguiente = new Set(this.activos());
    if (activo) siguiente.add(motivo); else siguiente.delete(motivo);
    this.activos.set(siguiente);
  }
}
