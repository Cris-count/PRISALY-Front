// DTOs mirrored from PRISALY-Backend records (presentation layer of each module).

// M1 personnel request/response live in core/auth/auth.models.ts.
export interface PermisoCrearCaso {
  readonly allowed: boolean;
  readonly permission: string;
  readonly userId: string;
}

// M1 ValidarAccesoEstudianteRequest
export interface ValidarAccesoEstudianteRequest {
  readonly challengeId: string;
  readonly codigo: string;
}

// M3 CrearCasoRequest / CrearCasoResponse
export interface CrearCasoRequest {
  readonly idCaso: string;
  readonly titulo: string;
  readonly tiempoEstimadoSegundos: number;
  readonly historia: string | null;
  readonly desarrolloSituacional: string | null;
}

export interface CrearCasoResponse {
  readonly idCaso: string;
  readonly estado: string;
}

// M4 EstadoSesion (@JsonValue values)
export const ESTADOS_SESION = ["SinIniciar", "EnCurso", "Finalizado"] as const;
export type EstadoSesion = (typeof ESTADOS_SESION)[number];

export interface CrearSesionRequest {
  readonly casoId: string;
  readonly titulo: string;
  readonly mensajePersonalizado: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly tiempoMaximoParticipacionSegundos: number;
}

export interface ActualizarSesionRequest {
  readonly titulo: string;
  readonly mensajePersonalizado: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
}

export interface SesionResponse {
  readonly id: string;
  readonly casoId: string;
  readonly docenteId: string;
  readonly titulo: string;
  readonly mensajePersonalizado: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly estado: EstadoSesion;
  readonly creadoEn: string;
  readonly fechaInicioReal: string | null;
  readonly fechaFinReal: string | null;
  readonly tiempoMaximoParticipacionSegundos: number;
}

export interface ConvocatoriaResponse {
  readonly id: string;
  readonly sesionId: string;
  readonly estudianteId: string;
  readonly convocadoEn: string;
  readonly estadoAutorizacion: string;
  readonly fechaRetiro: string | null;
}

// M5 IntentosM5Dto
export interface GuardarRespuestaRequest {
  readonly idOpcionSeleccionada: string;
  readonly revisionEsperada: number;
}

export interface RespuestaGuardada {
  readonly idPregunta: string;
  readonly idOpcionSeleccionada: string;
  readonly revision: number;
}

export interface IntentoResponse {
  readonly idIntento: string;
  readonly estado: string;
  readonly inicio: string;
  readonly limiteTemporal: string;
  readonly motivoFinalizacion: string | null;
  readonly respuestas: readonly RespuestaGuardada[];
  readonly ahoraServidor: string;
}

export interface HealthResponse {
  readonly status: string;
  readonly service: string;
}
