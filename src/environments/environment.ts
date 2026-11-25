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
  personalQaHabilitado: false,
  /** H-58-01 (opción B): las demostraciones solo existen en el entorno `demo`. */
  demostracionesHabilitadas: false,
  production: true,
  apiBaseUrl: '/api',
  /** Producción no publica una sesión 3D fija: requiere asignación autenticada. */
  simuladorUnrealLocal: false,
};
