import { USUARIOS_DEMO_LOCALES } from '../app/features/autenticacion/usuarios-demo-locales';

/**
 * Configuración de desarrollo local (`ng serve`).
 *
 * Coincide con los valores por defecto del backend en
 * PRISALY-Backen/app/src/main/resources/application.yml:
 * `APP_PORT=8080`, `context-path: /api` y CORS para `http://localhost:4200`.
 *
 * Las cuentas de `usuariosDemo` solo abren la interfaz local. No son usuarios del servidor.
 */
export const environment = {
  personalQaHabilitado: false,
  /** H-58-01: desarrollo no es un entorno de demostración autorizado (usar `--configuration demo`). */
  demostracionesHabilitadas: false,
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  usuariosDemo: USUARIOS_DEMO_LOCALES,
};
