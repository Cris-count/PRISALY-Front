import Phaser from 'phaser';
import { EventoMundo, MundoTecnico, Punto } from './mundo-tecnico.models';
import { rutaAPunto, validarMundo } from './navegacion-tecnica';
import { avanzarPorCaminos } from './movimiento-tecnico';
import { PersonajeTecnico } from './personaje-tecnico';
import { PaqueteVisual, validarPaqueteVisual } from './contrato-visual';
import { InstanciaVisual, paqueteCargado, precargarPaqueteVisual } from './adaptador-visual';
import { dibujarHospitalCalibrado } from './volumen-calibracion';
import { aMundo, aPantalla, profundidadApoyo, PROYECCION_ACTUAL, contornoCamino } from './proyeccion-tecnica';

/** Interfaz mínima para que Angular no dependa de la escena de Phaser. */
export interface ControlMundo {
  irA(id: string): void;
  direccion(vector: Punto): void;
  /** Idempotente: congela posición/ruta y descarta comandos hasta reanudar. */
  suspenderInteraccion(suspendida: boolean): void;
  consultarEstado(): { readonly interaccion: 'activa' | 'suspendida'; readonly posicion: Punto | null; readonly destino: Punto | null };
  actualizarTamano(): void;
  destruir(): void;
}

export function iniciarMundoPhaser(contenedor: HTMLElement, mundo: MundoTecnico, emitir: (evento: EventoMundo) => void, paquete: PaqueteVisual | null = null): ControlMundo {
  validarMundo(mundo);
  if (paquete) validarPaqueteVisual(paquete, mundo);
  let escena: EscenaTecnica | null = null;
  let suspendida = false;

  class EscenaTecnica extends Phaser.Scene {
    private avatar!: PersonajeTecnico | InstanciaVisual;
    private marcadorDestino!: Phaser.GameObjects.Graphics;
    private ruta: Punto[] = [];
    private direccionTeclado: Punto = { x: 0, y: 0 };
    private desplazandose = false;
    private posicion: Punto = { ...mundo.nodos.find(n => n.id === mundo.inicio)!.posicion };

    constructor() { super('escena-tecnica'); }
    consultarEstado() {
      return { interaccion: suspendida ? 'suspendida' as const : 'activa' as const, posicion: { ...this.posicion }, destino: this.ruta.length ? { ...this.ruta[this.ruta.length - 1] } : null };
    }
    preload(): void {
      // Calibración geométrica independiente de imágenes.
      if (paquete) precargarPaqueteVisual(this, paquete);
    }
    create(): void {
      escena = this;
      this.input.enabled = !suspendida;
      const visuales = paquete && paqueteCargado(this, paquete) ? paquete : null;
      if (paquete && !visuales) console.warn('Paquete visual incompleto o dimensiones distintas; se conserva la calibración provisional.');
      this.cameras.main.setBounds(0, 0, mundo.dimensiones.ancho, mundo.dimensiones.alto);
      const grafico = this.add.graphics();
      const suelo = aPantalla({ x: 0, y: 0 });
      const escalaY = PROYECCION_ACTUAL.escalaY;
      grafico.fillStyle(0x77b8cf).fillRect(0, 0, mundo.dimensiones.ancho, mundo.dimensiones.alto);
      grafico.fillStyle(0x8cc77d).fillRect(suelo.x, suelo.y, mundo.dimensiones.ancho, mundo.dimensiones.alto * escalaY);
      grafico.lineStyle(1, 0x689e6b, .35);
      for (let x = 40; x <= 860; x += 40) {
        const a = aPantalla({ x, y: 40 }), b = aPantalla({ x, y: 500 });
        grafico.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (let y = 40; y <= 500; y += 40) {
        const a = aPantalla({ x: 40, y }), b = aPantalla({ x: 860, y });
        grafico.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (const zona of mundo.zonasTransitables) {
        const p = aPantalla(zona);
        grafico.fillStyle(0xb7dc99, .3).fillRect(p.x, p.y, zona.ancho, zona.alto * escalaY);
      }
      for (const conexion of mundo.caminos) {
        const a = aPantalla(mundo.nodos.find(n => n.id === conexion.desde)!.posicion), b = aPantalla(mundo.nodos.find(n => n.id === conexion.hasta)!.posicion);
        for (const [ancho, color] of [[46, 0x6c978d], [40, 0xf8f3dc], [30, 0xc9d9d5]]) {
          const origen = mundo.nodos.find(n => n.id === conexion.desde)!.posicion;
          const destino = mundo.nodos.find(n => n.id === conexion.hasta)!.posicion;
          grafico.fillStyle(color).fillPoints(contornoCamino(origen, destino, ancho), true);
        }
        grafico.lineStyle(1, 0x5bc6dd).lineBetween(a.x, a.y, b.x, b.y);
      }
      for (const obstaculo of mundo.obstaculos) {
        const p = aPantalla(obstaculo);
        grafico.fillStyle(0x5d9b63).fillRoundedRect(p.x, p.y, obstaculo.ancho, obstaculo.alto * escalaY, 20);
        grafico.lineStyle(5, 0xe7e8c8).strokeRoundedRect(p.x, p.y, obstaculo.ancho, obstaculo.alto * escalaY, 20);
      }
      // Decoración provisional independiente: su profundidad depende del punto de apoyo.
      for (const [x, y] of [[270,250], [400,190], [490,205], [420,300], [490,340], [80,320], [695,110], [350,440]]) {
        if (visuales && x === 270 && y === 250) continue;
        const arbol = this.add.graphics();
        arbol.fillStyle(0x416149, .2).fillEllipse(0, 1, 34, 11);
        arbol.fillStyle(0x826644).fillRect(-3, -23, 6, 23);
        arbol.fillStyle(0x3b9657).fillCircle(0, -30, 15);
        arbol.fillStyle(0x78bd5f).fillCircle(-6, -36, 10);
        const pantalla = aPantalla({ x, y });
        arbol.setPosition(pantalla.x, pantalla.y).setDepth(profundidadApoyo({ x, y }));
      }
      if (visuales) new InstanciaVisual(this, visuales.arbol.recurso, visuales.arbol.apoyo);
      for (const edificio of mundo.edificios) {
        const area = edificio.area, entrada = mundo.nodos.find(n => n.id === edificio.entrada)!.posicion;
        const centroX = area.x + area.ancho / 2, baseY = area.y + area.alto;
        if (visuales && edificio.id === visuales.hospital.edificioId) {
          const hospital = new InstanciaVisual(this, visuales.hospital.recurso, { x: centroX, y: baseY });
          hospital.alSeleccionar(() => this.irA(edificio.entrada));
        } else if (edificio.plantillaVisual === 'hospital') {
          const hospital = dibujarHospitalCalibrado(this, area, entrada);
          hospital.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, evento: Phaser.Types.Input.EventData) => { evento.stopPropagation(); this.irA(edificio.entrada); });
        } else {
          const centro = aPantalla({ x: centroX, y: area.y + area.alto / 2 });
          const provisional = this.add.rectangle(centro.x, centro.y, area.ancho, area.alto * escalaY, 0x416280).setStrokeStyle(3, 0xf4f6e8).setDepth(baseY).setInteractive({ useHandCursor: true });
          provisional.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, evento: Phaser.Types.Input.EventData) => { evento.stopPropagation(); this.irA(edificio.entrada); });
          this.add.text(centro.x, centro.y, edificio.nombre.toUpperCase() + '\nPROVISIONAL', { color: '#ffffff', fontSize: '12px', align: 'center' }).setOrigin(.5).setDepth(baseY + 1);
        }
        const entradaPantalla = aPantalla(entrada);
        this.add.text(entradaPantalla.x, entradaPantalla.y + 20, 'ENTRADA', { color: '#124f3d', fontSize: '15px' }).setOrigin(.5);
      }
      if (mundo.plazaCentral) {
        const p = aPantalla(mundo.plazaCentral.posicion);
        grafico.fillStyle(0xddaf5b, 0.35).fillCircle(p.x, p.y, 28);
        grafico.fillStyle(0xf8f3dc, 0.9).fillCircle(p.x, p.y, 20);
        grafico.lineStyle(2, 0xb8860b, 0.8).strokeCircle(p.x, p.y, 20);
        grafico.fillStyle(0x183d53).fillCircle(p.x, p.y, 4);

        const plazaInteractiva = this.add.circle(p.x, p.y, 28, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        plazaInteractiva.on('pointerdown', (_ptr: unknown, _x: number, _y: number, evt: Phaser.Types.Input.EventData) => {
          evt.stopPropagation();
          this.irA(mundo.plazaCentral!.nodo);
        });

        this.add.text(p.x, p.y + 26, 'PLAZA CENTRAL\nPRISALY', {
          color: '#6e4401',
          fontSize: '11px',
          align: 'center',
        }).setOrigin(0.5);
      }
      for (const nodo of mundo.nodos) {
        const pantalla = aPantalla(nodo.posicion);
        grafico.fillStyle(mundo.edificios.some(e => e.entrada === nodo.id) ? 0x25805e : 0x4b7185).fillCircle(pantalla.x, pantalla.y, 7);
      }
      this.add.text(24, 18, 'CALIBRACIÓN 2.5D · 40° · suelo 0,643 · altura 0,766', { fontSize: '16px', color: '#183d53' });
      this.add.text(24, 42, visuales ? `Paquete visual: ${visuales.id} · v${visuales.version}` : 'Retícula: 40 × 40 unidades · persona: 48 · puerta: 52', { fontSize: '13px', color: '#183d53' });
      this.avatar = visuales ? new InstanciaVisual(this, visuales.personaje, this.posicion) : new PersonajeTecnico(this, this.posicion);
      this.avatar.objeto.setName('personaje-explorador');
      this.marcadorDestino = this.add.graphics();
      this.marcadorDestino.setDepth(9999);
      this.cameras.main.startFollow(this.avatar.objeto);
      this.input.on('pointerdown', (puntero: Phaser.Input.Pointer) => {
        if (suspendida) return;
        const punto = this.cameras.main.getWorldPoint(puntero.x, puntero.y);
        this.irAPunto(aMundo(punto));
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.marcadorDestino?.destroy();
        escena = null;
      });
      emitir({ tipo: 'listo', posicion: this.posicion });
    }
    private mostrarMarcadorDestino(puntoMundo: Punto, valido: boolean): void {
      if (!this.marcadorDestino) return;
      this.marcadorDestino.clear();
      const p = aPantalla(puntoMundo);
      if (valido) {
        this.marcadorDestino.lineStyle(2, 0x1d7058, 0.85);
        this.marcadorDestino.strokeCircle(p.x, p.y, 9);
        this.marcadorDestino.fillStyle(0x2da885, 0.3);
        this.marcadorDestino.fillCircle(p.x, p.y, 5);
      } else {
        this.marcadorDestino.lineStyle(2, 0xc25438, 0.85);
        this.marcadorDestino.strokeCircle(p.x, p.y, 8);
        this.marcadorDestino.lineBetween(p.x - 4, p.y - 4, p.x + 4, p.y + 4);
        this.marcadorDestino.lineBetween(p.x + 4, p.y - 4, p.x - 4, p.y + 4);
        this.time.delayedCall(400, () => {
          this.marcadorDestino?.clear();
        });
      }
    }
    irA(id: string): void {
      if (suspendida) return;
      const destino = mundo.nodos.find(n => n.id === id)?.posicion;
      if (!destino) {
        emitir({ tipo: 'rechazado', motivo: 'inalcanzable' });
        return;
      }
      this.irAPunto(destino);
    }
    private irAPunto(destino: Punto): void {
      if (suspendida) return;
      const ruta = rutaAPunto(mundo, this.posicion, destino);
      if (!ruta) {
        this.mostrarMarcadorDestino(destino, false);
        emitir({ tipo: 'rechazado', motivo: 'fuera-de-camino' });
        return;
      }
      this.mostrarMarcadorDestino(destino, true);
      this.direccionTeclado = { x: 0, y: 0 };
      this.ruta = ruta.filter((p, i, todos) => Math.hypot(p.x - (i ? todos[i-1].x : this.posicion.x), p.y - (i ? todos[i-1].y : this.posicion.y)) > 0.01);
      if (!this.ruta.length) { this.notificarLlegada(); return; }
      emitir({ tipo: 'moviendo', destino: this.ruta[this.ruta.length - 1] });
    }
    direccion(vector: Punto): void {
      if (suspendida) return;
      if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) return;
      const activo = Math.hypot(vector.x, vector.y) > 0;
      if (activo) {
        this.ruta = [];
        if (!this.desplazandose) emitir({ tipo: 'moviendo', destino: { ...this.posicion } });
      } else if (Math.hypot(this.direccionTeclado.x, this.direccionTeclado.y) > 0) {
        this.notificarLlegada();
      }
      this.direccionTeclado = { ...vector };
      this.desplazandose = activo;
    }
    override update(_tiempo: number, delta: number): void {
      if (suspendida) { this.avatar.actualizar(this.posicion, { x: 0, y: 0 }, delta); return; }
      const anterior = { ...this.posicion };
      // Limita únicamente pausas largas (por ejemplo, una pestaña en segundo plano).
      const avance = 210 * Math.min(Math.max(delta, 0), 250) / 1000;
      if (Math.hypot(this.direccionTeclado.x, this.direccionTeclado.y) > 0) {
        this.posicion = avanzarPorCaminos(mundo, this.posicion, this.direccionTeclado, avance);
        if (this.desplazandose && Math.hypot(this.posicion.x - anterior.x, this.posicion.y - anterior.y) < 0.00001) {
          this.desplazandose = false;
          this.notificarLlegada();
        }
        this.avatar.actualizar(this.posicion, { x: this.posicion.x - anterior.x, y: this.posicion.y - anterior.y }, delta);
        return;
      }
      if (!this.ruta.length) { this.avatar.actualizar(this.posicion, { x: 0, y: 0 }, delta); return; }
      const siguiente = this.ruta[0];
      const dx = siguiente.x - this.posicion.x, dy = siguiente.y - this.posicion.y;
      const restante = Math.hypot(dx, dy);
      if (restante <= avance) {
        this.posicion = { ...siguiente }; this.ruta.shift();
      } else this.posicion = { x: this.posicion.x + dx / restante * avance, y: this.posicion.y + dy / restante * avance };
      this.avatar.actualizar(this.posicion, { x: this.posicion.x - anterior.x, y: this.posicion.y - anterior.y }, delta);
      if (!this.ruta.length) this.notificarLlegada();
    }
    private notificarLlegada(): void {
      this.marcadorDestino?.clear();
      const edificio = mundo.edificios.find(e => {
        const entrada = mundo.nodos.find(n => n.id === e.entrada)!.posicion;
        return Math.hypot(entrada.x - this.posicion.x, entrada.y - this.posicion.y) < 1;
      });
      const enPlaza = mundo.plazaCentral
        ? Math.hypot(mundo.plazaCentral.posicion.x - this.posicion.x, mundo.plazaCentral.posicion.y - this.posicion.y) <= mundo.plazaCentral.radioInteraccion
        : false;
      const evento: EventoMundo = enPlaza && mundo.plazaCentral
        ? {
            tipo: 'llegada',
            posicion: { ...this.posicion },
            entradaId: edificio?.id ?? null,
            puntoAccesoId: mundo.plazaCentral.id,
          }
        : {
            tipo: 'llegada',
            posicion: { ...this.posicion },
            entradaId: edificio?.id ?? null,
          };
      emitir(evento);
    }
  }

  const juego = new Phaser.Game({
    type: Phaser.CANVAS, parent: contenedor, width: Math.min(900, mundo.dimensiones.ancho), height: Math.min(540, mundo.dimensiones.alto),
    backgroundColor: '#e9f1ea', scene: EscenaTecnica,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
  });
  let destruido = false;
  return {
    consultarEstado: () => escena?.consultarEstado() ?? { interaccion: suspendida ? 'suspendida' : 'activa', posicion: null, destino: null },
    irA: id => escena?.irA(id), direccion: vector => escena?.direccion(vector),
    suspenderInteraccion: valor => {
      if (destruido) return;
      suspendida = valor;
      if (escena) escena.input.enabled = !valor;
    },
    actualizarTamano: () => { if (!destruido) juego.scale.refresh(); },
    destruir: () => { if (!destruido) { destruido = true; escena = null; juego.destroy(true); } },
  };
}
