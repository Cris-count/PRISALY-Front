import { HttpErrorResponse } from '@angular/common/http';

/** Categorías de fallo que la interfaz sabe presentar. */
export type TipoFalloApi =
  | 'sin-conexion'
  | 'sesion-no-valida'
  | 'acceso-denegado'
  | 'no-encontrado'
  | 'conflicto'
  | 'servidor'
  | 'desconocido';

export interface FalloApi {
  readonly tipo: TipoFalloApi;
  readonly mensaje: string;
  /** Si tiene sentido ofrecer reintentar la misma operación. */
  readonly reintentable: boolean;
}

const MENSAJES: Record<TipoFalloApi, string> = {
  'sin-conexion': 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  'sesion-no-valida': 'Tu sesión no es válida o venció. Vuelve a ingresar para continuar.',
  'acceso-denegado': 'No tienes acceso a este recurso.',
  'no-encontrado': 'El recurso solicitado no existe o ya no está disponible.',
  conflicto: 'La operación no se pudo aplicar por el estado actual. Actualiza la vista.',
  servidor: 'El servidor no pudo completar la operación. Inténtalo más tarde.',
  desconocido: 'Ocurrió un error inesperado.',
};

/**
 * Clasifica un error de una llamada HTTP por su estado.
 *
 * Solo usa semántica ya establecida: estado 0 (sin conexión) y los 401/403
 * de la cadena de seguridad compartida (`{code, message}` de M1). No depende
 * de los códigos de error propuestos para M5, que ARQ-008.3 aún no ratifica,
 * ni muestra el mensaje del servidor, para no exponer detalles internos.
 */
export function clasificarErrorApi(error: unknown): FalloApi {
  if (!(error instanceof HttpErrorResponse)) {
    return fallo('desconocido', false);
  }
  const estado = error.status;
  if (estado === 0) {
    return fallo('sin-conexion', true);
  }
  if (estado === 401) {
    return fallo('sesion-no-valida', false);
  }
  if (estado === 403) {
    return fallo('acceso-denegado', false);
  }
  if (estado === 404) {
    return fallo('no-encontrado', false);
  }
  if (estado === 409) {
    return fallo('conflicto', false);
  }
  if (estado >= 500) {
    return fallo('servidor', true);
  }
  return fallo('desconocido', false);
}

function fallo(tipo: TipoFalloApi, reintentable: boolean): FalloApi {
  return { tipo, mensaje: MENSAJES[tipo], reintentable };
}
