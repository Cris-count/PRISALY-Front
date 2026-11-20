import Phaser from 'phaser';
import { Punto, Rectangulo } from './mundo-tecnico.models';
import { aPantalla, aPantallaVolumen, profundidadApoyo } from './proyeccion-tecnica';

/** Hospital independiente de calibración: geometría ortográfica, sin sprite deformado. */
export function dibujarHospitalCalibrado(scene: Phaser.Scene, area: Rectangulo, entrada: Punto): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const frente = area.y + area.alto;
  const altura = 80;
  const p = (x: number, y: number, z: number) => aPantallaVolumen({ x, y }, z);
  const poligono = (color: number, puntos: Punto[]) => g.fillStyle(color).fillPoints(puntos, true);
  poligono(0x8fa7ae, [p(area.x, frente, 0), p(area.x + area.ancho, frente, 0), p(area.x + area.ancho, frente, altura), p(area.x, frente, altura)]);
  poligono(0xf0f6f4, [p(area.x, frente, altura), p(area.x + area.ancho, frente, altura), p(area.x + area.ancho, area.y, altura), p(area.x, area.y, altura)]);
  const puertaX = Math.max(area.x + 14, Math.min(area.x + area.ancho - 14, entrada.x));
  poligono(0x173e58, [p(puertaX - 12, frente, 0), p(puertaX + 12, frente, 0), p(puertaX + 12, frente, 52), p(puertaX - 12, frente, 52)]);
  // Cruz sobre el techo, también proyectada en su plano horizontal.
  const cx = area.x + area.ancho / 2, cy = area.y + area.alto / 2;
  poligono(0xc74654, [p(cx - 5, cy - 20, altura), p(cx + 5, cy - 20, altura), p(cx + 5, cy + 20, altura), p(cx - 5, cy + 20, altura)]);
  poligono(0xc74654, [p(cx - 20, cy - 5, altura), p(cx + 20, cy - 5, altura), p(cx + 20, cy + 5, altura), p(cx - 20, cy + 5, altura)]);
  g.setDepth(profundidadApoyo({ x: puertaX, y: frente }));
  const esquina = aPantalla(area);
  g.setInteractive(new Phaser.Geom.Rectangle(esquina.x, esquina.y - altura * .7661, area.ancho, area.alto * .6428 + altura * .7661), Phaser.Geom.Rectangle.Contains);
  // Conector sobre el suelo; no modifica el nodo, la huella ni el contrato de entrada.
  const acceso = scene.add.graphics().setDepth(-1);
  const a = aPantalla({ x: puertaX, y: frente }), b = aPantalla(entrada);
  acceso.lineStyle(2, 0x25805e).lineBetween(a.x, a.y, b.x, b.y);
  acceso.fillStyle(0xf7be55).fillCircle(a.x, a.y, 3);
  return g;
}
