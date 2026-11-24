import { UsuarioDemoLocal } from '../app/features/autenticacion/usuarios-demo-locales';

/** Opt-in QA de personal. Sin proxy inventado ni credenciales. No modifica producción. */
export const environment = {
  production: false,
  personalQaHabilitado: true,
  /** H-58-01: QA no equivale a demostración; las demostraciones siguen bloqueadas. */
  demostracionesHabilitadas: false,
  apiBaseUrl: 'http://localhost:18094/api',
  /** QA usa el backend. No mezcla las cuentas locales de presentación. */
  usuariosDemo: [] as readonly UsuarioDemoLocal[],
};
