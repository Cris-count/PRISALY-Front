import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PersonalAuthRequest, PersonalAuthResponse } from '../auth/auth.models';
import { SKIP_PERSONAL_TOKEN, TokenStore } from '../auth/token.store';
import { EndpointDef, endpoints } from './catalog';
import { ApiError, networkError, toApiError } from './errors';
import { buildPath } from './path';
import { RequestLog } from './request-log.service';
import { sanitize } from './sanitize';
import {
  ActualizarSesionRequest,
  ConvocatoriaResponse,
  CrearCasoRequest,
  CrearCasoResponse,
  CrearSesionRequest,
  EstadoSesion,
  GuardarRespuestaRequest,
  HealthResponse,
  IntentoResponse,
  PermisoCrearCaso,
  RespuestaGuardada,
  SesionResponse,
  ValidarAccesoEstudianteRequest,
} from './types';

export interface ResponseMeta {
  readonly method: string;
  readonly url: string;
  readonly status: number;
  readonly durationMs: number;
}

export type ApiResult<T> =
  | { readonly ok: true; readonly data: T; readonly meta: ResponseMeta }
  | { readonly ok: false; readonly error: ApiError; readonly meta: ResponseMeta };

const NO_PARAMS: Readonly<Record<string, string>> = {};

// The only HTTP entry point of the app. It never throws for HTTP errors: every outcome
// becomes an ApiResult, and every call is recorded (sanitized) in the RequestLog.
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStore);
  private readonly log = inject(RequestLog);

  // attachToken only matters for endpoints with auth "personal"; "none" never carries it.
  async request<T>(
    endpoint: EndpointDef,
    params: Readonly<Record<string, string>>,
    body: unknown,
    attachToken: boolean,
  ): Promise<ApiResult<T>> {
    const path = buildPath(endpoint.path, params);
    const skipToken = endpoint.auth === 'none' || !attachToken;
    const withToken = !skipToken && this.tokens.token() !== null;
    const context = new HttpContext().set(SKIP_PERSONAL_TOKEN, skipToken);

    const started = performance.now();
    let status = 0;
    let responseBody: unknown = null;
    let error: ApiError | null = null;
    try {
      const response = await firstValueFrom(
        this.http.request<unknown>(endpoint.method, `${environment.apiUrl}${path}`, {
          body: body === null ? undefined : body,
          observe: 'response',
          context,
        }),
      );
      status = response.status;
      responseBody = response.body;
    } catch (cause) {
      if (cause instanceof HttpErrorResponse && cause.status !== 0) {
        status = cause.status;
        responseBody = cause.error;
        error = toApiError(status, responseBody);
      } else {
        error = networkError(cause instanceof HttpErrorResponse ? cause.message : cause);
      }
    }
    const meta: ResponseMeta = {
      method: endpoint.method,
      url: path,
      status,
      durationMs: Math.round(performance.now() - started),
    };
    this.log.add({
      seq: this.log.nextSeq(),
      at: new Date().toISOString(),
      endpointId: endpoint.id,
      method: endpoint.method,
      url: path,
      status,
      durationMs: meta.durationMs,
      withToken,
      errorKind: error === null ? null : error.kind,
      requestBody: sanitize(body),
      responseBody: sanitize(responseBody),
    });
    return error === null ? { ok: true, data: responseBody as T, meta } : { ok: false, error, meta };
  }

  health(): Promise<ApiResult<HealthResponse>> {
    return this.request(endpoints.health, NO_PARAMS, null, false);
  }

  autenticarPersonal(body: PersonalAuthRequest): Promise<ApiResult<PersonalAuthResponse>> {
    return this.request(endpoints.personalAutenticar, NO_PARAMS, body, false);
  }

  me(): Promise<ApiResult<PersonalAuthResponse>> {
    return this.request(endpoints.personalMe, NO_PARAMS, null, true);
  }

  permisoCrearCaso(): Promise<ApiResult<PermisoCrearCaso>> {
    return this.request(endpoints.personalCrearCaso, NO_PARAMS, null, true);
  }

  cerrarSesion(): Promise<ApiResult<null>> {
    return this.request(endpoints.personalCerrarSesion, NO_PARAMS, null, true);
  }

  validarAccesoEstudiante(body: ValidarAccesoEstudianteRequest): Promise<ApiResult<unknown>> {
    return this.request(endpoints.estudianteValidar, NO_PARAMS, body, false);
  }

  crearCaso(body: CrearCasoRequest): Promise<ApiResult<CrearCasoResponse>> {
    return this.request(endpoints.casoCrear, NO_PARAMS, body, true);
  }

  listarSesiones(): Promise<ApiResult<SesionResponse[]>> {
    return this.request(endpoints.sesionListar, NO_PARAMS, null, true);
  }

  consultarSesion(sesionId: string): Promise<ApiResult<SesionResponse>> {
    return this.request(endpoints.sesionConsultar, { sesionId }, null, true);
  }

  crearSesion(body: CrearSesionRequest): Promise<ApiResult<SesionResponse>> {
    return this.request(endpoints.sesionCrear, NO_PARAMS, body, true);
  }

  actualizarSesion(sesionId: string, body: ActualizarSesionRequest): Promise<ApiResult<SesionResponse>> {
    return this.request(endpoints.sesionActualizar, { sesionId }, body, true);
  }

  cambiarEstadoSesion(sesionId: string, nuevoEstado: EstadoSesion): Promise<ApiResult<SesionResponse>> {
    return this.request(endpoints.sesionEstado, { sesionId }, { nuevoEstado }, true);
  }

  listarConvocatorias(sesionId: string): Promise<ApiResult<ConvocatoriaResponse[]>> {
    return this.request(endpoints.convocatoriaListar, { sesionId }, null, true);
  }

  convocarEstudiante(sesionId: string, estudianteId: string): Promise<ApiResult<ConvocatoriaResponse>> {
    return this.request(endpoints.convocatoriaCrear, { sesionId }, { estudianteId }, true);
  }

  // Student routes: never receive the personnel token.
  consultarIntento(idIntento: string): Promise<ApiResult<IntentoResponse>> {
    return this.request(endpoints.intentoConsultar, { idIntento }, null, false);
  }

  guardarRespuesta(
    idIntento: string,
    idPregunta: string,
    body: GuardarRespuestaRequest,
  ): Promise<ApiResult<RespuestaGuardada>> {
    return this.request(endpoints.intentoGuardarRespuesta, { idIntento, idPregunta }, body, false);
  }
}
