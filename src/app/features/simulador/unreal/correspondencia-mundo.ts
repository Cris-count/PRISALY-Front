/**
 * COMPAT-01: correspondencia explícita entre los edificios narrativos de PRISALY y las zonas y puertas de MUNDO-24.
 * No cambia los identificadores canónicos. (Los nodos del simulador 2D/2.5D se retiraron en DC-SIM-LIMPIEZA-01.)
 */
export const CORRESPONDENCIA_MUNDO_UNREAL = [
  { edificioId: 'hospital-prueba', narrativa: 'hospital', zonaId: 'hospital_entrada', puertaId: 'hosp-puerta' },
  { edificioId: 'policia-prueba', narrativa: 'policia', zonaId: 'policia_entrada', puertaId: 'pol-puerta' },
  { edificioId: 'fiscalia-prueba', narrativa: 'fiscalia', zonaId: 'fiscalia_entrada', puertaId: 'fis-puerta' },
] as const;

export const PLAZA_UNREAL = { zonaId: 'plaza_central', puertaId: 'plaza-punto' } as const;

export function edificioPorZonaUnreal(zonaId: string) {
  return CORRESPONDENCIA_MUNDO_UNREAL.find((entrada) => entrada.zonaId === zonaId) ?? null;
}
