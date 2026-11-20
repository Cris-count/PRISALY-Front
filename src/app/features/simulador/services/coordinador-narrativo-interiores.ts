import { inject, Injectable } from '@angular/core';
import { GUIONES_POR_EDIFICIO } from '../demo/guiones-edificios-demo';
import { MotorNarrativo } from '../narrativa/motor-narrativo';
import { EstadoNarrativo, GuionNarrativo, PersonajeNarrativo } from '../narrativa/narrativa.models';
import { AdaptadorPistasNarrativas } from './adaptador-pistas-narrativas';

/**
 * Error tipado emitido ante incompatibilidad de un snapshot narrativo.
 * Conserva el snapshot original intacto para auditoría o migración autorizada.
 */
export class ErrorIncompatibilidadSnapshot extends Error {
  constructor(
    public readonly codigo:
      | 'GUION_DISCREPANTE'
      | 'EDIFICIO_DISCREPANTE'
      | 'VERSION_GUION_DISCREPANTE'
      | 'CASO_DISCREPANTE'
      | 'ESTRUCTURA_CORRUPTA',
    mensaje: string,
    public readonly esperado: {
      readonly guionId: string;
      readonly edificioId: string;
      readonly versionGuion?: number | string;
      readonly casoId?: string;
    },
    public readonly recibido: {
      readonly guionId: string;
      readonly edificioId: string;
      readonly versionGuion?: number | string;
      readonly casoId?: string;
    },
    public readonly snapshotConservado: SnapshotNarrativoEdificio
  ) {
    super(`Snapshot incompatible: ${mensaje}`);
    this.name = 'ErrorIncompatibilidadSnapshot';
  }
}

/**
 * Snapshot inmutable del progreso narrativo de un edificio individual.
 */
export interface SnapshotNarrativoEdificio {
  readonly edificioId: string;
  readonly guionId: string;
  readonly versionGuion?: number | string;
  readonly casoId?: string;
  readonly escenaId: string;
  readonly dialogoIndex: number;
  readonly marcasLocales: Readonly<Record<string, boolean>>;
  readonly personajes: readonly PersonajeNarrativo[];
  readonly visitadas: readonly string[];
  readonly opcionesElegidas: readonly string[];
  readonly efectosEjecutados: readonly string[];
  readonly terminado: boolean;
}

/**
 * Coordinador de continuidad narrativa para interiores de edificios (Fase 9).
 * - Mantiene instancias y snapshots aislados por edificio.
 * - Restaura el punto exacto de conversación al salir y regresar.
 * - Despacha pistas a LibretaStore de forma idempotente mediante AdaptadorPistasNarrativas.
 * - Sin dependencias de Phaser, Canvas o llamadas HTTP a Backend.
 */
@Injectable()
export class CoordinadorNarrativoInteriores {
  private readonly adaptadorPistas = inject(AdaptadorPistasNarrativas);

  private readonly motores = new Map<string, MotorNarrativo>();
  private readonly snapshots = new Map<string, SnapshotNarrativoEdificio>();
  private readonly opcionesElegidasPorEdificio = new Map<string, string[]>();
  private readonly efectosEjecutados = new Set<string>();
  private marcasGlobales: Record<string, boolean> = {};

  /**
   * Inicia o reanuda la conversación en un edificio específico.
   * Si ya existía una conversación previa, conserva el nodo y estado exacto donde se dejó.
   */
  iniciarOReanudar(edificioId: string, guiones = GUIONES_POR_EDIFICIO): MotorNarrativo {
    // 1. Si ya hay una instancia activa en memoria para este edificio, la reutilizamos
    let motor = this.motores.get(edificioId);

    if (!motor) {
      const guion = guiones[edificioId];
      if (!guion) {
        throw new Error(`No existe guion narrativo configurado para el edificio: ${edificioId}`);
      }

      motor = new MotorNarrativo(guion);

      // Si existe un snapshot previo capturado de una visita anterior, restauramos su estado con validación estricta
      const snapshot = this.snapshots.get(edificioId);
      if (snapshot) {
        if (snapshot.guionId !== guion.id) {
          throw new ErrorIncompatibilidadSnapshot(
            'GUION_DISCREPANTE',
            `guion esperado '${guion.id}', recibido '${snapshot.guionId}'`,
            { guionId: guion.id, edificioId },
            { guionId: snapshot.guionId, edificioId: snapshot.edificioId, versionGuion: snapshot.versionGuion, casoId: snapshot.casoId },
            snapshot
          );
        }
        if (snapshot.edificioId !== edificioId) {
          throw new ErrorIncompatibilidadSnapshot(
            'EDIFICIO_DISCREPANTE',
            `edificio esperado '${edificioId}', recibido '${snapshot.edificioId}'`,
            { guionId: guion.id, edificioId },
            { guionId: snapshot.guionId, edificioId: snapshot.edificioId, versionGuion: snapshot.versionGuion, casoId: snapshot.casoId },
            snapshot
          );
        }

        // Validamos coherencia de decisiones previas registradas
        const decisionesGuion = new Set(guion.escenas.flatMap((e) => e.decisiones.map((d) => d.id)));
        for (const opt of snapshot.opcionesElegidas) {
          if (!decisionesGuion.has(opt)) {
            throw new ErrorIncompatibilidadSnapshot(
              'ESTRUCTURA_CORRUPTA',
              `decisión previa desconocida '${opt}' en guion '${guion.id}'`,
              { guionId: guion.id, edificioId },
              { guionId: snapshot.guionId, edificioId: snapshot.edificioId, versionGuion: snapshot.versionGuion, casoId: snapshot.casoId },
              snapshot
            );
          }
        }

        const estadoARestaurar: EstadoNarrativo = {
          escenaId: snapshot.escenaId,
          dialogo: snapshot.dialogoIndex,
          marcas: { ...snapshot.marcasLocales, ...this.marcasGlobales },
          personajes: snapshot.personajes,
          visitadas: snapshot.visitadas,
          transicion: null,
        };
        motor.restaurar(estadoARestaurar);
      } else {
        // Primera visita: registramos efectos de alEntrar inicial
        this.registrarEfectosIniciales(edificioId, guion, motor.estado);
      }

      this.motores.set(edificioId, motor);
    }

    // Sincronizamos marcas con el adaptador de pistas (idempotente: no re-emite pistas ya descubiertas)
    this.adaptadorPistas.sincronizarConEstado(motor.estado);

    return motor;
  }

  /**
   * Congela y almacena el estado narrativo del edificio al solicitar salir al exterior.
   */
  pausarYGuardar(edificioId: string, guiones = GUIONES_POR_EDIFICIO): SnapshotNarrativoEdificio | null {
    const motor = this.motores.get(edificioId);
    if (!motor) return this.snapshots.get(edificioId) ?? null;

    const estado = motor.estado;
    const guion = guiones[edificioId];
    const guionId = guion?.id ?? edificioId;
    const opcionesElegidas = this.opcionesElegidasPorEdificio.get(edificioId) ?? [];

    const snapshot: SnapshotNarrativoEdificio = {
      edificioId,
      guionId,
      escenaId: estado.escenaId,
      dialogoIndex: estado.dialogo,
      marcasLocales: { ...estado.marcas },
      personajes: [...estado.personajes],
      visitadas: [...estado.visitadas],
      opcionesElegidas: [...opcionesElegidas],
      efectosEjecutados: Array.from(this.efectosEjecutados),
      terminado: motor.terminado,
    };

    this.snapshots.set(edificioId, snapshot);
    // Acumulamos marcas que pudieran ser globales
    this.marcasGlobales = { ...this.marcasGlobales, ...estado.marcas };

    return snapshot;
  }

  /**
   * Avanza el diálogo dentro del edificio activo.
   */
  avanzarDialogo(edificioId: string): void {
    const motor = this.motores.get(edificioId);
    if (!motor) return;
    motor.avanzarDialogo();
    this.adaptadorPistas.sincronizarConEstado(motor.estado);
  }

  /**
   * Elige una opción de decisión dentro del diálogo del edificio activo.
   */
  elegirOpcion(edificioId: string, decisionId: string): void {
    const motor = this.motores.get(edificioId);
    if (!motor) return;

    // Registramos la opción elegida
    const lista = this.opcionesElegidasPorEdificio.get(edificioId) ?? [];
    lista.push(decisionId);
    this.opcionesElegidasPorEdificio.set(edificioId, lista);

    // Registramos las consecuencias con identificadores únicos estables
    const decision = motor.decisionesDisponibles.find((d) => d.id === decisionId);
    if (decision) {
      for (const consecuencia of decision.consecuencias) {
        const clave = this.generarClaveConsecuencia(edificioId, decision.id, consecuencia);
        this.efectosEjecutados.add(clave);
      }
    }

    motor.elegir(decisionId);
    this.adaptadorPistas.sincronizarConEstado(motor.estado);
  }

  /**
   * Completa la transición a la siguiente escena dentro del edificio.
   */
  completarTransicion(edificioId: string): void {
    const motor = this.motores.get(edificioId);
    if (!motor) return;
    motor.completarTransicion();
    this.adaptadorPistas.sincronizarConEstado(motor.estado);
  }

  /**
   * Retrocede un paso en el historial de diálogo local del edificio.
   */
  volver(edificioId: string): void {
    const motor = this.motores.get(edificioId);
    if (!motor) return;
    motor.volver();
    this.adaptadorPistas.sincronizarConEstado(motor.estado);
  }

  /**
   * Consulta el motor narrativo activo de un edificio.
   */
  obtenerMotor(edificioId: string): MotorNarrativo | null {
    return this.motores.get(edificioId) ?? null;
  }

  /**
   * Consulta el snapshot guardado de un edificio.
   */
  obtenerSnapshot(edificioId: string): SnapshotNarrativoEdificio | null {
    return this.snapshots.get(edificioId) ?? null;
  }

  /**
   * Indica si la conversación en un edificio ha concluido sus diálogos y decisiones.
   */
  estaCompletado(edificioId: string): boolean {
    const motor = this.motores.get(edificioId);
    if (motor) return motor.terminado;
    const snapshot = this.snapshots.get(edificioId);
    return snapshot ? snapshot.terminado : false;
  }

  /**
   * Retorna el número total de edificios visitados en la sesión actual.
   */
  totalEdificiosVisitados(): number {
    return this.snapshots.size;
  }

  /**
   * Limpia todos los estados y snapshots para un nuevo recorrido demostrativo.
   */
  reiniciarSesion(): void {
    this.motores.clear();
    this.snapshots.clear();
    this.opcionesElegidasPorEdificio.clear();
    this.efectosEjecutados.clear();
    this.marcasGlobales = {};
    this.adaptadorPistas.reiniciar();
  }

  private registrarEfectosIniciales(edificioId: string, guion: GuionNarrativo, estado: EstadoNarrativo): void {
    const escenaInicial = guion.escenas.find((e) => e.id === guion.inicio);
    if (!escenaInicial) return;
    for (const c of escenaInicial.alEntrar) {
      const clave = this.generarClaveConsecuencia(edificioId, escenaInicial.id, c);
      this.efectosEjecutados.add(clave);
    }
  }

  private generarClaveConsecuencia(
    edificioId: string,
    origenId: string,
    c: { tipo: string; marca?: string; valor?: boolean; personajeId?: string; estado?: string; expresion?: string }
  ): string {
    if (c.tipo === 'marca') {
      return `${edificioId}:${origenId}:marca:${c.marca}:${c.valor}`;
    }
    return `${edificioId}:${origenId}:personaje:${c.personajeId}:${c.estado}:${c.expresion}`;
  }
}
