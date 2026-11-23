import type { MapeoRutaPersonal } from './m1-mapeo-rutas';

/**
 * DC-FULLSTACK-DEMO-URGENTE-03. Rutas docentes cuya integración con el Backend real se verificó
 * (DC-FULLSTACK-INTEGRACION-DOCENTE-01) y que Dirección Central autorizó habilitar **solo** en la
 * configuración local `qa-navegacion`. La administración de docentes no se incluye.
 */
export const RUTAS_AUTORIZADAS_QA_NAVEGACION: readonly string[] = [
  'casos-academicos',
  'rubricas',
  'sesiones',
  'convocatorias',
];

/** Forma mínima del `environment` que se inspecciona (se fija al compilar). */
export interface EntornoNavegacion {
  readonly production?: unknown;
  readonly personalQaHabilitado?: unknown;
  readonly rutasPersonalHabilitadasQa?: unknown;
}

/**
 * Devuelve el mapeo efectivo. Solo un build de QA no productivo (`production === false` y
 * `personalQaHabilitado === true`) que declare `rutasPersonalHabilitadasQa` puede habilitar rutas,
 * y únicamente las de `RUTAS_AUTORIZADAS_QA_NAVEGACION` con requisito aprobado. El requisito
 * (rol/permiso/sesión), los guards y la revalidación de `/me` no cambian: solo `habilitada`.
 * Cualquier otro entorno (producción, desarrollo, QA ordinario, demo) recibe el mapeo oficial.
 */
export function mapeoConHabilitacionQa(
  oficial: Readonly<Record<string, MapeoRutaPersonal>>,
  entorno: EntornoNavegacion,
): Readonly<Record<string, MapeoRutaPersonal>> {
  const lista = entorno.rutasPersonalHabilitadasQa;
  if (
    entorno.production !== false ||
    entorno.personalQaHabilitado !== true ||
    !Array.isArray(lista)
  )
    return oficial;
  const habilitar = new Set(
    lista.filter(
      (r): r is string =>
        typeof r === 'string' &&
        RUTAS_AUTORIZADAS_QA_NAVEGACION.includes(r) &&
        Object.hasOwn(oficial, r) &&
        oficial[r].aprobado !== null,
    ),
  );
  if (habilitar.size === 0) return oficial;
  const efectivo: Record<string, MapeoRutaPersonal> = {};
  for (const [ruta, mapeo] of Object.entries(oficial))
    efectivo[ruta] = habilitar.has(ruta) ? { ...mapeo, habilitada: true } : mapeo;
  return Object.freeze(efectivo);
}
