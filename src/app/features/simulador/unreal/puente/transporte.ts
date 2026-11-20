/**
 * Transporte de texto entre Angular y Unreal.
 * Implementaciones previstas:
 *   - CanalMemoria (este paquete): pruebas y demo, sin red.
 *   - Pixel Streaming 2 (pendiente, requiere Unreal): canal de datos WebRTC.
 *   - WebSocket local (pendiente): Unreal en el equipo del desarrollador sin streaming.
 * El adaptador solo conoce esta interfaz, nunca la tecnologia concreta.
 */
export interface Transporte {
  readonly conectado: boolean;
  enviar(texto: string): void;
  alRecibir(oyente: (texto: string) => void): () => void;
  alDesconectar(oyente: () => void): () => void;
  cerrar(): void;
}

export interface OpcionesCanal {
  /** 0 = entrega en la siguiente microtarea (determinista para pruebas). */
  latenciaMs?: number;
}

class Extremo implements Transporte {
  private oyentes = new Set<(t: string) => void>();
  private oyentesDesconexion = new Set<() => void>();
  otro!: Extremo;
  constructor(private canal: CanalMemoria) {}

  get conectado(): boolean { return this.canal.conectado; }

  enviar(texto: string): void {
    if (!this.canal.conectado) throw new Error('TRANSPORTE_DESCONECTADO');
    this.canal.enviados++;
    const destino = this.otro;
    const entregar = () => { if (this.canal.conectado) destino.entregar(texto); };
    const lat = this.canal.opciones.latenciaMs ?? 0;
    if (lat > 0) setTimeout(entregar, lat); else queueMicrotask(entregar);
  }
  entregar(texto: string): void { for (const o of this.oyentes) o(texto); }
  alRecibir(o: (t: string) => void) { this.oyentes.add(o); return () => this.oyentes.delete(o); }
  alDesconectar(o: () => void) { this.oyentesDesconexion.add(o); return () => this.oyentesDesconexion.delete(o); }
  notificarDesconexion(): void { for (const o of this.oyentesDesconexion) o(); }
  cerrar(): void { this.canal.desconectar(); }
}

/** Par de extremos conectados en memoria: `angular` <-> `unreal`. */
export class CanalMemoria {
  conectado = true;
  enviados = 0;
  readonly angular: Extremo;
  readonly unreal: Extremo;
  constructor(readonly opciones: OpcionesCanal = {}) {
    this.angular = new Extremo(this);
    this.unreal = new Extremo(this);
    this.angular.otro = this.unreal;
    this.unreal.otro = this.angular;
  }
  /** Simula la caida de la conexion: los mensajes en vuelo se pierden. */
  desconectar(): void {
    if (!this.conectado) return;
    this.conectado = false;
    this.angular.notificarDesconexion();
    this.unreal.notificarDesconexion();
  }
}

/** Espera a que se entreguen los mensajes pendientes con latencia 0. */
export const vaciarCola = () => new Promise<void>((r) => setTimeout(r, 0));
