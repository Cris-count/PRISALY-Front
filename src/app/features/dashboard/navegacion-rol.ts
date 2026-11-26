import { computed, inject, type Signal } from '@angular/core';
import { MAPEO_RUTAS_PERSONAL } from '../autenticacion/m1-mapeo-rutas';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import type { DecisionRuta, MapeoRutaPersonal } from '../autenticacion/m1-mapeo-rutas';
import { decidirRuta } from '../autenticacion/m1-mapeo-rutas';
import type { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import {
  DASHBOARD_ESTUDIANTE,
  DASHBOARD_SECCIONES,
  type DashboardSeccion,
} from './dashboard-secciones';

/**
 * DC-FE-UX-ROLES-24. Matriz de navegación por rol efectivo devuelto por `/v1/personal/me`.
 * Solo decide qué enlaces se muestran: ocultar un enlace no sustituye a los guards FE-58 ni a la
 * autorización del Backend. Comparación estricta del rol; nunca se infiere de correo, nombre o URL.
 */
export const MATRIZ_NAVEGACION_ROL: Readonly<Record<string, readonly string[]>> = {
  ADMINISTRADOR: ['usuarios-docentes', 'configuracion'],
  DOCENTE: ['casos-academicos', 'rubricas', 'sesiones', 'convocatorias'],
};

/**
 * Secciones visibles en QA de personal. Sin identidad válida (pendiente, expirada, cerrada) o con
 * un rol desconocido no se muestra ninguna sección. Una sección del rol solo aparece si la decisión
 * FE-58 sobre la identidad real es `autorizada`. «Mi espacio de aprendizaje» nunca aparece para
 * personal: el recorrido estudiantil es demostrativo y no forma parte de la sesión M1.
 */
export function seccionesPorRol(
  estado: EstadoSesionPersonal,
  mapeo: Readonly<Record<string, MapeoRutaPersonal>>,
): readonly DashboardSeccion[] {
  if (estado.tipo !== 'valida') return [];
  const { rol, permisos } = estado.identidad;
  if (typeof rol !== 'string' || rol.trim() !== rol || rol === '') return [];
  // Rol exacto ADMINISTRADOR → opciones administrativas. Cualquier otro rol de personal válido
  // (el QA actual devuelve un rol de semilla, p. ej. `DocenteBruno`) solo ve las secciones docentes
  // que sus permisos efectivos autorizan según FE-58. Nunca se infiere del correo ni del nombre.
  const delRol = MATRIZ_NAVEGACION_ROL[rol === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'DOCENTE'];
  const tiene = (requeridos: readonly string[]) => requeridos.every((p) => permisos.includes(p));
  const decision = (ruta: string): DecisionRuta =>
    decidirRuta(mapeo[ruta], true, tiene, (r) => r === rol);
  return DASHBOARD_SECCIONES.filter(
    (s) => delRol.includes(s.ruta) && decision(s.ruta) === 'autorizada',
  ).map((s) =>
    // DC-FE-60: etiqueta del panel administrador.
    rol === 'ADMINISTRADOR' && s.ruta === 'usuarios-docentes'
      ? { ...s, titulo: 'Gestión de usuarios' }
      : s,
  );
}

/** Navegación de presentación (demo / sin QA de personal): vistas demostrativas existentes. */
export const NAVEGACION_PRESENTACION: readonly DashboardSeccion[] = [
  ...DASHBOARD_SECCIONES,
  DASHBOARD_ESTUDIANTE,
];

/** `true` si alguna ruta de personal está efectivamente habilitada (solo `qa-navegacion`). */
export function hayRutasHabilitadas(mapeo: Readonly<Record<string, MapeoRutaPersonal>>): boolean {
  return Object.values(mapeo).some((m) => m.habilitada === true);
}

/**
 * DC-FE-UX-ROLES-24. `true` solo en QA de personal con rutas efectivamente habilitadas
 * (`qa-navegacion`) y una identidad de personal válida confirmada por `/me`. Las pantallas docentes
 * muestran entonces solo los paneles conectados al Backend y ocultan la maqueta de presentación.
 * No concede acceso: los guards y el Backend siguen decidiendo.
 */
export function crearModoDocenteOperativo(): Signal<boolean> {
  const qa = inject(M1_PERSONAL_LOCAL);
  const sesion = qa ? inject(SesionPersonalM1) : null;
  const habilitadas = hayRutasHabilitadas(inject(MAPEO_RUTAS_PERSONAL));
  return computed(() => habilitadas && sesion?.estado().tipo === 'valida');
}

/** Opción del menú lateral del espacio estudiantil demostrativo. */
export interface OpcionEstudiante {
  readonly titulo: string;
  readonly icono: string;
  /** Sección de la página `Mi espacio de aprendizaje` a la que se desplaza. */
  readonly ancla?: string;
  /** Ruta propia (visor de MUNDO-24, protegido por `requiereAccesoSimulador`). */
  readonly ruta?: string;
}

/**
 * Menú del espacio estudiantil (demostración; sin sesión M1). Solo opciones estudiantiles:
 * ni administración, ni casos, ni rúbricas. Las secciones son las de la propia página.
 */
export const NAVEGACION_ESTUDIANTE: readonly OpcionEstudiante[] = [
  {
    titulo: 'Mi espacio de aprendizaje',
    ruta: '/dashboard/estudiante',
    icono: 'M2 9 12 4l10 5-10 5L2 9M6 11v6c4 3 8 3 12 0v-6M22 9v8',
  },
  {
    titulo: 'Mis sesiones',
    ancla: 'sesiones-estudiante',
    icono: 'M3 5h18v16H3zM7 2v6M17 2v6M3 10h18M7 14h3M14 14h3M7 17h3',
  },
  {
    titulo: 'Mis convocatorias',
    ancla: 'convocatorias-estudiante',
    icono: 'M3 10v4h5l11 5V5L8 10H3M8 14l2 7h4l-3-6M22 9v6',
  },
  {
    titulo: 'Mis actividades',
    ancla: 'participaciones-estudiante',
    icono:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  },
  {
    titulo: 'Notificaciones',
    ancla: 'titulo-notificaciones',
    icono: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  },
  {
    titulo: 'Recorrido estudiantil',
    ancla: 'titulo-recorrido-visual',
    icono: 'M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4',
  },
  {
    titulo: 'Mi perfil',
    ruta: '/dashboard/perfil',
    icono: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10',
  },
  {
    titulo: 'Simulador',
    ruta: '/simulador-unreal',
    icono:
      'M6 11h4M8 9v4M15 12h.01M18 10h.01M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15a3 3 0 0 0 5.3 2.2L9 15h6l1.7 2.2A3 3 0 0 0 22 15l-.7-6.4a4 4 0 0 0-4-3.6',
  },
];
