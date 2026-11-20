import { GuionNarrativo } from '../narrativa/narrativa.models';
import { EscenarioVista } from '../models/simulador.models';

const crearEscenario = (titulo: string, contexto: string): EscenarioVista => ({
  titulo,
  contexto,
  elementos: [],
});

/**
 * Guion demostrativo del Hospital.
 * Permite dialogar con el médico y recopilar antecedentes clínicos.
 */
export const GUION_HOSPITAL_DEMO: GuionNarrativo = {
  id: 'guion-hospital-demo',
  inicio: 'recepcion',
  personajes: [
    { id: 'doctor', nombre: 'Dr. Mendoza', estado: 'en guardia', expresion: 'atenta' },
    { id: 'enfermera', nombre: 'Enf. Clara', estado: 'clasificando fichas', expresion: 'serena' },
  ],
  escenas: [
    {
      id: 'recepcion',
      escenario: crearEscenario('Hospital Central — Triaje', 'Área de guardia y atención clínica inicial.'),
      alEntrar: [],
      dialogos: [
        { personajeId: 'doctor', texto: 'Bienvenido al Hospital Central. ¿En qué puedo colaborar con su investigación?' },
        { personajeId: 'enfermera', texto: 'Tenemos los libros de ingreso listos si requiere contrastar las horas.' },
      ],
      decisiones: [
        {
          id: 'consultar-expediente',
          texto: 'Solicitar informe de ingreso del paciente',
          consecuencias: [
            { tipo: 'marca', marca: 'pista_historial_clinico', valor: true },
            { tipo: 'personaje', personajeId: 'doctor', estado: 'explicando expediente', expresion: 'alegre' },
          ],
          rutas: [
            { destino: 'sala-consulta', texto: 'El Dr. Mendoza revisa la carpeta médica con usted.' },
          ],
        },
        {
          id: 'consultar-urgencia',
          texto: 'Preguntar por el estado general de guardia',
          consecuencias: [
            { tipo: 'marca', marca: 'hospital_guardia_revisada', valor: true },
            { tipo: 'personaje', personajeId: 'doctor', estado: 'revisando turnos', expresion: 'serena' },
          ],
          rutas: [
            { destino: 'sala-consulta', texto: 'El Dr. Mendoza le indica que la noche fue inusualmente tranquila.' },
          ],
        },
      ],
    },
    {
      id: 'sala-consulta',
      escenario: crearEscenario('Hospital Central — Despacho Médico', 'Consulta de conclusiones diagnósticas.'),
      alEntrar: [
        { tipo: 'personaje', personajeId: 'doctor', estado: 'concluyendo informe', expresion: 'atenta' },
      ],
      dialogos: [
        { personajeId: 'doctor', texto: 'El paciente presentó lesiones contusas leves y fue dado de alta con seguimiento ambulatorio.' },
      ],
      decisiones: [],
    },
  ],
};

/**
 * Guion demostrativo de la Comisaría de Policía.
 * Permite interrogar al oficial a cargo y revisar el reporte de patrullaje.
 */
export const GUION_POLICIA_DEMO: GuionNarrativo = {
  id: 'guion-policia-demo',
  inicio: 'atencion-policial',
  personajes: [
    { id: 'oficial', nombre: 'Oficial Ramírez', estado: 'de servicio', expresion: 'serena' },
  ],
  escenas: [
    {
      id: 'atencion-policial',
      escenario: crearEscenario('Comisaría del Sector — Guardia', 'Mesa de partes y registro de incidentes policiales.'),
      alEntrar: [],
      dialogos: [
        { personajeId: 'oficial', texto: 'Comisaría Sectorial. Indique el número de parte o el caso que viene a revisar.' },
      ],
      decisiones: [
        {
          id: 'solicitar-atestado',
          texto: 'Revisar la minuta de intervención policial',
          consecuencias: [
            { tipo: 'marca', marca: 'pista_informe_policial', valor: true },
            { tipo: 'personaje', personajeId: 'oficial', estado: 'consultando archivo', expresion: 'atenta' },
          ],
          rutas: [
            { destino: 'archivo-policial', texto: 'El oficial busca el registro de la unidad de patrullaje.' },
          ],
        },
      ],
    },
    {
      id: 'archivo-policial',
      escenario: crearEscenario('Comisaría — Archivo de Partes', 'Inspección de actas de intervención.'),
      alEntrar: [],
      dialogos: [
        { personajeId: 'oficial', texto: 'La llamada ingresó a las 22:15. La unidad móvil llegó al lugar en menos de ocho minutos.' },
      ],
      decisiones: [],
    },
  ],
};

/**
 * Guion demostrativo de la Fiscalía.
 * Permite conocer los cargos preliminares y la estrategia del Ministerio Público.
 */
export const GUION_FISCALIA_DEMO: GuionNarrativo = {
  id: 'guion-fiscalia-demo',
  inicio: 'despacho-fiscal',
  personajes: [
    { id: 'fiscal', nombre: 'Dra. Valenzuela', estado: 'analizando carpeta', expresion: 'atenta' },
  ],
  escenas: [
    {
      id: 'despacho-fiscal',
      escenario: crearEscenario('Fiscalía — Despacho de Investigación', 'Coordinación fiscal para la formalización del caso.'),
      alEntrar: [],
      dialogos: [
        { personajeId: 'fiscal', texto: 'Estamos ordenando los indicios recabados antes de la audiencia preliminar.' },
      ],
      decisiones: [
        {
          id: 'consultar-calificacion',
          texto: 'Preguntar por la calificación jurídica provisional',
          consecuencias: [
            { tipo: 'marca', marca: 'pista_acusacion_fiscal', valor: true },
            { tipo: 'personaje', personajeId: 'fiscal', estado: 'anotando dictamen', expresion: 'alegre' },
          ],
          rutas: [
            { destino: 'sala-dictamen', texto: 'La fiscal resume los puntos centrales de la teoría del caso.' },
          ],
        },
      ],
    },
    {
      id: 'sala-dictamen',
      escenario: crearEscenario('Fiscalía — Sala de Dictamen', 'Puntos conclusivos de la fiscalía.'),
      alEntrar: [],
      dialogos: [
        { personajeId: 'fiscal', texto: 'Necesitamos verificar que las pericias médicas concuerden con los tiempos del parte policial.' },
      ],
      decisiones: [],
    },
  ],
};

/**
 * Mapeo de guiones demostrativos por identificador o plantilla visual de edificio.
 */
export const GUIONES_POR_EDIFICIO: Readonly<Record<string, GuionNarrativo>> = {
  'hospital-prueba': GUION_HOSPITAL_DEMO,
  'hospital': GUION_HOSPITAL_DEMO,
  'policia-prueba': GUION_POLICIA_DEMO,
  'policia': GUION_POLICIA_DEMO,
  'fiscalia-prueba': GUION_FISCALIA_DEMO,
  'fiscalia': GUION_FISCALIA_DEMO,
};
