import { CondicionNarrativa, ConsecuenciaNarrativa, DialogoNarrativo, Expresion } from './narrativa.models';

/** Documento M3 previamente validado; no sustituye la validación en el límite HTTP. */
export interface GuionM3 {
  readonly formato: 'prisaly-guion-1';
  readonly inicio: string;
  readonly espacios: readonly {
    readonly idEspacio: string; readonly titulo: string; readonly descripcion?: string | null;
    readonly recursoVisual?: string | null;
    readonly informaciones?: readonly { readonly idInformacion: string; readonly texto: string }[] | null;
    readonly accesos?: readonly { readonly destino: string; readonly texto: string }[] | null;
  }[];
  readonly personajes?: readonly {
    readonly idPersonaje: string; readonly nombre: string; readonly rol?: string | null;
    readonly recursoVisual?: string | null; readonly estadoInicial?: string | null;
    readonly expresionInicial?: Expresion | null;
  }[] | null;
  readonly intervenciones?: readonly {
    readonly idIntervencion: string; readonly idEspacio: string; readonly idPersonaje: string;
    readonly dialogos: readonly { readonly idPersonaje: string; readonly texto: string }[];
    readonly condicion?: CondicionNarrativa | null;
    readonly consecuencias?: readonly (
      | { readonly tipo: 'marca'; readonly marca: string; readonly valor: boolean }
      | { readonly tipo: 'personaje'; readonly idPersonaje: string; readonly estado: string; readonly expresion: Expresion }
    )[] | null;
  }[] | null;
}

/** Fragmentos compatibles con SIM-01, sin asignar escenas, decisiones ni efectos académicos. */
export interface IntervencionAdaptada {
  readonly id: string;
  readonly espacioId: string;
  readonly personajeId: string;
  readonly condicion?: CondicionNarrativa;
  readonly dialogos: readonly DialogoNarrativo[];
  readonly consecuencias: readonly ConsecuenciaNarrativa[];
}

/** Traduce solo campos equivalentes. El consumidor decide cuándo aplicar consecuencias. */
export function adaptarIntervencionesM3(guion: GuionM3): readonly IntervencionAdaptada[] {
  if (guion.formato !== 'prisaly-guion-1') throw new Error('Formato narrativo no compatible');
  return (guion.intervenciones ?? []).map(intervencion => ({
    id: intervencion.idIntervencion,
    espacioId: intervencion.idEspacio,
    personajeId: intervencion.idPersonaje,
    ...(intervencion.condicion ? { condicion: { ...intervencion.condicion } } : {}),
    dialogos: intervencion.dialogos.map(dialogo => ({ personajeId: dialogo.idPersonaje, texto: dialogo.texto })),
    consecuencias: (intervencion.consecuencias ?? []).map(efecto => {
      if (efecto.tipo === 'marca') return { tipo: 'marca' as const, marca: efecto.marca, valor: efecto.valor };
      if (efecto.tipo === 'personaje') return { tipo: 'personaje' as const, personajeId: efecto.idPersonaje, estado: efecto.estado, expresion: efecto.expresion };
      throw new Error('Consecuencia narrativa no compatible');
    }),
  }));
}
