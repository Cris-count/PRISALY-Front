import { ContenidoIntentoM5 } from '../models/contenido-intento.models';

/** Datos sintéticos exclusivos de pruebas; no forman un guion ni contenido autorizado. */
export const ID_INTENTO_CONTENIDO = '11111111-1111-4111-8111-111111111111';
export function contenidoPrueba(): ContenidoIntentoM5 {
  return {
    idIntento: ID_INTENTO_CONTENIDO,
    idSesion: '22222222-2222-4222-8222-222222222222',
    caso: {
      idCaso: '33333333-3333-4333-8333-333333333333',
      titulo: 'Caso de prueba',
      historia: null,
      desarrolloSituacional: 'Desarrollo de prueba',
      escenarios: [1, 2].map((n) => ({
        idEscenario: `44444444-4444-4444-8444-44444444444${n}`,
        titulo: n === 1 ? null : 'Segundo escenario',
        contexto: null,
        instrucciones: null,
        orden: n,
        preguntas: [1, 2].map((p) => ({
          idPregunta: `55555555-5555-4555-8555-5555555555${n}${p}`,
          enunciado: `Pregunta ${n}.${p}`,
          orden: p,
          opciones: [1, 2].map((o) => ({
            idOpcion: `66666666-6666-4666-8666-666666666${n}${p}${o}`,
            texto: `Opción ${n}.${p}.${o}`,
            orden: o,
          })),
        })),
      })),
    },
  };
}
