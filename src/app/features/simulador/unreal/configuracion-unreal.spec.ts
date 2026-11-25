import { ORIGEN_VISOR_LOCAL, SESION_VISUAL_LOCAL, resolverSesionVisual, validarSesionVisual } from './configuracion-unreal';

describe('resolverSesionVisual', () => {
  it('entrega la sesión del laboratorio solo si está habilitada y el Origin es el local aceptado', () => {
    expect(resolverSesionVisual(true, ORIGEN_VISOR_LOCAL)).toBe(SESION_VISUAL_LOCAL);
  });

  it('no entrega sesión en producción/QA ni desde otro Origin', () => {
    expect(resolverSesionVisual(false, ORIGEN_VISOR_LOCAL)).toBeNull();
    expect(resolverSesionVisual(true, 'http://localhost:4200')).toBeNull();
    expect(resolverSesionVisual(true, 'http://localhost:9876')).toBeNull();
    expect(resolverSesionVisual(true, '')).toBeNull();
  });

  it('la sesión local supera la validación de la asignación', () => {
    expect(() => validarSesionVisual(SESION_VISUAL_LOCAL)).not.toThrow();
  });
});
