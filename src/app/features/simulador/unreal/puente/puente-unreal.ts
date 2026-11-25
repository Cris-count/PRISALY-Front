/**
 * Puente de integración experimental, importado del prototipo aislado F1.
 *
 * - No depende de Angular ni de Phaser; no implementa ControlMundo ni sustituye FabricaMundo.
 * - La pausa reversible y la posición del contrato actual no tienen equivalencia completa
 *   en el protocolo candidato. Resolver esa diferencia requiere una decisión explícita.
 *
 * Garantias que prueban los tests:
 *   - Nunca envia un mensaje que no pase su propio validador.
 *   - Descarta y registra todo mensaje entrante invalido o de otra sesion.
 *   - Cada orden con ack se resuelve con su ack (misma correlacion), se rechaza con
 *     orden.error o vence por tiempo.
 *   - bloquearExploracion() es irreversible: despues no sale ninguna orden de mundo y no
 *     se entregan eventos espaciales al dominio, aunque Unreal no confirme.
 */
import { validarObjeto, validarTexto, VERSION_PROTOCOLO, type Esquemas, type Mensaje } from '../protocolo/validador-mensaje';
import type { Transporte } from './transporte';
import { Registro } from './registro';

export class ErrorOrden extends Error {
  constructor(readonly codigo: string, readonly detalle = '', readonly idOrden: string | null = null) {
    super(`${codigo}${detalle ? ': ' + detalle : ''}`);
  }
}

export interface OpcionesAdaptador {
  sesion: string;
  timeoutAckMs?: number; // especificacion: 3000 ms para el bloqueo
  reloj?: () => number;
}

interface Pendiente {
  resolver: (m: Mensaje) => void;
  rechazar: (e: ErrorOrden) => void;
  temporizador: ReturnType<typeof setTimeout>;
  tipo: string;
}

const PERMITIDOS_TRAS_BLOQUEO = new Set(['latido']);

export class PuenteUnreal {
  readonly registro = new Registro();
  private pendientes = new Map<string, Pendiente>();
  private oyentes = new Set<(m: Mensaje) => void>();
  private n = 0;
  // El contador local no basta al crear otro puente para la misma sesion.
  // Mantener ids distintos entre conexiones evita correlacionar ACK antiguos.
  private readonly prefijoConexion = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  private _bloqueado = false;
  private destruido = false;
  private bloqueo: Promise<{ confirmado: boolean; codigo?: string }> | null = null;
  private readonly recibidos = new Set<string>();
  private reloj: () => number;
  private quitarOyentes: Array<() => void>;

  constructor(private transporte: Transporte, private esquemas: Esquemas, private op: OpcionesAdaptador) {
    this.reloj = op.reloj ?? Date.now;
    this.quitarOyentes = [
      transporte.alRecibir((t) => this.recibir(t)),
      transporte.alDesconectar(() => this.rechazarPendientes('TRANSPORTE_DESCONECTADO')),
    ];
  }

  get bloqueado(): boolean { return this._bloqueado; }
  get ordenesPendientes(): number { return this.pendientes.size; }

  /** Suscripcion a hechos de Unreal (zona.entro, interactuable.activado, ...). */
  suscribir(oyente: (m: Mensaje) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  /**
   * Envia una orden. Si el tipo requiere ack, la promesa se resuelve con el ack
   * (misma correlacion) o se rechaza con ErrorOrden (orden.error, TIMEOUT_ACK, ...).
   */
  enviar(tipo: string, datos: Record<string, unknown>): Promise<Mensaje | null> {
    if (this.destruido) return Promise.reject(new ErrorOrden('ADAPTADOR_DESTRUIDO'));
    if (this._bloqueado && !PERMITIDOS_TRAS_BLOQUEO.has(tipo)) {
      this.log('salida', tipo, null, null, 'RECHAZADO:EXPLORACION_BLOQUEADA');
      return Promise.reject(new ErrorOrden('EXPLORACION_BLOQUEADA', `no se envia ${tipo}`));
    }
    const m: Mensaje = {
      v: VERSION_PROTOCOLO, tipo, id: `a-${this.prefijoConexion}${String(++this.n).padStart(6, '0')}`,
      correlacion: null, sesion: this.op.sesion, ts: this.reloj(), origen: 'angular', datos,
    };
    const r = validarObjeto(this.esquemas, m);
    if (!r.ok) {
      this.log('salida', tipo, m.id, null, `RECHAZADO:${r.codigo}`);
      return Promise.reject(new ErrorOrden(r.codigo, r.detalle, m.id));
    }
    if (!this.transporte.conectado) {
      this.log('salida', tipo, m.id, null, 'RECHAZADO:TRANSPORTE_DESCONECTADO');
      return Promise.reject(new ErrorOrden('TRANSPORTE_DESCONECTADO', '', m.id));
    }
    const requiereAck = this.esquemas.catalogo.tipos[tipo].requiereAck;
    const promesa = requiereAck
      ? new Promise<Mensaje>((resolver, rechazar) => {
          const temporizador = setTimeout(() => {
            this.pendientes.delete(m.id);
            this.log('entrada', 'orden.ack', null, m.id, 'TIMEOUT_ACK');
            rechazar(new ErrorOrden('TIMEOUT_ACK', `${tipo} sin respuesta`, m.id));
          }, this.op.timeoutAckMs ?? 3000);
          this.pendientes.set(m.id, { resolver, rechazar, temporizador, tipo });
        })
      : Promise.resolve(null);
    try {
      this.transporte.enviar(JSON.stringify(m));
    } catch {
      const pendiente = this.pendientes.get(m.id);
      if (pendiente) {
        clearTimeout(pendiente.temporizador);
        this.pendientes.delete(m.id);
        pendiente.rechazar(new ErrorOrden('TRANSPORTE_DESCONECTADO', tipo, m.id));
        return promesa;
      }
      return Promise.reject(new ErrorOrden('TRANSPORTE_DESCONECTADO', tipo, m.id));
    }
    this.log('salida', tipo, m.id, null, 'ENVIADO');
    return promesa;
  }

  /**
   * Transicion irreversible previa al cuestionario. El bloqueo local ocurre SIEMPRE,
   * confirme o no Unreal; `confirmado` indica si llego el ack a tiempo.
   */
  bloquearExploracion(): Promise<{ confirmado: boolean; codigo?: string }> {
    if (this.bloqueo) return this.bloqueo;
    const promesa = this.enviar('mundo.bloquearExploracion', { motivo: 'cuestionario' });
    this._bloqueado = true; // desde este instante no sale ninguna otra orden de mundo
    this.bloqueo = promesa.then(() => ({ confirmado: true }),
      (e: ErrorOrden) => ({ confirmado: false, codigo: e.codigo }));
    return this.bloqueo;
  }

  /** Cierra el canal (en produccion: cierra el stream y libera la instancia). */
  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.rechazarPendientes('ADAPTADOR_DESTRUIDO');
    this.quitarOyentes.forEach((q) => q());
    this.oyentes.clear();
    this.transporte.cerrar();
  }

  private recibir(texto: string): void {
    if (this.destruido) return;
    const r = validarTexto(this.esquemas, texto);
    if (!r.ok) { this.log('entrada', null, null, null, `DESCARTADO:${r.codigo}`); return; }
    const m = r.mensaje;
    if (m.sesion !== this.op.sesion) { this.log('entrada', m.tipo, m.id, m.correlacion, 'IGNORADO:SESION_AJENA'); return; }
    if (m.origen !== 'unreal') { this.log('entrada', m.tipo, m.id, m.correlacion, 'IGNORADO:ORIGEN'); return; }
    if (this.recibidos.has(m.id)) { this.log('entrada', m.tipo, m.id, m.correlacion, 'IGNORADO:DUPLICADO'); return; }
    this.recibidos.add(m.id);
    if (this.recibidos.size > 256) this.recibidos.delete(this.recibidos.values().next().value!);

    if (m.tipo === 'orden.ack' || m.tipo === 'orden.error') {
      const p = this.pendientes.get(m.correlacion!);
      if (!p) { this.log('entrada', m.tipo, m.id, m.correlacion, 'IGNORADO:SIN_ORDEN_PENDIENTE'); return; }
      clearTimeout(p.temporizador);
      this.pendientes.delete(m.correlacion!);
      if (m.tipo === 'orden.ack') {
        this.log('entrada', m.tipo, m.id, m.correlacion, 'ACK');
        p.resolver(m);
      } else {
        const d = m.datos as { codigo: string; detalle?: string };
        this.log('entrada', m.tipo, m.id, m.correlacion, `ERROR:${d.codigo}`);
        p.rechazar(new ErrorOrden(d.codigo, d.detalle ?? '', m.correlacion));
      }
      return;
    }
    if (this._bloqueado && m.tipo !== 'latido') {
      this.log('entrada', m.tipo, m.id, m.correlacion, 'IGNORADO:EXPLORACION_BLOQUEADA');
      return;
    }
    this.log('entrada', m.tipo, m.id, m.correlacion, 'ACEPTADO');
    for (const o of this.oyentes) o(m);
  }

  private rechazarPendientes(codigo: string): void {
    for (const [id, p] of this.pendientes) {
      clearTimeout(p.temporizador);
      p.rechazar(new ErrorOrden(codigo, p.tipo, id));
    }
    this.pendientes.clear();
  }

  private log(direccion: 'entrada' | 'salida', tipo: string | null, id: string | null, correlacion: string | null, resultado: string) {
    this.registro.agregar({ ts: this.reloj(), actor: 'angular', direccion, tipo, id, correlacion, sesion: this.op.sesion, resultado });
  }
}
