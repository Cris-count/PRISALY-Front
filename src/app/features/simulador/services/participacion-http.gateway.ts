import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Provider } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_CONFIG, construirUrlApi } from '../../../core/config/api.config';
import { clasificarErrorApi, FalloApi } from '../../../core/http/clasificar-error-api';
import { ParticipacionGateway, ParticipacionPendienteGateway } from './participacion.gateway';

import { IntentoM5, RespuestaGuardadaM5 } from '../models/participacion.models';
import { ContenidoIntentoM5 } from '../models/contenido-intento.models';
import { leerContenidoIntento } from './leer-contenido-intento';
export type {
  EstadoIntentoM5,
  IntentoM5,
  RespuestaGuardadaM5,
} from '../models/participacion.models';

/**
 * Fallo de una operación HTTP de participación. Conserva la clasificación
 * común de la interfaz y, solo como dato técnico, el código del servidor
 * (por ejemplo `REVISION_OBSOLETA`), nunca su mensaje.
 */
export class FalloParticipacionError extends Error {
  constructor(
    readonly fallo: FalloApi,
    readonly estado: number,
    readonly codigo: string | null,
  ) {
    super(fallo.mensaje);
    this.name = 'FalloParticipacionError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO = /^[A-Z][A-Z0-9_]{2,59}$/;

/**
 * Implementación HTTP de las dos operaciones de M5 publicadas en el Backend:
 * `GET /v1/estudiantes/intentos/{id}` y
 * `PUT /v1/estudiantes/intentos/{id}/respuestas/{idPregunta}`.
 * Además prepara GET `intentos/{id}/contenido` del PR #88, pendiente de integración.
 *
 * - La identidad estudiantil es la cookie HttpOnly emitida por M1
 *   (`withCredentials`); no se envían cabeceras de identidad ni Bearer.
 * - El resto de operaciones (inicio, finalización, progreso, sesiones) siguen
 *   sin contrato aprobado y fallan con `ContratoPendienteError`.
 * - No se registra por defecto: se activa con {@link provideParticipacionHttp}
 *   cuando exista el acceso estudiantil autorizado.
 */
@Injectable()
export class ParticipacionHttpGateway extends ParticipacionGateway {
  /** Operaciones sin contrato aprobado: se delegan sin cambio y siguen fallando sin simular éxito. */
  private readonly pendiente = new ParticipacionPendienteGateway();
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  consultarIntento(intentoId: string): Observable<IntentoM5> {
    const url = this.url(['intentos', intentoId]);
    if (url instanceof FalloParticipacionError) return throwError(() => url);
    return this.http.get<unknown>(url, { withCredentials: true }).pipe(
      map((cuerpo) => leerIntento(cuerpo)),
      catchError((e: unknown) => throwError(() => aFallo(e))),
    );
  }

  /** Consumo preparado del PR #88; no activa el proveedor ni almacena el contenido. */
  consultarContenidoIntento(intentoId: string): Observable<ContenidoIntentoM5> {
    const url = this.url(['intentos', intentoId, 'contenido']);
    if (url instanceof FalloParticipacionError) return throwError(() => url);
    return this.http.get<unknown>(url, { withCredentials: true }).pipe(
      map((cuerpo) => leerContenidoIntento(cuerpo, intentoId)),
      catchError((e: unknown) => throwError(() => aFallo(e))),
    );
  }

  registrarRespuesta(
    intentoId: string,
    preguntaId: string,
    opcionId: string,
    revisionEsperada: number,
  ): Observable<RespuestaGuardadaM5> {
    const url = this.url(['intentos', intentoId, 'respuestas', preguntaId]);
    if (url instanceof FalloParticipacionError) return throwError(() => url);
    if (!UUID.test(opcionId ?? '') || !Number.isInteger(revisionEsperada) || revisionEsperada < 0) {
      return throwError(() => invalido());
    }
    const cuerpo = { idOpcionSeleccionada: opcionId, revisionEsperada };
    return this.http.put<unknown>(url, cuerpo, { withCredentials: true }).pipe(
      map((respuesta) => leerRespuesta(respuesta)),
      catchError((e: unknown) => throwError(() => aFallo(e))),
    );
  }

  consultarSesionesAutorizadas(): Observable<never> {
    return this.pendiente.consultarSesionesAutorizadas();
  }

  iniciarIntento(): Observable<never> {
    return this.pendiente.iniciarIntento();
  }

  consultarProgreso(): Observable<never> {
    return this.pendiente.consultarProgreso();
  }

  reanudarIntento(): Observable<never> {
    return this.pendiente.reanudarIntento();
  }

  finalizarIntento(): Observable<never> {
    return this.pendiente.finalizarIntento();
  }

  /** Solo identificadores UUID completos: ningún dato del cliente compone la ruta libremente. */
  private url(segmentos: string[]): string | FalloParticipacionError {
    const ids = segmentos.filter((_, i) => i % 2 === 1);
    if (!ids.every((id) => UUID.test(id ?? ''))) return invalido();
    return construirUrlApi(this.api, `v1/estudiantes/${segmentos.join('/')}`);
  }
}

/** Registra la implementación HTTP en lugar de la pendiente (opt-in explícito). */
export function provideParticipacionHttp(): Provider {
  return { provide: ParticipacionGateway, useClass: ParticipacionHttpGateway };
}

function aFallo(error: unknown): FalloParticipacionError {
  if (error instanceof FalloParticipacionError) return error;
  const estado =
    typeof (error as { status?: unknown })?.status === 'number'
      ? (error as { status: number }).status
      : -1;
  const codigo = (error as { error?: { code?: unknown } })?.error?.code;
  return new FalloParticipacionError(
    clasificarErrorApi(error),
    estado,
    typeof codigo === 'string' && CODIGO.test(codigo) ? codigo : null,
  );
}

function invalido(): FalloParticipacionError {
  return new FalloParticipacionError(clasificarErrorApi(undefined), -1, null);
}

function texto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

function leerRespuesta(valor: unknown): RespuestaGuardadaM5 {
  const r = valor as Partial<RespuestaGuardadaM5> | null;
  if (
    !r ||
    !UUID.test(r.idPregunta ?? '') ||
    !UUID.test(r.idOpcionSeleccionada ?? '') ||
    !Number.isInteger(r.revision) ||
    (r.revision as number) < 0
  ) {
    throw invalido();
  }
  return {
    idPregunta: r.idPregunta!,
    idOpcionSeleccionada: r.idOpcionSeleccionada!,
    revision: r.revision!,
  };
}

/** Valida la forma real de la respuesta; un cuerpo inesperado nunca se presenta como intento válido. */
function leerIntento(valor: unknown): IntentoM5 {
  const i = valor as Partial<Record<keyof IntentoM5, unknown>> | null;
  if (
    !i ||
    !UUID.test(String(i.idIntento ?? '')) ||
    (i.estado !== 'EnCurso' && i.estado !== 'Finalizado') ||
    !texto(i.inicio) ||
    !texto(i.limiteTemporal) ||
    !texto(i.ahoraServidor) ||
    !(
      i.motivoFinalizacion === null ||
      i.motivoFinalizacion === undefined ||
      texto(i.motivoFinalizacion)
    ) ||
    !Array.isArray(i.respuestas)
  ) {
    throw invalido();
  }
  return {
    idIntento: i.idIntento as string,
    estado: i.estado,
    inicio: i.inicio,
    limiteTemporal: i.limiteTemporal,
    motivoFinalizacion: (i.motivoFinalizacion as string | null | undefined) ?? null,
    respuestas: i.respuestas.map((r) => leerRespuesta(r)),
    ahoraServidor: i.ahoraServidor,
  };
}
