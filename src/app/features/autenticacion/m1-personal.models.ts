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

/** PersonalSessionController.me, misma revisión Backend: no emite ni renueva el token.
 * Modelo preparatorio: la extensión /me sigue pendiente de conciliación y no se consume.
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
        | 'cierre-no-confirmado';
    }
  | {
      readonly tipo: 'verificado-local' | 'sesion-consultada-local';
      readonly identidad: IdentidadPersonal;
    };
