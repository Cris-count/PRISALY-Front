// M1 PersonalAutenticarRequest / PersonalAutenticarResponse.
export interface PersonalAuthRequest {
  readonly correo: string;
  readonly password: string;
}

// Same record for /autenticar and /me; /me returns accessToken = null.
export interface PersonalAuthResponse {
  readonly accessToken: string | null;
  readonly tokenType: string;
  readonly userId: string;
  readonly correo: string;
  readonly nombre: string;
  readonly rol: string;
  readonly permisos: readonly string[];
  readonly authPrototype: string;
}
