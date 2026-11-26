/**
 * Configuración de laboratorio para la prueba H4 en vivo (`ng serve --configuration laboratorio`).
 *
 * Igual que desarrollo, pero con las demostraciones habilitadas para abrir
 * `/simulador-unreal` con la sesión del laboratorio PS2 contra Unreal local.
 * Solo se sirve en http://127.0.0.1:4213 y nunca se despliega.
 *
 * No incluir credenciales ni secretos.
 */
export const environment = {
  personalQaHabilitado: true,
  /** Único entorno que combina demostraciones y Unreal local (ver entorno-laboratorio.spec.ts). */
  demostracionesHabilitadas: true,
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
