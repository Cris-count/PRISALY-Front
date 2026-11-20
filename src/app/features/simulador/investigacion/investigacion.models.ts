/** Modelos locales de propuesta; no son DTO ni contratos académicos aprobados. */
export type ContextoInvestigacion =
  | { readonly modo: 'demostracion'; readonly sesionId: string }
  | { readonly modo: 'academico'; readonly intentoId: string; readonly casoId: string; readonly versionPublicadaId: string };
export interface OrigenPista {
  readonly espacioId: string;
  readonly interaccionId: string;
  readonly personajeId?: string;
  readonly lugar: string;
}
export interface PistaInvestigacion {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly origen: OrigenPista;
  readonly obtenidaEn: string;
}
export interface NotaInvestigacion {
  readonly id: string;
  readonly texto: string;
  readonly creadaEn: string;
  readonly modificadaEn: string;
}
export interface EstadoLibreta {
  readonly contexto: ContextoInvestigacion;
  readonly pistas: readonly PistaInvestigacion[];
  readonly notas: readonly NotaInvestigacion[];
  readonly sincronizacion: 'solo-memoria-demostrativa';
}
/** Propuesta de puerto narrativo explícito. No interpreta conversaciones ni respuestas. */
export interface EventoPistaObtenida {
  readonly tipo: 'pista-obtenida';
  readonly contexto: ContextoInvestigacion;
  readonly pista: Omit<PistaInvestigacion, 'obtenidaEn'>;
}
