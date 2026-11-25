import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { aFalloAcademico, contextoAcademico, esUuid, respuestaInvalida } from './academico-http';

/**
 * `AdministracionController.DocenteAltaRequest`: solo nombre y correo. El alta nunca devuelve ni
 * genera una contraseña; con D-05 activa el Backend emite además una invitación de activación.
 */
export interface DocenteAltaRequest {
  readonly nombre: string;
  readonly correo: string;
}

export interface UsuarioDocente {
  readonly idUsuario: string;
  readonly nombre: string;
  readonly correo: string;
  readonly estado: string;
}

export interface RolResumen {
  readonly idRol: number;
  readonly nombre: string;
}

export interface PermisoResumen {
  readonly idPermiso: number;
  readonly codigo: string;
  readonly nombre: string;
}

export interface AsignacionPermisoUsuario {
  readonly idUsuario: string;
  readonly idPermiso: number;
  readonly habilitado: boolean;
}

/**
 * P-78 `AdministracionEstudiantesController.EstudianteAltaRequest` (Backend DC-99): solo nombre
 * (máx. 150) y correo (máx. 255, formato correo). No incluye contraseña: no se crea credencial.
 */
export interface EstudianteAltaRequest {
  readonly nombre: string;
  readonly correo: string;
}

/** P-78 `EstudianteRegistrado`: respuesta de `POST` (201) y elementos de `GET ?correo=`. */
export interface EstudianteRegistrado {
  readonly idUsuario: string;
  readonly idEstudiante: string;
  readonly nombre: string;
  readonly correo: string;
  readonly estado: string;
}

const texto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const entero = (v: unknown): v is number => Number.isInteger(v);

function items(valor: unknown): unknown[] {
  const lista = (valor as { items?: unknown } | null)?.items;
  if (!Array.isArray(lista)) throw respuestaInvalida();
  return lista;
}

function leerPermiso(v: unknown): PermisoResumen {
  const p = v as Partial<Record<keyof PermisoResumen, unknown>> | null;
  if (!p || !entero(p.idPermiso) || !texto(p.codigo) || !texto(p.nombre)) throw respuestaInvalida();
  return { idPermiso: p.idPermiso, codigo: p.codigo, nombre: p.nombre };
}

function leerRol(v: unknown): RolResumen {
  const r = v as Partial<Record<keyof RolResumen, unknown>> | null;
  if (!r || !entero(r.idRol) || !texto(r.nombre)) throw respuestaInvalida();
  return { idRol: r.idRol, nombre: r.nombre };
}

function leerDocente(v: unknown): UsuarioDocente {
  const d = v as Partial<Record<keyof UsuarioDocente, unknown>> | null;
  if (!d || !esUuid(d.idUsuario) || !texto(d.nombre) || !texto(d.correo) || !texto(d.estado))
    throw respuestaInvalida();
  return { idUsuario: d.idUsuario, nombre: d.nombre, correo: d.correo, estado: d.estado };
}

function leerEstudiante(v: unknown): EstudianteRegistrado {
  const e = v as Partial<Record<keyof EstudianteRegistrado, unknown>> | null;
  if (
    !e ||
    !esUuid(e.idUsuario) ||
    !esUuid(e.idEstudiante) ||
    !texto(e.nombre) ||
    !texto(e.correo) ||
    !texto(e.estado)
  )
    throw respuestaInvalida();
  return {
    idUsuario: e.idUsuario,
    idEstudiante: e.idEstudiante,
    nombre: e.nombre,
    correo: e.correo,
    estado: e.estado,
  };
}

/**
 * API administrativa de M1 (`/v1/admin`). El Backend exige el rol ADMINISTRADOR y aplica la
 * política de permisos (sin autoasignación); Angular no concede ni infiere privilegios.
 */
@Injectable({ providedIn: 'root' })
export class AdministracionM1Api {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  roles(): Observable<RolResumen[]> {
    return this.get('v1/admin/roles').pipe(map((v) => items(v).map(leerRol)));
  }

  permisos(): Observable<PermisoResumen[]> {
    return this.get('v1/admin/permisos').pipe(map((v) => items(v).map(leerPermiso)));
  }

  permisosDeUsuario(idUsuario: string): Observable<PermisoResumen[]> {
    if (!esUuid(idUsuario)) return throwError(() => respuestaInvalida());
    return this.get(`v1/admin/usuarios/${idUsuario}/permisos`).pipe(
      map((v) => items(v).map(leerPermiso)),
    );
  }

  asignarPermiso(idUsuario: string, idPermiso: number): Observable<AsignacionPermisoUsuario> {
    if (!esUuid(idUsuario) || !entero(idPermiso)) return throwError(() => respuestaInvalida());
    return this.http
      .put<unknown>(this.url(`v1/admin/usuarios/${idUsuario}/permisos/${idPermiso}`), null, {
        context: contextoAcademico(),
      })
      .pipe(
        map((v) => {
          const a = v as Partial<Record<keyof AsignacionPermisoUsuario, unknown>> | null;
          if (
            !a ||
            !esUuid(a.idUsuario) ||
            !entero(a.idPermiso) ||
            typeof a.habilitado !== 'boolean'
          )
            throw respuestaInvalida();
          return { idUsuario: a.idUsuario, idPermiso: a.idPermiso, habilitado: a.habilitado };
        }),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  revocarPermiso(idUsuario: string, idPermiso: number): Observable<void> {
    if (!esUuid(idUsuario) || !entero(idPermiso)) return throwError(() => respuestaInvalida());
    return this.http
      .delete(this.url(`v1/admin/usuarios/${idUsuario}/permisos/${idPermiso}`), {
        context: contextoAcademico(),
        observe: 'response',
      })
      .pipe(
        map((r) => {
          if (r.status !== 204) throw respuestaInvalida();
        }),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  altaDocente(datos: DocenteAltaRequest): Observable<UsuarioDocente> {
    // Lista cerrada de campos del DTO (additionalProperties: false en ARQ-008.3).
    const cuerpo: DocenteAltaRequest = { nombre: datos.nombre.trim(), correo: datos.correo.trim() };
    return this.http
      .post<unknown>(this.url('v1/admin/docentes'), cuerpo, { context: contextoAcademico() })
      .pipe(
        map(leerDocente),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  /**
   * P-78 `POST /v1/admin/estudiantes` → 201. Crea el usuario (rol ESTUDIANTE, sin credencial) y su
   * registro de estudiante. NO activa el acceso estudiantil DD-02 ni envía correo. Errores del
   * Backend: 400 `VALIDATION_ERROR`, 401, 403 `ADMIN_REQUIRED`, 409 `DUPLICATE_EMAIL`, 503
   * `STUDENT_ROLE_NOT_CONFIGURED`/`ROLE_NOT_FOUND`; 404 sin código si el interruptor está apagado.
   */
  altaEstudiante(datos: EstudianteAltaRequest): Observable<EstudianteRegistrado> {
    const cuerpo: EstudianteAltaRequest = {
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim(),
    };
    return this.http
      .post<unknown>(this.url('v1/admin/estudiantes'), cuerpo, { context: contextoAcademico() })
      .pipe(
        map(leerEstudiante),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  /**
   * P-78 `GET /v1/admin/estudiantes?correo=` → 200 `{items}`. Coincidencia EXACTA por correo (sin
   * distinguir mayúsculas). No existe listado general, paginación ni otros filtros.
   */
  buscarEstudiantePorCorreo(correo: string): Observable<EstudianteRegistrado[]> {
    const valor = (correo ?? '').trim();
    if (!valor) return throwError(() => respuestaInvalida());
    return this.http
      .get<unknown>(this.url('v1/admin/estudiantes'), {
        context: contextoAcademico(),
        params: { correo: valor },
      })
      .pipe(
        map((v) => items(v).map(leerEstudiante)),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  /**
   * D-05 `POST /v1/admin/docentes/{id}/activacion` → 202 sin cuerpo: el Backend encola la
   * (re)emisión de la invitación. El 202 NO prueba que el correo se haya entregado. El token nunca
   * se devuelve. Errores: 404 `USER_NOT_FOUND` (o 404 sin código con el interruptor apagado), 409
   * `ACTIVATION_NOT_ALLOWED`/`ACTIVATION_CONFLICT`, 503 `ACTIVATION_DELIVERY_FAILED`.
   */
  emitirActivacionDocente(idUsuario: string): Observable<void> {
    return this.sinCuerpo('POST', idUsuario, 202);
  }

  /** D-05 `DELETE /v1/admin/docentes/{id}/activacion` → 204: revoca la invitación vigente. */
  revocarActivacionDocente(idUsuario: string): Observable<void> {
    return this.sinCuerpo('DELETE', idUsuario, 204);
  }

  private sinCuerpo(
    metodo: 'POST' | 'DELETE',
    idUsuario: string,
    esperado: number,
  ): Observable<void> {
    if (!esUuid(idUsuario)) return throwError(() => respuestaInvalida());
    return this.http
      .request(metodo, this.url(`v1/admin/docentes/${idUsuario}/activacion`), {
        context: contextoAcademico(),
        observe: 'response',
      })
      .pipe(
        map((r) => {
          if (r.status !== esperado) throw respuestaInvalida();
        }),
        catchError((e: unknown) => throwError(() => aFalloAcademico(e))),
      );
  }

  private get(ruta: string): Observable<unknown> {
    return this.http
      .get<unknown>(this.url(ruta), { context: contextoAcademico() })
      .pipe(catchError((e: unknown) => throwError(() => aFalloAcademico(e))));
  }

  private url(ruta: string): string {
    return construirUrlApi(this.api, ruta);
  }
}
