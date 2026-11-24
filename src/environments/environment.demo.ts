import { USUARIOS_DEMO_LOCALES } from '../app/features/autenticacion/usuarios-demo-locales';

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
  usuariosDemo: USUARIOS_DEMO_LOCALES,
};
