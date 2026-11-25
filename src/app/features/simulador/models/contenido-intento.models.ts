/** Proyección estudiantil integrada en Backend bf47bdd3 (#88); sin guion ni evaluación. */
export interface ContenidoIntentoM5 {
  readonly idIntento: string;
  readonly idSesion: string;
  readonly caso: CasoContenidoM5;
}

export interface CasoContenidoM5 {
  readonly idCaso: string;
  readonly titulo: string;
  readonly historia: string | null;
  readonly desarrolloSituacional: string | null;
  readonly escenarios: readonly EscenarioContenidoM5[];
}

export interface EscenarioContenidoM5 {
  readonly idEscenario: string;
  readonly titulo: string | null;
  readonly contexto: string | null;
  readonly instrucciones: string | null;
  readonly orden: number;
  readonly preguntas: readonly PreguntaContenidoM5[];
}

export interface PreguntaContenidoM5 {
  readonly idPregunta: string;
  readonly enunciado: string;
  readonly orden: number;
  readonly opciones: readonly OpcionContenidoM5[];
}

export interface OpcionContenidoM5 {
  readonly idOpcion: string;
  readonly texto: string;
  readonly orden: number;
}
