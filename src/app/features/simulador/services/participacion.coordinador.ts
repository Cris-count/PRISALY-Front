import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { IntentoM5, RespuestaGuardadaM5 } from '../models/participacion.models';
import { ContenidoIntentoM5 } from '../models/contenido-intento.models';
import { FalloParticipacionError } from './participacion-http.gateway';
import { ParticipacionGateway } from './participacion.gateway';

export interface SeleccionAcademica {
  readonly idPregunta: string;
  readonly idOpcionSeleccionada: string;
}

export type EstadoSincronizacion =
  | 'inactivo'
  | 'cargando'
  | 'disponible'
  | 'guardando'
  | 'guardada'
  | 'por-verificar'
  | 'conflicto'
  | 'finalizado'
  | 'error';

/** Consumidor de N9, sin reglas narrativas ni activación del proveedor HTTP. */
@Injectable()
export class ParticipacionCoordinador {
  private readonly gateway = inject(ParticipacionGateway);
  private generacion = 0;
  private consulta: Subscription | null = null;
  private escritura: Subscription | null = null;
  private consultaContenido: Subscription | null = null;
  private readonly contenidoActual = signal<ContenidoIntentoM5 | null>(null);
  private readonly faseContenido = signal<'inactivo' | 'cargando' | 'disponible' | 'error'>(
    'inactivo',
  );
  readonly contenido = this.contenidoActual.asReadonly();
  readonly estadoContenido = this.faseContenido.asReadonly();
  private intentoId: string | null = null;
  private readonly actual = signal<IntentoM5 | null>(null);
  private readonly fase = signal<EstadoSincronizacion>('inactivo');
  private readonly pendiente = signal<SeleccionAcademica | null>(null);
  private readonly fallo = signal<unknown>(null);

  readonly intento = this.actual.asReadonly();
  readonly estado = this.fase.asReadonly();
  readonly seleccionPendiente = this.pendiente.asReadonly();
  readonly error = this.fallo.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cerrar());
  }

  /** El origen autorizado del ID y del contenido se resuelve fuera de este coordinador. */
  cargar(idIntento: string): void {
    this.cerrar();
    this.intentoId = idIntento;
    this.leer(false);
  }

  /** Lectura aislada: no habilita guardados ni construye un guion narrativo. */
  cargarContenido(idIntento: string): void {
    this.cerrar();
    const generacion = this.generacion;
    this.faseContenido.set('cargando');
    let recibido = false;
    this.consultaContenido = this.gateway
      .consultarContenidoIntento(idIntento)
      .pipe(take(1))
      .subscribe({
        next: (contenido) => {
          recibido = true;
          if (generacion !== this.generacion) return;
          if (contenido.idIntento.toLowerCase() !== idIntento.toLowerCase()) {
            this.fallo.set(new Error('El contenido no corresponde al intento solicitado.'));
            this.faseContenido.set('error');
            return;
          }
          this.contenidoActual.set(structuredClone(contenido));
          this.faseContenido.set('disponible');
        },
        error: (error) => {
          if (generacion !== this.generacion) return;
          this.fallo.set(error);
          this.faseContenido.set('error');
        },
        complete: () => {
          if (!recibido && generacion === this.generacion) this.faseContenido.set('error');
        },
      });
  }

  cerrar(): void {
    this.generacion++;
    this.consulta?.unsubscribe();
    this.escritura?.unsubscribe();
    this.consultaContenido?.unsubscribe();
    this.consultaContenido = null;
    this.contenidoActual.set(null);
    this.faseContenido.set('inactivo');
    this.consulta = this.escritura = null;
    this.intentoId = null;
    this.actual.set(null);
    this.pendiente.set(null);
    this.fallo.set(null);
    this.fase.set('inactivo');
  }

  /** No reenvía escrituras: consulta el estado vigente y conserva la intención local. */
  verificar(): void {
    if (this.intentoId && !['cargando', 'guardando', 'inactivo'].includes(this.fase())) {
      this.leer(true);
    }
  }

  /**
   * Solo acepta IDs académicos ya resueltos por el enlace autorizado.
   * El callback permite aplicar la elección narrativa una vez confirmada.
   * La reconciliación no ejecuta callbacks antiguos: el consumidor debe decidir
   * explícitamente cómo continuar a partir de la respuesta confirmada.
   */
  guardar(seleccion: SeleccionAcademica, confirmado?: () => void): void {
    const intento = this.actual();
    if (
      !intento ||
      !['disponible', 'guardada'].includes(this.fase()) ||
      intento.estado !== 'EnCurso'
    )
      return;
    const solicitud = { ...seleccion };
    const anterior = intento.respuestas.find((r) => r.idPregunta === solicitud.idPregunta);
    if (anterior?.idOpcionSeleccionada === solicitud.idOpcionSeleccionada) {
      this.pendiente.set(null);
      this.fase.set('guardada');
      confirmado?.();
      return;
    }
    this.pendiente.set(solicitud);
    this.fallo.set(null);
    this.fase.set('guardando');
    const generacion = this.generacion;
    const revision = anterior?.revision ?? 0;
    let recibido = false;
    this.escritura = this.gateway
      .registrarRespuesta(
        intento.idIntento,
        solicitud.idPregunta,
        solicitud.idOpcionSeleccionada,
        revision,
      )
      .pipe(take(1))
      .subscribe({
        next: (respuesta) => {
          recibido = true;
          if (generacion !== this.generacion) return;
          if (
            respuesta.idPregunta !== solicitud.idPregunta ||
            respuesta.idOpcionSeleccionada !== solicitud.idOpcionSeleccionada ||
            !Number.isInteger(respuesta.revision) ||
            respuesta.revision <= revision
          ) {
            this.fallo.set(new Error('Confirmación de respuesta inconsistente.'));
            this.fase.set('por-verificar');
            return;
          }
          this.actual.set({
            ...intento,
            respuestas: [
              ...intento.respuestas.filter((r) => r.idPregunta !== solicitud.idPregunta),
              { ...respuesta },
            ],
          });
          this.pendiente.set(null);
          this.fase.set('guardada');
          confirmado?.();
        },
        error: (error) => {
          if (generacion !== this.generacion) return;
          this.fallo.set(error);
          this.fase.set(
            error instanceof FalloParticipacionError && error.estado === 409
              ? 'conflicto'
              : error instanceof FalloParticipacionError && [401, 403, 404].includes(error.estado)
                ? 'error'
                : 'por-verificar',
          );
        },
        complete: () => {
          if (!recibido && generacion === this.generacion) this.fase.set('por-verificar');
        },
      });
  }

  private leer(reconciliar: boolean): void {
    const id = this.intentoId!;
    const generacion = this.generacion;
    this.fase.set('cargando');
    this.fallo.set(null);
    let recibido = false;
    this.consulta = this.gateway
      .consultarIntento(id)
      .pipe(take(1))
      .subscribe({
        next: (intento) => {
          recibido = true;
          if (generacion !== this.generacion) return;
          if (intento.idIntento !== id) {
            this.fallo.set(new Error('El intento recibido no corresponde al solicitado.'));
            this.fase.set(reconciliar ? 'por-verificar' : 'error');
            return;
          }
          this.actual.set(structuredClone(intento));
          const pendiente = this.pendiente();
          const confirmada: RespuestaGuardadaM5 | undefined = pendiente
            ? intento.respuestas.find((r) => r.idPregunta === pendiente.idPregunta)
            : undefined;
          const coincide =
            pendiente && confirmada?.idOpcionSeleccionada === pendiente.idOpcionSeleccionada;
          if (coincide) this.pendiente.set(null);
          this.fase.set(
            intento.estado === 'Finalizado' ? 'finalizado' : coincide ? 'guardada' : 'disponible',
          );
        },
        error: (error) => {
          if (generacion !== this.generacion) return;
          this.fallo.set(error);
          this.fase.set(reconciliar ? 'por-verificar' : 'error');
        },
        complete: () => {
          if (!recibido && generacion === this.generacion) {
            this.fase.set(reconciliar ? 'por-verificar' : 'error');
          }
        },
      });
  }
}
