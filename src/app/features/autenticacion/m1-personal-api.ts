import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, defer, map, Observable, throwError } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { clasificarErrorApi } from '../../core/http/clasificar-error-api';
import {
  PersonalAutenticarRequest,
  PersonalAutenticarResponse,
  PersonalMeResponse,
} from './m1-personal.models';
import { M1_PERSONAL_LOCAL, SOLICITUD_PERSONAL_M1 } from './m1-personal-http';
import { CredencialPersonalMemoria, esTokenPersonal } from './m1-personal-memoria';
export { provideM1PersonalLocal } from './m1-personal-http';

export class FalloAutenticacionPersonal extends Error {
  constructor(
    readonly tipo: string,
    mensaje: string,
    /** Valor en segundos publicado por M1 en HTTP 429; no programa reintentos ni sesiones. */
    readonly reintentarEnSegundos?: number,
  ) {
    super(mensaje);
    this.name = 'FalloAutenticacionPersonal';
  }
}

/** Contratos confirmados en I4. Sin conexión al login, persistencia ni reintentos.
 * Los métodos protegidos requieren el interceptor opt-in personalM1Interceptor.
 */
@Injectable({ providedIn: 'root' })
export class M1PersonalApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly habilitado = inject(M1_PERSONAL_LOCAL);
  private readonly memoria = inject(CredencialPersonalMemoria);
  private reintentarDesde?: number;

  autenticar(datos: PersonalAutenticarRequest): Observable<PersonalAutenticarResponse> {
    return defer(() => {
      this.comprobarHabilitacion();
      const espera =
        this.reintentarDesde === undefined
          ? 0
          : Math.ceil((this.reintentarDesde - Date.now()) / 1000);
      if (espera > 0)
        throw new FalloAutenticacionPersonal(
          'limite-intentos',
          'Se alcanzó el límite de intentos. Espera antes de intentarlo de nuevo.',
          espera,
        );
      this.reintentarDesde = undefined;
      if (!datos.correo?.trim() || !datos.password?.trim()) {
        throw new FalloAutenticacionPersonal(
          'datos-invalidos',
          'Revisa el correo y la contraseña.',
        );
      }
      // Lista cerrada de campos del DTO: no transmite identificadores ni propiedades adicionales.
      const cuerpo: PersonalAutenticarRequest = { correo: datos.correo, password: datos.password };
      return this.http.post<unknown>(
        construirUrlApi(this.config, 'v1/personal/autenticar'),
        cuerpo,
        {
          withCredentials: false,
        },
      );
    }).pipe(
      map((valor) => validarRespuesta(valor, 'autenticar') as PersonalAutenticarResponse),
      catchError((error: unknown) => this.tratarError(error, true)),
    );
  }

  consultarIdentidad(): Observable<PersonalMeResponse> {
    return defer(() => {
      this.comprobarHabilitacion(true);
      const revision = this.memoria.revision();
      return this.http
        .get<unknown>(construirUrlApi(this.config, 'v1/personal/me'), {
          context: new HttpContext().set(SOLICITUD_PERSONAL_M1, true),
          withCredentials: false,
        })
        .pipe(
          map((valor) => {
            this.comprobarRevision(revision);
            return validarRespuesta(valor, 'me') as PersonalMeResponse;
          }),
          catchError((error: unknown) => {
            if (this.memoria.leerParaHttp()) this.comprobarRevision(revision);
            return throwError(() => error);
          }),
        );
    }).pipe(catchError((error: unknown) => this.tratarError(error)));
  }

  cerrarSesion(): Observable<void> {
    return defer(() => {
      this.comprobarHabilitacion(true);
      const revision = this.memoria.revision();
      return this.http
        .post<unknown>(construirUrlApi(this.config, 'v1/personal/cerrar-sesion'), null, {
          context: new HttpContext().set(SOLICITUD_PERSONAL_M1, true),
          withCredentials: false,
          observe: 'response',
        })
        .pipe(
          map((respuesta) => {
            this.comprobarRevision(revision);
            if (respuesta.status !== 204 || respuesta.body !== null)
              throw new FalloAutenticacionPersonal(
                'respuesta-invalida',
                'No se confirmó el cierre de sesión.',
              );
            this.memoria.limpiar();
          }),
          catchError((error: unknown) => {
            if (this.memoria.leerParaHttp()) this.comprobarRevision(revision);
            return throwError(() => error);
          }),
        );
    }).pipe(catchError((error: unknown) => this.tratarError(error)));
  }

  private comprobarRevision(revision: number): void {
    if (this.memoria.revision() !== revision)
      throw new FalloAutenticacionPersonal(
        'sesion-cambiada',
        'La credencial cambió durante la consulta. No se confirma la sesión anterior.',
      );
  }

  private comprobarHabilitacion(protegida = false): void {
    if (!this.habilitado)
      throw new FalloAutenticacionPersonal(
        'integracion-no-habilitada',
        'La autenticación de personal requiere un entorno local autorizado.',
      );
    if (protegida && !this.memoria.leerParaHttp())
      throw new FalloAutenticacionPersonal(
        'sesion-no-valida',
        'No hay una sesión de personal verificable.',
      );
  }

  private tratarError(error: unknown, autenticando = false): Observable<never> {
    if (error instanceof FalloAutenticacionPersonal) return throwError(() => error);
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400)
        return rechazar('datos-invalidos', 'Revisa el correo y la contraseña.');
      if (error.status === 401) {
        this.memoria.limpiar();
        return autenticando
          ? rechazar('credenciales', 'No fue posible verificar las credenciales.')
          : rechazar('sesion-no-valida', 'No se pudo verificar una sesión de personal vigente.');
      }
      if (error.status === 429) {
        const segundos = leerEsperaM1(error);
        // Respeta la espera indicada por el servidor, sin temporizadores ni solicitudes automáticas.
        if (
          autenticando &&
          segundos !== undefined &&
          Number.isSafeInteger(segundos * 1000 + Date.now())
        )
          this.reintentarDesde = Date.now() + segundos * 1000;
        return throwError(
          () =>
            new FalloAutenticacionPersonal(
              'limite-intentos',
              'Se alcanzó el límite de intentos. Espera antes de intentarlo de nuevo.',
              segundos,
            ),
        );
      }
    }
    const fallo = clasificarErrorApi(error);
    return rechazar(fallo.tipo, fallo.mensaje);
  }
}

/** LimiteIntentosExceptionHandler publica un long positivo, no una fecha HTTP.
 * Si falta o no es representable, no se inventa un tiempo de espera.
 */
function leerEsperaM1(error: HttpErrorResponse): number | undefined {
  const cabecera = error.headers.get('Retry-After');
  if (!cabecera || !/^\d+$/.test(cabecera)) return undefined;
  const segundos = Number(cabecera);
  return Number.isSafeInteger(segundos) && segundos > 0 ? segundos : undefined;
}

function rechazar(tipo: string, mensaje: string): Observable<never> {
  return throwError(() => new FalloAutenticacionPersonal(tipo, mensaje));
}

function validarRespuesta(
  valor: unknown,
  operacion: 'autenticar' | 'me',
): PersonalAutenticarResponse | PersonalMeResponse {
  if (valor && typeof valor === 'object') {
    const dato = valor as Record<string, unknown>;
    if (
      ['userId', 'correo', 'nombre', 'rol'].every(
        (campo) => typeof dato[campo] === 'string' && (dato[campo] as string).trim().length > 0,
      ) &&
      (operacion === 'autenticar'
        ? esTokenPersonal(dato['accessToken'])
        : dato['accessToken'] === null) &&
      dato['tokenType'] === 'Bearer' &&
      dato['authPrototype'] === 'TD-M1-AUTH-PROVISIONAL' &&
      Array.isArray(dato['permisos']) &&
      dato['permisos'].every((permiso: unknown) => typeof permiso === 'string')
    ) {
      const identidad = {
        tokenType: 'Bearer',
        userId: dato['userId'] as string,
        correo: dato['correo'] as string,
        nombre: dato['nombre'] as string,
        rol: dato['rol'] as string,
        permisos: [...dato['permisos']],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      } as const;
      return operacion === 'autenticar'
        ? { ...identidad, accessToken: dato['accessToken'] as string }
        : { ...identidad, accessToken: null };
    }
  }
  throw new FalloAutenticacionPersonal(
    'respuesta-invalida',
    'No fue posible verificar la respuesta de autenticación.',
  );
}
