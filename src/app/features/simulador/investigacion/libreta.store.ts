import { Injectable, signal } from '@angular/core';
import { EstadoLibreta, EventoPistaObtenida } from './investigacion.models';

/** Una instancia por simulador; sin HTTP, Phaser o almacenamiento del navegador. */
@Injectable()
export class LibretaStore {
  private readonly datos = signal<EstadoLibreta>(this.nuevaSesion());
  readonly estado = this.datos.asReadonly();
  private nuevaSesion(): EstadoLibreta {
    return { contexto: { modo: 'demostracion', sesionId: crypto.randomUUID() }, pistas: [], notas: [], sincronizacion: 'solo-memoria-demostrativa' };
  }
  reiniciarDemostracion(): void { this.datos.set(this.nuevaSesion()); }
  crearNota(texto: string): string | null {
    const limpio = texto.trim();
    if (!limpio || limpio.length > 4000) return null;
    const ahora = new Date().toISOString(), id = crypto.randomUUID();
    this.datos.update(e => ({ ...e, notas: [...e.notas, { id, texto: limpio, creadaEn: ahora, modificadaEn: ahora }] }));
    return id;
  }
  actualizarNota(id: string, texto: string): boolean {
    const limpio = texto.trim();
    if (!limpio || limpio.length > 4000 || !this.estado().notas.some(n => n.id === id)) return false;
    this.datos.update(e => ({ ...e, notas: e.notas.map(n => n.id === id ? { ...n, texto: limpio, modificadaEn: new Date().toISOString() } : n) }));
    return true;
  }
  eliminarNota(id: string): boolean {
    if (!this.estado().notas.some(n => n.id === id)) return false;
    this.datos.update(e => ({ ...e, notas: e.notas.filter(n => n.id !== id) }));
    return true;
  }
  registrarPista(evento: EventoPistaObtenida): boolean {
    const e = this.estado(), contexto = evento.contexto, pista = evento.pista;
    if (evento.tipo !== 'pista-obtenida' || contexto.modo !== 'demostracion' || e.contexto.modo !== 'demostracion' || contexto.sesionId !== e.contexto.sesionId) return false;
    if (![pista.id, pista.titulo, pista.descripcion, pista.origen.espacioId, pista.origen.interaccionId, pista.origen.lugar].every(v => typeof v === 'string' && v.trim().length > 0)) return false;
    if (e.pistas.some(p => p.id === pista.id)) return false;
    this.datos.update(estado => ({ ...estado, pistas: [...estado.pistas, { ...pista, origen: { ...pista.origen }, obtenidaEn: new Date().toISOString() }] }));
    return true;
  }
}
