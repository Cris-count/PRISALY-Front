import { inject, InjectionToken } from '@angular/core';
import type { PaqueteVisual } from './contrato-visual';
import { MUNDO_PRUEBA } from './mundo-tecnico.fixture';
import { EventoMundo } from './mundo-tecnico.models';
import type { ControlMundo } from './phaser-mundo';

/** Puerto local para crear el renderer; no accede a servicios académicos. */
export type FabricaMundo = (contenedor: HTMLElement, emitir: (evento: EventoMundo) => void) => Promise<ControlMundo>;
/** Sin provider, se mantiene la calibración provisional. Activar solo tras validar el paquete. */
export const PAQUETE_VISUAL = new InjectionToken<PaqueteVisual | null>('PAQUETE_VISUAL_SIMULADOR', { providedIn: 'root', factory: () => null });
export const FABRICA_MUNDO = new InjectionToken<FabricaMundo>('FABRICA_MUNDO_TECNICO', {
  providedIn: 'root',
  factory: () => {
    const paquete = inject(PAQUETE_VISUAL);
    return async (contenedor, emitir) => {
      const { iniciarMundoPhaser } = await import('./phaser-mundo');
      return iniciarMundoPhaser(contenedor, MUNDO_PRUEBA, emitir, paquete);
    };
  },
});
