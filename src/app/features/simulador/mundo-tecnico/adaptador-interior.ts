import { ContextoInterior, EspacioDemostrativo, EventoEspacioVisual } from '../exploracion/mapa.models';
import { EdificioTecnico } from './mundo-tecnico.models';

/** Adaptación local al contrato de Cristian; no inventa contenido ni persistencia. */
export function contextoInteriorTecnico(edificio: EdificioTecnico, interaccionActiva: boolean, emitir: (evento: EventoEspacioVisual) => void): ContextoInterior {
  const espacio: EspacioDemostrativo = {
    id: edificio.id, nombre: edificio.nombre, plantillaVisual: edificio.plantillaVisual,
    posicion: { x: edificio.area.x, y: edificio.area.y }, disponible: true,
  };
  return { $implicit: espacio, interaccionActiva, emitir };
}
