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

/** Proyección para presentación. Nunca contiene el token ni concede permisos efectivos. */
export type IdentidadPersonal = Omit<PersonalAutenticarResponse, 'accessToken' | 'tokenType'>;

export type EstadoAccesoPersonal =
  | { readonly tipo: 'pendiente' | 'cargando' | 'denegado' | 'error' }
  | { readonly tipo: 'verificado-local'; readonly identidad: IdentidadPersonal };
