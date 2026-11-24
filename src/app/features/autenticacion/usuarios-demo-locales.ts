/** Cuenta local de presentación. No existe en el servidor y no abre operaciones de M1–M7. */
export interface UsuarioDemoLocal {
  readonly correo: string;
  readonly clave: string;
  readonly nombre: string;
  readonly rol: 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE';
  readonly espacio: string;
  /** Códigos que el guard usa solo para abrir pantallas. No son un Bearer ni un alta en M1. */
  readonly permisos: readonly string[];
}

/** Sesión en memoria, sin token ni contraseña. */
export interface SesionDemoLocal {
  readonly correo: string;
  readonly nombre: string;
  readonly rol: UsuarioDemoLocal['rol'];
  readonly espacio: string;
  readonly permisos: readonly string[];
}

/** Cuentas desechables. Solo las incluyen los entornos development y demo, nunca producción. */
export const USUARIOS_DEMO_LOCALES: readonly UsuarioDemoLocal[] = [
  {
    correo: 'admin.demo@prisaly.local',
    clave: 'DemoLocal!234',
    nombre: 'Administrador demo',
    rol: 'ADMINISTRADOR',
    espacio: 'Administrador',
    permisos: [],
  },
  {
    correo: 'docente.demo@prisaly.local',
    clave: 'DemoLocal!234',
    nombre: 'Docente demo',
    rol: 'DOCENTE',
    espacio: 'Docente',
    permisos: ['CONSULTAR_CASO', 'GESTIONAR_SESION'],
  },
  {
    correo: 'estudiante.demo@prisaly.local',
    clave: 'DemoLocal!234',
    nombre: 'Estudiante demo',
    rol: 'ESTUDIANTE',
    espacio: 'Mi espacio de aprendizaje',
    permisos: [],
  },
];
