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

/** `CasoContenidoResponse.OpcionContenido` (vista docente: incluye corrección y explicación). */
export interface OpcionContenido {
  readonly idOpcion: string;
  readonly texto: string;
  readonly esCorrecta: boolean;
  readonly explicacion: string | null;
  readonly orden: number | null;
}

/** `CasoContenidoResponse.PreguntaContenido`. Los campos añadidos en FE-54 son opcionales. */
export interface PreguntaContenido {
  readonly idPregunta: string;
  readonly enunciado: string;
  readonly orden: number | null;
  readonly textoAyuda?: string | null;
  readonly estadoEdicion?: string | null;
  readonly visible?: boolean | null;
  readonly opciones?: readonly OpcionContenido[];
}

/** `CasoContenidoResponse.EscenarioContenido`. */
export interface EscenarioContenido {
  readonly idEscenario: string;
  readonly titulo: string | null;
  readonly orden: number | null;
  readonly contexto?: string | null;
  readonly instrucciones?: string | null;
  readonly activo?: boolean | null;
  readonly preguntas: readonly PreguntaContenido[];
}

/** Cuerpo cerrado de `POST /v1/casos/{idCaso}/escenarios` (`CasoContenidoRequest.escenario`). */
export interface AgregarEscenarioRequest {
  readonly idEscenario: string;
  readonly titulo: string | null;
  readonly contexto: string | null;
  readonly instrucciones: string | null;
  readonly orden: number;
}

/** Cuerpo cerrado de `POST .../escenarios/{idEscenario}/preguntas`. */
export interface AgregarPreguntaRequest {
  readonly idPregunta: string;
  readonly enunciado: string;
  readonly textoAyuda: string | null;
  readonly orden: number;
}

/** Cuerpo cerrado de `POST .../preguntas/{idPregunta}/opciones` (RF-07/RF-08). */
export interface AgregarOpcionRequest {
  readonly idOpcion: string;
  readonly texto: string;
  readonly esCorrecta: boolean;
  readonly explicacion: string;
  readonly orden: number;
}

/** Respuesta 201 `{ id }` con el ETag de la nueva versión del agregado. */
export interface ElementoCreado {
  readonly id: string;
}

/** Lista {items} de `GET /v1/casos` (DC-67). Sin contrato (flag OFF) el error HTTP se propaga. */
function itemsListados(v: unknown): CasoDocente[] {
  const items = (v as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) throw respuestaInvalida();
  return items.map(leerCaso);
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

const opcionalTexto = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** Ausente → lista vacía (compatibilidad); presente con otro tipo → respuesta inválida. */
function leerOpciones(v: unknown): OpcionContenido[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw respuestaInvalida();
  return v.map((x) => {
    const o = x as Record<string, unknown> | null;
    if (
      !o ||
      !texto(o['idOpcion']) ||
      typeof o['texto'] !== 'string' ||
      typeof o['esCorrecta'] !== 'boolean'
    )
      throw respuestaInvalida();
    return {
      idOpcion: o['idOpcion'] as string,
      texto: o['texto'] as string,
      esCorrecta: o['esCorrecta'] as boolean,
      explicacion: opcionalTexto(o['explicacion']),
      orden: Number.isInteger(o['orden']) ? (o['orden'] as number) : null,
    };
  });
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
          textoAyuda: opcionalTexto(pr['textoAyuda']),
          estadoEdicion: opcionalTexto(pr['estadoEdicion']),
          visible: typeof pr['visible'] === 'boolean' ? (pr['visible'] as boolean) : null,
          opciones: leerOpciones(pr['opciones']),
        };
      }),
      contexto: opcionalTexto(esc['contexto']),
      instrucciones: opcionalTexto(esc['instrucciones']),
      activo: typeof esc['activo'] === 'boolean' ? (esc['activo'] as boolean) : null,
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

  /** Listado M3 (DC-67): casos del docente propietario; solo contraparte declarada, sin inventar. */
  listado(): Observable<CasoDocente[]> {
    return this.http
      .get<unknown>(this.url('v1/casos'), { context: contextoAcademico() })
      .pipe(map(itemsListados), catchError((e: unknown) => throwError(() => aFalloAcademico(e))));
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

  /**
   * FE-54. Altas de contenido en un caso en Borrador. Cada alta exige `If-Match` y devuelve 201
   * con `{ id }` y el ETag de la nueva versión. El consumidor no debe combinar ese ETag con datos
   * leídos en una versión anterior: debe volver a consultar `contenido`.
   */
  agregarEscenario(
    idCaso: string,
    datos: AgregarEscenarioRequest,
    ifMatch: string,
  ): Observable<Versionado<ElementoCreado>> {
    if (!esUuid(datos.idEscenario)) return throwError(() => respuestaInvalida());
    const cuerpo: AgregarEscenarioRequest = {
      idEscenario: datos.idEscenario,
      titulo: datos.titulo,
      contexto: datos.contexto,
      instrucciones: datos.instrucciones,
      orden: datos.orden,
    };
    return this.postContenido(
      idCaso,
      `v1/casos/${idCaso}/escenarios`,
      cuerpo,
      ifMatch,
      cuerpo.idEscenario,
    );
  }

  agregarPregunta(
    idCaso: string,
    idEscenario: string,
    datos: AgregarPreguntaRequest,
    ifMatch: string,
  ): Observable<Versionado<ElementoCreado>> {
    if (!esUuid(idEscenario) || !esUuid(datos.idPregunta))
      return throwError(() => respuestaInvalida());
    const cuerpo: AgregarPreguntaRequest = {
      idPregunta: datos.idPregunta,
      enunciado: datos.enunciado,
      textoAyuda: datos.textoAyuda,
      orden: datos.orden,
    };
    return this.postContenido(
      idCaso,
      `v1/casos/${idCaso}/escenarios/${idEscenario}/preguntas`,
      cuerpo,
      ifMatch,
      cuerpo.idPregunta,
    );
  }

  agregarOpcion(
    idCaso: string,
    idPregunta: string,
    datos: AgregarOpcionRequest,
    ifMatch: string,
  ): Observable<Versionado<ElementoCreado>> {
    if (!esUuid(idPregunta) || !esUuid(datos.idOpcion))
      return throwError(() => respuestaInvalida());
    const cuerpo: AgregarOpcionRequest = {
      idOpcion: datos.idOpcion,
      texto: datos.texto,
      esCorrecta: datos.esCorrecta,
      explicacion: datos.explicacion,
      orden: datos.orden,
    };
    return this.postContenido(
      idCaso,
      `v1/casos/${idCaso}/preguntas/${idPregunta}/opciones`,
      cuerpo,
      ifMatch,
      cuerpo.idOpcion,
    );
  }

  private postContenido(
    idCaso: string,
    ruta: string,
    cuerpo: object,
    ifMatch: string,
    idEsperado: string,
  ): Observable<Versionado<ElementoCreado>> {
    if (!esUuid(idCaso) || !ifMatch) return throwError(() => respuestaInvalida());
    return this.http
      .post<unknown>(this.url(ruta), cuerpo, {
        context: contextoAcademico(),
        headers: new HttpHeaders({ 'If-Match': ifMatch }),
        observe: 'response',
      })
      .pipe(
        map((r) => {
          const b = r.body as Record<string, unknown> | null;
          // El Backend devuelve el mismo identificador que generó el cliente.
          if (
            r.status !== 201 ||
            !b ||
            typeof b['id'] !== 'string' ||
            b['id'].toLowerCase() !== idEsperado.toLowerCase()
          )
            throw respuestaInvalida();
          return { datos: { id: b['id'] }, etag: etag(r) };
        }),
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
