/**
 * DC-FULLSTACK-DEMO-URGENTE-03: configuración local `qa-navegacion`, exclusiva para la demostración
 * controlada contra el Backend QA real. Igual que QA ordinario, más la habilitación de las cuatro
 * rutas docentes verificadas. No es producción, ni QA ordinario, ni el entorno `demo`.
 * Sin credenciales ni secretos.
 */
export const environment = {
  production: false,
  personalQaHabilitado: true,
  demostracionesHabilitadas: false,
  apiBaseUrl: 'http://localhost:18094/api',
  rutasPersonalHabilitadasQa: [
    'usuarios-docentes',
    'configuracion',
    'casos-academicos',
    'rubricas',
    'sesiones',
    'convocatorias',
  ],
};
