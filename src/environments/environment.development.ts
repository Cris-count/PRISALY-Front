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
  /** Local: el login de `ng serve` habla con el backend de este equipo. Producción y demo siguen apagados. */
  personalQaHabilitado: true,
  /** H-58-01: desarrollo no es un entorno de demostración autorizado (usar `--configuration demo`). */
  demostracionesHabilitadas: false,
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  rutasPersonalHabilitadasQa: [
    'usuarios-docentes',
    'configuracion',
    'casos-academicos',
    'rubricas',
    'sesiones',
    'convocatorias',
  ],
  /** Ciudad 3D contra la señalización local de PS2-LAB-03; solo en http://127.0.0.1:4213. */
  simuladorUnrealLocal: true,
};
