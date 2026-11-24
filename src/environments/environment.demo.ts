/**
 * H-58-01 (opción B, DC-FE-58-RESOLUCION-04): entorno de demostración identificado expresamente
 * (`ng build --configuration demo`). Solo presentación con datos ficticios: sin sesión de personal,
 * sin interceptores académicos y sin URL de backend real. No es QA ni producción.
 */
export const environment = {
  personalQaHabilitado: false,
  demostracionesHabilitadas: true,
  production: false,
  apiBaseUrl: '/api',
  /**
   * DC-FULLSTACK-DEMO-ESTUDIANTE-04: entrada estudiantil demostrativa (verificación local, sin
   * Backend). Solo el hash SHA-256 de la clave de prueba; nunca la clave en claro.
   */
  estudianteDemo: {
    correo: 'estudiante.demo@prisaly.local',
    hashClave: '46d374f5a394e3652e67573c606d2ffeafb169b3759cec9880d55f781c46dc47',
  },
};
