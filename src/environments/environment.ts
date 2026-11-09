/**
 * Configuración de despliegue (build de producción).
 *
 * `apiBaseUrl` es relativa: el navegador llama a `/api` en el mismo origen
 * que sirve la aplicación, y un proxy inverso la reenvía al backend. Esa
 * estrategia está PENDIENTE de aprobación por el Integrante 1, responsable de
 * Docker Compose. Ver docs/configuracion-api.md.
 *
 * No incluir credenciales ni secretos: este archivo termina en el bundle
 * público del navegador.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
};
