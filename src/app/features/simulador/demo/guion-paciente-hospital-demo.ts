import { GuionNarrativo } from '../narrativa/narrativa.models';

/** Contenido provisional autorizado por Nicolás. No representa hechos de un caso académico. */
export const GUION_PACIENTE_HOSPITAL_DEMO: GuionNarrativo = {
  id: 'guion-hospital-paciente-demo',
  inicio: 'paciente-presentacion',
  personajes: [
    { id: 'paciente-01', nombre: 'Paciente (demostración)', estado: 'descansando en la camilla', expresion: 'serena' },
  ],
  escenas: [
    {
      id: 'paciente-presentacion',
      escenario: { titulo: 'Hospital Central — Camilla del paciente', contexto: 'Conversación de demostración, sin datos de un caso real.', elementos: [] },
      alEntrar: [],
      dialogos: [
        { personajeId: 'paciente-01', texto: 'Hola. Estoy descansando en esta camilla y puedo conversar un momento.' },
        { personajeId: 'paciente-01', texto: 'Esta conversación es una demostración. Mi testimonio del caso se incorporará cuando esté disponible el guion autorizado.' },
      ],
      decisiones: [
        {
          id: 'registrar-entrevista-paciente-demo',
          texto: 'Registrar conversación de demostración con el paciente',
          consecuencias: [
            { tipo: 'marca', marca: 'demo_entrevista_paciente_registrada', valor: true },
            { tipo: 'personaje', personajeId: 'paciente-01', estado: 'conversación demostrativa registrada', expresion: 'atenta' },
          ],
          rutas: [{ destino: 'paciente-cierre', texto: 'Registras en la libreta el origen de esta conversación de demostración.' }],
        },
      ],
    },
    {
      id: 'paciente-cierre',
      escenario: { titulo: 'Hospital Central — Cierre de entrevista', contexto: 'Fin del diálogo provisional del paciente.', elementos: [] },
      alEntrar: [],
      dialogos: [{ personajeId: 'paciente-01', texto: 'Gracias. Puedes continuar tu recorrido por el Hospital.' }],
      decisiones: [],
    },
  ],
};
