/** Contratos M1 verificados en Backend develop bda71ca (PersonalAutenticarRequest/Response).
 * Bearer provisional: integración local exclusivamente; no es una sesión estudiantil.
 */
export interface PersonalAutenticarRequest {
  readonly correo: string;
  readonly password: string;
}

export interface PersonalAutenticarResponse {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly userId: string;
  readonly correo: string;
  readonly nombre: string;
  readonly rol: string;
  readonly permisos: readonly string[];
  readonly authPrototype: 'TD-M1-AUTH-PROVISIONAL';
}

/** PersonalSessionController.me, contrato confirmado para preparación en DC-FE-MAR-I4.
 * No emite ni renueva el token; el flujo permanece sin activar.
 * No se añade expiresAt: el DTO Backend no publica la expiración.
 */
export interface PersonalMeResponse extends Omit<PersonalAutenticarResponse, 'accessToken'> {
  readonly accessToken: null;
}

/** Proyección para presentación. Nunca contiene el token ni concede permisos efectivos. */
export type IdentidadPersonal = Omit<PersonalAutenticarResponse, 'accessToken' | 'tokenType'>;

export type EstadoAccesoPersonal =
  | {
      readonly tipo:
        | 'pendiente'
        | 'cargando'
        | 'denegado'
        | 'error'
        | 'consultando-sesion'
        | 'sesion-no-verificada'
        | 'cerrando-sesion'
        | 'cierre-no-confirmado'
        | 'no-autenticada'
        | 'cierre-confirmado';
    }
  | {
      readonly tipo: 'verificado-local' | 'sesion-consultada-local';
      readonly identidad: IdentidadPersonal;
    };

export interface FalloSesionPersonal {
  readonly tipo: string;
  readonly mensaje: string;
  readonly reintentarEnSegundos?: number;
}

/** Solo 'valida' contiene una identidad consultada mediante /me. Ningún estado contiene tokens. */
export type EstadoSesionPersonal =
  | { readonly tipo: 'valida'; readonly identidad: IdentidadPersonal }
  | {
      readonly tipo:
        | 'no-autenticada'
        | 'autenticando'
        | 'identidad-pendiente'
        | 'expirada'
        | 'acceso-denegado'
        | 'cerrando'
        | 'cierre-confirmado'
        | 'cierre-no-confirmado'
        | 'error-servicio';
      readonly fallo?: FalloSesionPersonal;
    };
