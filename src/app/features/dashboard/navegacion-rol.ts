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
