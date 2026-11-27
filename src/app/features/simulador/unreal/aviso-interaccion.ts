/**
 * G4-V11 / FE-UX-09: avisos contextuales de MUNDO-24 en el visor de Angular.
 *
 * Sustituyen a los mensajes de depuración que Unreal pintaba en el vídeo («Pulsa E para interactuar»), que no se
 * dibujan en un paquete Shipping. Se derivan solo de hechos del protocolo v1 que ya existen:
 * `interactuable.disponible` / `interactuable.no_disponible` (con su categoría), `edificio.entro` / `edificio.salio`,
 * `orden.error EDIFICIO_RESTRINGIDO` y los `edificiosHabilitados` de `caso.configurar`. No añade mensajes.
 *
 * Regla: sin acción disponible no hay aviso. Nunca se promete una tecla que no haga nada.
 */

export type CategoriaInteractuable = 'puerta' | 'npc' | 'documento' | 'cierre';

export interface InteractuableDisponible {
  readonly id: string;
  readonly categoria: CategoriaInteractuable;
}

export type AvisoInteraccion =
  | { readonly tipo: 'accion'; readonly tecla: 'E'; readonly texto: string }
  | { readonly tipo: 'informacion'; readonly texto: string }
  | { readonly tipo: 'restriccion'; readonly texto: string };

export interface EntradaAvisoInteraccion {
  readonly conectado: boolean;
  readonly recuperando: boolean;
  readonly libretaAbierta: boolean;
  readonly espacio: 'exterior' | 'entrando' | 'interior';
  readonly conversacion: 'cerrada' | 'abriendo' | 'abierta' | 'cerrando' | 'error';
  /** Nombre del interior al que se está entrando o en el que se está. */
  readonly interior: string | null;
  readonly disponible: InteractuableDisponible | null;
  /** Puerta exterior por id: nombre del edificio y si el caso lo habilita. null si no es una puerta de edificio. */
  readonly puerta: (id: string) => { readonly nombre: string; readonly habilitado: boolean } | null;
  /** Personaje del interior actual por id: nombre y si ya se completó su conversación. null si no conversa. */
  readonly personaje: (id: string) => { readonly nombre: string; readonly completado: boolean } | null;
}

export const TEXTO_RESTRINGIDO = 'Este edificio no forma parte de tu investigación';

export function avisoInteraccion(e: EntradaAvisoInteraccion): AvisoInteraccion | null {
  if (!e.conectado || e.recuperando || e.libretaAbierta) return null;
  if (e.espacio === 'entrando') return { tipo: 'informacion', texto: `Entrando a ${e.interior ?? 'el edificio'}…` };
  if (e.conversacion === 'abierta') return { tipo: 'informacion', texto: 'Continúa el diálogo en el panel de conversación' };
  if (e.conversacion !== 'cerrada' || !e.disponible) return null;
  const { id, categoria } = e.disponible;
  if (categoria === 'puerta' && e.espacio === 'exterior') {
    const puerta = e.puerta(id);
    if (!puerta) return null;
    return puerta.habilitado
      ? { tipo: 'accion', tecla: 'E', texto: `Entrar a ${puerta.nombre}` }
      : { tipo: 'restriccion', texto: TEXTO_RESTRINGIDO };
  }
  if (categoria === 'npc' && e.espacio === 'interior') {
    const personaje = e.personaje(id);
    if (!personaje) return null;
    return { tipo: 'accion', tecla: 'E', texto: `${personaje.completado ? 'Volver a conversar' : 'Conversar'} con ${personaje.nombre}` };
  }
  // `cierre` (punto informativo de la plaza) y `documento` no abren nada en Angular: sin aviso.
  return null;
}

export type AvisoConexion = { readonly tipo: 'progreso' | 'problema' | 'inicio'; readonly texto: string };

/** Estado de la conexión sobre el visor mientras no hay vídeo. Con la ciudad conectada no se muestra nada. */
export function avisoConexion(e: {
  readonly conectado: boolean;
  readonly conectando: boolean;
  readonly reconectando: boolean;
  readonly fallo: boolean;
}): AvisoConexion | null {
  if (e.conectado) return null;
  if (e.conectando) return { tipo: 'progreso', texto: e.reconectando ? 'Reconectando con la ciudad 3D…' : 'Conectando con la ciudad 3D…' };
  if (e.fallo) return { tipo: 'problema', texto: 'No fue posible establecer la conexión con la ciudad 3D' };
  if (e.reconectando) return { tipo: 'problema', texto: 'La ciudad 3D se desconectó. Reconecta para continuar donde lo dejaste' };
  return { tipo: 'inicio', texto: 'Conecta la ciudad 3D para empezar el recorrido' };
}
