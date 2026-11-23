import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  defer,
  finalize,
  map,
  Observable,
  of,
  share,
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

/** Resultado de `actualizarIdentidad`: solo `vigente` permite decidir con la identidad mostrada. */
export type VerificacionIdentidad = 'vigente' | 'no-vigente' | 'no-disponible';

/** H-58-02: ventana en la que una identidad recién confirmada se reutiliza sin volver a `/me`. */
export const VIGENCIA_IDENTIDAD_MS = 15_000;

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
  /** H-58-02: consulta `/me` compartida entre solicitantes concurrentes. */
  private actualizacionEnCurso: Observable<VerificacionIdentidad> | null = null;
  private readonly confirmacionPendiente = signal(false);
  private generacionIdentidad = 0;
  private confirmadaEn = 0;
  private readonly reloj: () => number = () => Date.now();

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

  /**
   * H-58-02. Vuelve a consultar `GET /v1/personal/me` para decidir la navegación con permisos y rol
   * vigentes. No crea ni renueva credenciales y no cambia el estado a «pendiente» mientras consulta.
   *
   * - Una sola consulta compartida para solicitantes concurrentes; sin intervalos automáticos.
   * - `forzar = false` reutiliza una identidad confirmada hace menos de `VIGENCIA_IDENTIDAD_MS`.
   * - Una respuesta tardía (otra credencial, cierre, nuevo inicio de sesión) se descarta.
   * - 401: la credencial ya se limpió en el interceptor/API; la sesión queda `expirada`.
   * - 403 de `/me` (cuenta inactiva o denegada): la identidad deja de ser utilizable.
   * - Error de red o de servicio: `no-disponible`; se conserva la sesión pero no se concede acceso.
   */
  actualizarIdentidad(forzar = false): Observable<VerificacionIdentidad> {
    const actual = this.interno();
    if (this.ocupada || actual.tipo !== 'valida' || this.estado().tipo !== 'valida')
      return of('no-vigente');
    if (
      !forzar &&
      this.revisionVerificada === this.memoria.revision() &&
      this.reloj() - this.confirmadaEn < VIGENCIA_IDENTIDAD_MS
    )
      return of('vigente');
    if (this.actualizacionEnCurso) return this.actualizacionEnCurso;

    const revision = this.memoria.revision();
    const generacion = this.generacionIdentidad;
    const userId = actual.identidad.userId;
    // La respuesta solo se aplica si sigue siendo la misma credencial y la misma identidad.
    const vigenteAun = () =>
      this.memoria.revision() === revision &&
      this.generacionIdentidad === generacion &&
      !this.ocupada &&
      (() => {
        const e = this.interno();
        return e.tipo === 'valida' && e.identidad.userId === userId;
      })();

    const consulta = this.api.consultarIdentidad().pipe(
      map((identidad): VerificacionIdentidad => {
        if (!vigenteAun()) return 'no-vigente';
        if (identidad.userId !== userId) {
          this.memoria.limpiar();
          this.interno.set({ tipo: 'expirada' });
          return 'no-vigente';
        }
        this.interno.set(this.confirmarIdentidad(identidad));
        this.confirmacionPendiente.set(false);
        this.revisionVerificada = revision;
        this.confirmadaEn = this.reloj();
        return 'vigente';
      }),
      catchError((error: unknown): Observable<VerificacionIdentidad> => {
        if (!vigenteAun()) return of('no-vigente');
        this.confirmadaEn = 0;
        const tipo = error instanceof FalloAutenticacionPersonal ? error.tipo : 'desconocido';
        const fallo: FalloSesionPersonal = {
          tipo,
          mensaje:
            error instanceof FalloAutenticacionPersonal
              ? error.message
              : 'No fue posible verificar la sesión de personal.',
        };
        if (tipo === 'sesion-no-valida' || tipo === 'sesion-cambiada') {
          this.memoria.limpiar();
          this.interno.set({ tipo: 'expirada', fallo });
          return of('no-vigente');
        }
        if (tipo === 'acceso-denegado') {
          this.memoria.limpiar();
          this.interno.set({ tipo: 'acceso-denegado', fallo });
          return of('no-vigente');
        }
        return of('no-disponible');
      }),
      takeUntil(this.cancelar),
      finalize(() => {
        if (this.actualizacionEnCurso === compartida) this.actualizacionEnCurso = null;
      }),
    );
    const compartida = consulta.pipe(share());
    this.actualizacionEnCurso = compartida;
    return compartida;
  }

  /** Un 403 exige una confirmación iniciada después del rechazo, sin cerrar la sesión. */
  confirmarTrasDenegacion(): Observable<VerificacionIdentidad> {
    if (!this.confirmacionPendiente()) {
      this.confirmacionPendiente.set(true);
      this.generacionIdentidad++;
      this.confirmadaEn = 0;
      this.actualizacionEnCurso = null;
    }
    return this.actualizarIdentidad(true);
  }

  identidadRequiereConfirmacion(): boolean {
    return this.confirmacionPendiente();
  }

  /** Invalidación local; no afirma revocación en Backend. También cancela lecturas tardías. */
  invalidarSesion(): void {
    this.cancelar.next();
    this.memoria.limpiar();
    this.interno.set({ tipo: 'expirada' });
  }

  /**
   * FE-58. Rol exacto de `/v1/personal/me` (sensible a mayúsculas, como el control
   * `exigirAdministrador` del Backend). No se deduce de los permisos ni concede operaciones.
   */
  tieneRol(rol: string): boolean {
    const estado = this.estado();
    return (
      estado.tipo === 'valida' &&
      !this.confirmacionPendiente() &&
      typeof rol === 'string' &&
      rol.length > 0 &&
      estado.identidad.rol === rol
    );
  }

  tienePermisos(permisos: readonly string[]): boolean {
    const estado = this.estado();
    return (
      estado.tipo === 'valida' &&
      !this.confirmacionPendiente() &&
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
          if (estado.tipo === 'valida') {
            this.revisionVerificada = this.memoria.revision();
            this.generacionIdentidad++;
            this.confirmacionPendiente.set(false);
            this.actualizacionEnCurso = null;
            this.confirmadaEn = 0;
          }
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
