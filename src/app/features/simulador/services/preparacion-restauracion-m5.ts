import { EstadoIntentoM5, IntentoM5, RespuestaGuardadaM5 } from '../models/participacion.models';
import { EstadoSincronizacion, SeleccionAcademica } from './participacion.coordinador';

/**
 * DC-DEV-117. Separa el intento ya persistido de la memoria visual.
 * No define rutas ni DTO de notas, pistas, edificios, zonas o fase: eso espera DC-DEV-116.
 */

/** Lo que el GET de intento ya puede devolver. */
export interface EstadoPersistidoIntento {
  readonly origen: 'backend';
  readonly idIntento: string;
  readonly estado: EstadoIntentoM5;
  readonly respuestas: readonly RespuestaGuardadaM5[];
}

/** Elección aún no confirmada por un PUT. Vive solo en el coordinador. */
export interface EstadoAcademicoMemoria {
  readonly origen: 'memoria';
  readonly seleccionPendiente: SeleccionAcademica | null;
  readonly sincronizacion: EstadoSincronizacion;
}

/**
 * Hueco explícito. Cada campo queda vacío hasta el contrato.
 * No se rellena con el intento ni con la libreta de demostración.
 */
export interface EstadoVisualPendiente {
  readonly origen: 'contrato-pendiente';
  readonly notas: null;
  readonly pistas: null;
  readonly edificiosVisitados: null;
  readonly zonasExploradas: null;
  readonly faseActual: null;
}

export interface EstadosSeparados {
  readonly persistido: EstadoPersistidoIntento | null;
  readonly academico: EstadoAcademicoMemoria;
  readonly visual: EstadoVisualPendiente;
}

export type MomentoRestauracion =
  | 'inactivo'
  | 'primer-ingreso'
  | 'recarga'
  | 'reconexion'
  | 'conflicto'
  | 'finalizado'
  | 'error';

const VISUAL_PENDIENTE: EstadoVisualPendiente = {
  origen: 'contrato-pendiente',
  notas: null,
  pistas: null,
  edificiosVisitados: null,
  zonasExploradas: null,
  faseActual: null,
};

/** Consultan el backend cuando `participacionHttp` esté autorizado. Hoy el gateway pendiente no llama. */
export const CONSULTAN_BACKEND = [
  'ParticipacionHttpGateway.consultarIntento',
  'ParticipacionHttpGateway.registrarRespuesta',
  'ParticipacionHttpGateway.consultarContenidoIntento',
] as const;

/** Se arman con la respuesta del intento, sin otro almacén. */
export const RECONSTRUYEN_DESDE_INTENTO = ['estado', 'respuestasConfirmadas'] as const;

/** Siguen en memoria o en el protocolo visual. No tienen contrato M5. */
export const ESPERAN_CONTRATO = [
  'notas',
  'pistas',
  'edificiosVisitados',
  'zonasExploradas',
  'faseActual',
] as const;

export function separarEstados(
  intento: IntentoM5 | null,
  seleccionPendiente: SeleccionAcademica | null,
  sincronizacion: EstadoSincronizacion,
): EstadosSeparados {
  return {
    persistido: intento
      ? {
          origen: 'backend',
          idIntento: intento.idIntento,
          estado: intento.estado,
          respuestas: intento.respuestas.map((r) => ({ ...r })),
        }
      : null,
    academico: { origen: 'memoria', seleccionPendiente, sincronizacion },
    visual: { ...VISUAL_PENDIENTE },
  };
}

export function momentoRestauracion(
  sincronizacion: EstadoSincronizacion,
  intento: IntentoM5 | null,
): MomentoRestauracion {
  if (sincronizacion === 'inactivo') return 'inactivo';
  if (sincronizacion === 'error') return 'error';
  if (sincronizacion === 'conflicto') return 'conflicto';
  if (sincronizacion === 'por-verificar') return 'reconexion';
  if (sincronizacion === 'finalizado' || intento?.estado === 'Finalizado') return 'finalizado';
  if (intento && intento.respuestas.length > 0) return 'recarga';
  return 'primer-ingreso';
}

/** Misma regla que el coordinador: solo un intento en curso ya leído admite otra escritura. */
export function admiteEscritura(
  sincronizacion: EstadoSincronizacion,
  estado: EstadoIntentoM5 | null,
): boolean {
  return (
    (sincronizacion === 'disponible' || sincronizacion === 'guardada') && estado === 'EnCurso'
  );
}

/** La selección local no coincide con la respuesta ya persistida: hay que volver a guardar a propósito. */
export function hayConflictoDeRevision(
  respuestas: readonly RespuestaGuardadaM5[],
  pendiente: SeleccionAcademica | null,
): boolean {
  if (!pendiente) return false;
  const previa = respuestas.find((r) => r.idPregunta === pendiente.idPregunta);
  return previa !== undefined && previa.idOpcionSeleccionada !== pendiente.idOpcionSeleccionada;
}
