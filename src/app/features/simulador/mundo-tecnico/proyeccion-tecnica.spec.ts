import { aMundo, aPantalla, aPantallaVolumen, contornoCamino, profundidadApoyo, PROYECCION_PROPUESTA, PROYECCION_ACTUAL } from './proyeccion-tecnica';
import { MUNDO_PRUEBA } from './mundo-tecnico.fixture';
import { rutaAPunto } from './navegacion-tecnica';

describe('proyección separada del mundo lógico', () => {
  it('proyecta una altura de puerta mayor que la persona sin mover su apoyo', () => {
    const apoyo = { x: 795, y: 255 };
    const base = aPantalla(apoyo);
    const cabeza = aPantallaVolumen(apoyo, 48);
    const dintel = aPantallaVolumen(apoyo, 52);
    expect(base.y - cabeza.y).toBeCloseTo(48 * Math.cos(40 * Math.PI / 180), 6);
    expect(dintel.y).toBeLessThan(cabeza.y);
    expect(cabeza.x).toBe(base.x);
  });
  it('acorta el ancho sobre Y y conserva el ancho sobre X', () => {
    const horizontal = contornoCamino({ x: 0, y: 0 }, { x: 100, y: 0 }, 40);
    const vertical = contornoCamino({ x: 0, y: 0 }, { x: 0, y: 100 }, 40);
    expect(Math.abs(horizontal[0].y - horizontal[3].y)).toBeCloseTo(40 * Math.sin(40 * Math.PI / 180), 6);
    expect(Math.abs(vertical[0].x - vertical[3].x)).toBe(40);
  });
  it('invierte la transformación propuesta sin modificar las coordenadas lógicas', () => {
    const punto = { x: 320, y: 180 };
    const pantalla = aPantalla(punto, PROYECCION_PROPUESTA);
    const retorno = aMundo(pantalla, PROYECCION_PROPUESTA);
    expect(retorno.x).toBeCloseTo(punto.x, 8);
    expect(retorno.y).toBeCloseTo(punto.y, 8);
  });
  it('ordena delante y detrás por el punto de apoyo', () => {
    expect(profundidadApoyo({ x: 300, y: 220 })).toBeLessThan(profundidadApoyo({ x: 300, y: 260 }));
  });
  it('traduce clics proyectados sin convertir un obstáculo en destino accesible', () => {
    const inicio = MUNDO_PRUEBA.nodos.find(n => n.id === MUNDO_PRUEBA.inicio)!.posicion;
    const destino = { x: 260, y: 220 };
    expect(PROYECCION_ACTUAL.escalaY).toBeCloseTo(Math.sin(40 * Math.PI / 180), 8);
    const ruta = rutaAPunto(MUNDO_PRUEBA, inicio, aMundo(aPantalla(destino)));
    expect(ruta?.at(-1)?.x).toBeCloseTo(destino.x, 6);
    expect(ruta?.at(-1)?.y).toBeCloseTo(destino.y, 6);
    expect(rutaAPunto(MUNDO_PRUEBA, inicio, aMundo(aPantalla({ x: 450, y: 250 })))).toBeNull();
  });
});
