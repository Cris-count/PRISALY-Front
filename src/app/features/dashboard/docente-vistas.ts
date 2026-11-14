import { BloqueDocente } from './estructura-docente';

interface VistaDocente {
  consulta: string;
  organizacion: string;
  nota: string;
  acciones: readonly string[];
  bloques: readonly BloqueDocente[];
}

/** Contenido de interfaz; no contiene registros, criterios aprobados ni reglas académicas. */
export const VISTAS_DOCENTES: Readonly<Record<string, VistaDocente>> = {
  'casos-academicos': {
    consulta: 'Listado futuro de casos',
    organizacion: 'Organización del contenido del caso',
    nota: 'La creación, consulta, edición, publicación y archivo requieren integración autorizada. Esta vista no cambia estados ni aplica reglas de publicación.',
    acciones: ['Crear caso', 'Editar caso', 'Consultar caso', 'Publicar caso', 'Archivar caso'],
    bloques: [
      {
        titulo: 'Información general',
        descripcion: 'Espacio previsto para identificar y describir el caso.',
      },
      { titulo: 'Escenarios', descripcion: 'Área futura para organizar los escenarios del caso.' },
      { titulo: 'Preguntas', descripcion: 'Espacio previsto para la organización de preguntas.' },
      {
        titulo: 'Opciones de respuesta',
        descripcion: 'Área futura para las opciones asociadas a cada pregunta.',
      },
      {
        titulo: 'Orden del contenido',
        descripcion: 'Presentación futura de la secuencia; sin controles de reordenación.',
      },
    ],
  },
  rubricas: {
    consulta: 'Consulta futura de rúbricas',
    organizacion: 'Organización de la rúbrica',
    nota: 'Consulta y organización pendientes de integración. No se guardan rúbricas ni se calculan puntajes o calificaciones.',
    acciones: ['Consultar rúbricas', 'Organizar criterios'],
    bloques: [
      {
        titulo: 'Criterios',
        descripcion: 'Espacio para criterios institucionales pendientes de consulta.',
      },
      {
        titulo: 'Dimensiones',
        descripcion: 'Área prevista para organizar las dimensiones de cada criterio.',
      },
      {
        titulo: 'Descriptores',
        descripcion:
          'Espacio para descripciones institucionales; sin niveles ni valores inventados.',
      },
    ],
  },
  sesiones: {
    consulta: 'Consulta futura de sesiones',
    organizacion: 'Preparación de la programación académica',
    nota: 'Programación no disponible. Solo se podrán programar casos PUBLICADOS tras integración autorizada. La validación académica definitiva corresponde al Backend.',
    acciones: ['Programar sesión', 'Consultar sesiones', 'Editar programación'],
    bloques: [
      {
        titulo: 'Caso publicado',
        descripcion: 'Selección futura de casos habilitados; sin casos consultados.',
      },
      {
        titulo: 'Programación',
        descripcion: 'Espacio previsto para fecha y hora; sin sesiones programadas.',
      },
      {
        titulo: 'Disponibilidad',
        descripcion:
          'Pendiente de consulta institucional. No se determina elegibilidad estudiantil.',
      },
    ],
  },
  convocatorias: {
    consulta: 'Consulta futura de convocatorias',
    organizacion: 'Organización de la convocatoria',
    nota: 'Gestión pendiente de integración. No hay estudiantes convocados, mensajes enviados ni notificaciones entregadas en esta demostración.',
    acciones: ['Preparar convocatoria', 'Consultar convocatorias', 'Convocar estudiantes'],
    bloques: [
      {
        titulo: 'Sesión académica',
        descripcion: 'Vinculación futura con una sesión autorizada; sin sesiones consultadas.',
      },
      {
        titulo: 'Destinatarios',
        descripcion: 'Espacio para una futura consulta autorizada; sin estudiantes seleccionados.',
      },
      {
        titulo: 'Condiciones',
        descripcion:
          'Área para presentar condiciones institucionales, sin definir ni aplicar reglas.',
      },
    ],
  },
};
