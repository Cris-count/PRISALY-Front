import { Injectable, signal } from '@angular/core';
import { EdificioTecnico, EventoMundo, MundoTecnico, Punto } from './mundo-tecnico.models';
import type { ControlMundo } from './phaser-mundo';

export interface EstadoAdaptadorMundo {
  readonly listo: boolean;
  readonly suspendida: boolean;
  readonly posicion: Punto | null;
  readonly destino: Punto | null;
  readonly entradaActual: EdificioTecnico | null;
  readonly interiorActivo: EdificioTecnico | null;
}

/**
 * Adaptador tipado Angular–Phaser para la Fase 7.
 * Conecta eventos del mundo con los componentes de la aplicación sin acoplar
 * el motor gráfico a servicios académicos ni de calificación.
 */
@Injectable()
export class AdaptadorMundoSimulador {
  private control: ControlMundo | null = null;
  private mundoActual: MundoTecnico | null = null;
  private suspensionExterna = false;

  readonly listo = signal(false);
  readonly suspendida = signal(false);
  readonly posicion = signal<Punto | null>(null);
  readonly destino = signal<Punto | null>(null);
  readonly entradaActual = signal<EdificioTecnico | null>(null);
  readonly interiorActivo = signal<EdificioTecnico | null>(null);
  readonly mensaje = signal<string>('Inicializando visor de exploración…');

  /**
   * Conecta el controlador de Phaser con el adaptador.
   */
  conectar(control: ControlMundo, mundo: MundoTecnico): void {
    if (this.control && this.control !== control) this.control.destruir();
    this.control = control;
    this.mundoActual = mundo;
    this.aplicarSuspension();
  }

  /**
   * Procesa de forma tipada e idempotente los eventos emitidos por el mundo Phaser.
   */
  procesarEvento(evento: EventoMundo): void {
    switch (evento.tipo) {
      case 'listo':
        this.listo.set(true);
        this.posicion.set(evento.posicion);
        this.mensaje.set('Ciudad lista para explorar. Selecciona un lugar o camino.');
        break;

      case 'moviendo':
        this.destino.set(evento.destino);
        this.entradaActual.set(null);
        this.mensaje.set('Caminando hacia el destino…');
        break;

      case 'llegada':
        this.posicion.set(evento.posicion);
        this.destino.set(null);
        if (evento.entradaId && this.mundoActual) {
          const edificio = this.mundoActual.edificios.find((e) => e.id === evento.entradaId) ?? null;
          this.entradaActual.set(edificio);
          if (edificio) {
            this.mensaje.set(`Llegaste a la entrada de ${edificio.nombre}.`);
          } else {
            this.mensaje.set('Llegaste al punto seleccionado.');
          }
        } else {
          this.entradaActual.set(null);
          this.mensaje.set('Llegaste al punto seleccionado.');
        }
        break;

      case 'rechazado':
        if (evento.motivo === 'fuera-de-camino') {
          this.mensaje.set('Destino inaccesible: el punto no está sobre un camino transitable.');
        } else {
          this.mensaje.set('Destino no alcanzable en la red actual.');
        }
        break;
    }
  }

  /**
   * Solicita al personaje caminar hacia un nodo o entrada de edificio.
   */
  caminarA(nodoId: string): void {
    if (this.suspendida() || !this.control) {
      return;
    }
    this.control.irA(nodoId);
  }

  /**
   * Solicita la entrada formal a un edificio.
   * Suspende explícitamente la interacción en Phaser y abre el interior.
   */
  solicitarEntrada(edificio: EdificioTecnico): boolean {
    const configurado = this.mundoActual?.edificios.find((e) => e.id === edificio.id);
    const entrada = this.mundoActual?.nodos.find((n) => n.id === configurado?.entrada)?.posicion;
    const posicion = this.posicion();
    if (
      !this.listo() || this.suspendida() || !this.control || !configurado ||
      this.entradaActual()?.id !== configurado.id || !entrada || !posicion ||
      Math.hypot(posicion.x - entrada.x, posicion.y - entrada.y) >= 1
    ) {
      return false;
    }
    // Suspende explícitamente el mundo para congelar posición y deshabilitar clics
    this.interiorActivo.set(configurado);
    this.aplicarSuspension();
    this.mensaje.set(`Dentro de: ${configurado.nombre}`);
    return true;
  }

  /**
   * Retorna desde el interior al mapa de la ciudad.
   * Restaura la interacción en Phaser conservando la posición exacta del avatar.
   */
  salirDeInterior(): void {
    const edificio = this.interiorActivo();
    if (!edificio) return;
    this.interiorActivo.set(null);
    // Solo reactiva si tampoco hay una libreta o confirmación pendiente.
    this.aplicarSuspension();
    this.entradaActual.set(edificio);
    this.mensaje.set(`De regreso en la entrada de ${edificio.nombre}.`);
  }

  /**
   * Control explícito de suspensión:
   * Detiene el movimiento, desactiva listeners de entrada y previene clics acumulados.
   */
  suspender(valor: boolean): void {
    this.suspensionExterna = valor;
    this.aplicarSuspension();
  }

  private aplicarSuspension(): void {
    const valor = this.suspensionExterna || this.interiorActivo() !== null;
    this.suspendida.set(valor);
    if (this.control) {
      this.control.suspenderInteraccion(valor);
    }
  }

  /**
   * Limpieza al desmontar el componente contenedor.
   */
  desconectar(): void {
    if (this.control) {
      this.control.destruir();
      this.control = null;
    }
    this.mundoActual = null;
    this.suspensionExterna = false;
    this.listo.set(false);
    this.suspendida.set(false);
    this.posicion.set(null);
    this.destino.set(null);
    this.entradaActual.set(null);
    this.interiorActivo.set(null);
  }
}
