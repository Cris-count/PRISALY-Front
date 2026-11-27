import {
  ORIGEN_VISOR_LOCAL,
  SESION_VISUAL_LOCAL,
  resolverSesionVisual,
  validarSesionVisual,
} from './configuracion-unreal';

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

describe('Origen configurable del visor', () => {
  it('no hereda laboratorio si la asignación QA está pendiente', () => {
    expect(
      resolverSesionVisual(true, 'http://localhost:18176', {
        origenVisor: 'http://localhost:18176',
        asignacion: null,
      }),
    ).toBeNull();
  });
  it('acepta solo el origen exacto configurado y una asignación válida', () => {
    const c = { origenVisor: 'http://localhost:18176', asignacion: SESION_VISUAL_LOCAL };
    expect(resolverSesionVisual(true, c.origenVisor, c)).toBe(SESION_VISUAL_LOCAL);
    expect(resolverSesionVisual(true, 'http://localhost:18175', c)).toBeNull();
  });
  it('rechaza parámetros de URL que pudieran transportar credenciales', () => {
    expect(() =>
      validarSesionVisual({
        ...SESION_VISUAL_LOCAL,
        urlSenalizacion: 'ws://127.0.0.1:8898/?token=no-permitido',
      }),
    ).toThrow();
  });
});
