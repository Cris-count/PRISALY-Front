export interface DashboardSeccion {
  ruta: string;
  titulo: string;
  descripcion: string;
  icono: string;
  alcance: readonly string[];
}

/** Contenido de presentación, sin registros ni métricas de actividad. */
export const DASHBOARD_SECCIONES: readonly DashboardSeccion[] = [
  {
    ruta: 'usuarios-docentes',
    titulo: 'Usuarios y docentes',
    descripcion: 'Un espacio para organizar la comunidad académica y sus responsabilidades.',
    icono:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    alcance: [
      'Organización de usuarios',
      'Vinculación de docentes',
      'Presentación de responsabilidades',
    ],
  },
  {
    ruta: 'casos-academicos',
    titulo: 'Casos académicos',
    descripcion:
      'Contextos y situaciones para explorar distintas perspectivas de la Psicología Social.',
    icono: 'M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3',
    alcance: [
      'Presentación de contextos',
      'Organización de casos situacionales',
      'Consulta de objetivos de aprendizaje',
    ],
  },
  {
    ruta: 'rubricas',
    titulo: 'Rúbricas',
    descripcion: 'Una visión organizada de los criterios que acompañan el aprendizaje.',
    icono: 'M9 3H4v18h16V3h-5M9 2h6v4H9zM8 11h8M8 16h8',
    alcance: [
      'Presentación de criterios',
      'Organización de dimensiones',
      'Consulta de descriptores',
    ],
  },
  {
    ruta: 'sesiones',
    titulo: 'Sesiones',
    descripcion: 'Un punto de encuentro para la planificación de experiencias académicas.',
    icono: 'M3 5h18v16H3zM7 2v6M17 2v6M3 10h18M7 14h3M14 14h3M7 17h3',
    alcance: [
      'Presentación de la planificación',
      'Organización de experiencias',
      'Consulta de información de sesiones',
    ],
  },
  {
    ruta: 'convocatorias',
    titulo: 'Convocatorias',
    descripcion: 'Un espacio para presentar oportunidades de participación académica.',
    icono: 'M3 10v4h5l11 5V5L8 10H3M8 14l2 7h4l-3-6M22 9v6',
    alcance: [
      'Presentación de convocatorias',
      'Organización de información',
      'Consulta de condiciones de participación',
    ],
  },
  {
    ruta: 'configuracion',
    titulo: 'Configuración',
    descripcion: 'La base visual para las futuras preferencias generales de la plataforma.',
    icono: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
    alcance: [
      'Presentación de preferencias',
      'Organización de opciones generales',
      'Consulta de información de la interfaz',
    ],
  },
];

/** Entrada de presentación propia; no forma parte de las vistas administrativas genéricas. */
export const DASHBOARD_ESTUDIANTE: DashboardSeccion = {
  ruta: 'estudiante',
  titulo: 'Mi espacio de aprendizaje',
  descripcion:
    'Conoce el futuro recorrido estudiantil: sesiones, convocatorias y participaciones académicas.',
  icono: 'M2 9 12 4l10 5-10 5L2 9M6 11v6c4 3 8 3 12 0v-6M22 9v8',
  alcance: [],
};

export const DASHBOARD_NAVEGACION = [...DASHBOARD_SECCIONES, DASHBOARD_ESTUDIANTE] as const;
