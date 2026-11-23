import type { Transporte } from './puente/transporte';

/** Superficie pública de la biblioteca oficial de Epic; permite probar el canal sin una GPU. */
export interface CanalPixelStreaming {
  emitUIInteraction(descriptor: object): boolean;
  addResponseEventListener(nombre: string, oyente: (texto: string) => void): void;
  removeResponseEventListener(nombre: string): void;
  disconnect(): void;
}

export class TransportePixelStreaming implements Transporte {
  private activo = false;
  private cerrado = false;
  private readonly receptores = new Set<(texto: string) => void>();
  private readonly desconexiones = new Set<() => void>();
  private readonly nombre = 'prisaly-protocolo-v1';

  constructor(private readonly canal: CanalPixelStreaming) {
    canal.addResponseEventListener(this.nombre, (texto) => {
      if (this.conectado) for (const receptor of this.receptores) receptor(texto);
    });
  }

  get conectado(): boolean { return this.activo && !this.cerrado; }

  abrir(): void { if (!this.cerrado) this.activo = true; }

  notificarDesconexion(): void {
    if (!this.activo) return;
    this.activo = false;
    for (const oyente of this.desconexiones) oyente();
  }

  enviar(texto: string): void {
    if (!this.conectado) throw new Error('TRANSPORTE_DESCONECTADO');
    // Epic aplica JSON.stringify: recibe el objeto del sobre, no otro texto JSON.
    const descriptor: unknown = JSON.parse(texto);
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) throw new Error('MENSAJE_INVALIDO');
    if (!this.canal.emitUIInteraction(descriptor)) throw new Error('TRANSPORTE_DESCONECTADO');
  }

  alRecibir(oyente: (texto: string) => void): () => void {
    this.receptores.add(oyente);
    return () => this.receptores.delete(oyente);
  }

  alDesconectar(oyente: () => void): () => void {
    this.desconexiones.add(oyente);
    return () => this.desconexiones.delete(oyente);
  }

  cerrar(): void {
    if (this.cerrado) return;
    this.notificarDesconexion();
    this.cerrado = true;
    this.canal.removeResponseEventListener(this.nombre);
    this.receptores.clear();
    this.desconexiones.clear();
    this.canal.disconnect();
  }
}
