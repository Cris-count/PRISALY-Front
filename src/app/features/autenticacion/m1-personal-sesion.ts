import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  defer,
  finalize,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
  throwError,
} from 'rxjs';
import { FalloAutenticacionPersonal, M1PersonalApi } from './m1-personal-api';
import { CredencialPersonalMemoria } from './m1-personal-memoria';
import {
  EstadoAccesoPersonal,
  EstadoSesionPersonal,
  FalloSesionPersonal,
  PersonalAutenticarRequest,
  PersonalMeResponse,
} from './m1-personal.models';

/** Preparación aislada. No se instancia desde login, rutas ni arranque.
 * No restaura sesiones, calcula expiraciones, renueva tokens ni inicia HTTP al construirse.
 */
@Injectable({ providedIn: 'root' })
export class SesionPersonalM1 {
  private readonly api = inject(M1PersonalApi);
  private readonly memoria = inject(CredencialPersonalMemoria);
  private readonly interno = signal<EstadoSesionPersonal>({ tipo: 'no-autenticada' });
  private readonly cancelar = new Subject<void>();
  private ocupada = false;
  private revisionVerificada = -1;

  readonly estado = computed<EstadoSesionPersonal>(() => {
    const estado = this.interno();
    // Un 401 o cambio externo de credencial invalida inmediatamente la identidad anterior.
    return estado.tipo === 'valida' &&
      (this.revisionVerificada !== this.memoria.revision() || !this.memoria.leerParaHttp())
      ? { tipo: 'expirada' }
      : estado;
  });

  readonly estadoPanel = computed<EstadoAccesoPersonal>(() => {
    const estado = this.estado();
    switch (estado.tipo) {
      case 'valida':
        return { tipo: 'sesion-consultada-local', identidad: estado.identidad };
      case 'autenticando':
        return { tipo: 'cargando' };
      case 'identidad-pendiente':
        return { tipo: 'consultando-sesion' };
      case 'expirada':
        return { tipo: 'sesion-no-verificada' };
      case 'acceso-denegado':
        return { tipo: 'denegado' };
      case 'cerrando':
        return { tipo: 'cerrando-sesion' };
      case 'cierre-confirmado':
        return { tipo: 'cierre-confirmado' };
      case 'cierre-no-confirmado':
        return { tipo: 'cierre-no-confirmado' };
      case 'error-servicio':
        return { tipo: 'error' };
      default:
        return { tipo: 'no-autenticada' };
    }
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cancelar.next();
      this.cancelar.complete();
      this.memoria.limpiar();
    });
  }

  autenticar(datos: PersonalAutenticarRequest): Observable<EstadoSesionPersonal> {
    return this.ejecutar('autenticando', () => {
      this.memoria.limpiar();
      return this.api.autenticar(datos).pipe(
        switchMap((respuesta) => {
          this.memoria.guardar(respuesta.accessToken);
          this.interno.set({ tipo: 'identidad-pendiente' });
          return this.api.consultarIdentidad().pipe(
            map((identidad) => {
              if (identidad.userId !== respuesta.userId)
                throw new FalloAutenticacionPersonal(
                  'respuesta-invalida',
                  'No se pudo verificar la identidad de personal.',
                );
              return this.confirmarIdentidad(identidad);
            }),
          );
        }),
      );
    });
  }

  verificarSesion(): Observable<EstadoSesionPersonal> {
    return this.ejecutar('identidad-pendiente', () =>
      this.api.consultarIdentidad().pipe(map((identidad) => this.confirmarIdentidad(identidad))),
    );
  }

  cerrarSesion(): Observable<EstadoSesionPersonal> {
    return this.ejecutar('cerrando', () =>
      this.api.cerrarSesion().pipe(
        map(() => {
          this.memoria.limpiar();
          return { tipo: 'cierre-confirmado' } as const;
        }),
      ),
    );
  }

  /** Invalidación local; no afirma revocación en Backend. También cancela lecturas tardías. */
  invalidarSesion(): void {
    this.cancelar.next();
    this.memoria.limpiar();
    this.interno.set({ tipo: 'expirada' });
  }

  tienePermisos(permisos: readonly string[]): boolean {
    const estado = this.estado();
    return (
      estado.tipo === 'valida' &&
      permisos.length > 0 &&
      permisos.every(
        (permiso) =>
          typeof permiso === 'string' &&
          permiso.length > 0 &&
          estado.identidad.permisos.includes(permiso),
      )
    );
  }

  private confirmarIdentidad(respuesta: PersonalMeResponse): EstadoSesionPersonal {
    const { accessToken: _token, tokenType: _tipo, ...datos } = respuesta;
    const identidad = Object.freeze({ ...datos, permisos: Object.freeze([...datos.permisos]) });
    return { tipo: 'valida', identidad };
  }

  private ejecutar(
    tipo: 'autenticando' | 'identidad-pendiente' | 'cerrando',
    trabajo: () => Observable<EstadoSesionPersonal>,
  ): Observable<EstadoSesionPersonal> {
    return defer(() => {
      if (this.ocupada)
        return throwError(
          () =>
            new FalloAutenticacionPersonal(
              'operacion-en-curso',
              'Espera a que termine la operación de acceso actual.',
            ),
        );
      this.ocupada = true;
      this.interno.set({ tipo });
      let terminada = false;
      return defer(trabajo).pipe(
        tap((estado) => {
          if (estado.tipo === 'valida') this.revisionVerificada = this.memoria.revision();
          this.interno.set(estado);
          terminada = true;
        }),
        catchError((error: unknown) => {
          const fallo: FalloSesionPersonal =
            error instanceof FalloAutenticacionPersonal
              ? {
                  tipo: error.tipo,
                  mensaje: error.message,
                  reintentarEnSegundos: error.reintentarEnSegundos,
                }
              : {
                  tipo: 'desconocido',
                  mensaje: 'No fue posible completar la operación de acceso.',
                };
          if (
            fallo.tipo === 'sesion-no-valida' ||
            fallo.tipo === 'credenciales' ||
            fallo.tipo === 'respuesta-invalida'
          )
            this.memoria.limpiar();
          const estado: EstadoSesionPersonal = {
            tipo:
              fallo.tipo === 'sesion-no-valida' || fallo.tipo === 'sesion-cambiada'
                ? 'expirada'
                : fallo.tipo === 'credenciales' ||
                    fallo.tipo === 'datos-invalidos' ||
                    fallo.tipo === 'integracion-no-habilitada'
                  ? 'no-autenticada'
                  : tipo === 'cerrando'
                    ? 'cierre-no-confirmado'
                    : fallo.tipo === 'acceso-denegado'
                      ? 'acceso-denegado'
                      : 'error-servicio',
            fallo,
          };
          this.interno.set(estado);
          terminada = true;
          return of(estado);
        }),
        takeUntil(this.cancelar),
        finalize(() => {
          this.ocupada = false;
          if (!terminada) {
            if (tipo !== 'cerrando') this.memoria.limpiar();
            this.interno.set({
              tipo: tipo === 'cerrando' ? 'cierre-no-confirmado' : 'no-autenticada',
            });
          }
        }),
      );
    });
  }
}
