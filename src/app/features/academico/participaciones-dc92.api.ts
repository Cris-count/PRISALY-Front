import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, from, map, Observable, switchMap, throwError } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import {
  aFalloAcademico,
  contextoAcademico,
  esUuid,
  FalloAcademico,
  mensajeFallo,
  respuestaInvalida,
} from './academico-http';

/**
 * FE-61 Fase 2 · DD-09 y DD-11 (Backend DC-99 `develop` 32922bb).
 *
 * - DD-09 `ParticipacionesDocenteController`: `GET /v1/docente/sesiones/{idSesion}/participaciones`
 *   → 200 `{items: VistaParticipacionDc92.Fila[]}` (`no-store`). Solo el docente propietario de la
 *   sesión (regla M4 `consultarSesionAutorizada`: `GESTIONAR_SESION` + programó la sesión); solo
 *   sus estudiantes convocados; la nota solo si está PUBLICADA. Interruptor
 *   `PRISALY_M4_CONSULTA_PARTICIPACIONES_ENABLED` + esquema DC-92 (sin él: 404 sin código).
 * - DD-11 `ReporteParticipacionController`: `GET /v1/docente/sesiones/{idSesion}/reporte-participacion`
 *   → 200 `text/csv; charset=UTF-8`, adjunto `participacion-sesion-{idSesion}.csv`, `no-store`. Misma
 *   regla de propietario. Interruptor `prisaly.m7.reportes.participacion.enabled` (404 sin código).
 *
 * Errores comunes (`ErroresDc92` y el manejador del reporte, `{code, message}`): 401
 * `UNAUTHENTICATED`/`M4-NO-AUTENTICADO`; 403 `M4-SIN-PERMISO`/`M4-SESION-AJENA`; 404
 * `M4-SESION-NO-ENCONTRADA`; 400 `VALIDACION` (DD-09) o `M4-SOLICITUD-INVALIDA` (DD-11); 503
 * `M4-PROVEEDOR-NO-DISPONIBLE` o proveedor de programación no disponible.
 */

/** `estadoParticipacion` publicado por `VistaParticipacionDc92.estadoParticipacion` (DD-13 + RF-21). */
export const ETIQUETA_PARTICIPACION: Readonly<Record<string, string>> = {
  CONVOCADO: 'Convocado',
  AUSENTE_PENDIENTE_REVISION: 'Ausente · pendiente de revisión',
  AUSENCIA_JUSTIFICADA: 'Ausencia justificada',
  AUSENCIA_NO_JUSTIFICADA: 'Ausencia no justificada',
  PARTICIPACION_INICIADA: 'Participación iniciada',
  PARTICIPACION_FINALIZADA: 'Participación finalizada',
  RETIRADO: 'Retirado',
};

/** `estadoEvaluacion` publicado por `VistaParticipacionDc92.estadoEvaluacion` (DD-04, DD-09, DD-12). */
export const ETIQUETA_EVALUACION: Readonly<Record<string, string>> = {
  SIN_INTENTOS: 'Sin intentos',
  SELECCION_PENDIENTE: 'Selección de intento pendiente',
  SIN_EVALUAR: 'Sin evaluar',
  EVALUADA_NO_PUBLICADA: 'Evaluada · no publicada',
  PUBLICADA: 'Publicada',
};

/** Presenta el valor del servidor; un valor no catalogado se muestra tal cual, sin inventar otro. */
export function etiqueta(catalogo: Readonly<Record<string, string>>, valor: string): string {
  return Object.hasOwn(catalogo, valor) ? catalogo[valor] : valor;
}

/** `VistaParticipacionDc92.Fila` (un registro por convocatoria de la sesión). Instantes en ISO-8601. */
export interface FilaParticipacion {
  readonly idConvocatoria: string;
  readonly idEstudiante: string;
  readonly nombreEstudiante: string | null;
  readonly caso: string | null;
  readonly sesion: string | null;
  readonly fechaSesion: string | null;
  /** `Convocatoria.estadoAutorizacion` tal como lo guarda M4. */
  readonly estadoConvocatoria: string | null;
  readonly fechaRetiro: string | null;
  readonly idParticipacion: string | null;
  readonly fechaIngreso: string | null;
  readonly numeroIntentos: number;
  readonly estadoParticipacion: string;
  /** DD-04: la última selección docente o, con un único intento, ese intento. */
  readonly idIntentoConsiderado: string | null;
  readonly inicioIntento: string | null;
  readonly finIntento: string | null;
  readonly estadoEvaluacion: string;
  /** Solo con `estadoEvaluacion = PUBLICADA` (liberación N2); en cualquier otro caso `null`. */
  readonly calificacionPublicada: number | null;
  readonly fechaPublicacion: string | null;
}

/** Descarga obtenida del Backend: el contenido es exactamente el cuerpo de la respuesta. */
export interface ReporteDescargado {
  readonly nombreArchivo: string;
  readonly contenido: Blob;
}

const textoONulo = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw respuestaInvalida();
  return v;
};
const uuidONulo = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (!esUuid(v)) throw respuestaInvalida();
  return v;
};

export function leerFilaParticipacion(v: unknown): FilaParticipacion {
  const f = v as Record<string, unknown> | null;
  if (
    !f ||
    !esUuid(f['idConvocatoria']) ||
    !esUuid(f['idEstudiante']) ||
    !Number.isInteger(f['numeroIntentos']) ||
    (f['numeroIntentos'] as number) < 0 ||
    typeof f['estadoParticipacion'] !== 'string' ||
    !f['estadoParticipacion'] ||
    typeof f['estadoEvaluacion'] !== 'string' ||
    !f['estadoEvaluacion']
  )
    throw respuestaInvalida();
  const estadoEvaluacion = f['estadoEvaluacion'] as string;
  const nota = f['calificacionPublicada'];
  if (nota !== null && nota !== undefined) {
    // Defensa: una nota solo puede mostrarse si el servidor la declara publicada.
    if (typeof nota !== 'number' || !Number.isFinite(nota) || estadoEvaluacion !== 'PUBLICADA')
      throw respuestaInvalida();
  }
  return {
    idConvocatoria: f['idConvocatoria'] as string,
    idEstudiante: f['idEstudiante'] as string,
    nombreEstudiante: textoONulo(f['nombreEstudiante']),
    caso: textoONulo(f['caso']),
    sesion: textoONulo(f['sesion']),
    fechaSesion: textoONulo(f['fechaSesion']),
    estadoConvocatoria: textoONulo(f['estadoConvocatoria']),
    fechaRetiro: textoONulo(f['fechaRetiro']),
    idParticipacion: uuidONulo(f['idParticipacion']),
    fechaIngreso: textoONulo(f['fechaIngreso']),
    numeroIntentos: f['numeroIntentos'] as number,
    estadoParticipacion: f['estadoParticipacion'] as string,
    idIntentoConsiderado: uuidONulo(f['idIntentoConsiderado']),
    inicioIntento: textoONulo(f['inicioIntento']),
    finIntento: textoONulo(f['finIntento']),
    estadoEvaluacion,
    calificacionPublicada: typeof nota === 'number' ? nota : null,
    fechaPublicacion: textoONulo(f['fechaPublicacion']),
  };
}

/** Nombre fijado por `ReporteParticipacionService`; se usa si `Content-Disposition` no es legible. */
export function nombreReportePorDefecto(idSesion: string): string {
  return `participacion-sesion-${idSesion}.csv`;
}

/**
 * Nombre del adjunto desde `Content-Disposition`. Hoy el CORS del Backend solo expone `ETag` y
 * `Retry-After`, así que entre orígenes distintos la cabecera no es legible y se usa el nombre por
 * defecto (idéntico al que fija el Backend). Solo se aceptan nombres simples `.csv`.
 */
export function nombreDesdeCabecera(cabecera: string | null): string | null {
  if (!cabecera) return null;
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cabecera);
  if (!m) return null;
  let nombre: string;
  try {
    nombre = decodeURIComponent(m[1].trim());
  } catch {
    return null;
  }
  return /^[A-Za-z0-9._-]{1,120}\.csv$/.test(nombre) ? nombre : null;
}

/** Con `responseType: 'blob'` el cuerpo de error llega como Blob: se lee para conservar `{code}`. */
export function errorConCuerpoJson(e: unknown): Observable<never> {
  if (e instanceof HttpErrorResponse && e.error instanceof Blob) {
    return from(e.error.text()).pipe(
      switchMap((texto) => {
        let cuerpo: unknown = null;
        try {
          cuerpo = JSON.parse(texto);
        } catch {
          cuerpo = null;
        }
        return throwError(() =>
          aFalloAcademico(
            new HttpErrorResponse({
              status: e.status,
              statusText: e.statusText,
              headers: e.headers,
              url: e.url ?? undefined,
              error: cuerpo,
            }),
          ),
        );
      }),
      catchError((x: unknown) =>
        throwError(() => aFalloAcademico(x instanceof FalloAcademico ? x : e)),
      ),
    );
  }
  return throwError(() => aFalloAcademico(e));
}

/** Mensajes de interfaz para DD-09/DD-11; no reproduce el mensaje del servidor. */
export function mensajeFalloParticipaciones(
  e: unknown,
  funcionalidad: 'consulta' | 'reporte',
): string {
  const fallo = aFalloAcademico(e);
  let texto: string;
  if (fallo.estado === 404 && fallo.codigo === null) {
    texto =
      funcionalidad === 'consulta'
        ? 'El servidor no tiene habilitada la consulta de participaciones (DD-09).'
        : 'El servidor no tiene habilitado el reporte de participación (DD-11).';
  } else {
    switch (fallo.codigo) {
      case 'UNAUTHENTICATED':
      case 'M4-NO-AUTENTICADO':
        texto = 'La sesión no es válida o expiró. Inicia sesión de nuevo.';
        break;
      case 'M4-SIN-PERMISO':
        texto =
          'El servidor denegó la consulta: la identidad no tiene el permiso GESTIONAR_SESION.';
        break;
      case 'M4-SESION-AJENA':
        texto =
          'La sesión pertenece a otro docente: solo su docente puede consultar sus participaciones.';
        break;
      case 'M4-SESION-NO-ENCONTRADA':
        texto = 'La sesión no existe o no es accesible.';
        break;
      case 'VALIDACION':
      case 'M4-SOLICITUD-INVALIDA':
        texto = 'El identificador de la sesión no es válido.';
        break;
      default:
        texto =
          fallo.estado === 401
            ? 'La sesión no es válida o expiró. Inicia sesión de nuevo.'
            : fallo.estado === 403
              ? 'El servidor denegó el acceso a las participaciones de esta sesión.'
              : mensajeFallo(fallo);
    }
  }
  return `${texto}${fallo.estado > 0 ? ` (HTTP ${fallo.estado}${fallo.codigo ? ` · ${fallo.codigo}` : ''})` : ''}`;
}

@Injectable({ providedIn: 'root' })
export class ParticipacionesDc92Api {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  /** DD-09. El identificador debe venir de una respuesta de M4 (la sesión consultada). */
  participaciones(idSesion: string): Observable<FilaParticipacion[]> {
    if (!esUuid(idSesion)) return throwError(() => respuestaInvalida());
    return this.http
      .get<unknown>(this.url(`v1/docente/sesiones/${idSesion}/participaciones`), {
        context: contextoAcademico(),
      })
      .pipe(
        map((v) => {
          const items = (v as { items?: unknown } | null)?.items;
          if (!Array.isArray(items)) throw respuestaInvalida();
          return items.map(leerFilaParticipacion);
        }),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  /**
   * DD-11. Devuelve el CSV tal como lo entrega el Backend (no se genera ni modifica en Angular).
   * Solo se acepta un 200 con tipo `text/csv`.
   */
  reporte(idSesion: string): Observable<ReporteDescargado> {
    if (!esUuid(idSesion)) return throwError(() => respuestaInvalida());
    return this.http
      .get(this.url(`v1/docente/sesiones/${idSesion}/reporte-participacion`), {
        context: contextoAcademico(),
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((r: HttpResponse<Blob>) => {
          const tipo = r.headers.get('Content-Type') ?? r.body?.type ?? '';
          if (r.status !== 200 || !r.body || !/^text\/csv\b/i.test(tipo)) throw respuestaInvalida();
          return {
            nombreArchivo:
              nombreDesdeCabecera(r.headers.get('Content-Disposition')) ??
              nombreReportePorDefecto(idSesion),
            contenido: r.body,
          };
        }),
        catchError((e: unknown) =>
          e instanceof FalloAcademico ? throwError(() => e) : errorConCuerpoJson(e),
        ),
      );
  }

  private url(ruta: string): string {
    return construirUrlApi(this.api, ruta);
  }
}
