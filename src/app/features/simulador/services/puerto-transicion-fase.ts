import { InjectionToken } from '@angular/core';
import { Observable, throwError } from 'rxjs';

/** Fases oficiales del flujo académico en el servidor. */
export type FaseAcademicaOficial = 'exploracion' | 'cuestionario' | 'finalizado';

/** Solicitud para pasar de la exploración libre al cuestionario o al cierre. */
export interface SolicitudTransicionFase {
  readonly idIntento: string;
  readonly faseOrigen: FaseAcademicaOficial;
  readonly faseDestino: FaseAcademicaOficial;
  readonly marcaTiempoCliente: string;
}

/** Resultado tipado de una solicitud de transición. */
export type ResultadoTransicionFase =
  | { readonly tipo: 'confirmada'; readonly idIntento: string; readonly faseActual: FaseAcademicaOficial; readonly transicionadaEn: string }
  | { readonly tipo: 'conflicto-fase'; readonly idIntento: string; readonly faseServidor: FaseAcademicaOficial; readonly mensaje: string }
  | { readonly tipo: 'error-conexion'; readonly mensaje: string; readonly reintentable: boolean }
  | { readonly tipo: 'resultado-incierto'; readonly idIntento: string; readonly mensaje: string };

/** Consulta de sincronización tras reconexión o recarga. */
export interface ConsultaEstadoFase {
  readonly idIntento: string;
  readonly faseServidor: FaseAcademicaOficial;
  readonly puedeContinuar: boolean;
}

/**
 * Puerto tipado para la futura transición académica oficial con Backend (M5).
 * Actualmente no implementa llamadas HTTP inexistentes; retorna TransicionFasePendienteError.
 */
export interface PuertoTransicionFase {
  solicitarTransicion(solicitud: SolicitudTransicionFase): Observable<ResultadoTransicionFase>;
  consultarEstadoFase(idIntento: string): Observable<ConsultaEstadoFase>;
}

export class TransicionFasePendienteError extends Error {
  constructor(mensaje = 'La transición oficial de fase requiere contratos y endpoints aprobados de Backend (M5).') {
    super(mensaje);
    this.name = 'TransicionFasePendienteError';
  }
}

/**
 * Proveedor predeterminado: bloquea llamadas HTTP y garantiza el aislamiento demostrativo.
 */
export const PUERTO_TRANSICION_FASE = new InjectionToken<PuertoTransicionFase>(
  'PUERTO_TRANSICION_FASE',
  {
    providedIn: 'root',
    factory: () => ({
      solicitarTransicion: () => throwError(() => new TransicionFasePendienteError()),
      consultarEstadoFase: () => throwError(() => new TransicionFasePendienteError()),
    }),
  }
);
