import { GUIONES_POR_EDIFICIO } from '../demo/guiones-edificios-demo';
import { GUION_PACIENTE_HOSPITAL_DEMO } from '../demo/guion-paciente-hospital-demo';
import { CORRESPONDENCIA_MUNDO_UNREAL } from './correspondencia-mundo';

export interface NpcInteriorUnreal {
  readonly espacialId: string;
  readonly personajeId: string;
  readonly nombre: string;
  readonly guionId: string;
}

// Se conservan las exportaciones de la primera integración del Hospital.
export const HOSPITAL_UNREAL = {
  ...CORRESPONDENCIA_MUNDO_UNREAL[0], npcId: 'hosp-npc-doctor',
} as const;

export const NPCS_HOSPITAL_UNREAL = {
  doctor: { espacialId: HOSPITAL_UNREAL.npcId, personajeId: 'doctor', nombre: 'Dr. Mendoza', guionId: GUIONES_POR_EDIFICIO[HOSPITAL_UNREAL.edificioId].id },
  paciente: { espacialId: 'hosp-npc-paciente-01', personajeId: 'paciente-01', nombre: 'Paciente (demostración)', guionId: GUION_PACIENTE_HOSPITAL_DEMO.id },
} as const;

/** Correspondencias de presentación; no amplía el catálogo de mensajes v1. */
const FICHAS: Record<typeof CORRESPONDENCIA_MUNDO_UNREAL[number]['edificioId'], {
  readonly nombre: string;
  readonly indicaciones: string;
  readonly npcs: readonly NpcInteriorUnreal[];
}> = {
  'hospital-prueba': {
    nombre: 'Hospital Central',
    indicaciones: 'Acércate al doctor o al costado de la camilla del paciente y pulsa E para conversar. Para salir, camina hasta las puertas de vidrio.',
    npcs: [NPCS_HOSPITAL_UNREAL.doctor, NPCS_HOSPITAL_UNREAL.paciente],
  },
  'policia-prueba': {
    nombre: 'Comisaría Sectorial',
    indicaciones: 'Acércate al oficial y pulsa E para conversar. Al terminar, cierra la conversación y camina hasta la salida para regresar a la ciudad.',
    npcs: [{ espacialId: 'pol-npc-oficial', personajeId: 'oficial', nombre: 'Oficial Ramírez', guionId: GUIONES_POR_EDIFICIO['policia-prueba'].id }],
  },
  'fiscalia-prueba': {
    nombre: 'Fiscalía de Turno',
    indicaciones: 'Acércate a la fiscal y pulsa E para conversar. Al terminar, cierra la conversación y camina hasta la salida para regresar a la ciudad.',
    npcs: [{ espacialId: 'fis-npc-fiscal', personajeId: 'fiscal', nombre: 'Dra. Valenzuela', guionId: GUIONES_POR_EDIFICIO['fiscalia-prueba'].id }],
  },
};

export const INTERIORES_NARRATIVOS_UNREAL = CORRESPONDENCIA_MUNDO_UNREAL.map(entrada => ({
  ...entrada, ...FICHAS[entrada.edificioId],
}));

export type InteriorNarrativoUnreal = typeof INTERIORES_NARRATIVOS_UNREAL[number];
