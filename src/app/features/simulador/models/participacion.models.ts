/** Estados de un intento tal como los devuelve M5 (`IntentosM5Dto.Intento`). */
export type EstadoIntentoM5 = 'EnCurso' | 'Finalizado';

/** `IntentosM5Dto.RespuestaGuardada`: respuesta propia con su revisión (D06). */
export interface RespuestaGuardadaM5 {
  readonly idPregunta: string;
  readonly idOpcionSeleccionada: string;
  readonly revision: number;
}

/** `IntentosM5Dto.Intento`: solo información de M5 (estado, tiempos y respuestas propias). */
export interface IntentoM5 {
  readonly idIntento: string;
  readonly estado: EstadoIntentoM5;
  readonly inicio: string;
  readonly limiteTemporal: string;
  readonly motivoFinalizacion: string | null;
  readonly respuestas: readonly RespuestaGuardadaM5[];
  readonly ahoraServidor: string;
}
