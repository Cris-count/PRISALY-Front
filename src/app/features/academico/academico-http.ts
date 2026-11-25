import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_CONFIG } from '../../core/config/api.config';
import { clasificarErrorApi, FalloApi } from '../../core/http/clasificar-error-api';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { CredencialPersonalMemoria } from '../autenticacion/m1-personal-memoria';
import { VigilanciaAccesoPersonal } from '../autenticacion/vigilancia-acceso-personal';

/** Marca explícita de las solicitudes académicas de personal (M1 administración, M3, M4). */
export const SOLICITUD_ACADEMICA = new HttpContextToken<boolean>(() => false);

export function contextoAcademico(): HttpContext {
  return new HttpContext().set(SOLICITUD_ACADEMICA, true);
}

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

/**
 * Lista cerrada de rutas publicadas por el Backend (`develop` 773818c) que consume el Frontend.
 * Plantillas exactas por método; no se usan prefijos libres. No incluye M5 ni el acceso estudiantil.
 */
const RUTAS_AUTORIZADAS: readonly { metodo: string; ruta: RegExp }[] = [
  { metodo: 'POST', ruta: /^v1\/admin\/docentes$/ },
  { metodo: 'GET', ruta: /^v1\/admin\/roles$/ },
  { metodo: 'GET', ruta: /^v1\/admin\/permisos$/ },
  { metodo: 'GET', ruta: new RegExp(`^v1/admin/usuarios/${UUID}/permisos$`) },
  { metodo: 'PUT', ruta: new RegExp(`^v1/admin/usuarios/${UUID}/permisos/\\d+$`) },
  { metodo: 'DELETE', ruta: new RegExp(`^v1/admin/usuarios/${UUID}/permisos/\\d+$`) },
  { metodo: 'POST', ruta: /^v1\/casos$/ },
  { metodo: 'GET', ruta: new RegExp(`^v1/casos/${UUID}$`) },
  { metodo: 'PATCH', ruta: new RegExp(`^v1/casos/${UUID}$`) },
  { metodo: 'GET', ruta: new RegExp(`^v1/casos/${UUID}/contenido$`) },
  // FE-54: altas de contenido (CasoContenidoController). Las lecturas parciales no se consumen.
  { metodo: 'POST', ruta: new RegExp(`^v1/casos/${UUID}/escenarios$`) },
  { metodo: 'POST', ruta: new RegExp(`^v1/casos/${UUID}/escenarios/${UUID}/preguntas$`) },
  { metodo: 'POST', ruta: new RegExp(`^v1/casos/${UUID}/preguntas/${UUID}/opciones$`) },
  { metodo: 'POST', ruta: new RegExp(`^v1/casos/${UUID}/publicar$`) },
  { metodo: 'GET', ruta: new RegExp(`^v1/casos/${UUID}/rubrica$`) },
  { metodo: 'PUT', ruta: new RegExp(`^v1/casos/${UUID}/rubrica$`) },
  { metodo: 'POST', ruta: /^m4\/sesiones$/ },
  { metodo: 'GET', ruta: /^m4\/sesiones$/ },
  { metodo: 'GET', ruta: new RegExp(`^m4/sesiones/${UUID}$`) },
  { metodo: 'PUT', ruta: new RegExp(`^m4/sesiones/${UUID}$`) },
  { metodo: 'PATCH', ruta: new RegExp(`^m4/sesiones/${UUID}/estado$`) },
  { metodo: 'POST', ruta: new RegExp(`^m4/sesiones/${UUID}/convocatorias$`) },
  { metodo: 'GET', ruta: new RegExp(`^m4/sesiones/${UUID}/convocatorias$`) },
];

/** Devuelve la ruta relativa a la base configurada, o `null` si la URL apunta a otro origen o base. */
export function rutaRelativaApi(baseUrl: string, url: string): string | null {
  const base = `${baseUrl}/`;
  if (!url.startsWith(base)) return null;
  const relativa = url.slice(base.length).split(/[?#]/, 1)[0];
  return relativa.includes('..') ? null : relativa;
}

export function esRutaAcademicaAutorizada(metodo: string, relativa: string): boolean {
  return RUTAS_AUTORIZADAS.some((r) => r.metodo === metodo && r.ruta.test(relativa));
}

/**
 * Transporte de la credencial de personal para las rutas académicas. Mismo criterio que
 * `personalM1Interceptor` (que no se modifica): opt-in QA, contexto explícito y lista cerrada de
 * método y ruta. No concede permisos: la autorización la decide siempre el Backend.
 */
export const personalAcademicoInterceptor: HttpInterceptorFn = (solicitud, siguiente) => {
  if (!inject(M1_PERSONAL_LOCAL) || !solicitud.context.get(SOLICITUD_ACADEMICA))
    return siguiente(solicitud);
  const relativa = rutaRelativaApi(inject(API_CONFIG).baseUrl, solicitud.url);
  if (relativa === null || !esRutaAcademicaAutorizada(solicitud.method, relativa))
    return siguiente(solicitud);
  const memoria = inject(CredencialPersonalMemoria);
  const vigilancia = inject(VigilanciaAccesoPersonal);
  const revision = memoria.revision();
  const token = memoria.leerParaHttp();
  const peticion = token
    ? solicitud.clone({ setHeaders: { Authorization: `Bearer ${token}` }, withCredentials: false })
    : solicitud;
  return siguiente(peticion).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        memoria.revision() === revision
      )
        memoria.limpiar();
      // H-58-02: un 403 puede indicar permisos revocados. Se confirma `/me` una vez (compartida);
      // la operación denegada no se reintenta y la sesión no se cierra.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        memoria.revision() === revision
      ) {
        // La señal de vigilancia nunca sustituye ni oculta el error original de la operación.
        try {
          vigilancia.operacionDenegada();
        } catch {
          /* sin efecto sobre la respuesta */
        }
      }
      return throwError(() => error);
    }),
  );
};

const CODIGO = /^[A-Z][A-Z0-9_-]{2,79}$/;

/** Fallo de una operación académica: clasificación común y, como dato técnico, código y estado. */
export class FalloAcademico extends Error {
  constructor(
    readonly fallo: FalloApi,
    readonly estado: number,
    readonly codigo: string | null,
  ) {
    super(fallo.mensaje);
    this.name = 'FalloAcademico';
  }
}

export function aFalloAcademico(error: unknown): FalloAcademico {
  if (error instanceof FalloAcademico) return error;
  const estado = error instanceof HttpErrorResponse ? error.status : -1;
  const cuerpo = error instanceof HttpErrorResponse ? (error.error as { code?: unknown }) : null;
  const codigo = typeof cuerpo?.code === 'string' && CODIGO.test(cuerpo.code) ? cuerpo.code : null;
  return new FalloAcademico(clasificarErrorApi(error), estado, codigo);
}

export function respuestaInvalida(): FalloAcademico {
  return new FalloAcademico(
    {
      tipo: 'desconocido',
      mensaje: 'La respuesta del servidor no tiene el formato esperado.',
      reintentable: false,
    },
    -1,
    null,
  );
}

/** Mensaje de interfaz por estado HTTP; no reproduce el mensaje del servidor. */
export function mensajeFallo(fallo: FalloAcademico): string {
  switch (fallo.estado) {
    case 400:
      return 'Los datos no cumplen las validaciones del servidor. Revisa el formulario.';
    case 412:
      return 'Otra persona o pestaña modificó el caso. Vuelve a consultarlo antes de guardar.';
    case 422:
      return 'El servidor rechazó la operación por una regla de validación.';
    case 428:
      return 'Falta la versión del caso. Consulta el caso antes de guardar.';
    default:
      return fallo.fallo.mensaje;
  }
}

export const UUID_RE = new RegExp(`^${UUID}$`);

export function esUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID_RE.test(valor);
}
