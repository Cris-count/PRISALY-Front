import { MUNDO_PRUEBA } from './mundo-tecnico.fixture';
import { intersectaObstaculo, nodoCercano, rutaAPunto, rutaEntre, validarMundo, vecinoEnDireccion } from './navegacion-tecnica';

describe('navegación geométrica de la prueba técnica', () => {
  it('valida el mundo y encuentra un camino a la entrada que rodea el obstáculo', () => {
    expect(() => validarMundo(MUNDO_PRUEBA)).not.toThrow();
    const ids = rutaEntre(MUNDO_PRUEBA, 'inicio', 'entrada')!;
    expect(ids).toEqual(['inicio', 'oeste', 'fiscalia-entrada', 'norte-oeste', 'norte-este', 'este', 'entrada']);
    const nodos = ids.map(id => MUNDO_PRUEBA.nodos.find(n => n.id === id)!.posicion);
    for (let i = 1; i < nodos.length; i++) {
      for (const obstaculo of MUNDO_PRUEBA.obstaculos) expect(intersectaObstaculo(nodos[i-1], nodos[i], obstaculo, MUNDO_PRUEBA.radioPersonaje)).toBeFalse();
    }
  });
  it('admite clics sobre tramos y rechaza obstáculo, zonas lejanas e inalcanzables', () => {
    const inicio = { x: 110, y: 400 };
    const tramo = rutaAPunto(MUNDO_PRUEBA, inicio, { x: 180, y: 400 });
    expect(tramo?.at(-1)).toEqual({ x: 180, y: 400 });
    expect(rutaAPunto(MUNDO_PRUEBA, { x: 180, y: 400 }, { x: 260, y: 300 })?.at(-1)).toEqual({ x: 260, y: 300 });
    expect(rutaAPunto(MUNDO_PRUEBA, inicio, { x: 450, y: 250 })).toBeNull();
    expect(rutaAPunto(MUNDO_PRUEBA, inicio, { x: 100, y: 100 })).toBeNull();
    const desconectado = { ...MUNDO_PRUEBA, caminos: MUNDO_PRUEBA.caminos.slice(0, 2) };
    expect(rutaEntre(desconectado, 'inicio', 'entrada')).toBeNull();
  });
  it('valida colisiones y evita configuraciones imposibles', () => {
    const atajo = { ...MUNDO_PRUEBA, caminos: [...MUNDO_PRUEBA.caminos, { desde: 'norte-oeste', hasta: 'este' }] };
    expect(() => validarMundo(atajo)).toThrowError('Camino inválido');
    expect(() => validarMundo({ ...MUNDO_PRUEBA, inicio: 'ausente' })).toThrow();
    expect(nodoCercano(MUNDO_PRUEBA, { x: 450, y: 250 })).toBeNull();
    const edificioBloqueante = { ...MUNDO_PRUEBA, edificios: [{ ...MUNDO_PRUEBA.edificios[0], area: { x: 180, y: 385, ancho: 30, alto: 30 } }] };
    expect(() => validarMundo(edificioBloqueante)).toThrowError('Camino inválido');
  });
  it('elige conexiones accesibles con teclado según la dirección', () => {
    expect(vecinoEnDireccion(MUNDO_PRUEBA, 'inicio', { x: 1, y: 0 })?.id).toBe('oeste');
    expect(vecinoEnDireccion(MUNDO_PRUEBA, 'oeste', { x: 0, y: -1 })?.id).toBe('fiscalia-entrada');
    expect(vecinoEnDireccion(MUNDO_PRUEBA, 'inicio', { x: -1, y: 0 })).toBeNull();
  });

  it('permite llegar a las tres entradas y valida una configuración reubicada', () => {
    for (const edificio of MUNDO_PRUEBA.edificios) {
      expect(rutaEntre(MUNDO_PRUEBA, MUNDO_PRUEBA.inicio, edificio.entrada)).not.toBeNull();
    }
    const edificios = MUNDO_PRUEBA.edificios.map(e => e.id === 'hospital-prueba' ? { ...e, area: { ...e.area, x: 735, y: 140 } } : e);
    expect(() => validarMundo({ ...MUNDO_PRUEBA, edificios })).not.toThrow();
    const sinEntrada = { ...MUNDO_PRUEBA, caminos: MUNDO_PRUEBA.caminos.filter(c => c.hasta !== 'entrada') };
    expect(() => validarMundo(sinEntrada)).toThrowError('Acceso inalcanzable');
    expect(() => validarMundo({ ...MUNDO_PRUEBA, edificios: [...edificios, edificios[0]] })).toThrowError('Edificio duplicado');
  });
});
