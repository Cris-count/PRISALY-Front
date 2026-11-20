/**
 * Manifiesto PaqueteVisual REAL de Cristian (arte técnico/provisional V1).
 *
 * Recursos gráficos producidos conforme a MUNDO_PRUEBA (proyección ortográfica 40°,
 * fondo transparente real, hospital exterior V1, explorador V1 y árbol decorativo V1).
 *
 * Valores verificados:
 * - hospital-exterior-v1.png: 236×274, apoyoPx (118,266), escala 0.5 (2 px/ud).
 * - explorador-v1.png: hoja 8×1, celda 32×48, apoyoPx (16,48), escala 0.63.
 * - arbol-v1.png: 64×64, apoyoPx (32,64), escala 0.8.
 *
 * Geometría lógica: elevación 40°, giro 0°, escalaSueloY = sin(40°) ≈ 0.6427876;
 * hospital huella (-55,-105,110,105), entrada (-5,45); personaje radio 12; árbol apoyo (270,250).
 */
import { PaqueteVisual } from './contrato-visual';

const SIN_40 = Math.sin((40 * Math.PI) / 180);

export const PAQUETE_VISUAL_V1: PaqueteVisual = {
  id: 'prisaly-hospital-v1',
  version: 1,
  perspectiva: { elevacion: 40, giro: 0, escalaSueloY: SIN_40 },

  hospital: {
    edificioId: 'hospital-prueba',
    recurso: {
      id: 'hospital-exterior',
      version: 1,
      tipo: 'hospital',
      escala: 0.5,
      alturaLogica: 80,
      orientaciones: ['sur'],
      colision: { tipo: 'rectangulo', huella: { x: -55, y: -105, ancho: 110, alto: 105 } },
      entrada: { x: -5, y: 45 },
      capas: [
        {
          id: 'cuerpo',
          ruta: '/images/simulador/hospital-exterior-v1.png',
          dimensiones: { ancho: 236, alto: 274 },
          apoyoPx: { x: 118, y: 266 },
          plano: 'volumen',
          desplazamientoApoyoY: 0,
        },
      ],
      animaciones: [],
    },
  },

  personaje: {
    id: 'explorador',
    version: 1,
    tipo: 'personaje',
    escala: 0.63,
    alturaLogica: 26,
    orientaciones: ['sur', 'norte', 'este', 'oeste'],
    colision: { tipo: 'circulo', radio: 12 },
    capas: [
      {
        id: 'cuerpo',
        ruta: '/images/simulador/explorador-v1.png',
        dimensiones: { ancho: 32, alto: 48 },
        apoyoPx: { x: 16, y: 48 },
        plano: 'volumen',
        desplazamientoApoyoY: 0,
        hoja: { columnas: 8, filas: 1 },
      },
    ],
    animaciones: (['sur', 'norte', 'este', 'oeste'] as const).flatMap((orientacion, i) => [
      { estado: 'reposo' as const, orientacion, fotogramas: [i * 2], fps: 4 },
      { estado: 'caminar' as const, orientacion, fotogramas: [i * 2, i * 2 + 1], fps: 8 },
    ]),
  },

  arbol: {
    apoyo: { x: 270, y: 250 },
    recurso: {
      id: 'arbol-decorativo',
      version: 1,
      tipo: 'arbol',
      escala: 0.8,
      alturaLogica: 51,
      orientaciones: ['sur'],
      colision: { tipo: 'decorativo' },
      capas: [
        {
          id: 'copa',
          ruta: '/images/simulador/arbol-v1.png',
          dimensiones: { ancho: 64, alto: 64 },
          apoyoPx: { x: 32, y: 64 },
          plano: 'volumen',
          desplazamientoApoyoY: 0,
        },
      ],
      animaciones: [],
    },
  },
};
