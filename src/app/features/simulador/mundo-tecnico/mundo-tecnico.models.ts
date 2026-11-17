/** Geometría técnica local; no es un contrato académico ni de Backend. */
export interface Punto { readonly x: number; readonly y: number }
export interface Rectangulo extends Punto { readonly ancho: number; readonly alto: number }
export interface Nodo { readonly id: string; readonly posicion: Punto }
export interface Camino { readonly desde: string; readonly hasta: string }
export interface EdificioTecnico { readonly id: string; readonly nombre: string; readonly plantillaVisual: string; readonly area: Rectangulo; readonly entrada: string; readonly salida: string }
export interface PuntoAccesoCuestionario {
  readonly id: string;
  readonly nombre: string;
  readonly nodo: string;
  readonly posicion: Punto;
  readonly radioInteraccion: number;
}
export interface MundoTecnico {
  readonly id: string; readonly version: number; readonly dimensiones: { readonly ancho: number; readonly alto: number };
  readonly zonasTransitables: readonly Rectangulo[]; readonly obstaculos: readonly Rectangulo[];
  readonly nodos: readonly Nodo[]; readonly caminos: readonly Camino[];
  readonly edificios: readonly EdificioTecnico[]; readonly inicio: string;
  readonly puntosSeguros: readonly string[]; readonly radioPersonaje: number;
  readonly plazaCentral?: PuntoAccesoCuestionario;
}
export type EventoMundo =
  | { readonly tipo: 'listo'; readonly posicion: Punto }
  | { readonly tipo: 'moviendo'; readonly destino: Punto }
  | { readonly tipo: 'llegada'; readonly posicion: Punto; readonly entradaId: string | null; readonly puntoAccesoId?: string | null }
  | { readonly tipo: 'rechazado'; readonly motivo: 'fuera-de-camino' | 'en-movimiento' | 'inalcanzable' };

/** Transiciones locales, sin implicaciones académicas. */
export type EventoTransicion = { readonly tipo: 'entrada-solicitada' | 'entrada-autorizada' | 'interior-abierto' | 'salida-solicitada' | 'regreso-mapa'; readonly edificioId: string };
