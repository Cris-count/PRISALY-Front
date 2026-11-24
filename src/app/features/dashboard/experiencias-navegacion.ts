import { MAPEO_RUTAS_PERSONAL_OFICIAL } from '../autenticacion/m1-mapeo-rutas';

/** Experiencia de navegación. No concede permisos: el guard FE-58 sigue decidiendo. */
export type ExperienciaId = 'administrador' | 'docente';

/**
 * Entrada de menú. `aviso` distinto de null significa que la operación no está habilitada:
 * el enlace vuelve al inicio con ese aviso y no abre la pantalla protegida.
 */
export interface EntradaExperiencia {
  readonly titulo: string;
  readonly descripcion: string;
  /** Trazo del icono, el mismo lenguaje visual del menú público. */
  readonly icono: string;
  /** Segmento bajo `/dashboard`. `null` es el inicio de la experiencia. */
  readonly ruta: string | null;
  readonly aviso: 'habilitacion-pendiente' | 'permisos-pendientes' | null;
}

const bloqueada = (
  titulo: string,
  descripcion: string,
  ruta: string,
  icono: string,
): EntradaExperiencia => ({
  titulo,
  descripcion,
  icono,
  ruta,
  aviso:
    MAPEO_RUTAS_PERSONAL_OFICIAL[ruta]?.habilitada === true
      ? null
      : MAPEO_RUTAS_PERSONAL_OFICIAL[ruta]
        ? 'habilitacion-pendiente'
        : 'permisos-pendientes',
});

/** Gestión institucional. El rol no abre casos ni sesiones. */
export const MENU_ADMINISTRADOR: readonly EntradaExperiencia[] = [
  {
    titulo: 'Inicio',
    descripcion: 'Resumen institucional. Los indicadores sin contrato no muestran cifras.',
    icono: 'M3 10 12 3l9 7v11h-7v-7h-4v7H3z',
    ruta: null,
    aviso: null,
  },
  bloqueada(
    'Gestión de docentes',
    'Navegación abierta. El alta real sigue en M1: no hay contraseña predeterminada ni D-05.',
    'usuarios-docentes',
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  ),
  bloqueada(
    'Gestión de estudiantes',
    'Navegación abierta. El listado institucional no tiene contrato y DD-02 sigue apagado.',
    'estudiantes',
    'M2 9 12 4l10 5-10 5L2 9M6 11v6c4 3 8 3 12 0v-6M22 9v8',
  ),
  bloqueada(
    'Vista general',
    'Supervisión de áreas. Un indicador sin API no bloquea la pantalla ni concede edición.',
    'vista-general',
    'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  ),
  bloqueada(
    'Configuración',
    'Pantalla de sesión. Entrar aquí no abre todas las funciones administrativas.',
    'configuracion',
    'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  ),
  bloqueada(
    'Mi perfil',
    'Nombre, correo y rol de la sesión confirmada. Sin token ni hash de contraseña.',
    'mi-perfil',
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0',
  ),
];

/** Actividad académica del docente autenticado. Consultar no autoriza crear ni publicar. */
export const MENU_DOCENTE: readonly EntradaExperiencia[] = [
  {
    titulo: 'Inicio',
    descripcion: 'Casos, sesiones y convocatorias de tu alcance. Consultar no autoriza crear ni publicar.',
    icono: 'M3 10 12 3l9 7v11h-7v-7h-4v7H3z',
    ruta: null,
    aviso: null,
  },
  bloqueada(
    'Casos académicos',
    'Consultar exige CONSULTAR_CASO. Crear, editar y publicar son operaciones distintas y no están habilitadas.',
    'casos-academicos',
    'M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3',
  ),
  bloqueada(
    'Rúbricas',
    'Criterios del caso. No calcula calificaciones de M6.',
    'rubricas',
    'M9 3H4v18h16V3h-5M9 2h6v4H9zM8 11h8M8 16h8',
  ),
  bloqueada(
    'Sesiones',
    'Programación M4. Exige GESTIONAR_SESION y un caso publicado.',
    'sesiones',
    'M3 5h18v16H3zM7 2v6M17 2v6M3 10h18M7 14h3M14 14h3M7 17h3',
  ),
  bloqueada(
    'Convocatorias',
    'Registro de convocatoria. Un alta no significa que el correo se entregó.',
    'convocatorias',
    'M3 10v4h5l11 5V5L8 10H3M8 14l2 7h4l-3-6M22 9v6',
  ),
  bloqueada(
    'Mi perfil',
    'Datos de la cuenta de personal autenticada.',
    'mi-perfil',
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0',
  ),
];

/**
 * Recorrido estudiantil de demostración. No es un rol de `/me` ni usa el Bearer de personal.
 * Las secciones viven en `/dashboard/estudiante`; no consultan convocatorias.
 */
export const MENU_ESTUDIANTE_DEMO: readonly { titulo: string; ancla: string }[] = [
  { titulo: 'Mi espacio de aprendizaje', ancla: 'bienvenida-estudiante' },
  { titulo: 'Mi perfil', ancla: 'titulo-perfil-estudiante' },
  { titulo: 'Sesiones académicas', ancla: 'sesiones-estudiante' },
  { titulo: 'Convocatorias', ancla: 'convocatorias-estudiante' },
  { titulo: 'Participaciones académicas', ancla: 'participaciones-estudiante' },
  { titulo: 'Notificaciones', ancla: 'titulo-notificaciones' },
  { titulo: 'Recorrido estudiantil', ancla: 'titulo-recorrido-visual' },
  { titulo: 'Simulador', ancla: 'titulo-entrada' },
];

/** Solo los roles de personal reconocidos. Cualquier otro valor no abre un menú ajeno. */
export function experienciaDeRol(rol: string | null | undefined): ExperienciaId | null {
  if (rol === 'ADMINISTRADOR') return 'administrador';
  if (rol === 'DOCENTE') return 'docente';
  return null;
}

export function menuDeRol(rol: string | null | undefined): readonly EntradaExperiencia[] {
  switch (experienciaDeRol(rol)) {
    case 'administrador':
      return MENU_ADMINISTRADOR;
    case 'docente':
      return MENU_DOCENTE;
    default:
      return [];
  }
}
