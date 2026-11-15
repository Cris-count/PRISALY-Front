import { ConfiguracionMapa } from './mapa.models';

export const MAPA_DEMOSTRACION: ConfiguracionMapa = {
  id: 'demo-mapa-01',
  titulo: 'Recorrido de investigación · demostración',
  espacios: [
    {
      id: 'demo-hospital',
      nombre: 'Hospital',
      plantillaVisual: 'hospital',
      posicion: { x: 24, y: 27 },
      disponible: true,
    },
    {
      id: 'demo-comisaria',
      nombre: 'Comisaría',
      plantillaVisual: 'comisaria',
      posicion: { x: 76, y: 27 },
      disponible: true,
    },
    {
      id: 'demo-oficinas',
      nombre: 'Oficinas',
      plantillaVisual: 'oficinas',
      posicion: { x: 50, y: 79 },
      disponible: true,
    },
  ],
};
