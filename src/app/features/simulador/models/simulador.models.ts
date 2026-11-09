/**
 * Modelos INTERNOS de presentación del simulador.
 *
 * No representan el contrato REST de M5 ni el modelo de M3: esos contratos
 * (ARQ-008.3 / OpenAPI) aún no existen. Cuando existan, un adaptador los
 * traducirá a estos modelos. Deliberadamente no contienen clave de
 * respuesta, puntaje, rúbrica ni retroalimentación.
 */

export interface OpcionVista {
  readonly id: string;
  readonly texto: string;
}

export interface PreguntaVista {
  readonly id: string;
  readonly enunciado: string;
  readonly opciones: readonly OpcionVista[];
}

export type TipoElementoEscena = 'persona' | 'objeto';

/** Elemento visual del escenario; `x` e `y` son porcentajes (0–100) del área. */
export interface ElementoEscena {
  readonly id: string;
  readonly etiqueta: string;
  readonly tipo: TipoElementoEscena;
  readonly x: number;
  readonly y: number;
}

export interface EscenarioVista {
  readonly titulo: string;
  readonly contexto: string;
  readonly elementos: readonly ElementoEscena[];
}

export interface CasoVista {
  readonly titulo: string;
  readonly escenario: EscenarioVista;
  readonly preguntas: readonly PreguntaVista[];
  /** Duración informativa; `null` si no hay límite conocido. */
  readonly duracionSegundos: number | null;
}

/** Estados de presentación del simulador (no son estados académicos del intento). */
export type FaseSimulador = 'inicio' | 'cargando' | 'en-curso' | 'confirmando' | 'finalizado' | 'error';

/** Origen de los datos que se muestran. */
export type OrigenDatos = 'demostracion' | 'm5';
