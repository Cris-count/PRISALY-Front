import { MundoTecnico } from './mundo-tecnico.models';

/** Mundo sintético exclusivo de la prueba: ningún identificador pertenece a un caso. */
export const MUNDO_PRUEBA: MundoTecnico = {
  id: 'mundo-tecnico', version: 1, dimensiones: { ancho: 900, alto: 540 }, radioPersonaje: 12,
  zonasTransitables: [{ x: 40, y: 40, ancho: 820, alto: 460 }],
  obstaculos: [{ x: 370, y: 155, ancho: 160, alto: 230 }],
  nodos: [
    { id: 'inicio', posicion: { x: 110, y: 400 } },
    { id: 'oeste', posicion: { x: 260, y: 400 } },
    { id: 'fiscalia-entrada', posicion: { x: 260, y: 200 } },
    { id: 'norte-oeste', posicion: { x: 260, y: 90 } },
    { id: 'norte-este', posicion: { x: 640, y: 90 } },
    { id: 'este', posicion: { x: 640, y: 400 } },
    { id: 'entrada', posicion: { x: 795, y: 300 } },
  ],
  caminos: [
    { desde: 'inicio', hasta: 'oeste' }, { desde: 'oeste', hasta: 'fiscalia-entrada' },
    { desde: 'fiscalia-entrada', hasta: 'norte-oeste' },
    { desde: 'norte-oeste', hasta: 'norte-este' }, { desde: 'norte-este', hasta: 'este' },
    { desde: 'este', hasta: 'entrada' },
  ],
  edificios: [
    { id: 'hospital-prueba', nombre: 'Hospital', plantillaVisual: 'hospital', area: { x: 745, y: 150, ancho: 110, alto: 105 }, entrada: 'entrada', salida: 'entrada' },
    { id: 'fiscalia-prueba', nombre: 'Fiscalía', plantillaVisual: 'fiscalia', area: { x: 120, y: 145, ancho: 105, alto: 90 }, entrada: 'fiscalia-entrada', salida: 'fiscalia-entrada' },
    { id: 'policia-prueba', nombre: 'Policía', plantillaVisual: 'policia', area: { x: 515, y: 435, ancho: 95, alto: 60 }, entrada: 'este', salida: 'este' },
  ],
  inicio: 'inicio', puntosSeguros: ['inicio', 'entrada'],
};
