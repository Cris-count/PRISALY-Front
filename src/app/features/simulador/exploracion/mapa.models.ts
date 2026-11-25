import { TemplateRef } from '@angular/core';

/** IDs y coordenadas locales: no representan entidades M3 ni fases M5. */
export interface EspacioDemostrativo {
  readonly id: string;
  readonly nombre: string;
  readonly plantillaVisual: string;
  readonly posicion: { readonly x: number; readonly y: number };
  readonly disponible: boolean;
}
export interface ConfiguracionMapa {
  readonly id: string;
  readonly titulo: string;
  readonly espacios: readonly EspacioDemostrativo[];
}
export type FaseExploracion =
  'presentacion' | 'explorando' | 'confirmando' | 'cuestionario' | 'completado';
export interface ContextoExterior {
  readonly $implicit: EspacioDemostrativo;
  readonly seleccionado: boolean;
  readonly visitas: number;
}
export type EventoEspacioVisual =
  | { readonly tipo: 'interaccion-iniciada'; readonly espacioId: string }
  | { readonly tipo: 'interaccion-finalizada'; readonly espacioId: string }
  | { readonly tipo: 'salida-solicitada'; readonly espacioId: string };
export interface ContextoInterior {
  readonly $implicit: EspacioDemostrativo;
  readonly interaccionActiva: boolean;
  readonly emitir: (evento: EventoEspacioVisual) => void;
}
/** Contrato local propuesto para Cristian, sin dependencia del motor o del gateway. */
export interface PlantillasEspacio {
  readonly exterior?: TemplateRef<ContextoExterior>;
  readonly interior?: TemplateRef<ContextoInterior>;
}
