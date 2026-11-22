import { InjectionToken } from '@angular/core';

/**
 * Requisito de acceso a una ruta de personal. Solo lo fija Dirección Central con Ingrid Backend:
 * `permisos` exige todos los códigos indicados en `PersonalMeResponse.permisos`.
 */
export interface RequisitoRutaAprobado {
  readonly permisos: readonly string[];
}

/**
 * Entrada de conciliación ruta–permiso (FE-54).
 * `permisosBackend` documenta los códigos que el Backend `773818c` exige en las operaciones de la
 * pantalla; es información de presentación y nunca concede acceso. Solo `aprobado` se usa para
 * autorizar la navegación.
 */
export interface MapeoRutaPersonal {
  readonly ruta: string;
  readonly permisosBackend: readonly string[];
  /** Requisito de rol exigido por el Backend (administración M1); informativo. */
  readonly rolBackend: string | null;
  /** `null` mientras no exista una asociación oficial aprobada (BLQ-53-01). */
  readonly aprobado: RequisitoRutaAprobado | null;
}

/**
 * Estado oficial vigente: ninguna ruta tiene asociación aprobada. Al recibir el mapeo oficial basta
 * con completar `aprobado` en la entrada correspondiente; componentes y guard no cambian.
 */
export const MAPEO_RUTAS_PERSONAL_OFICIAL: Readonly<Record<string, MapeoRutaPersonal>> = {
  'usuarios-docentes': {
    ruta: 'usuarios-docentes',
    permisosBackend: [],
    rolBackend: 'ADMINISTRADOR',
    aprobado: null,
  },
  'casos-academicos': {
    ruta: 'casos-academicos',
    permisosBackend: ['CREAR_CASO', 'CONSULTAR_CASO', 'MODIFICAR_CASO', 'PUBLICAR_CASO'],
    rolBackend: null,
    aprobado: null,
  },
  rubricas: {
    ruta: 'rubricas',
    permisosBackend: ['CONSULTAR_CASO', 'MODIFICAR_CASO'],
    rolBackend: null,
    aprobado: null,
  },
  sesiones: {
    ruta: 'sesiones',
    permisosBackend: ['GESTIONAR_SESION'],
    rolBackend: null,
    aprobado: null,
  },
  convocatorias: {
    ruta: 'convocatorias',
    permisosBackend: ['GESTIONAR_SESION'],
    rolBackend: null,
    aprobado: null,
  },
  configuracion: {
    ruta: 'configuracion',
    permisosBackend: [],
    rolBackend: null,
    aprobado: null,
  },
};

export const MAPEO_RUTAS_PERSONAL = new InjectionToken<Readonly<Record<string, MapeoRutaPersonal>>>(
  'MAPEO_RUTAS_PERSONAL',
  { providedIn: 'root', factory: () => MAPEO_RUTAS_PERSONAL_OFICIAL },
);

export type DecisionRuta = 'sin-sesion' | 'pendiente' | 'insuficiente' | 'autorizada';

/**
 * Decisión pura de navegación. Una ruta sin entrada, sin aprobación o con requisito vacío queda
 * pendiente: nunca se autoriza por omisión, por rol ni por los permisos documentados del Backend.
 */
export function decidirRuta(
  mapeo: MapeoRutaPersonal | undefined,
  sesionValida: boolean,
  tienePermisos: (permisos: readonly string[]) => boolean,
): DecisionRuta {
  if (!sesionValida) return 'sin-sesion';
  const requisito = mapeo?.aprobado;
  if (!requisito || requisito.permisos.length === 0) return 'pendiente';
  return tienePermisos(requisito.permisos) ? 'autorizada' : 'insuficiente';
}

/** Avisos de la ruta de retorno `/dashboard?aviso=...`. */
export const AVISOS_ACCESO: Readonly<Record<string, string>> = {
  'permisos-pendientes':
    'Esta sección requiere la asociación oficial entre ruta y permiso, pendiente de aprobación por Dirección Central e Ingrid Backend. No se habilitó ningún acceso provisional.',
  'permiso-insuficiente':
    'Tu sesión no tiene los permisos aprobados para esta sección. La autorización final corresponde al Backend.',
};
