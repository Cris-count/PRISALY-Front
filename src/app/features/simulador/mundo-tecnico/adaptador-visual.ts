import Phaser from 'phaser';
import { CapaVisual, OrientacionVisual, PaqueteVisual, RecursoVisual } from './contrato-visual';
import { Punto } from './mundo-tecnico.models';
import { aPantalla, profundidadApoyo } from './proyeccion-tecnica';

const clave = (r: RecursoVisual, c: CapaVisual) => `visual:${r.id}:v${r.version}:${c.id}`;
const animacion = (r: RecursoVisual, c: CapaVisual, estado: string, orientacion: string) => `${clave(r, c)}:${estado}:${orientacion}`;

export function precargarPaqueteVisual(scene: Phaser.Scene, paquete: PaqueteVisual): void {
  for (const r of [paquete.hospital.recurso, paquete.personaje, paquete.arbol.recurso]) for (const c of r.capas) {
    if (c.hoja) scene.load.spritesheet(clave(r, c), c.ruta, { frameWidth: c.dimensiones.ancho, frameHeight: c.dimensiones.alto });
    else scene.load.image(clave(r, c), c.ruta);
  }
}

/** Capas independientes: suelo debajo; volumen ordenado por su apoyo lógico. */
export class InstanciaVisual {
  readonly objetos: readonly Phaser.GameObjects.Sprite[];
  get objeto(): Phaser.GameObjects.Sprite { return this.objetos[0]; }
  private orientacion: OrientacionVisual = 'sur';
  constructor(private readonly scene: Phaser.Scene, private readonly recurso: RecursoVisual, apoyo: Punto) {
    this.objetos = recurso.capas.map(c => {
      const objeto = scene.add.sprite(0, 0, clave(recurso, c));
      objeto.setOrigin(c.apoyoPx.x / c.dimensiones.ancho, c.apoyoPx.y / c.dimensiones.alto).setScale(recurso.escala);
      for (const a of recurso.animaciones) {
        const key = animacion(recurso, c, a.estado, a.orientacion);
        if (!scene.anims.exists(key)) scene.anims.create({ key, frames: a.fotogramas.map(frame => ({ key: clave(recurso, c), frame })), frameRate: a.fps, repeat: -1 });
      }
      return objeto;
    });
    this.actualizar(apoyo, { x: 0, y: 0 });
  }
  actualizar(apoyo: Punto, desplazamiento: Punto, _delta = 0): void {
    const moviendo = Math.hypot(desplazamiento.x, desplazamiento.y) > .0001;
    if (moviendo) this.orientacion = Math.abs(desplazamiento.x) > Math.abs(desplazamiento.y) ? (desplazamiento.x > 0 ? 'este' : 'oeste') : (desplazamiento.y > 0 ? 'sur' : 'norte');
    const pantalla = aPantalla(apoyo);
    this.objetos.forEach((o, i) => {
      const c = this.recurso.capas[i];
      o.setPosition(pantalla.x, pantalla.y).setDepth(c.plano === 'suelo' ? -1000 : profundidadApoyo(apoyo) + c.desplazamientoApoyoY);
      const key = animacion(this.recurso, c, moviendo ? 'caminar' : 'reposo', this.orientacion);
      if (this.scene.anims.exists(key)) o.play(key, true);
    });
  }
  alSeleccionar(accion: () => void): void {
    for (const objeto of this.objetos) objeto.setInteractive({ useHandCursor: true, pixelPerfect: true }).on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, evento: Phaser.Types.Input.EventData) => { evento.stopPropagation(); accion(); });
  }
}

/** Un paquete incompleto no se activa a medias; conserva los provisionales. */
export function paqueteCargado(scene: Phaser.Scene, paquete: PaqueteVisual): boolean {
  return [paquete.hospital.recurso, paquete.personaje, paquete.arbol.recurso].every(r => r.capas.every(c => {
    if (!scene.textures.exists(clave(r, c))) return false;
    const textura = scene.textures.get(clave(r, c));
    const fuente = textura.getSourceImage() as HTMLImageElement;
    return fuente.width === c.dimensiones.ancho * (c.hoja?.columnas ?? 1) && fuente.height === c.dimensiones.alto * (c.hoja?.filas ?? 1);
  }));
}
