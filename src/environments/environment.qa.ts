/** Opt-in QA de personal. Sin proxy inventado ni credenciales. No modifica producción. */
export const environment = {
  production: false,
  personalQaHabilitado: true,
  /** H-58-01: QA no equivale a demostración; las demostraciones siguen bloqueadas. */
  demostracionesHabilitadas: false,
  apiBaseUrl: 'http://localhost:18094/api',
  simuladorUnrealLocal: false,
};
