/** COMPAT-01: correspondencia experimental explícita; no cambia los identificadores originales. */
export const CORRESPONDENCIA_MUNDO_UNREAL = [
  { edificioId: 'hospital-prueba', narrativa: 'hospital', nodoId: 'entrada', zonaId: 'hospital_entrada', puertaId: 'hosp-puerta' },
  { edificioId: 'policia-prueba', narrativa: 'policia', nodoId: 'este', zonaId: 'policia_entrada', puertaId: 'pol-puerta' },
  { edificioId: 'fiscalia-prueba', narrativa: 'fiscalia', nodoId: 'fiscalia-entrada', zonaId: 'fiscalia_entrada', puertaId: 'fis-puerta' },
] as const;

export const PLAZA_UNREAL = { nodoId: 'plaza-central', zonaId: 'plaza_central', puertaId: 'plaza-punto' } as const;

export function edificioPorZonaUnreal(zonaId: string) {
  return CORRESPONDENCIA_MUNDO_UNREAL.find((entrada) => entrada.zonaId === zonaId) ?? null;
}

export function zonaUnrealPorNodo(nodoId: string): string | null {
  if (nodoId === PLAZA_UNREAL.nodoId) return PLAZA_UNREAL.zonaId;
  return CORRESPONDENCIA_MUNDO_UNREAL.find((entrada) => entrada.nodoId === nodoId)?.zonaId ?? null;
}
