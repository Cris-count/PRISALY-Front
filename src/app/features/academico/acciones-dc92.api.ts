import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { contextoAcademico, esUuid } from './academico-http';

/**
 * DC-118 · Acciones docentes ratificadas en DC-92 sobre contratos existentes del Backend (Bearer del personal):
 * - RF-26 / DD-12: `GET|POST|PUT /v1/docente/participaciones/{id}/retroalimentacion` `{contenido}`
 * - RF-24 / DD-13: `POST /v1/docente/convocatorias/{id}/ausencia` `{estado, motivo}`
 * - RF-21: `POST /v1/docente/convocatorias/{id}/retiro` `{motivo, resolucionIntentoEnCurso}`
 * - RF-25 / DD-04: `POST /v1/docente/participaciones/{id}/repeticion` `{motivo}`
 * La titularidad (docente de la sesión o creador del caso) y las reglas las decide el Backend.
 */
export class FalloAccionDc92 extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string | null,
  ) {
    super(codigo ?? `HTTP ${estado}`);
  }
}

function aFallo(e: unknown): FalloAccionDc92 {
  if (e instanceof HttpErrorResponse) {
    const c = (e.error ?? {}) as { code?: unknown };
    return new FalloAccionDc92(e.status, typeof c.code === 'string' ? c.code : null);
  }
  return new FalloAccionDc92(-1, null);
}

const MENSAJES: Readonly<Record<string, string>> = {
  RETROALIMENTACION_EXISTENTE: 'Ya existe una retroalimentación; se actualizó.',
  TRANSICION_NO_VALIDA: 'Esa clasificación no es posible en el estado actual de la convocatoria.',
  YA_RETIRADO: 'El estudiante ya fue retirado de esta convocatoria.',
  INTENTO_EN_CURSO_REQUIERE_RESOLUCION: 'El estudiante tiene un intento en curso: confirma su finalización por retiro.',
  REPETICION_AGOTADA: 'Este estudiante ya usó su única repetición excepcional.',
  AUTORIZACION_VIGENTE: 'Ya existe una autorización de repetición vigente.',
  VALIDACION: 'Revisa el motivo: es obligatorio y no puede superar 2000 caracteres.',
  ACCESO_DENEGADO: 'Solo el docente responsable puede realizar esta acción.',
  PARTICIPACION_NO_ENCONTRADA: 'La participación no existe o no es tuya.',
};

export function mensajeAccionDc92(e: unknown): string {
  const f = e instanceof FalloAccionDc92 ? e : null;
  if (f?.codigo && MENSAJES[f.codigo]) return MENSAJES[f.codigo];
  if (f?.estado === 404) return 'Esta función no está habilitada en el servidor o el recurso no existe.';
  if (f?.estado === 401) return 'Tu sesión de personal terminó. Vuelve a iniciar sesión.';
  if (f?.estado === 403) return 'No tienes permiso para esta acción.';
  return 'No fue posible completar la acción. Inténtalo de nuevo.';
}

@Injectable({ providedIn: 'root' })
export class AccionesDc92Api {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private post(ruta: string, cuerpo: unknown): Observable<unknown> {
    return this.http
      .post<unknown>(construirUrlApi(this.api, ruta), cuerpo, { context: contextoAcademico() })
      .pipe(catchError((e: unknown) => throwError(() => aFallo(e))));
  }

  consultarRetroalimentacion(idParticipacion: string): Observable<string | null> {
    if (!esUuid(idParticipacion)) return throwError(() => new FalloAccionDc92(-1, null));
    return this.http
      .get<{ contenido?: unknown }>(construirUrlApi(this.api, `v1/docente/participaciones/${idParticipacion}/retroalimentacion`), {
        context: contextoAcademico(),
      })
      .pipe(
        map((r) => (typeof r?.contenido === 'string' ? r.contenido : null)),
        catchError((e: unknown) => {
          const f = aFallo(e);
          return f.codigo === 'RETROALIMENTACION_NO_ENCONTRADA' ? [null] : throwError(() => f);
        }),
      );
  }

  /** Registra la retroalimentación; si ya existe, la actualiza (PUT del mismo contrato). */
  guardarRetroalimentacion(idParticipacion: string, contenido: string): Observable<unknown> {
    const ruta = `v1/docente/participaciones/${idParticipacion}/retroalimentacion`;
    return this.post(ruta, { contenido }).pipe(
      catchError((e: unknown) =>
        e instanceof FalloAccionDc92 && e.codigo === 'RETROALIMENTACION_EXISTENTE'
          ? this.http
              .put<unknown>(construirUrlApi(this.api, ruta), { contenido }, { context: contextoAcademico() })
              .pipe(catchError((x: unknown) => throwError(() => aFallo(x))))
          : throwError(() => e),
      ),
    );
  }

  clasificarAusencia(idConvocatoria: string, justificada: boolean, motivo: string): Observable<unknown> {
    return this.post(`v1/docente/convocatorias/${idConvocatoria}/ausencia`, {
      estado: justificada ? 'AUSENCIA_JUSTIFICADA' : 'AUSENCIA_NO_JUSTIFICADA',
      motivo: motivo || null,
    });
  }

  retirar(idConvocatoria: string, motivo: string, intentoEnCurso: boolean): Observable<unknown> {
    return this.post(`v1/docente/convocatorias/${idConvocatoria}/retiro`, {
      motivo: motivo || null,
      resolucionIntentoEnCurso: intentoEnCurso ? 'INTENTO_FINALIZADO_POR_RETIRO' : null,
    });
  }

  autorizarRepeticion(idParticipacion: string, motivo: string): Observable<unknown> {
    return this.post(`v1/docente/participaciones/${idParticipacion}/repeticion`, { motivo });
  }
}
