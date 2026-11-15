import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken, Provider } from '@angular/core';
import { catchError, defer, map, Observable, throwError } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { clasificarErrorApi } from '../../core/http/clasificar-error-api';
import { PersonalAutenticarRequest, PersonalAutenticarResponse } from './m1-personal.models';

/** Sin proveedor en app.config: requiere habilitación explícita en un entorno local autorizado. */
const M1_PERSONAL_LOCAL = new InjectionToken<boolean>('M1_PERSONAL_LOCAL', {
  providedIn: 'root',
  factory: () => false,
});

export function provideM1PersonalLocal(): Provider {
  return { provide: M1_PERSONAL_LOCAL, useValue: true };
}

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

/** Cliente independiente, sin persistencia, interceptores, reintentos ni conexión al login.
 * No implementa /me ni /cerrar-sesion: son extensiones pendientes de conciliación.
 */
@Injectable({ providedIn: 'root' })
export class M1PersonalApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly habilitado = inject(M1_PERSONAL_LOCAL);

  autenticar(datos: PersonalAutenticarRequest): Observable<PersonalAutenticarResponse> {
    return defer(() => {
      if (!this.habilitado) {
        throw new FalloAutenticacionPersonal(
          'integracion-no-habilitada',
          'La autenticación de personal requiere un entorno local autorizado.',
        );
      }
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
      map(validarRespuesta),
      catchError((error: unknown) => {
        if (error instanceof FalloAutenticacionPersonal) return throwError(() => error);
        if (error instanceof HttpErrorResponse) {
          if (error.status === 400)
            return rechazar('datos-invalidos', 'Revisa el correo y la contraseña.');
          if (error.status === 401)
            return rechazar('credenciales', 'No fue posible verificar las credenciales.');
          if (error.status === 429)
            return throwError(
              () =>
                new FalloAutenticacionPersonal(
                  'limite-intentos',
                  'Se alcanzó el límite de intentos. Espera antes de intentarlo de nuevo.',
                  leerEsperaM1(error),
                ),
            );
        }
        const fallo = clasificarErrorApi(error);
        return rechazar(fallo.tipo, fallo.mensaje);
      }),
    );
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

function validarRespuesta(valor: unknown): PersonalAutenticarResponse {
  if (valor && typeof valor === 'object') {
    const dato = valor as Record<string, unknown>;
    if (
      ['accessToken', 'userId', 'correo', 'nombre', 'rol'].every(
        (campo) => typeof dato[campo] === 'string' && (dato[campo] as string).trim().length > 0,
      ) &&
      dato['tokenType'] === 'Bearer' &&
      dato['authPrototype'] === 'TD-M1-AUTH-PROVISIONAL' &&
      Array.isArray(dato['permisos']) &&
      dato['permisos'].every((permiso: unknown) => typeof permiso === 'string')
    ) {
      return {
        accessToken: dato['accessToken'] as string,
        tokenType: 'Bearer',
        userId: dato['userId'] as string,
        correo: dato['correo'] as string,
        nombre: dato['nombre'] as string,
        rol: dato['rol'] as string,
        permisos: [...dato['permisos']],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      };
    }
  }
  throw new FalloAutenticacionPersonal(
    'respuesta-invalida',
    'No fue posible verificar la respuesta de autenticación.',
  );
}
