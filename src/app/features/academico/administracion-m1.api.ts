import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { aFalloAcademico, contextoAcademico, esUuid, respuestaInvalida } from './academico-http';

/** `AdministracionController.DocenteAltaRequest`: solo nombre y correo (sin contraseña, D-05). */
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

  private get(ruta: string): Observable<unknown> {
    return this.http
      .get<unknown>(this.url(ruta), { context: contextoAcademico() })
      .pipe(catchError((e: unknown) => throwError(() => aFalloAcademico(e))));
  }

  private url(ruta: string): string {
    return construirUrlApi(this.api, ruta);
  }
}
