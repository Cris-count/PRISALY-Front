import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { aFalloAcademico, contextoAcademico, esUuid, respuestaInvalida } from './academico-http';

/** Catálogo exacto de `EstadoSesion` (V002): valores JSON publicados por M4. */
export type EstadoSesion = 'SinIniciar' | 'EnCurso' | 'Finalizado';
export const ESTADOS_SESION: readonly EstadoSesion[] = ['SinIniciar', 'EnCurso', 'Finalizado'];

/**
 * Reflejo de presentación del patrón State de M4 (`SinIniciarState.iniciar`, `EnCursoState.cerrar`):
 * evita ofrecer en la interfaz transiciones que el Backend rechaza. La validación sigue en M4.
 */
export const SIGUIENTE_ESTADO: Readonly<Record<EstadoSesion, EstadoSesion | null>> = {
  SinIniciar: 'EnCurso',
  EnCurso: 'Finalizado',
  Finalizado: null,
};

/** `SinIniciarState.permiteModificacion()` y `permiteConvocatoria()`: solo antes de iniciar. */
export function admiteCambios(estado: EstadoSesion): boolean {
  return estado === 'SinIniciar';
}

/** `CrearSesionRequest`. La identidad docente la resuelve el Backend desde la credencial. */
export interface CrearSesionRequest {
  readonly casoId: string;
  readonly titulo: string;
  readonly mensajePersonalizado: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly tiempoMaximoParticipacionSegundos: number;
  readonly lugarFisico: string | null;
}

/** `ActualizarSesionRequest` (sin caso ni tiempo máximo: no son editables por contrato). */
export interface ActualizarSesionRequest {
  readonly titulo: string;
  readonly mensajePersonalizado: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly lugarFisico: string | null;
}

export interface SesionAcademica {
  readonly id: string;
  readonly casoId: string;
  readonly docenteId: string;
  readonly titulo: string;
  readonly mensajePersonalizado: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly estado: EstadoSesion;
  readonly creadoEn: string | null;
  readonly fechaInicioReal: string | null;
  readonly fechaFinReal: string | null;
  readonly tiempoMaximoParticipacionSegundos: number;
  readonly lugarFisico: string | null;
}

/** `ConvocatoriaResponse`. */
export interface Convocatoria {
  readonly id: string;
  readonly sesionId: string;
  readonly estudianteId: string;
  readonly convocadoEn: string | null;
  readonly estadoAutorizacion: string | null;
  readonly fechaRetiro: string | null;
}

const texto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const opcional = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function leerSesion(v: unknown): SesionAcademica {
  const s = v as Record<string, unknown> | null;
  if (
    !s ||
    !esUuid(s['id']) ||
    !esUuid(s['casoId']) ||
    !esUuid(s['docenteId']) ||
    !texto(s['titulo']) ||
    !texto(s['fechaInicio']) ||
    !texto(s['fechaFin']) ||
    !ESTADOS_SESION.includes(s['estado'] as EstadoSesion) ||
    !Number.isInteger(s['tiempoMaximoParticipacionSegundos'])
  )
    throw respuestaInvalida();
  return {
    id: s['id'] as string,
    casoId: s['casoId'] as string,
    docenteId: s['docenteId'] as string,
    titulo: s['titulo'] as string,
    mensajePersonalizado: opcional(s['mensajePersonalizado']),
    fechaInicio: s['fechaInicio'] as string,
    fechaFin: s['fechaFin'] as string,
    estado: s['estado'] as EstadoSesion,
    creadoEn: opcional(s['creadoEn']),
    fechaInicioReal: opcional(s['fechaInicioReal']),
    fechaFinReal: opcional(s['fechaFinReal']),
    tiempoMaximoParticipacionSegundos: s['tiempoMaximoParticipacionSegundos'] as number,
    lugarFisico: opcional(s['lugarFisico']),
  };
}

function leerConvocatoria(v: unknown): Convocatoria {
  const c = v as Record<string, unknown> | null;
  if (!c || !esUuid(c['id']) || !esUuid(c['sesionId']) || !esUuid(c['estudianteId']))
    throw respuestaInvalida();
  return {
    id: c['id'] as string,
    sesionId: c['sesionId'] as string,
    estudianteId: c['estudianteId'] as string,
    convocadoEn: opcional(c['convocadoEn']),
    estadoAutorizacion: opcional(c['estadoAutorizacion']),
    fechaRetiro: opcional(c['fechaRetiro']),
  };
}

function lista<T>(leer: (v: unknown) => T): (v: unknown) => T[] {
  return (v) => {
    if (!Array.isArray(v)) throw respuestaInvalida();
    return v.map(leer);
  };
}

/**
 * API de programación académica (M4). No envía `X-Docente-Id`: la identidad docente sale de la
 * credencial en el Backend. Las reglas (caso publicado, transiciones de estado, permisos
 * `GESTIONAR_SESION`) las aplica exclusivamente M4.
 */
@Injectable({ providedIn: 'root' })
export class SesionesM4Api {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  listar(): Observable<SesionAcademica[]> {
    return this.ejecutar(
      this.http.get<unknown>(this.url('m4/sesiones'), { context: contextoAcademico() }),
      lista(leerSesion),
    );
  }

  consultar(id: string): Observable<SesionAcademica> {
    if (!esUuid(id)) return throwError(() => respuestaInvalida());
    return this.ejecutar(
      this.http.get<unknown>(this.url(`m4/sesiones/${id}`), { context: contextoAcademico() }),
      leerSesion,
    );
  }

  crear(datos: CrearSesionRequest): Observable<SesionAcademica> {
    if (!esUuid(datos.casoId)) return throwError(() => respuestaInvalida());
    const cuerpo: CrearSesionRequest = {
      casoId: datos.casoId,
      titulo: datos.titulo,
      mensajePersonalizado: datos.mensajePersonalizado,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      tiempoMaximoParticipacionSegundos: datos.tiempoMaximoParticipacionSegundos,
      lugarFisico: datos.lugarFisico,
    };
    return this.ejecutar(
      this.http.post<unknown>(this.url('m4/sesiones'), cuerpo, { context: contextoAcademico() }),
      leerSesion,
    );
  }

  actualizar(id: string, datos: ActualizarSesionRequest): Observable<SesionAcademica> {
    if (!esUuid(id)) return throwError(() => respuestaInvalida());
    const cuerpo: ActualizarSesionRequest = {
      titulo: datos.titulo,
      mensajePersonalizado: datos.mensajePersonalizado,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      lugarFisico: datos.lugarFisico,
    };
    return this.ejecutar(
      this.http.put<unknown>(this.url(`m4/sesiones/${id}`), cuerpo, {
        context: contextoAcademico(),
      }),
      leerSesion,
    );
  }

  cambiarEstado(id: string, nuevoEstado: EstadoSesion): Observable<SesionAcademica> {
    if (!esUuid(id) || !ESTADOS_SESION.includes(nuevoEstado))
      return throwError(() => respuestaInvalida());
    return this.ejecutar(
      this.http.patch<unknown>(
        this.url(`m4/sesiones/${id}/estado`),
        { nuevoEstado },
        { context: contextoAcademico() },
      ),
      leerSesion,
    );
  }

  convocatorias(sesionId: string): Observable<Convocatoria[]> {
    if (!esUuid(sesionId)) return throwError(() => respuestaInvalida());
    return this.ejecutar(
      this.http.get<unknown>(this.url(`m4/sesiones/${sesionId}/convocatorias`), {
        context: contextoAcademico(),
      }),
      lista(leerConvocatoria),
    );
  }

  convocar(sesionId: string, estudianteId: string): Observable<Convocatoria> {
    if (!esUuid(sesionId) || !esUuid(estudianteId)) return throwError(() => respuestaInvalida());
    return this.ejecutar(
      this.http.post<unknown>(
        this.url(`m4/sesiones/${sesionId}/convocatorias`),
        { estudianteId },
        { context: contextoAcademico() },
      ),
      leerConvocatoria,
    );
  }

  private ejecutar<T>(origen: Observable<unknown>, leer: (v: unknown) => T): Observable<T> {
    return origen.pipe(
      catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      map(leer),
    );
  }

  private url(ruta: string): string {
    return construirUrlApi(this.api, ruta);
  }
}
