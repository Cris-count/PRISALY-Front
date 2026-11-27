import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { contextoAcademico, esUuid } from './academico-http';

/**
 * DC-DEMO-112 · Evaluación docente (M6) y liberación de la calificación (N2) sobre contratos existentes:
 * - `POST /v1/evaluacion/intentos/{idIntento}` `{idRubrica}` → 201 (409 si ya evaluado o en curso; 422 rechazada)
 * - `POST /v1/evaluacion/intentos/{idIntento}/liberacion` → 201 primera vez, 200 si ya estaba liberada
 * Rutas ya permitidas por el interceptor académico (Bearer del personal). Titularidad: Backend.
 */
export interface CalificacionDocente {
  readonly valor: number;
  readonly escala: string;
  readonly liberada: boolean;
}

export class FalloEvaluacion extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string | null,
    readonly motivo: string | null,
  ) {
    super(codigo ?? `HTTP ${estado}`);
  }
}

function aFallo(e: unknown): FalloEvaluacion {
  if (e instanceof HttpErrorResponse) {
    const c = (e.error ?? {}) as { codigo?: unknown; code?: unknown; motivo?: unknown };
    const codigo = typeof c.codigo === 'string' ? c.codigo : typeof c.code === 'string' ? c.code : null;
    return new FalloEvaluacion(e.status, codigo, typeof c.motivo === 'string' ? c.motivo : null);
  }
  return new FalloEvaluacion(-1, null, null);
}

function leer(v: unknown): CalificacionDocente {
  const c = v as Record<string, unknown> | null;
  return {
    valor: Number(c?.['valor']),
    escala: typeof c?.['escala'] === 'string' ? (c['escala'] as string) : '',
    liberada: c?.['liberada'] === true,
  };
}

/** Mensaje de interfaz para el docente; nunca reproduce el mensaje técnico del servidor. */
export function mensajeEvaluacion(e: unknown): string {
  const f = e instanceof FalloEvaluacion ? e : null;
  switch (f?.codigo) {
    case 'EVALUACION_EXISTENTE':
      return 'Este intento ya tiene una calificación registrada (es inmutable).';
    case 'INTENTO_NO_FINALIZADO':
      return 'El estudiante aún no ha finalizado el intento.';
    case 'EVALUACION_RECHAZADA':
      return f.motivo === 'PESOS_INCOMPLETOS'
        ? 'La rúbrica no asigna un valor a todas las preguntas. Complétala antes de evaluar.'
        : `La evaluación fue rechazada (${f.motivo ?? 'motivo no informado'}).`;
    case 'ACCESO_DENEGADO':
      return 'Solo el docente propietario del caso puede evaluar este intento.';
  }
  if (f?.estado === 401) return 'Tu sesión de personal terminó. Vuelve a iniciar sesión.';
  if (f?.estado === 404) return 'El caso no tiene rúbrica o el intento no existe.';
  return 'No fue posible completar la operación. Inténtalo de nuevo.';
}

@Injectable({ providedIn: 'root' })
export class EvaluacionM6Api {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  evaluar(idIntento: string, idRubrica: string): Observable<CalificacionDocente> {
    if (!esUuid(idIntento) || !esUuid(idRubrica)) return throwError(() => new FalloEvaluacion(-1, null, null));
    return this.http
      .post<unknown>(construirUrlApi(this.api, `v1/evaluacion/intentos/${idIntento}`), { idRubrica }, {
        context: contextoAcademico(),
      })
      .pipe(
        map(leer),
        catchError((e: unknown) => throwError(() => aFallo(e))),
      );
  }

  liberar(idIntento: string): Observable<CalificacionDocente> {
    if (!esUuid(idIntento)) return throwError(() => new FalloEvaluacion(-1, null, null));
    return this.http
      .post<unknown>(construirUrlApi(this.api, `v1/evaluacion/intentos/${idIntento}/liberacion`), null, {
        context: contextoAcademico(),
      })
      .pipe(
        map(leer),
        catchError((e: unknown) => throwError(() => aFallo(e))),
      );
  }
}
