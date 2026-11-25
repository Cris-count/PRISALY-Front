import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';
import { mapeoConHabilitacionQa } from './habilitacion-qa-navegacion';

/**
 * Requisito de acceso a una ruta de personal. Solo lo fija Dirección Central con Ingrid Backend.
 * Admite tres modalidades, siempre explícitas:
 *
 * - **Permiso**: `permisos` exige todos los códigos indicados en `PersonalMeResponse.permisos`.
 * - **Rol** (FE-58): `rol` exige que `PersonalMeResponse.rol` coincida exactamente (como
 *   `AdministracionIdentidadService.exigirAdministrador`, que compara con `equals`). Ningún permiso
 *   individual sustituye al rol: con rol y permisos se exigen ambos.
 * - **Sesión** (FE-58-05): `sesion: true` exige solo una identidad de personal autenticada y
 *   válida. Debe declararse expresamente y no puede combinarse con rol ni permisos; no autoriza
 *   operaciones, que siguen dependiendo del Backend.
 *
 * Un requisito sin modalidad, con valores vacíos, combinaciones no admitidas o valores
 * desconocidos se trata como no aprobado (denegación por defecto).
 */
export interface RequisitoRutaAprobado {
  readonly permisos: readonly string[];
  readonly rol?: string | null;
  readonly sesion?: true;
}

/**
 * Entrada de conciliación ruta–permiso (FE-54, ampliada en FE-58-05).
 *
 * Separa los estados que la resolución exige no confundir:
 * - `aprobado`: requisito aprobado por Dirección Central (`null` si no existe).
 * - `habilitada`: habilitación efectiva de la navegación. Solo `true` permite entrar; mientras sea
 *   `false`, una ruta con requisito aprobado queda «preparada» y el guard la bloquea.
 * - `resolucion` y `verificacionQa`: trazabilidad informativa; nunca conceden acceso.
 *
 * `permisosBackend` y `rolBackend` documentan lo que el Backend `773818c` exige en las operaciones
 * de la pantalla; son información de presentación y nunca conceden acceso.
 */
export interface MapeoRutaPersonal {
  readonly ruta: string;
  readonly permisosBackend: readonly string[];
  /** Requisito de rol exigido por el Backend (administración M1); informativo. */
  readonly rolBackend: string | null;
  /** `null` mientras no exista una asociación oficial aprobada. */
  readonly aprobado: RequisitoRutaAprobado | null;
  /** Habilitación efectiva; independiente de la aprobación. */
  readonly habilitada: boolean;
  /** Resolución que aprobó el requisito, si existe (informativo). */
  readonly resolucion: string | null;
  /** Estado de la verificación QA exigida antes de habilitar (informativo). */
  readonly verificacionQa: 'no-aplica' | 'pendiente' | 'verificada';
}

const RESOLUCION_FE58 = 'DC-FE-58-RESOLUCION-04';

/**
 * Matriz aprobada por Dirección Central (DC-FE-58-RESOLUCION-04) incorporada como requisito.
 * **Ninguna ruta está habilitada**: la resolución exige completar la verificación QA y obtener la
 * autorización de habilitación. Activar una ruta exige cambiar `habilitada` en revisión.
 */
export const MAPEO_RUTAS_PERSONAL_OFICIAL: Readonly<Record<string, MapeoRutaPersonal>> = {
  'usuarios-docentes': {
    ruta: 'usuarios-docentes',
    permisosBackend: [],
    rolBackend: 'ADMINISTRADOR',
    aprobado: { rol: 'ADMINISTRADOR', permisos: [] },
    habilitada: false,
    resolucion: RESOLUCION_FE58,
    verificacionQa: 'pendiente',
  },
  'casos-academicos': {
    ruta: 'casos-academicos',
    permisosBackend: ['CREAR_CASO', 'CONSULTAR_CASO', 'MODIFICAR_CASO', 'PUBLICAR_CASO'],
    rolBackend: null,
    aprobado: { permisos: ['CONSULTAR_CASO'] },
    habilitada: false,
    resolucion: RESOLUCION_FE58,
    verificacionQa: 'pendiente',
  },
  rubricas: {
    ruta: 'rubricas',
    permisosBackend: ['CONSULTAR_CASO', 'MODIFICAR_CASO'],
    rolBackend: null,
    aprobado: { permisos: ['CONSULTAR_CASO'] },
    habilitada: false,
    resolucion: RESOLUCION_FE58,
    verificacionQa: 'pendiente',
  },
  sesiones: {
    ruta: 'sesiones',
    permisosBackend: ['GESTIONAR_SESION'],
    rolBackend: null,
    aprobado: { permisos: ['GESTIONAR_SESION'] },
    habilitada: false,
    resolucion: RESOLUCION_FE58,
    verificacionQa: 'pendiente',
  },
  convocatorias: {
    ruta: 'convocatorias',
    permisosBackend: ['GESTIONAR_SESION'],
    rolBackend: null,
    aprobado: { permisos: ['GESTIONAR_SESION'] },
    habilitada: false,
    resolucion: RESOLUCION_FE58,
    verificacionQa: 'pendiente',
  },
  configuracion: {
    ruta: 'configuracion',
    permisosBackend: [],
    rolBackend: null,
    aprobado: { sesion: true, permisos: [] },
    habilitada: false,
    resolucion: RESOLUCION_FE58,
    verificacionQa: 'pendiente',
  },
};

export const MAPEO_RUTAS_PERSONAL = new InjectionToken<Readonly<Record<string, MapeoRutaPersonal>>>(
  'MAPEO_RUTAS_PERSONAL',
  {
    providedIn: 'root',
    // Solo `qa-navegacion` (QA no productivo con lista explícita) habilita rutas autorizadas.
    factory: () => mapeoConHabilitacionQa(MAPEO_RUTAS_PERSONAL_OFICIAL, environment),
  },
);

export type DecisionRuta =
  'sin-sesion' | 'pendiente' | 'preparada' | 'rol-insuficiente' | 'insuficiente' | 'autorizada';

const codigoValido = (v: unknown): v is string =>
  typeof v === 'string' && v.trim() === v && v !== '';

type Modalidad =
  | { readonly tipo: 'sesion' }
  | { readonly tipo: 'exige'; readonly rol: string | null; readonly permisos: readonly string[] };

/**
 * Valida la forma del requisito. Devuelve `null` (no aprobado) ante cualquier ambigüedad: requisito
 * vacío, códigos mal formados, `permisos` que no es una lista, `sesion` distinto de `true` o
 * combinado con rol o permisos.
 */
export function modalidadRequisito(
  requisito: RequisitoRutaAprobado | null | undefined,
): Modalidad | null {
  if (!requisito || !Array.isArray(requisito.permisos)) return null;
  if (Object.keys(requisito).some((clave) => !['permisos', 'rol', 'sesion'].includes(clave)))
    return null;
  // Array.from materializa huecos como undefined: every los omitiría y podría autorizar.
  const permisos = Array.from(requisito.permisos);
  if (!permisos.every(codigoValido)) return null;
  const rol = requisito.rol ?? null;
  if (rol !== null && !codigoValido(rol)) return null;
  const sesion = (requisito as { sesion?: unknown }).sesion;
  if (sesion !== undefined) {
    return sesion === true && rol === null && permisos.length === 0 ? { tipo: 'sesion' } : null;
  }
  if (rol === null && permisos.length === 0) return null;
  return { tipo: 'exige', rol, permisos };
}

/**
 * Decisión pura de navegación. Una ruta sin entrada, sin aprobación o con requisito mal formado
 * queda pendiente; con requisito aprobado pero sin habilitación efectiva queda preparada. Nunca se
 * autoriza por omisión, por rol ni por los permisos documentados del Backend. Sin comprobador de
 * rol, un requisito de rol se deniega (restrictivo por defecto).
 */
export function decidirRuta(
  mapeo: MapeoRutaPersonal | undefined,
  sesionValida: boolean,
  tienePermisos: (permisos: readonly string[]) => boolean,
  tieneRol: (rol: string) => boolean = () => false,
): DecisionRuta {
  if (!sesionValida) return 'sin-sesion';
  const modalidad = modalidadRequisito(mapeo?.aprobado);
  if (!modalidad) return 'pendiente';
  if (mapeo?.habilitada !== true) return 'preparada';
  if (modalidad.tipo === 'sesion') return 'autorizada';
  if (modalidad.rol !== null && !tieneRol(modalidad.rol)) return 'rol-insuficiente';
  if (modalidad.permisos.length > 0 && !tienePermisos(modalidad.permisos)) return 'insuficiente';
  return 'autorizada';
}

/** Parámetro `aviso` de `/dashboard` para cada decisión denegada. */
export function avisoDeDecision(decision: DecisionRuta): string {
  switch (decision) {
    case 'insuficiente':
      return 'permiso-insuficiente';
    case 'rol-insuficiente':
      return 'rol-insuficiente';
    case 'preparada':
      return 'habilitacion-pendiente';
    default:
      return 'permisos-pendientes';
  }
}

/** Avisos de la ruta de retorno `/dashboard?aviso=...`. Solo se muestran claves conocidas. */
export const AVISOS_ACCESO: Readonly<Record<string, string>> = {
  'permisos-pendientes':
    'Esta sección requiere la asociación oficial entre ruta y permiso, pendiente de aprobación por Dirección Central e Ingrid Backend. No se habilitó ningún acceso provisional.',
  'habilitacion-pendiente':
    'Dirección Central aprobó el requisito de esta sección, pero su habilitación sigue pendiente de la verificación QA y de la autorización correspondiente. No se habilitó ningún acceso provisional.',
  'permiso-insuficiente':
    'Tu sesión no tiene los permisos aprobados para esta sección. La autorización final corresponde al Backend.',
  'rol-insuficiente':
    'Esta sección exige un rol aprobado que tu sesión no tiene. Los permisos individuales no sustituyen al rol; la autorización final corresponde al Backend.',
  'verificacion-no-disponible':
    'No fue posible confirmar con el servidor que tus permisos siguen vigentes. Inténtalo de nuevo; no se concede acceso con datos no verificados.',
  'acceso-retirado':
    'Tu autorización para la sección abierta dejó de estar vigente según el servidor. Se cerró la pantalla para no mostrar datos sin autorización.',
  'demostracion-no-autorizada':
    'Las demostraciones solo están disponibles en el entorno de demostración autorizado.',
};
