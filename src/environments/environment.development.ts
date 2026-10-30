/**
 * Configuración de desarrollo local (`ng serve`).
 *
 * Coincide con los valores por defecto del backend en
 * PRISALY-Backen/app/src/main/resources/application.yml:
 * `APP_PORT=8080`, `context-path: /api` y CORS para `http://localhost:4200`.
 *
 * No incluir credenciales ni secretos.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
};
