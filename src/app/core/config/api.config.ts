import { InjectionToken, Provider } from '@angular/core';

import { environment } from '../../../environments/environment';

/** Configuración centralizada del backend de PRISALY. */
export interface ApiConfig {
  /** URL base sin barra final, tomada de src/environments (por ejemplo `/api`). */
  readonly baseUrl: string;
}

/**
 * Normaliza y valida la URL base de la API.
 *
 * @throws Error si la URL está vacía.
 */
export function crearApiConfig(baseUrl: string): ApiConfig {
  const normalizada = (baseUrl ?? '').trim().replace(/\/+$/, '');
  if (!normalizada) {
    throw new Error('La URL base de la API no puede estar vacía.');
  }
  return { baseUrl: normalizada };
}

/**
 * Única fuente de la URL base. Por defecto se toma del archivo de entorno
 * activo (desarrollo o despliegue); los componentes nunca la conocen.
 */
export const API_CONFIG = new InjectionToken<ApiConfig>('PRISALY_API_CONFIG', {
  providedIn: 'root',
  factory: () => crearApiConfig(environment.apiBaseUrl),
});

/** Permite sustituir la URL base, por ejemplo en pruebas. */
export function provideApiConfig(baseUrl: string): Provider {
  return { provide: API_CONFIG, useValue: crearApiConfig(baseUrl) };
}

/**
 * Construye la URL de un recurso a partir de la base configurada.
 *
 * Solo acepta rutas relativas a la base para que ningún servicio pueda
 * apuntar a otro servidor ni repetir la base.
 *
 * @throws Error si la ruta está vacía, es absoluta o repite la base.
 */
export function construirUrlApi(config: ApiConfig, ruta: string): string {
  const relativa = (ruta ?? '').trim().replace(/^\/+/, '');
  if (!relativa) {
    throw new Error('La ruta del recurso no puede estar vacía.');
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(relativa) || (ruta ?? '').trim().startsWith('//')) {
    throw new Error('La ruta del recurso debe ser relativa a la URL base configurada.');
  }
  const ultimoSegmento = config.baseUrl.split('/').pop();
  if (ultimoSegmento && relativa.startsWith(`${ultimoSegmento}/`)) {
    throw new Error(`La ruta "${ruta}" repite el segmento base "${ultimoSegmento}".`);
  }
  return `${config.baseUrl}/${relativa}`;
}
