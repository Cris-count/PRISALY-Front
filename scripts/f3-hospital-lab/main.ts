import { Component, inject, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HospitalUnreal } from '../../src/app/features/simulador/unreal/hospital-unreal';
import { HospitalNarrativoUnreal } from '../../src/app/features/simulador/unreal/hospital-narrativo-unreal';
import { LibretaStore } from '../../src/app/features/simulador/investigacion/libreta.store';
import { AdaptadorPistasNarrativas } from '../../src/app/features/simulador/services/adaptador-pistas-narrativas';
import { CoordinadorNarrativoInteriores } from '../../src/app/features/simulador/services/coordinador-narrativo-interiores';
import { PuenteUnreal } from '../../src/app/features/simulador/unreal/puente/puente-unreal';
import { cargarEsquemasBrowser } from '../../src/app/features/simulador/unreal/protocolo/cargar-esquemas-browser';
import { Mensaje } from '../../src/app/features/simulador/unreal/protocolo/validador-mensaje';
import { Transporte } from '../../src/app/features/simulador/unreal/puente/transporte';

// El modo manual recibe exclusivamente las activaciones espaciales del juego.
const MODO_MANUAL = new URLSearchParams(location.search).get('modo') === 'manual';
const SESION_LAB = MODO_MANUAL ? 'ses-prototipo-0001' : 'ses-f3-codex28-0001';
const PUERTO_LAB = MODO_MANUAL ? 8890 : 8898;

/** Transporte de laboratorio: órdenes y hechos reales de Unreal; no transporta video. */
class WebSocketLaboratorio implements Transporte {
  private ws = new WebSocket(`ws://127.0.0.1:${PUERTO_LAB}/angular?sesion=${SESION_LAB}`);
  private receptores = new Set<(texto: string) => void>();
  private desconexiones = new Set<() => void>();
  readonly listo = new Promise<void>((resolve, reject) => {
    this.ws.addEventListener('open', () => resolve(), { once: true });
    this.ws.addEventListener('error', () => reject(new Error('Relé no disponible')), { once: true });
  });
  constructor() {
    this.ws.addEventListener('message', e => { if (typeof e.data === 'string') this.receptores.forEach(r => r(e.data)); });
    this.ws.addEventListener('close', () => this.desconexiones.forEach(r => r()));
  }
  get conectado() { return this.ws.readyState === WebSocket.OPEN; }
  enviar(texto: string) { this.ws.send(texto); }
  alRecibir(receptor: (texto: string) => void) { this.receptores.add(receptor); return () => this.receptores.delete(receptor); }
  alDesconectar(receptor: () => void) { this.desconexiones.add(receptor); return () => this.desconexiones.delete(receptor); }
  cerrar() { this.ws.close(); }
}

@Component({
  selector: 'app-root', imports: [HospitalNarrativoUnreal],
  providers: [HospitalUnreal, LibretaStore, AdaptadorPistasNarrativas, CoordinadorNarrativoInteriores],
  template: `
    <main style="max-width:1000px;margin:2rem auto;font-family:system-ui;color:#19384b">
      <h1>Laboratorio narrativo del Hospital</h1>
      <p>Angular y Unreal real mediante WebSocket local. Sin video integrado.</p>
      @if (manual) {
        <p>Modo manual: activa la puerta y los personajes con E en Unreal. El doctor y el paciente tienen diálogos demostrativos y progreso separado.</p>
      } @else {
        <p>Los botones de estímulo simulan pulsar E. Los diálogos, decisiones, pistas y libreta usan la implementación real de PRISALY.</p>
      }
      <button data-action="conectar" (click)="conectar()">Conectar laboratorio</button>
      @if (!manual) {
      <button data-action="puerta" [disabled]="!listo()" (click)="estimular('hosp-puerta', 'puerta')">Estímulo simulado: activar puerta</button>
      <button data-action="doctor" [disabled]="!hospital.enInterior()" (click)="estimular('hosp-npc-doctor', 'npc')">Estímulo simulado: activar doctor</button>
      <button data-action="paciente" [disabled]="!hospital.enInterior()" (click)="estimular('hosp-npc-paciente-01', 'npc')">Estímulo simulado: activar paciente</button>
      }
      <button data-action="reconectar" (click)="conectar()">Reconectar misma sesión</button>
      @if (manual) { <button type="button" (click)="descargarRegistro()">Descargar registro de la sesión</button> }
      <p role="status">{{ estado() }} · {{ hospital.espacio() }} · {{ hospital.conversacion() }}</p>
      <app-hospital-narrativo-unreal />
    </main>`,
})
class LaboratorioHospital {
  readonly manual = MODO_MANUAL;
  readonly hospital = inject(HospitalUnreal);
  readonly libreta = inject(LibretaStore);
  readonly listo = signal(false);
  readonly estado = signal('Sin conectar');
  readonly hechos: Mensaje[] = [];
  readonly estimulos: object[] = [];
  private puente: PuenteUnreal | null = null;
  private registros: object[] = [];
  private iniciando = false;

  constructor() { (window as unknown as { laboratorioHospital: LaboratorioHospital }).laboratorioHospital = this; }
  async conectar() {
    this.hospital.desvincular();
    if (this.puente) { this.registros.push(...this.puente.registro.entradas); this.puente.destruir(); }
    this.listo.set(false);
    try {
      const transporte = new WebSocketLaboratorio(); await transporte.listo;
      const puente = this.puente = new PuenteUnreal(transporte, await cargarEsquemasBrowser(), { sesion: SESION_LAB });
      this.hospital.vincular(puente, { sesion: SESION_LAB, casoId: 'caso-demo-01', streamerId: 'laboratorio', urlSenalizacion: `ws://127.0.0.1:${PUERTO_LAB}` });
      puente.suscribir(m => {
        this.hechos.push(m);
        if (m.tipo === 'mundo.listo') void this.iniciar();
        else if (this.listo()) void this.hospital.procesar(m);
      });
      await this.iniciar();
    } catch (e) { this.estado.set(String(e)); }
  }
  private async iniciar() {
    if (this.iniciando || this.listo() || !this.puente) return;
    this.iniciando = true;
    try {
      await this.puente.enviar('sesion.iniciar', { casoId: 'caso-demo-01', preferencias: { reducirMovimiento: false, invertirCamara: false } });
      this.listo.set(true); this.estado.set('Sesión real confirmada por Unreal');
    } catch (e) { this.estado.set(String(e)); }
    finally { this.iniciando = false; }
  }
  async estimular(interactuableId: string, categoria: string) {
    if (this.manual) return;
    this.estimulos.push({ ts: Date.now(), interactuableId, categoria, origen: 'estimulo-simulado-no-enviado-por-Unreal' });
    await this.hospital.procesar({ v: 1, tipo: 'interactuable.activado', id: 'u-999999', correlacion: null,
      sesion: SESION_LAB, ts: Date.now(), origen: 'unreal', datos: { interactuableId, categoria } });
  }
  resultado() {
    return { modo: this.manual ? 'manual' : 'estimulos-simulados', sesion: SESION_LAB, npcActivo: this.hospital.npcActivo(),
      listo: this.listo(), espacio: this.hospital.espacio(), conversacion: this.hospital.conversacion(),
      vista: this.hospital.vista(), libreta: this.libreta.estado(), error: this.hospital.error(),
      hechos: this.hechos, estimulos: this.estimulos, registro: [...this.registros, ...(this.puente?.registro.entradas ?? [])] };
  }
  descargarRegistro() {
    const datos = { dictamen: 'SIN EVALUAR; los resultados deben ser informados por Nicolás', ...this.resultado() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `hospital-manual-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

bootstrapApplication(LaboratorioHospital).catch(console.error);
