import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken, Provider } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { CredencialPersonalMemoria } from './m1-personal-memoria';

export const M1_PERSONAL_LOCAL = new InjectionToken<boolean>('M1_PERSONAL_LOCAL', {
  providedIn: 'root',
  factory: () => false,
});

/** Opt-in existente; no se registra en app.config ni habilita por sí solo el formulario. */
export function provideM1PersonalLocal(): Provider {
  return { provide: M1_PERSONAL_LOCAL, useValue: true };
}

export const SOLICITUD_PERSONAL_M1 = new HttpContextToken<boolean>(() => false);

/** Preparado para registro explícito con withInterceptors en un entorno autorizado.
 * Exige opt-in, contexto y coincidencia exacta de método/URL centralizada. No usa prefijos.
 * No envía Bearer al login, DD-02, M5, recursos estáticos ni otros servidores.
 */
export const personalM1Interceptor: HttpInterceptorFn = (solicitud, siguiente) => {
  if (!inject(M1_PERSONAL_LOCAL) || !solicitud.context.get(SOLICITUD_PERSONAL_M1))
    return siguiente(solicitud);
  const config = inject(API_CONFIG);
  const autorizada =
    (solicitud.method === 'GET' && solicitud.url === construirUrlApi(config, 'v1/personal/me')) ||
    (solicitud.method === 'POST' &&
      solicitud.url === construirUrlApi(config, 'v1/personal/cerrar-sesion'));
  if (!autorizada) return siguiente(solicitud);
  const memoria = inject(CredencialPersonalMemoria);
  const revision = memoria.revision();
  const token = memoria.leerParaHttp();
  const peticion = token
    ? solicitud.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: false,
      })
    : solicitud;
  return siguiente(peticion).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        memoria.revision() === revision
      )
        memoria.limpiar();
      return throwError(() => error);
    }),
  );
};
