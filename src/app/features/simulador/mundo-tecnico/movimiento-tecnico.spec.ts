import { MUNDO_PRUEBA } from './mundo-tecnico.fixture';
import { avanzarPorCaminos } from './movimiento-tecnico';

describe('movimiento continuo sobre caminos', () => {
  it('avanza continuamente, se detiene y no sale del final del camino', () => {
    const inicio = { x: 110, y: 400 };
    const paso = avanzarPorCaminos(MUNDO_PRUEBA, inicio, { x: 1, y: 0 }, 30);
    expect(paso.x).toBeCloseTo(140, 5);
    expect(avanzarPorCaminos(MUNDO_PRUEBA, paso, { x: 0, y: 0 }, 100)).toEqual(paso);
    expect(avanzarPorCaminos(MUNDO_PRUEBA, inicio, { x: -1, y: 0 }, 100)).toEqual(inicio);
  });
  it('normaliza la entrada diagonal y no aumenta la distancia recorrida', () => {
    const inicio = { x: 110, y: 400 };
    const recto = avanzarPorCaminos(MUNDO_PRUEBA, inicio, { x: 1, y: 0 }, 60);
    const diagonal = avanzarPorCaminos(MUNDO_PRUEBA, inicio, { x: 1, y: -1 }, 60);
    expect(diagonal.x - inicio.x).toBeCloseTo(recto.x - inicio.x, 5);
  });
  it('continúa en un camino diagonal y respeta el cambio de dirección en nodos', () => {
    const este = MUNDO_PRUEBA.nodos.find(n => n.id === 'este')!.posicion;
    const siguiente = avanzarPorCaminos(MUNDO_PRUEBA, este, { x: 1, y: -1 }, 70);
    expect(Math.hypot(siguiente.x - este.x, siguiente.y - este.y)).toBeCloseTo(70, 5);
    const giro = avanzarPorCaminos(MUNDO_PRUEBA, { x: 260, y: 250 }, { x: 0, y: -1 }, 80);
    expect(giro.x).toBeCloseTo(260, 5);
    expect(giro.y).toBeCloseTo(170, 5);
  });
});
