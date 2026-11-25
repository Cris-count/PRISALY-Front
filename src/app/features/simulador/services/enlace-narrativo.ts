import { computed, signal } from '@angular/core';
import { PreguntaVista } from '../models/simulador.models';
import { MotorNarrativo } from '../narrativa/motor-narrativo';
import { GuionNarrativo } from '../narrativa/narrativa.models';
import { ParticipacionCoordinador, SeleccionAcademica } from './participacion.coordinador';

export interface VinculoDecisionAcademica extends SeleccionAcademica {
  readonly guionId: string;
  readonly escenaId: string;
  readonly decisionId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enlace local para contenido ya obtenido de una fuente autorizada.
 * No obtiene contenido, no acredita autorización ni registra proveedores HTTP.
 * Cada instancia corresponde a un intento y un guion; descartar al cambiar contexto.
 */
export class EnlaceNarrativo {
  readonly motor: MotorNarrativo;
  private readonly vinculos = new Map<string, SeleccionAcademica>();
  private readonly cerrado = signal(false);
  private readonly instantanea = signal<MotorNarrativo['estado'] | null>(null);
  readonly estado = this.instantanea.asReadonly();
  readonly puedeInteractuar = computed(() => this.disponible());

  constructor(
    private readonly idIntento: string,
    guion: GuionNarrativo,
    preguntas: readonly PreguntaVista[],
    vinculos: readonly VinculoDecisionAcademica[],
    private readonly participacion: ParticipacionCoordinador,
  ) {
    this.motor = new MotorNarrativo(guion);
    this.instantanea.set(this.motor.estado);
    const exigir = (condicion: boolean) => {
      if (!condicion) throw new Error('Correspondencia narrativa–académica inválida.');
    };
    exigir(UUID.test(idIntento));
    const opciones = new Map<string, Set<string>>();
    for (const pregunta of preguntas) {
      exigir(UUID.test(pregunta.id) && !opciones.has(pregunta.id));
      const ids = pregunta.opciones.map((o) => o.id);
      exigir(ids.every((id) => UUID.test(id)) && new Set(ids).size === ids.length);
      opciones.set(pregunta.id, new Set(ids));
    }
    for (const vinculo of vinculos) {
      const escena = guion.escenas.find((e) => e.id === vinculo.escenaId);
      const clave = this.clave(vinculo.escenaId, vinculo.decisionId);
      exigir(
        vinculo.guionId === guion.id &&
          !!escena?.decisiones.some((d) => d.id === vinculo.decisionId),
      );
      exigir(!this.vinculos.has(clave));
      exigir(opciones.get(vinculo.idPregunta)?.has(vinculo.idOpcionSeleccionada) === true);
      this.vinculos.set(clave, {
        idPregunta: vinculo.idPregunta,
        idOpcionSeleccionada: vinculo.idOpcionSeleccionada,
      });
    }
  }

  /** Una elección inválida, anticipada o bloqueada no produce efectos ni HTTP. */
  elegir(decisionId: string): void {
    if (!this.puedeElegir(decisionId)) return;
    const anterior = this.motor.estado;
    const seleccion = this.vinculos.get(this.clave(anterior.escenaId, decisionId));
    if (!seleccion) {
      this.motor.elegir(decisionId);
      this.instantanea.set(this.motor.estado);
      return;
    }
    this.participacion.guardar(seleccion, () => {
      // No aplicar una confirmación a otra escena, otro intento o un enlace descartado.
      if (this.disponible() && this.motor.estado === anterior) {
        this.motor.elegir(decisionId);
        this.instantanea.set(this.motor.estado);
      }
    });
  }

  /** CONTINUIDAD-06: no ofrecer cambios de respuestas confirmadas sin política aprobada. */
  puedeElegir(decisionId: string): boolean {
    if (!this.disponible() || !this.motor.decisionesDisponibles.some((d) => d.id === decisionId))
      return false;
    const seleccion = this.vinculos.get(this.clave(this.motor.estado.escenaId, decisionId));
    if (!seleccion) return true;
    const confirmada = this.participacion
      .intento()
      ?.respuestas.find((r) => r.idPregunta === seleccion.idPregunta);
    return !confirmada || confirmada.idOpcionSeleccionada === seleccion.idOpcionSeleccionada;
  }

  /** Estos controles solo cambian narrativa; nunca borran respuestas persistidas. */
  avanzarDialogo(): void {
    if (this.disponible()) this.motor.avanzarDialogo();
    this.instantanea.set(this.motor.estado);
  }
  completarTransicion(): void {
    if (this.disponible()) this.motor.completarTransicion();
    this.instantanea.set(this.motor.estado);
  }
  volver(): void {
    if (this.disponible()) this.motor.volver();
    this.instantanea.set(this.motor.estado);
  }

  /** Invalida continuaciones locales; el dueño del coordinador cancela HTTP al salir. */
  cerrar(): void {
    this.cerrado.set(true);
  }

  private disponible(): boolean {
    return (
      !this.cerrado() &&
      this.participacion.intento()?.idIntento === this.idIntento &&
      this.participacion.intento()?.estado === 'EnCurso' &&
      ['disponible', 'guardada'].includes(this.participacion.estado())
    );
  }

  private clave(escenaId: string, decisionId: string): string {
    return JSON.stringify([escenaId, decisionId]);
  }
}
