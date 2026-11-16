import Phaser from 'phaser';
import { Punto } from './mundo-tecnico.models';
import { aPantalla, aPantallaVolumen, profundidadApoyo } from './proyeccion-tecnica';

/** Dibujo técnico temporal: el origen del contenedor está en los pies. */
export class PersonajeTecnico {
  readonly objeto: Phaser.GameObjects.Container;
  private readonly dibujo: Phaser.GameObjects.Graphics;
  private orientacion: Punto = { x: 0, y: 1 };
  private tiempo = 0;

  constructor(scene: Phaser.Scene, posicion: Punto) {
    this.objeto = scene.add.container(posicion.x, posicion.y);
    this.dibujo = scene.add.graphics();
    this.objeto.add(this.dibujo);
    this.actualizar(posicion, { x: 0, y: 0 }, 0);
  }

  actualizar(posicion: Punto, desplazamiento: Punto, delta: number): void {
    const caminando = Math.hypot(desplazamiento.x, desplazamiento.y) > 0.0001;
    if (caminando) this.orientacion = desplazamiento;
    this.tiempo += delta;
    const paso = caminando ? Math.sin(this.tiempo / 90) : 0;

    const lado = Math.abs(this.orientacion.x) > Math.abs(this.orientacion.y) ? Math.sign(this.orientacion.x) : 0;
    const espalda = !lado && this.orientacion.y < 0;
    const g = this.dibujo.clear();
    const punto = (x: number, y: number, z: number) => {
      const pantalla = aPantallaVolumen({ x, y }, z);
      const origen = aPantalla({ x: 0, y: 0 });
      return { x: pantalla.x - origen.x, y: pantalla.y - origen.y };
    };
    const linea = (color: number, ancho: number, a: ReturnType<typeof punto>, b: ReturnType<typeof punto>) => {
      g.lineStyle(ancho, color).lineBetween(a.x, a.y, b.x, b.y);
    };
    // Volumen de 48 unidades: Z se proyecta desde el modelo, nunca escalando el sprite.
    g.fillStyle(0x183d53, .22).fillEllipse(0, 0, 22, 12 * Math.sin(40 * Math.PI / 180));
    linea(0x183d64, 5, punto(-4, 0, 19), punto(-4, paso * 4, 3));
    linea(0x183d64, 5, punto(4, 0, 19), punto(4, -paso * 4, 3));
    linea(0x1978bd, 15, punto(0, 0, 20), punto(0, 0, 32));
    linea(0xe4ac84, 4, punto(-9, 0, 32), punto(-10, -paso * 4, 19));
    linea(0xe4ac84, 4, punto(9, 0, 32), punto(10, paso * 4, 19));
    const cabeza = punto(0, 0, 40);
    g.fillStyle(0xe8b58b).fillCircle(cabeza.x, cabeza.y, 6);
    g.fillStyle(0x46342d).fillEllipse(0, cabeza.y - 4, 12, 5);
    if (!espalda) g.fillStyle(0x222f3d).fillCircle(lado ? lado * 3 : -2, cabeza.y, 1);
    if (!espalda && !lado) g.fillCircle(2, cabeza.y, 1);
    const pantalla = aPantalla(posicion);
    this.objeto.setPosition(pantalla.x, pantalla.y).setDepth(profundidadApoyo(posicion));
  }
}
