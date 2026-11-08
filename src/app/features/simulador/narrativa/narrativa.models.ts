import { EscenarioVista } from '../models/simulador.models';

/** Modelo local de presentación. No es una ampliación de BD-005.2 ni de M5. */
export type Expresion = 'serena' | 'atenta' | 'alegre';
export interface PersonajeNarrativo {
  readonly id: string;
  readonly nombre: string;
  readonly estado: string;
  readonly expresion: Expresion;
}
export interface CondicionNarrativa {
  readonly marca: string;
  readonly valor: boolean;
}
/** Lista cerrada: no admite callbacks, respuestas, puntajes ni efectos académicos. */
export type ConsecuenciaNarrativa =
  | { readonly tipo: 'marca'; readonly marca: string; readonly valor: boolean }
  | { readonly tipo: 'personaje'; readonly personajeId: string;
      readonly estado: string; readonly expresion: Expresion };
export interface DialogoNarrativo {
  readonly personajeId: string;
  readonly texto: string;
  readonly condicion?: CondicionNarrativa;
}
export interface RutaNarrativa {
  readonly destino: string;
  readonly texto: string;
  readonly condicion?: CondicionNarrativa;
}
export interface DecisionNarrativa {
  readonly id: string;
  readonly texto: string;
  readonly consecuencias: readonly ConsecuenciaNarrativa[];
  /** Primera ruta aplicable; la última siempre es una alternativa sin condición. */
  readonly rutas: readonly RutaNarrativa[];
}
export interface EscenaNarrativa {
  readonly id: string;
  readonly escenario: EscenarioVista;
  readonly dialogos: readonly DialogoNarrativo[];
  readonly alEntrar: readonly ConsecuenciaNarrativa[];
  /** Sin decisiones: cierre narrativo, independiente de la finalización del intento. */
  readonly decisiones: readonly DecisionNarrativa[];
}
export interface GuionNarrativo {
  readonly id: string;
  readonly inicio: string;
  readonly personajes: readonly PersonajeNarrativo[];
  readonly escenas: readonly EscenaNarrativa[];
}
export interface EstadoNarrativo {
  readonly escenaId: string;
  readonly dialogo: number;
  readonly marcas: Readonly<Record<string, boolean>>;
  readonly personajes: readonly PersonajeNarrativo[];
  readonly visitadas: readonly string[];
  readonly transicion: { readonly destino: string; readonly texto: string } | null;
}
