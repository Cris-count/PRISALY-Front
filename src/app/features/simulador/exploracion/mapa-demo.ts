import { ConfiguracionMapa } from './mapa.models';

export const MAPA_DEMOSTRACION: ConfiguracionMapa = {
  id: 'demo-mapa-01',
  titulo: 'Recorrido de investigación · demostración',
  espacios: [
    {
      id: 'demo-hospital',
      nombre: 'Hospital',
      plantillaVisual: 'hospital',
      posicion: { x: 42, y: 29 },
      disponible: true,
    },
    {
      id: 'demo-comisaria',
      nombre: 'Comisaría',
      plantillaVisual: 'comisaria',
      posicion: { x: 21, y: 43 },
      disponible: true,
    },
    {
      id: 'demo-oficinas',
      nombre: 'Oficinas',
      plantillaVisual: 'oficinas',
      posicion: { x: 83, y: 53 },
      disponible: true,
    },
    { id: 'demo-espacio-4', nombre: 'Espacio 4', plantillaVisual: 'espacio-4', posicion: { x: 69, y: 30 }, disponible: true },
    { id: 'demo-espacio-5', nombre: 'Espacio 5', plantillaVisual: 'espacio-5', posicion: { x: 34, y: 70 }, disponible: true },
    { id: 'demo-espacio-6', nombre: 'Espacio 6', plantillaVisual: 'espacio-6', posicion: { x: 59, y: 25 }, disponible: true },
  ],
};
