// DC-106: solo QA local autorizado. Sin credenciales, bypass ni activación productiva.
export const environment = {
  production: false,
  personalQaHabilitado: true,
  /** DC-115: bloque «Acceso rápido QA» en /acceso (requiere el endpoint QA del Backend, desactivado por defecto). */
  accesoRapidoQa: true,
  demostracionesHabilitadas: false,
  apiBaseUrl: '/api',
  simuladorUnrealLocal: false,
  rutasPersonalHabilitadasQa: [
    'usuarios-docentes',
    'configuracion',
    'casos-academicos',
    'rubricas',
    'sesiones',
    'convocatorias',
  ],
  capacidadesBackend: {
    altaEstudiantes: true,
    activacionDocente: true,
    consultaParticipaciones: true,
    reporteParticipacion: false,
    participacionHttp: false,
  },
};
