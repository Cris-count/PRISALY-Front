import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

/** Operaciones conceptuales del recorrido estudiantil frente a M5. */
export type OperacionParticipacion =
  | 'consultarSesionesAutorizadas'
  | 'iniciarIntento'
  | 'consultarIntento'
  | 'registrarRespuesta'
  | 'consultarProgreso'
  | 'reanudarIntento'
  | 'finalizarIntento';

/** La operación existe en el diseño, pero su contrato REST todavía no. */
export class ContratoPendienteError extends Error {
  constructor(readonly operacion: OperacionParticipacion) {
    super(`La operación "${operacion}" requiere el contrato REST de M5, que aún no está disponible.`);
    this.name = 'ContratoPendienteError';
  }
}

/**
 * Límite de integración entre el simulador y M5.
 *
 * Las firmas son PROVISIONALES: parámetros y resultados se tipan como
 * identificadores opacos y `unknown` porque las rutas, los esquemas y los
 * códigos de respuesta de M5 no están aprobados. Cuando exista el contrato,
 * se agregará una implementación HTTP que use `API_CONFIG` y un adaptador
 * hacia los modelos de presentación.
 */
@Injectable({ providedIn: 'root', useFactory: () => new ParticipacionPendienteGateway() })
export abstract class ParticipacionGateway {
  abstract consultarSesionesAutorizadas(): Observable<unknown>;
  abstract iniciarIntento(sesionId: string): Observable<unknown>;
  abstract consultarIntento(intentoId: string): Observable<unknown>;
  abstract registrarRespuesta(intentoId: string, preguntaId: string, opcionId: string): Observable<unknown>;
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
