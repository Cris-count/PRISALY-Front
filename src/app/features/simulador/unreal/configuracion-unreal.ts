import { InjectionToken } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HOSTS_LOCALES_SENALIZACION } from '../../../../environments/senalizacion-unreal';

/** Asignación de una instancia visual; no constituye autorización académica. */
export interface SesionVisualUnreal {
  readonly urlSenalizacion: string;
  readonly streamerId: string;
  readonly sesion: string;
  readonly casoId: string;
}

/**
 * Instancia del laboratorio local PS2-LAB-03: señalización `infraestructura/senalizacion-local.mjs`
 * (player 8898, streamer 8899, ID `PRISALY-LAB-03`) y Unreal con `-PrisalySesion=ses-lab-ps2-0001`.
 */
export const SESION_VISUAL_LOCAL: SesionVisualUnreal = Object.freeze({
  urlSenalizacion: 'ws://127.0.0.1:8898/',
  streamerId: 'PRISALY-LAB-03',
  sesion: 'ses-lab-ps2-0001',
  casoId: 'caso-lab-demo',
});

/** Único Origin que admite la señalización local para el navegador. */
export const ORIGEN_VISOR_LOCAL = 'http://127.0.0.1:4213';

/** La sesión local solo se entrega en desarrollo y desde el Origin aceptado por la señalización. */
export function resolverSesionVisual(habilitada: boolean, origen: string): SesionVisualUnreal | null {
  return habilitada && origen === ORIGEN_VISOR_LOCAL ? SESION_VISUAL_LOCAL : null;
}

/** Sin servidor asignado no se abre ninguna conexión ni se simula una ciudad 3D. */
export const SESION_VISUAL_UNREAL = new InjectionToken<SesionVisualUnreal | null>(
  'SESION_VISUAL_UNREAL', {
    providedIn: 'root',
    factory: () => resolverSesionVisual(environment.simuladorUnrealLocal, globalThis.location?.origin ?? ''),
  },
);

export function validarSesionVisual(sesion: SesionVisualUnreal): void {
  const url = new URL(sesion.urlSenalizacion);
  const local = HOSTS_LOCALES_SENALIZACION.includes(url.hostname);
  if (url.protocol !== 'wss:' && !(local && url.protocol === 'ws:')) {
    throw new Error('La señalización requiere WSS; WS solo se admite en direcciones de bucle local.');
  }
  if (url.username || url.password || url.hash || !sesion.streamerId.trim() ||
      !/^[A-Za-z0-9_-]{8,64}$/.test(sesion.sesion) || !/^[A-Za-z0-9_-]{1,64}$/.test(sesion.casoId)) {
    throw new Error('La asignación de la sesión visual está incompleta o no es válida.');
  }
}
