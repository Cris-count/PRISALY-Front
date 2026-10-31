import { HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import { clasificarErrorApi } from '../../../core/http/clasificar-error-api';

import { CASO_DEMOSTRACION } from '../demo/caso-demostracion';
import { CasoVista, FaseSimulador, OrigenDatos, PreguntaVista } from '../models/simulador.models';
import { ContratoPendienteError, ParticipacionGateway } from './participacion.gateway';

const MENSAJE_ERROR_GENERICO = 'No fue posible comunicarse con el servicio de participación.';
const MENSAJE_CONTRATO_PENDIENTE =
  'La conexión con M5 aún no está disponible: faltan los endpoints aprobados. ' +
  'No se inició ningún intento.';
const MENSAJE_RESPUESTA_NO_INTERPRETABLE =
  'La respuesta de M5 todavía no puede interpretarse: falta el contrato aprobado.';

/**
 * Estado de PRESENTACIÓN del simulador, en memoria.
 *
 * - No persiste nada en el navegador: recargar la página vuelve a la pantalla
 *   inicial y nunca inicia un intento por sí sola.
 * - Las selecciones solo existen en esta vista; registrarlas en M5 queda
 *   bloqueado hasta que exista el contrato.
 * - El temporizador es informativo: no impide seleccionar ni decide si una
 *   respuesta se acepta; eso corresponde al backend.
 *
 * Se provee a nivel de página, por lo que su ciclo de vida es el de la vista.
 */
@Injectable()
export class SimuladorStore {
  private readonly gateway = inject(ParticipacionGateway);

  private readonly faseActual = signal<FaseSimulador>('inicio');
  private readonly origenActual = signal<OrigenDatos | null>(null);
  private readonly casoActual = signal<CasoVista | null>(null);
  private readonly indiceActual = signal(0);
  private readonly seleccionesActuales = signal<ReadonlyMap<string, string>>(new Map());
  private readonly mensajeError = signal<string | null>(null);
  private readonly errorReintentable = signal(false);
  private readonly segundos = signal<number | null>(null);
  private temporizador: ReturnType<typeof setInterval> | null = null;

  readonly fase = this.faseActual.asReadonly();
  readonly origen = this.origenActual.asReadonly();
  readonly caso = this.casoActual.asReadonly();
  readonly indice = this.indiceActual.asReadonly();
  readonly selecciones = this.seleccionesActuales.asReadonly();
  readonly error = this.mensajeError.asReadonly();
  /** El último fallo admite reintentar la misma consulta (sin conexión o error del servidor). */
  readonly reintentable = this.errorReintentable.asReadonly();
  readonly segundosRestantes = this.segundos.asReadonly();

  readonly preguntas = computed<readonly PreguntaVista[]>(() => this.casoActual()?.preguntas ?? []);
  readonly totalPreguntas = computed(() => this.preguntas().length);
  readonly preguntaActual = computed<PreguntaVista | null>(() => this.preguntas()[this.indiceActual()] ?? null);
  readonly seleccionActual = computed(() => {
    const pregunta = this.preguntaActual();
    return pregunta ? (this.seleccionesActuales().get(pregunta.id) ?? null) : null;
  });
  readonly respondidas = computed(() => this.preguntas().filter((p) => this.seleccionesActuales().has(p.id)).length);
  readonly esPrimera = computed(() => this.indiceActual() === 0);
  readonly esUltima = computed(() => this.indiceActual() >= this.totalPreguntas() - 1);
  readonly tiempoAgotado = computed(() => this.segundos() === 0);
  readonly esDemostracion = computed(() => this.origenActual() === 'demostracion');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detenerTemporizador());
  }

  /**
   * Solicita a M5 las sesiones autorizadas para iniciar un intento real.
   * Mientras no exista el contrato, termina en estado de error con un
   * mensaje explícito; nunca simula un intento.
   */
  consultarSesiones(): void {
    if (this.faseActual() === 'cargando') {
      return;
    }
    this.mensajeError.set(null);
    this.faseActual.set('cargando');
    this.gateway.consultarSesionesAutorizadas().subscribe({
      next: () => this.fallar(MENSAJE_RESPUESTA_NO_INTERPRETABLE),
      error: (error: unknown) => this.fallarPor(error),
    });
  }

  /** Abre la vista con datos simulados, identificados como tales. */
  explorarDemostracion(): void {
    this.reiniciarEstado();
    this.origenActual.set('demostracion');
    this.casoActual.set(CASO_DEMOSTRACION);
    this.faseActual.set('en-curso');
    this.iniciarTemporizador(CASO_DEMOSTRACION.duracionSegundos);
  }

  seleccionarOpcion(opcionId: string): void {
    const pregunta = this.preguntaActual();
    if (this.faseActual() !== 'en-curso' || !pregunta || !pregunta.opciones.some((o) => o.id === opcionId)) {
      return;
    }
    const siguientes = new Map(this.seleccionesActuales());
    siguientes.set(pregunta.id, opcionId);
    this.seleccionesActuales.set(siguientes);
  }

  siguiente(): void {
    this.irAPregunta(this.indiceActual() + 1);
  }

  anterior(): void {
    this.irAPregunta(this.indiceActual() - 1);
  }

  irAPregunta(indice: number): void {
    if (this.faseActual() === 'en-curso' && indice >= 0 && indice < this.totalPreguntas()) {
      this.indiceActual.set(indice);
    }
  }

  solicitarFinalizacion(): void {
    if (this.faseActual() === 'en-curso') {
      this.faseActual.set('confirmando');
    }
  }

  cancelarFinalizacion(): void {
    if (this.faseActual() === 'confirmando') {
      this.faseActual.set('en-curso');
    }
  }

  /**
   * Cierra la vista de demostración. Con datos de M5 esta acción deberá
   * invocar `finalizarIntento`, hoy bloqueada por contrato.
   */
  confirmarFinalizacion(): void {
    if (this.faseActual() !== 'confirmando' || !this.esDemostracion()) {
      return;
    }
    this.detenerTemporizador();
    this.faseActual.set('finalizado');
  }

  volverAlInicio(): void {
    this.reiniciarEstado();
  }

  private fallarPor(error: unknown): void {
    if (error instanceof ContratoPendienteError) {
      this.fallar(MENSAJE_CONTRATO_PENDIENTE);
    } else if (error instanceof HttpErrorResponse) {
      const fallo = clasificarErrorApi(error);
      this.fallar(fallo.mensaje, fallo.reintentable);
    } else {
      this.fallar(MENSAJE_ERROR_GENERICO);
    }
  }

  private fallar(mensaje: string, reintentable = false): void {
    this.mensajeError.set(mensaje);
    this.errorReintentable.set(reintentable);
    this.faseActual.set('error');
  }

  private reiniciarEstado(): void {
    this.detenerTemporizador();
    this.faseActual.set('inicio');
    this.origenActual.set(null);
    this.casoActual.set(null);
    this.indiceActual.set(0);
    this.seleccionesActuales.set(new Map());
    this.mensajeError.set(null);
    this.errorReintentable.set(false);
    this.segundos.set(null);
  }

  private iniciarTemporizador(duracion: number | null): void {
    this.detenerTemporizador();
    this.segundos.set(duracion);
    if (duracion === null || duracion <= 0) {
      return;
    }
    this.temporizador = setInterval(() => {
      const restantes = Math.max((this.segundos() ?? 0) - 1, 0);
      this.segundos.set(restantes);
      if (restantes === 0) {
        this.detenerTemporizador();
      }
    }, 1000);
  }

  private detenerTemporizador(): void {
    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }
}
