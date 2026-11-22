import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { aFalloAcademico, contextoAcademico, esUuid, respuestaInvalida } from './academico-http';

/** `CrearCasoRequest` (M3): `idCaso` lo genera el cliente; `docenteId` lo decide el Backend. */
export interface CrearCasoRequest {
  readonly idCaso: string;
  readonly titulo: string;
  readonly tiempoEstimadoSegundos: number;
  readonly historia?: string | null;
  readonly desarrolloSituacional?: string | null;
}

export interface CrearCasoResponse {
  readonly idCaso: string;
  readonly estado: string;
}

/** `CasoDocenteConsultaResponse`. */
export interface CasoDocente {
  readonly idCaso: string;
  readonly titulo: string;
  readonly tiempoEstimadoSegundos: number;
  readonly estado: string;
}

/** Valor del ETag recibido; se reenvía sin modificar en `If-Match`. */
export interface Versionado<T> {
  readonly datos: T;
  readonly etag: string | null;
}

/** Campos admitidos por `CasoPatchRequest`. */
export interface CasoPatch {
  titulo?: string;
  historia?: string | null;
  desarrolloSituacional?: string | null;
  tiempoEstimadoSegundos?: number;
}

export interface PreguntaContenido {
  readonly idPregunta: string;
  readonly enunciado: string;
  readonly orden: number | null;
}

export interface EscenarioContenido {
  readonly idEscenario: string;
  readonly titulo: string | null;
  readonly orden: number | null;
  readonly preguntas: readonly PreguntaContenido[];
}

/** Proyección de `CasoContenidoResponse` que usa la interfaz (lectura). */
export interface CasoContenido extends CasoDocente {
  readonly historia: string | null;
  readonly desarrolloSituacional: string | null;
  readonly escenarios: readonly EscenarioContenido[];
}

export interface CriterioRubrica {
  readonly id: string;
  readonly descripcion: string;
  readonly puntaje: number;
  readonly ponderacion: number | null;
}

export interface AsociacionRubrica {
  readonly idPregunta: string;
  readonly valorPregunta: number;
  readonly criterio: string;
}

/** `CasoRubricaDto.RubricaResponse`. */
export interface Rubrica {
  readonly idRubrica: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly puntajeTotal: number | null;
  readonly completa: boolean;
  readonly criterios: readonly CriterioRubrica[];
  readonly preguntas: readonly AsociacionRubrica[];
}

/** Cuerpo de `PUT /rubrica` (lista cerrada de campos de `CasoRubricaDto.comando`). */
export interface GuardarRubrica {
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly puntajeTotal: number | null;
  readonly criterios: readonly CriterioRubrica[];
  readonly preguntas: readonly AsociacionRubrica[];
}

const texto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const textoONulo = (v: unknown): v is string | null | undefined =>
  v === null || v === undefined || typeof v === 'string';
const numeroONulo = (v: unknown): v is number | null | undefined =>
  v === null || v === undefined || typeof v === 'number';

function leerCaso(v: unknown): CasoDocente {
  const c = v as Partial<Record<keyof CasoDocente, unknown>> | null;
  if (
    !c ||
    !esUuid(c.idCaso) ||
    !texto(c.titulo) ||
    !Number.isInteger(c.tiempoEstimadoSegundos) ||
    !texto(c.estado)
  )
    throw respuestaInvalida();
  return {
    idCaso: c.idCaso,
    titulo: c.titulo,
    tiempoEstimadoSegundos: c.tiempoEstimadoSegundos as number,
    estado: c.estado,
  };
}

function leerContenido(v: unknown): CasoContenido {
  const base = leerCaso(v);
  const c = v as Record<string, unknown>;
  if (
    !textoONulo(c['historia']) ||
    !textoONulo(c['desarrolloSituacional']) ||
    !Array.isArray(c['escenarios'])
  )
    throw respuestaInvalida();
  const escenarios = (c['escenarios'] as unknown[]).map((e) => {
    const esc = e as Record<string, unknown> | null;
    if (!esc || !texto(esc['idEscenario']) || !Array.isArray(esc['preguntas']))
      throw respuestaInvalida();
    return {
      idEscenario: esc['idEscenario'] as string,
      titulo: typeof esc['titulo'] === 'string' ? (esc['titulo'] as string) : null,
      orden: Number.isInteger(esc['orden']) ? (esc['orden'] as number) : null,
      preguntas: (esc['preguntas'] as unknown[]).map((p) => {
        const pr = p as Record<string, unknown> | null;
        if (!pr || !texto(pr['idPregunta']) || typeof pr['enunciado'] !== 'string')
          throw respuestaInvalida();
        return {
          idPregunta: pr['idPregunta'] as string,
          enunciado: pr['enunciado'] as string,
          orden: Number.isInteger(pr['orden']) ? (pr['orden'] as number) : null,
        };
      }),
    };
  });
  return {
    ...base,
    historia: (c['historia'] as string | null | undefined) ?? null,
    desarrolloSituacional: (c['desarrolloSituacional'] as string | null | undefined) ?? null,
    escenarios,
  };
}

function leerRubrica(v: unknown): Rubrica {
  const r = v as Record<string, unknown> | null;
  if (
    !r ||
    !texto(r['idRubrica']) ||
    !texto(r['nombre']) ||
    !textoONulo(r['descripcion']) ||
    !numeroONulo(r['puntajeTotal']) ||
    typeof r['completa'] !== 'boolean' ||
    !Array.isArray(r['criterios']) ||
    !Array.isArray(r['preguntas'])
  )
    throw respuestaInvalida();
  return {
    idRubrica: r['idRubrica'] as string,
    nombre: r['nombre'] as string,
    descripcion: (r['descripcion'] as string | null | undefined) ?? null,
    puntajeTotal: (r['puntajeTotal'] as number | null | undefined) ?? null,
    completa: r['completa'] as boolean,
    criterios: (r['criterios'] as unknown[]).map((x) => {
      const c = x as Record<string, unknown> | null;
      if (
        !c ||
        !texto(c['id']) ||
        typeof c['descripcion'] !== 'string' ||
        !Number.isInteger(c['puntaje']) ||
        !numeroONulo(c['ponderacion'])
      )
        throw respuestaInvalida();
      return {
        id: c['id'] as string,
        descripcion: c['descripcion'] as string,
        puntaje: c['puntaje'] as number,
        ponderacion: (c['ponderacion'] as number | null | undefined) ?? null,
      };
    }),
    preguntas: (r['preguntas'] as unknown[]).map((x) => {
      const p = x as Record<string, unknown> | null;
      if (
        !p ||
        !texto(p['idPregunta']) ||
        typeof p['valorPregunta'] !== 'number' ||
        !texto(p['criterio'])
      )
        throw respuestaInvalida();
      return {
        idPregunta: p['idPregunta'] as string,
        valorPregunta: p['valorPregunta'] as number,
        criterio: p['criterio'] as string,
      };
    }),
  };
}

function etag(r: HttpResponse<unknown>): string | null {
  const valor = r.headers.get('ETag');
  return valor && valor.trim().length > 0 ? valor : null;
}

/**
 * API de casos (M3). Las escrituras sobre un caso existente exigen `If-Match` con el ETag
 * recibido: un 412 (versión obsoleta) o 428 (falta precondición) nunca se convierte en éxito ni
 * se reintenta automáticamente.
 */
@Injectable({ providedIn: 'root' })
export class CasosM3Api {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  crear(datos: CrearCasoRequest): Observable<CrearCasoResponse> {
    if (!esUuid(datos.idCaso)) return throwError(() => respuestaInvalida());
    const cuerpo: CrearCasoRequest = {
      idCaso: datos.idCaso,
      titulo: datos.titulo,
      tiempoEstimadoSegundos: datos.tiempoEstimadoSegundos,
      historia: datos.historia ?? null,
      desarrolloSituacional: datos.desarrolloSituacional ?? null,
    };
    return this.http
      .post<unknown>(this.url('v1/casos'), cuerpo, { context: contextoAcademico() })
      .pipe(
        map((v) => {
          const r = v as Partial<Record<keyof CrearCasoResponse, unknown>> | null;
          if (!r || !esUuid(r.idCaso) || !texto(r.estado)) throw respuestaInvalida();
          return { idCaso: r.idCaso, estado: r.estado };
        }),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  consultar(idCaso: string): Observable<Versionado<CasoDocente>> {
    return this.getVersionado(`v1/casos/${idCaso}`, idCaso, leerCaso);
  }

  contenido(idCaso: string): Observable<Versionado<CasoContenido>> {
    return this.getVersionado(`v1/casos/${idCaso}/contenido`, idCaso, leerContenido);
  }

  actualizar(idCaso: string, cambios: CasoPatch, ifMatch: string): Observable<void> {
    if (!esUuid(idCaso) || !ifMatch) return throwError(() => respuestaInvalida());
    return this.http
      .patch(this.url(`v1/casos/${idCaso}`), cambios, {
        context: contextoAcademico(),
        headers: new HttpHeaders({ 'If-Match': ifMatch }),
        observe: 'response',
      })
      .pipe(
        map((r) => {
          if (r.status !== 204) throw respuestaInvalida();
        }),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  publicar(idCaso: string, ifMatch: string): Observable<Versionado<CrearCasoResponse>> {
    if (!esUuid(idCaso) || !ifMatch) return throwError(() => respuestaInvalida());
    return this.http
      .post<unknown>(this.url(`v1/casos/${idCaso}/publicar`), null, {
        context: contextoAcademico(),
        headers: new HttpHeaders({ 'If-Match': ifMatch }),
        observe: 'response',
      })
      .pipe(
        map((r) => {
          const b = r.body as Partial<Record<keyof CrearCasoResponse, unknown>> | null;
          if (!b || !esUuid(b.idCaso) || !texto(b.estado)) throw respuestaInvalida();
          return { datos: { idCaso: b.idCaso, estado: b.estado }, etag: etag(r) };
        }),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  rubrica(idCaso: string): Observable<Versionado<Rubrica>> {
    return this.getVersionado(`v1/casos/${idCaso}/rubrica`, idCaso, leerRubrica);
  }

  guardarRubrica(
    idCaso: string,
    rubrica: GuardarRubrica,
    ifMatch: string,
  ): Observable<Versionado<Rubrica>> {
    if (!esUuid(idCaso) || !ifMatch) return throwError(() => respuestaInvalida());
    const cuerpo: GuardarRubrica = {
      nombre: rubrica.nombre,
      descripcion: rubrica.descripcion,
      puntajeTotal: rubrica.puntajeTotal,
      criterios: rubrica.criterios.map((c) => ({
        id: c.id,
        descripcion: c.descripcion,
        puntaje: c.puntaje,
        ponderacion: c.ponderacion,
      })),
      preguntas: rubrica.preguntas.map((p) => ({
        idPregunta: p.idPregunta,
        valorPregunta: p.valorPregunta,
        criterio: p.criterio,
      })),
    };
    return this.http
      .put<unknown>(this.url(`v1/casos/${idCaso}/rubrica`), cuerpo, {
        context: contextoAcademico(),
        headers: new HttpHeaders({ 'If-Match': ifMatch }),
        observe: 'response',
      })
      .pipe(
        map((r) => ({ datos: leerRubrica(r.body), etag: etag(r) })),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  private getVersionado<T>(
    ruta: string,
    idCaso: string,
    leer: (v: unknown) => T,
  ): Observable<Versionado<T>> {
    if (!esUuid(idCaso)) return throwError(() => respuestaInvalida());
    return this.http
      .get<unknown>(this.url(ruta), { context: contextoAcademico(), observe: 'response' })
      .pipe(
        map((r) => ({ datos: leer(r.body), etag: etag(r) })),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  private url(ruta: string): string {
    return construirUrlApi(this.api, ruta);
  }
}
