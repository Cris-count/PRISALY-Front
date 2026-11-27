/**
 * CB-07 (DC-CB-AVANCE-08 §3): adaptador PURO entre los hechos del simulador y los eventos de investigación A1.
 *
 * - Solo traduce a identificadores del guion fijado en el intento (`idEspacio`, `idInformacion`, `idIntervencion`,
 *   marcas). Un hecho sin correspondencia en el guion no produce evento: nunca se envían nombres libres ni ids de Unreal.
 * - Es una **propuesta**: la autoridad académica es M5, que valida titularidad, fase, guion e idempotencia
 *   (`InvestigacionA1`, Backend `84f520c`). Unreal no decide qué información se obtuvo.
 * - Sin transporte HTTP ni persistencia (pendientes de los contratos de M5 y de D-ESQ-1). Sin `localStorage`.
 */
import type { GuionM3 } from '../narrativa/adaptador-guion-m3';
import type { CatalogoVisual } from './caso-visual';
import type { Mensaje } from './protocolo/validador-mensaje';

export type TipoEventoA1 = 'espacio.visitado' | 'informacion.obtenida' | 'intervencion.completada' | 'marca.fijada';

/** Hechos que el Front observa (de Unreal o del motor narrativo). */
export type HechoSimulador =
  | { readonly tipo: 'interior.entrado'; readonly zoneId: string }
  | { readonly tipo: 'conversacion.terminada'; readonly npcId: string }
  | { readonly tipo: 'informacion.mostrada'; readonly idInformacion: string }
  | { readonly tipo: 'marca.aplicada'; readonly marca: string; readonly valor: boolean };

/** Cuerpo propuesto para `POST …/investigacion/eventos` (contrato candidato, solicitud única §6). */
export interface EventoA1Propuesto {
  readonly idEvento: string;
  readonly tipo: TipoEventoA1;
  readonly referencia: string;
  readonly valor?: boolean;
  readonly hashDefinicion: string;
}

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HASH = /^[0-9a-f]{64}$/;

/**
 * Traduce un hecho a cero o más eventos A1. `nuevoId` genera la clave de idempotencia (UUID v4); se inyecta para
 * poder probar el resultado. `hashDefinicion` es el de la narrativa fijada (P1 de M5).
 */
export function eventosDesdeHecho(
  hecho: HechoSimulador,
  guion: GuionM3,
  catalogo: CatalogoVisual,
  hashDefinicion: string,
  nuevoId: () => string = () => crypto.randomUUID(),
): EventoA1Propuesto[] {
  if (!HASH.test(hashDefinicion)) throw new Error('hashDefinicion inválido');
  const evento = (tipo: TipoEventoA1, referencia: string, valor?: boolean): EventoA1Propuesto | null =>
    ID.test(referencia) ? { idEvento: nuevoId(), tipo, referencia, ...(valor === undefined ? {} : { valor }), hashDefinicion } : null;
  const listo = (e: (EventoA1Propuesto | null)[]) => e.filter((x): x is EventoA1Propuesto => x !== null);

  switch (hecho.tipo) {
    case 'interior.entrado': {
      const edificio = catalogo.edificios.find((e) => e.zoneId === hecho.zoneId);
      const espacio = edificio && guion.espacios.find((e) => e.recursoVisual === edificio.clave);
      return espacio ? listo([evento('espacio.visitado', espacio.idEspacio)]) : [];
    }
    case 'conversacion.terminada': {
      const puesto = catalogo.puestos.find((p) => p.npcId === hecho.npcId);
      const personaje = puesto && (guion.personajes ?? []).find((p) => p.recursoVisual === puesto.clave);
      if (!personaje) return [];
      const espacio = guion.espacios.find((e) => e.recursoVisual === puesto.edificio);
      return listo((guion.intervenciones ?? [])
        .filter((i) => i.idPersonaje === personaje.idPersonaje && (!espacio || i.idEspacio === espacio.idEspacio))
        .map((i) => evento('intervencion.completada', i.idIntervencion)));
    }
    case 'informacion.mostrada': {
      const existe = guion.espacios.some((e) => (e.informaciones ?? []).some((i) => i.idInformacion === hecho.idInformacion));
      return existe ? listo([evento('informacion.obtenida', hecho.idInformacion)]) : [];
    }
    case 'marca.aplicada': {
      const marcas = new Set((guion.intervenciones ?? []).flatMap((i) => [
        ...(i.condicion && 'marca' in i.condicion && typeof i.condicion.marca === 'string' ? [i.condicion.marca] : []),
        ...(i.consecuencias ?? []).filter((c) => c.tipo === 'marca').map((c) => (c as { marca: string }).marca),
      ]));
      return marcas.has(hecho.marca) ? listo([evento('marca.fijada', hecho.marca, hecho.valor)]) : [];
    }
  }
}

/**
 * El único hecho académico que sale de un mensaje de Unreal (ya validado por el puente y del contexto vigente): la
 * entrada confirmada a un interior (`edificio.entro`). El cierre de una conversación (`conversacion.terminada`), la
 * información mostrada y las marcas los produce el motor narrativo de Angular, no Unreal: `interactuable.estado` es
 * una orden que envía Angular, no un hecho que reporte el mundo.
 */
export function hechoDesdeMensaje(m: Mensaje): HechoSimulador | null {
  if (m.origen === 'unreal' && m.tipo === 'edificio.entro' && typeof m.datos['zoneId'] === 'string')
    return { tipo: 'interior.entrado', zoneId: m.datos['zoneId'] };
  return null;
}
