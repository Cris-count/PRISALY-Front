import { EstadoExploracion } from './estado-exploracion';

describe('motivos independientes de suspensión visual', () => {
  it('cerrar libreta dentro de un interior o modal no desbloquea el mapa', () => {
    const estado = new EstadoExploracion();
    expect(estado.suspendido()).toBeFalse();
    estado.establecer('interior', true); estado.establecer('libreta', true);
    estado.establecer('libreta', true); estado.establecer('libreta', false);
    expect(estado.motivos()).toEqual(['interior']);
    expect(estado.suspendido()).toBeTrue();
    estado.establecer('confirmacion-modal', true); estado.establecer('interior', false);
    expect(estado.suspendido()).toBeTrue();
    estado.establecer('confirmacion-modal', false);
    expect(estado.suspendido()).toBeFalse();
    estado.establecer('cuestionario', true);
    expect(estado.suspendido()).toBeTrue();
    estado.establecer('cuestionario', false);
    expect(estado.suspendido()).toBeFalse();
  });
});
