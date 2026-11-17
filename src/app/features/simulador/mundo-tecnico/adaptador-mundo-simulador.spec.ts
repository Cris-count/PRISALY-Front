import { AdaptadorMundoSimulador } from './adaptador-mundo-simulador';
import { MUNDO_PRUEBA } from './mundo-tecnico.fixture';
import { EdificioTecnico, EventoMundo, Punto } from './mundo-tecnico.models';
import type { ControlMundo } from './phaser-mundo';

describe('AdaptadorMundoSimulador', () => {
  let adaptador: AdaptadorMundoSimulador;
  let mockControl: jasmine.SpyObj<ControlMundo>;

  beforeEach(() => {
    adaptador = new AdaptadorMundoSimulador();
    mockControl = jasmine.createSpyObj<ControlMundo>('ControlMundo', [
      'irA',
      'direccion',
      'suspenderInteraccion',
      'consultarEstado',
      'actualizarTamano',
      'destruir',
    ]);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);
  });

  afterEach(() => {
    adaptador.desconectar();
  });

  function llegarAlHospital(): void {
    adaptador.procesarEvento({ tipo: 'listo', posicion: { x: 110, y: 400 } });
    adaptador.procesarEvento({ tipo: 'llegada', posicion: { x: 795, y: 300 }, entradaId: 'hospital-prueba' });
  }

  it('procesa el evento listo e inicializa la posición', () => {
    const posInicial: Punto = { x: 110, y: 400 };
    adaptador.procesarEvento({ tipo: 'listo', posicion: posInicial });

    expect(adaptador.listo()).toBeTrue();
    expect(adaptador.posicion()).toEqual(posInicial);
    expect(adaptador.suspendida()).toBeFalse();
  });

  it('procesa el evento moviendo y limpia la entrada activa', () => {
    const destino: Punto = { x: 260, y: 400 };
    adaptador.procesarEvento({ tipo: 'moviendo', destino });

    expect(adaptador.destino()).toEqual(destino);
    expect(adaptador.entradaActual()).toBeNull();
    expect(adaptador.mensaje()).toContain('Caminando');
  });

  it('identifica el edificio al llegar a un nodo de entrada', () => {
    const entradaHospital = MUNDO_PRUEBA.edificios.find((e) => e.id === 'hospital-prueba')!;
    const posEntrada: Punto = { x: 795, y: 300 };

    adaptador.procesarEvento({
      tipo: 'llegada',
      posicion: posEntrada,
      entradaId: entradaHospital.id,
    });

    expect(adaptador.posicion()).toEqual(posEntrada);
    expect(adaptador.destino()).toBeNull();
    expect(adaptador.entradaActual()).toEqual(entradaHospital);
    expect(adaptador.mensaje()).toContain('Hospital');
  });

  it('solicita la entrada, suspende el mundo y abre el interior', () => {
    llegarAlHospital();
    const edificio: EdificioTecnico = MUNDO_PRUEBA.edificios[0];
    const exito = adaptador.solicitarEntrada(edificio);

    expect(exito).toBeTrue();
    expect(adaptador.interiorActivo()).toEqual(edificio);
    expect(adaptador.suspendida()).toBeTrue();
    expect(mockControl.suspenderInteraccion).toHaveBeenCalledWith(true);
  });

  it('ignora solicitudes de caminata mientras la interacción está suspendida', () => {
    adaptador.suspender(true);
    adaptador.caminarA('entrada');

    expect(mockControl.irA).not.toHaveBeenCalled();
  });

  it('restaura la interacción en Phaser al salir del interior conservando la posición', () => {
    llegarAlHospital();
    const edificio: EdificioTecnico = MUNDO_PRUEBA.edificios[0];
    adaptador.solicitarEntrada(edificio);
    expect(adaptador.interiorActivo()).not.toBeNull();

    adaptador.salirDeInterior();

    expect(adaptador.interiorActivo()).toBeNull();
    expect(adaptador.suspendida()).toBeFalse();
    expect(mockControl.suspenderInteraccion).toHaveBeenCalledWith(false);
    expect(adaptador.entradaActual()).toEqual(edificio);
  });

  it('desconecta y destruye la instancia al desmontarse', () => {
    adaptador.desconectar();

    expect(mockControl.destruir).toHaveBeenCalledTimes(1);
    expect(adaptador.listo()).toBeFalse();
    expect(adaptador.posicion()).toBeNull();
  });

  it('rechaza entrar antes de llegar o a otro edificio y usa la configuración canónica', () => {
    expect(adaptador.solicitarEntrada(MUNDO_PRUEBA.edificios[0])).toBeFalse();
    llegarAlHospital();
    expect(adaptador.solicitarEntrada(MUNDO_PRUEBA.edificios[1])).toBeFalse();
    expect(adaptador.solicitarEntrada({ ...MUNDO_PRUEBA.edificios[0], nombre: 'Nombre no configurado' })).toBeTrue();
    expect(adaptador.interiorActivo()).toBe(MUNDO_PRUEBA.edificios[0]);
  });

  it('cerrar la libreta dentro del interior no reactiva el mundo', () => {
    llegarAlHospital(); adaptador.solicitarEntrada(MUNDO_PRUEBA.edificios[0]);
    adaptador.suspender(true); adaptador.suspender(false);
    expect(adaptador.suspendida()).toBeTrue();
    expect(mockControl.suspenderInteraccion.calls.mostRecent().args).toEqual([true]);
    adaptador.salirDeInterior();
    expect(adaptador.suspendida()).toBeFalse();
  });

  it('salir del interior conserva una confirmación o libreta aún abierta', () => {
    llegarAlHospital(); adaptador.solicitarEntrada(MUNDO_PRUEBA.edificios[0]);
    adaptador.suspender(true); adaptador.salirDeInterior();
    expect(adaptador.suspendida()).toBeTrue();
    adaptador.caminarA('inicio'); expect(mockControl.irA).not.toHaveBeenCalled();
    adaptador.suspender(false);
    adaptador.caminarA('inicio'); expect(mockControl.irA).toHaveBeenCalledWith('inicio');
  });

  it('aplica la suspensión solicitada antes de conectar Phaser y desconecta idempotentemente', () => {
    adaptador.desconectar(); mockControl.destruir.calls.reset();
    adaptador.suspender(true); adaptador.conectar(mockControl, MUNDO_PRUEBA);
    expect(mockControl.suspenderInteraccion.calls.mostRecent().args).toEqual([true]);
    adaptador.desconectar(); adaptador.desconectar();
    expect(mockControl.destruir).toHaveBeenCalledTimes(1);
  });

  it('detecta la llegada a la Plaza Central y actualiza el estado enPlazaCentral', () => {
    expect(adaptador.enPlazaCentral()).toBeFalse();

    adaptador.procesarEvento({
      tipo: 'llegada',
      posicion: { x: 450, y: 400 },
      entradaId: null,
      puntoAccesoId: 'plaza-central',
    });

    expect(adaptador.enPlazaCentral()).toBeTrue();
    expect(adaptador.mensaje()).toContain('Plaza Central');

    // Al iniciar movimiento fuera de la plaza, se desactiva
    adaptador.procesarEvento({ tipo: 'moviendo', destino: { x: 260, y: 400 } });
    expect(adaptador.enPlazaCentral()).toBeFalse();
  });

  it('bloquearPorCuestionario bloquea permanentemente la interacción y desactiva caminarA', () => {
    adaptador.bloquearPorCuestionario();

    expect(adaptador.enCuestionario()).toBeTrue();
    expect(adaptador.suspendida()).toBeTrue();
    expect(mockControl.suspenderInteraccion).toHaveBeenCalledWith(true);

    adaptador.caminarA('inicio');
    expect(mockControl.irA).not.toHaveBeenCalled();

    const hospital = MUNDO_PRUEBA.edificios[0];
    const entradaPermitida = adaptador.solicitarEntrada(hospital);
    expect(entradaPermitida).toBeFalse();

    // Desbloquear
    adaptador.desbloquearCuestionario();
    expect(adaptador.enCuestionario()).toBeFalse();
    expect(adaptador.suspendida()).toBeFalse();
  });
});
