import { CASO_DEMOSTRACION } from './caso-demostracion';
import { EscenarioVista } from '../models/simulador.models';
import { GuionNarrativo } from '../narrativa/narrativa.models';

const escenario = (titulo: string, contexto: string): EscenarioVista => ({
  ...CASO_DEMOSTRACION.escenario, titulo, contexto,
});

/** Ficción de interfaz, sin contenido académico aprobado ni decisiones correctas. */
export const GUION_DEMOSTRACION: GuionNarrativo = {
  id: 'demo-narrativa-sim-01', inicio: 'bienvenida',
  personajes: [
    { id: 'a', nombre: 'Persona A', estado: 'esperando', expresion: 'serena' },
    { id: 'b', nombre: 'Persona B', estado: 'esperando', expresion: 'serena' },
  ],
  escenas: [
    {
      id: 'bienvenida',
      escenario: escenario('Encuentro de demostración', 'Dos personajes preparan una visita ficticia. Elige el orden del recorrido; ninguna ruta es correcta o incorrecta.'),
      alEntrar: [],
      dialogos: [
        { personajeId: 'a', texto: 'Esta es una historia de ejemplo. Podemos conversar o mirar la sala primero.' },
        { personajeId: 'b', texto: 'Tu elección solo cambiará nuestra conversación y las escenas siguientes.' },
      ],
      decisiones: [
        { id: 'conversar', texto: 'Conversar primero', consecuencias: [
          { tipo: 'marca', marca: 'conversacion', valor: true },
          { tipo: 'personaje', personajeId: 'b', estado: 'conversando', expresion: 'alegre' },
        ], rutas: [{ destino: 'conversacion', texto: 'Los personajes se acercan para conversar.' }] },
        { id: 'observar', texto: 'Observar primero', consecuencias: [
          { tipo: 'marca', marca: 'conversacion', valor: false },
          { tipo: 'personaje', personajeId: 'a', estado: 'observando', expresion: 'atenta' },
        ], rutas: [{ destino: 'observacion', texto: 'La atención pasa a la sala de ejemplo.' }] },
      ],
    },
    {
      id: 'conversacion',
      escenario: escenario('Una conversación ficticia', 'La ruta elegida cambia el diálogo y el estado de Persona B.'),
      alEntrar: [],
      dialogos: [{ personajeId: 'b', texto: 'Comenzamos conversando. Ahora podemos reunirnos para cerrar la visita.' }],
      decisiones: [{ id: 'reunirse', texto: 'Reunir al grupo', consecuencias: [],
        rutas: [{ destino: 'reunion', texto: 'El grupo vuelve a reunirse.' }] }],
    },
    {
      id: 'observacion',
      escenario: escenario('Exploración de la sala', 'La ruta elegida cambia el diálogo y la expresión de Persona A.'),
      alEntrar: [],
      dialogos: [{ personajeId: 'a', texto: 'Observamos la sala primero. Compartamos el recorrido con el grupo.' }],
      decisiones: [{ id: 'reunirse', texto: 'Reunir al grupo', consecuencias: [],
        rutas: [{ destino: 'reunion', texto: 'El grupo vuelve a reunirse.' }] }],
    },
    {
      id: 'reunion',
      escenario: escenario('Punto de encuentro', 'La historia recuerda la elección anterior, sin evaluar respuestas.'),
      alEntrar: [{ tipo: 'personaje', personajeId: 'a', estado: 'reunida', expresion: 'serena' }],
      dialogos: [
        { personajeId: 'a', texto: 'La conversación inicial cambió nuestro recorrido.', condicion: { marca: 'conversacion', valor: true } },
        { personajeId: 'a', texto: 'La observación inicial cambió nuestro recorrido.', condicion: { marca: 'conversacion', valor: false } },
      ],
      decisiones: [{ id: 'despedirse', texto: 'Despedirse', consecuencias: [], rutas: [
        { destino: 'cierre-conversacion', texto: 'La visita termina después de la conversación.', condicion: { marca: 'conversacion', valor: true } },
        { destino: 'cierre-observacion', texto: 'La visita termina después de la observación.' },
      ] }],
    },
    {
      id: 'cierre-conversacion',
      escenario: escenario('Cierre: conversación', 'Final de la ruta de conversación. No hay calificación ni intento registrado.'),
      alEntrar: [{ tipo: 'personaje', personajeId: 'b', estado: 'despidiéndose', expresion: 'alegre' }],
      dialogos: [{ personajeId: 'b', texto: 'Gracias por conversar. Aquí termina esta ruta ficticia.' }], decisiones: [],
    },
    {
      id: 'cierre-observacion',
      escenario: escenario('Cierre: observación', 'Final de la ruta de observación. No hay calificación ni intento registrado.'),
      alEntrar: [{ tipo: 'personaje', personajeId: 'b', estado: 'despidiéndose', expresion: 'serena' }],
      dialogos: [{ personajeId: 'b', texto: 'Gracias por recorrer la sala. Aquí termina esta ruta ficticia.' }], decisiones: [],
    },
  ],
};
