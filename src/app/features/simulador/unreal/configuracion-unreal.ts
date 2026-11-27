import { InjectionToken } from '@angular/core';
import { environment } from '../../../../environments/environment';
import {
  HOSTS_LOCALES_SENALIZACION,
  ORIGEN_VISOR_LOCAL,
  URL_SENALIZACION_LOCAL,
} from '../../../../environments/senalizacion-unreal';

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
  urlSenalizacion: URL_SENALIZACION_LOCAL,
  streamerId: 'PRISALY-LAB-03',
  sesion: 'ses-lab-ps2-0001',
  casoId: 'caso-lab-demo',
});

export { ORIGEN_VISOR_LOCAL };

/** La sesión local solo se entrega en desarrollo y desde el Origin aceptado por la señalización. */
export interface ConfiguracionVisorUnreal {
  readonly origenVisor: string;
  readonly asignacion: SesionVisualUnreal | null;
}
export function resolverSesionVisual(
  habilitada: boolean,
  origen: string,
  configuracion: ConfiguracionVisorUnreal = {
    origenVisor: ORIGEN_VISOR_LOCAL,
    asignacion: SESION_VISUAL_LOCAL,
  },
): SesionVisualUnreal | null {
  if (!habilitada || origen !== configuracion.origenVisor || !configuracion.asignacion) return null;
  try {
    validarSesionVisual(configuracion.asignacion);
    return configuracion.asignacion;
  } catch {
    return null;
  }
}

/** Sin servidor asignado no se abre ninguna conexión ni se simula una ciudad 3D. */
export const SESION_VISUAL_UNREAL = new InjectionToken<SesionVisualUnreal | null>(
  'SESION_VISUAL_UNREAL',
  {
    providedIn: 'root',
    factory: () => {
      const config = environment as typeof environment & {
        simuladorUnreal?: ConfiguracionVisorUnreal;
      };
      // La asignación del laboratorio no se reutiliza para un caso académico.
      return resolverSesionVisual(
        config.simuladorUnrealLocal,
        globalThis.location?.origin ?? '',
        config.simuladorUnreal ?? {
          origenVisor: ORIGEN_VISOR_LOCAL,
          asignacion: SESION_VISUAL_LOCAL,
        },
      );
    },
  },
);

export function validarSesionVisual(sesion: SesionVisualUnreal): void {
  const url = new URL(sesion.urlSenalizacion);
  const local = HOSTS_LOCALES_SENALIZACION.includes(url.hostname);
  if (url.protocol !== 'wss:' && !(local && url.protocol === 'ws:')) {
    throw new Error(
      'La señalización requiere WSS; WS solo se admite en direcciones de bucle local.',
    );
  }
  if (
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    !sesion.streamerId.trim() ||
    !/^[A-Za-z0-9_-]{8,64}$/.test(sesion.sesion) ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(sesion.casoId)
  ) {
    throw new Error('La asignación de la sesión visual está incompleta o no es válida.');
  }
}
