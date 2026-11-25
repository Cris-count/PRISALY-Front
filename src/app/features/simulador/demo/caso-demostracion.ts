import { CasoVista } from '../models/simulador.models';

/**
 * DATOS SIMULADOS — solo para revisar la presentación del simulador.
 *
 * No son contenido académico de PRISALY, no provienen de M3 ni de M5 y no
 * se guardan en ningún lugar. No incluyen respuestas correctas ni puntajes.
 */
export const CASO_DEMOSTRACION: CasoVista = {
  titulo: 'Caso de demostración (datos simulados)',
  escenario: {
    titulo: 'Escenario de ejemplo',
    contexto:
      'Texto de ejemplo para revisar la maquetación del simulador. No corresponde a un caso ' +
      'situacional aprobado: el contenido real lo proveerá M3 a través de M5.',
    elementos: [
      { id: 'persona-a', etiqueta: 'Persona A', tipo: 'persona', x: 22, y: 80 },
      { id: 'persona-b', etiqueta: 'Persona B', tipo: 'persona', x: 52, y: 76 },
      { id: 'persona-c', etiqueta: 'Persona C', tipo: 'persona', x: 80, y: 84 },
      { id: 'objeto-a', etiqueta: 'Mesa', tipo: 'objeto', x: 37, y: 90 },
    ],
  },
  preguntas: [1, 2, 3].map((n) => ({
    id: `demo-p${n}`,
    enunciado: `Pregunta de ejemplo ${n}. Su texto real dependerá del caso publicado.`,
    opciones: ['A', 'B', 'C'].map((letra) => ({
      id: `demo-p${n}-${letra.toLowerCase()}`,
      texto: `Opción de ejemplo ${letra}`,
    })),
  })),
  duracionSegundos: 300,
};
