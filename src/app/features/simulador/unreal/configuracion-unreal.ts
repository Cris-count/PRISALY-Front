import { InjectionToken } from '@angular/core';
import { HOSTS_LOCALES_SENALIZACION } from '../../../../environments/senalizacion-unreal';

/** Asignación de una instancia visual; no constituye autorización académica. */
export interface SesionVisualUnreal {
  readonly urlSenalizacion: string;
  readonly streamerId: string;
  readonly sesion: string;
  readonly casoId: string;
}

/** Sin servidor asignado no se abre ninguna conexión ni se simula una ciudad 3D. */
export const SESION_VISUAL_UNREAL = new InjectionToken<SesionVisualUnreal | null>(
  'SESION_VISUAL_UNREAL', { providedIn: 'root', factory: () => null },
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
