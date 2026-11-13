import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { IntentoM5, RespuestaGuardadaM5 } from '../models/participacion.models';
import { ContenidoIntentoM5 } from '../models/contenido-intento.models';

/** Operaciones conceptuales del recorrido estudiantil frente a M5. */
export type OperacionParticipacion =
  | 'consultarSesionesAutorizadas'
  | 'iniciarIntento'
  | 'consultarIntento'
  | 'consultarContenidoIntento'
  | 'registrarRespuesta'
  | 'consultarProgreso'
  | 'reanudarIntento'
  | 'finalizarIntento';

/** La operación existe en el diseño, pero su contrato REST todavía no. */
export class ContratoPendienteError extends Error {
  constructor(readonly operacion: OperacionParticipacion) {
    super(
      `La operación "${operacion}" requiere el contrato REST de M5, que aún no está disponible.`,
    );
    this.name = 'ContratoPendienteError';
  }
}

/**
 * Límite de integración entre el simulador y M5.
 *
 * Consulta y registro usan los DTO publicados por M5. El resto conserva
 * resultados `unknown` hasta contar con su contrato aprobado.
 * `ParticipacionHttpGateway` conserva consulta/registro y prepara la lectura
 * de contenido del PR #88. Se activa de forma explícita.
 */
@Injectable({ providedIn: 'root', useFactory: () => new ParticipacionPendienteGateway() })
export abstract class ParticipacionGateway {
  abstract consultarSesionesAutorizadas(): Observable<unknown>;
  abstract iniciarIntento(sesionId: string): Observable<unknown>;
  abstract consultarIntento(intentoId: string): Observable<IntentoM5>;
  /** PR Backend #88: preparado; pendiente de integración y autorización operativa. */
  abstract consultarContenidoIntento(intentoId: string): Observable<ContenidoIntentoM5>;
  /** D06: el guardado exige la revisión esperada de la respuesta (0 si aún no existe). */
  abstract registrarRespuesta(
    intentoId: string,
    preguntaId: string,
    opcionId: string,
    revisionEsperada: number,
  ): Observable<RespuestaGuardadaM5>;
  abstract consultarProgreso(intentoId: string): Observable<unknown>;
  abstract reanudarIntento(intentoId: string): Observable<unknown>;
  abstract finalizarIntento(intentoId: string): Observable<unknown>;
}

/**
 * Implementación por defecto mientras no existan los endpoints: toda
 * operación falla con {@link ContratoPendienteError}. No simula éxito ni
 * respuestas del servidor.
 */
export class ParticipacionPendienteGateway extends ParticipacionGateway {
  consultarSesionesAutorizadas(): Observable<never> {
    return this.pendiente('consultarSesionesAutorizadas');
  }

  iniciarIntento(): Observable<never> {
    return this.pendiente('iniciarIntento');
  }

  consultarIntento(): Observable<never> {
    return this.pendiente('consultarIntento');
  }

  consultarContenidoIntento(): Observable<never> {
    return this.pendiente('consultarContenidoIntento');
  }

  registrarRespuesta(): Observable<never> {
    return this.pendiente('registrarRespuesta');
  }

  consultarProgreso(): Observable<never> {
    return this.pendiente('consultarProgreso');
  }

  reanudarIntento(): Observable<never> {
    return this.pendiente('reanudarIntento');
  }

  finalizarIntento(): Observable<never> {
    return this.pendiente('finalizarIntento');
  }

  private pendiente(operacion: OperacionParticipacion): Observable<never> {
    return throwError(() => new ContratoPendienteError(operacion));
  }
}
