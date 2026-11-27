import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { ContenidoIntentoM5 } from '../simulador/models/contenido-intento.models';
import { leerContenidoIntento } from '../simulador/services/leer-contenido-intento';
import type { GuionM3 } from '../simulador/narrativa/adaptador-guion-m3';

/**
 * DC-DEMO-112 · Portal del estudiante sobre los contratos existentes del Backend (cookie DD-02 B):
 * - M4 `GET /v1/estudiantes/convocatorias`
 * - M5 `POST /v1/estudiantes/sesiones/{idSesion}/intentos` (iniciar o reanudar), `GET .../intentos/{id}`,
 *   `GET .../intentos/{id}/contenido`, `PUT .../intentos/{id}/respuestas/{idPregunta}`,
 *   `POST .../intentos/{id}/finalizar`
 * - M6/N2 `GET /v1/estudiantes/intentos/{id}/calificacion` (404 mientras no esté publicada)
 * - M1 `POST /v1/acceso-estudiante/cerrar-sesion`
 * La identidad y la titularidad las decide siempre el Backend.
 */
export interface ConvocatoriaEstudiante {
  readonly idConvocatoria: string;
  readonly idSesion: string;
  readonly idCaso: string;
  readonly estadoSesion: string;
  readonly inicioPrevisto: string | null;
  readonly finPrevisto: string | null;
  readonly tiempoMaximoParticipacionSegundos: number;
}

export interface RespuestaIntento {
  readonly idPregunta: string;
  readonly idOpcionSeleccionada: string;
  readonly revision: number;
}

export interface IntentoEstudiante {
  readonly idIntento: string;
  readonly estado: string;
  readonly inicio: string | null;
  readonly limiteTemporal: string | null;
  readonly respuestas: readonly RespuestaIntento[];
  readonly ahoraServidor: string | null;
}

export interface ResultadoEstudiante {
  readonly valor: number;
  readonly escala: string;
  readonly caracter: string | null;
  readonly fechaLiberacion: string | null;
  readonly retroalimentacionGeneral: string | null;
}

/**
 * CB-07 · P1 de M5 (`GET …/intentos/{id}/narrativa`): el guion publicado **fijado en el intento**, nunca el borrador ni
 * la última versión publicada. `definicion` es el documento prisaly-guion-1 tal como lo persistió M3.
 */
export interface NarrativaIntentoM5 {
  readonly idIntento: string;
  readonly idGuion: string;
  readonly version: number;
  readonly hashDefinicion: string;
  readonly definicion: GuionM3;
}

/** CB-07 · P2 de M5 (`GET …/fase`): fase persistida; base de la recuperación tras recargar. */
export interface FaseIntentoM5 {
  readonly idIntento: string;
  readonly estadoIntento: 'EnCurso' | 'Finalizado';
  readonly fase: 'SIN_FASES' | 'EXPLORACION' | 'CUESTIONARIO';
  readonly fechaInicioExploracion: string | null;
  readonly fechaInicioCuestionario: string | null;
  readonly limiteTemporal: string | null;
  readonly ahoraServidor: string | null;
}

/** CB-07 · P3 de M5 (`POST …/cuestionario`): entrada atómica e idempotente; `yaIniciado` en un reintento. */
export interface EntradaCuestionarioM5 {
  readonly idIntento: string;
  readonly fechaInicioCuestionario: string;
  readonly yaIniciado: boolean;
}

/** Fallo clasificado: código tipado del servidor (si lo hay) y estado HTTP. */
export class FalloPortal extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string | null,
  ) {
    super(codigo ?? `HTTP ${estado}`);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function aFallo(e: unknown): FalloPortal {
  if (e instanceof HttpErrorResponse) {
    const cuerpo = e.error as { code?: unknown } | null;
    return new FalloPortal(e.status, typeof cuerpo?.code === 'string' ? cuerpo.code : null);
  }
  return new FalloPortal(0, null);
}

function leerConvocatoria(v: unknown): ConvocatoriaEstudiante | null {
  const c = v as Record<string, unknown> | null;
  if (!c || !UUID.test(texto(c['idSesion']) ?? '')) return null;
  return {
    idConvocatoria: texto(c['idConvocatoria']) ?? '',
    idSesion: c['idSesion'] as string,
    idCaso: texto(c['idCaso']) ?? '',
    estadoSesion: texto(c['estadoSesion']) ?? '',
    inicioPrevisto: texto(c['inicioPrevisto']),
    finPrevisto: texto(c['finPrevisto']),
    tiempoMaximoParticipacionSegundos: Number(c['tiempoMaximoParticipacionSegundos'] ?? 0),
  };
}

export function leerIntentoEstudiante(v: unknown): IntentoEstudiante {
  const i = v as Record<string, unknown> | null;
  if (!i || !UUID.test(texto(i['idIntento']) ?? '')) throw new FalloPortal(0, 'RESPUESTA_INVALIDA');
  const respuestas = Array.isArray(i['respuestas']) ? (i['respuestas'] as unknown[]) : [];
  return {
    idIntento: i['idIntento'] as string,
    estado: texto(i['estado']) ?? '',
    inicio: texto(i['inicio']),
    limiteTemporal: texto(i['limiteTemporal']),
    ahoraServidor: texto(i['ahoraServidor']),
    respuestas: respuestas
      .map((r) => r as Record<string, unknown>)
      .filter((r) => r && typeof r['idPregunta'] === 'string')
      .map((r) => ({
        idPregunta: r['idPregunta'] as string,
        idOpcionSeleccionada: texto(r['idOpcionSeleccionada']) ?? '',
        revision: Number(r['revision'] ?? 0),
      })),
  };
}

const invalida = () => new FalloPortal(0, 'RESPUESTA_INVALIDA');

/** Integridad disponible en el contrato P1: intento pedido, versión, huellas y formato. El servidor ya verificó la huella. */
export function leerNarrativaIntento(v: unknown, idIntento: string): NarrativaIntentoM5 {
  const n = v as Record<string, unknown> | null;
  const definicion = n?.['definicion'] as Record<string, unknown> | null | undefined;
  if (
    !n || n['idIntento'] !== idIntento || !UUID.test(texto(n['idGuion']) ?? '') ||
    typeof n['version'] !== 'number' || n['version'] < 1 ||
    !/^[0-9a-f]{64}$/.test(texto(n['hashDefinicion']) ?? '') ||
    !definicion || typeof definicion !== 'object' || definicion['formato'] !== 'prisaly-guion-1' ||
    !Array.isArray(definicion['espacios'])
  ) throw invalida();
  return {
    idIntento,
    idGuion: n['idGuion'] as string,
    version: n['version'],
    hashDefinicion: n['hashDefinicion'] as string,
    definicion: definicion as unknown as GuionM3,
  };
}

const ESTADOS = ['EnCurso', 'Finalizado'] as const;
const FASES = ['SIN_FASES', 'EXPLORACION', 'CUESTIONARIO'] as const;

export function leerFaseIntento(v: unknown, idIntento: string): FaseIntentoM5 {
  const f = v as Record<string, unknown> | null;
  const estado = f?.['estadoIntento'], fase = f?.['fase'];
  if (!f || f['idIntento'] !== idIntento || !ESTADOS.includes(estado as never) || !FASES.includes(fase as never))
    throw invalida();
  return {
    idIntento,
    estadoIntento: estado as FaseIntentoM5['estadoIntento'],
    fase: fase as FaseIntentoM5['fase'],
    fechaInicioExploracion: texto(f['fechaInicioExploracion']),
    fechaInicioCuestionario: texto(f['fechaInicioCuestionario']),
    limiteTemporal: texto(f['limiteTemporal']),
    ahoraServidor: texto(f['ahoraServidor']),
  };
}

@Injectable({ providedIn: 'root' })
export class PortalEstudianteApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private url(ruta: string): string {
    return construirUrlApi(this.config, ruta);
  }

  convocatorias(): Observable<readonly ConvocatoriaEstudiante[]> {
    return this.http.get<unknown>(this.url('v1/estudiantes/convocatorias'), { withCredentials: true }).pipe(
      map((cuerpo) => {
        const lista = Array.isArray(cuerpo)
          ? cuerpo
          : Array.isArray((cuerpo as { items?: unknown })?.items)
            ? ((cuerpo as { items: unknown[] }).items)
            : [];
        return lista.map(leerConvocatoria).filter((c): c is ConvocatoriaEstudiante => c !== null);
      }),
      catchError((e: unknown) => throwError(() => aFallo(e))),
    );
  }

  iniciarOReanudar(idSesion: string): Observable<IntentoEstudiante> {
    if (!UUID.test(idSesion)) return throwError(() => new FalloPortal(0, 'IDENTIFICADOR_INVALIDO'));
    return this.http
      .post<unknown>(this.url(`v1/estudiantes/sesiones/${idSesion}/intentos`), null, { withCredentials: true })
      .pipe(
        map((cuerpo) => leerIntentoEstudiante((cuerpo as { intento?: unknown } | null)?.intento)),
        catchError((e: unknown) => throwError(() => (e instanceof FalloPortal ? e : aFallo(e)))),
      );
  }

  intento(idIntento: string): Observable<IntentoEstudiante> {
    return this.http.get<unknown>(this.url(`v1/estudiantes/intentos/${idIntento}`), { withCredentials: true }).pipe(
      map(leerIntentoEstudiante),
      catchError((e: unknown) => throwError(() => (e instanceof FalloPortal ? e : aFallo(e)))),
    );
  }

  contenido(idIntento: string): Observable<ContenidoIntentoM5> {
    return this.http
      .get<unknown>(this.url(`v1/estudiantes/intentos/${idIntento}/contenido`), { withCredentials: true })
      .pipe(
        map((cuerpo) => leerContenidoIntento(cuerpo, idIntento)),
        catchError((e: unknown) => throwError(() => aFallo(e))),
      );
  }

  responder(idIntento: string, idPregunta: string, idOpcion: string, revisionEsperada: number): Observable<RespuestaIntento> {
    return this.http
      .put<unknown>(
        this.url(`v1/estudiantes/intentos/${idIntento}/respuestas/${idPregunta}`),
        { idOpcionSeleccionada: idOpcion, revisionEsperada },
        { withCredentials: true },
      )
      .pipe(
        // M5 devuelve la `RespuestaGuardada` con la revisión persistida.
        map((cuerpo) => {
          const r = cuerpo as Record<string, unknown> | null;
          if (!r || typeof r['revision'] !== 'number') throw new FalloPortal(0, 'RESPUESTA_INVALIDA');
          return {
            idPregunta: texto(r['idPregunta']) ?? idPregunta,
            idOpcionSeleccionada: texto(r['idOpcionSeleccionada']) ?? idOpcion,
            revision: r['revision'] as number,
          };
        }),
        catchError((e: unknown) => throwError(() => (e instanceof FalloPortal ? e : aFallo(e)))),
      );
  }

  finalizar(idIntento: string): Observable<void> {
    return this.http
      .post<unknown>(this.url(`v1/estudiantes/intentos/${idIntento}/finalizar`), null, { withCredentials: true })
      .pipe(
        map(() => undefined),
        catchError((e: unknown) => throwError(() => aFallo(e))),
      );
  }

  /** P1: narrativa fijada en el intento. 409 `EXPLORACION_CERRADA` en cuestionario o finalizado (se propaga). */
  narrativa(idIntento: string): Observable<NarrativaIntentoM5> {
    if (!UUID.test(idIntento)) return throwError(() => new FalloPortal(0, 'IDENTIFICADOR_INVALIDO'));
    return this.http
      .get<unknown>(this.url(`v1/estudiantes/intentos/${idIntento}/narrativa`), { withCredentials: true })
      .pipe(
        map((cuerpo) => leerNarrativaIntento(cuerpo, idIntento)),
        catchError((e: unknown) => throwError(() => (e instanceof FalloPortal ? e : aFallo(e)))),
      );
  }

  /** P2: fase persistida del intento. */
  fase(idIntento: string): Observable<FaseIntentoM5> {
    if (!UUID.test(idIntento)) return throwError(() => new FalloPortal(0, 'IDENTIFICADOR_INVALIDO'));
    return this.http
      .get<unknown>(this.url(`v1/estudiantes/intentos/${idIntento}/fase`), { withCredentials: true })
      .pipe(
        map((cuerpo) => leerFaseIntento(cuerpo, idIntento)),
        catchError((e: unknown) => throwError(() => (e instanceof FalloPortal ? e : aFallo(e)))),
      );
  }

  /** P3: entrada al cuestionario; cierra la exploración en el servidor. Idempotente. */
  iniciarCuestionario(idIntento: string): Observable<EntradaCuestionarioM5> {
    if (!UUID.test(idIntento)) return throwError(() => new FalloPortal(0, 'IDENTIFICADOR_INVALIDO'));
    return this.http
      .post<unknown>(this.url(`v1/estudiantes/intentos/${idIntento}/cuestionario`), null, { withCredentials: true })
      .pipe(
        map((cuerpo) => {
          const c = cuerpo as Record<string, unknown> | null;
          if (!c || c['idIntento'] !== idIntento || c['fase'] !== 'CUESTIONARIO' || typeof c['yaIniciado'] !== 'boolean'
            || !texto(c['fechaInicioCuestionario'])) throw invalida();
          return { idIntento, fechaInicioCuestionario: c['fechaInicioCuestionario'] as string, yaIniciado: c['yaIniciado'] };
        }),
        catchError((e: unknown) => throwError(() => (e instanceof FalloPortal ? e : aFallo(e)))),
      );
  }

  /** `null` mientras el docente no haya publicado la nota (404 CALIFICACION_NO_DISPONIBLE). */
  resultado(idIntento: string): Observable<ResultadoEstudiante | null> {
    return this.http
      .get<unknown>(this.url(`v1/estudiantes/intentos/${idIntento}/calificacion`), { withCredentials: true })
      .pipe(
        map((cuerpo) => {
          const r = cuerpo as Record<string, unknown>;
          return {
            valor: Number(r['valor']),
            escala: texto(r['escala']) ?? '',
            caracter: texto(r['caracter']),
            fechaLiberacion: texto(r['fechaLiberacion']),
            retroalimentacionGeneral: texto(r['retroalimentacionGeneral']),
          };
        }),
        catchError((e: unknown) => {
          const f = aFallo(e);
          return f.estado === 404 && f.codigo === 'CALIFICACION_NO_DISPONIBLE' ? of(null) : throwError(() => f);
        }),
      );
  }

  cerrarSesion(): Observable<void> {
    return this.http
      .post<unknown>(this.url('v1/acceso-estudiante/cerrar-sesion'), null, { withCredentials: true })
      .pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
      );
  }
}
