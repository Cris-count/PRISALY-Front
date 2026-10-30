import { TestBed } from '@angular/core/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';

import { CASO_DEMOSTRACION } from '../demo/caso-demostracion';
import { ContratoPendienteError, ParticipacionGateway } from './participacion.gateway';
import { SimuladorStore } from './simulador.store';

describe('SimuladorStore', () => {
  let gateway: jasmine.SpyObj<ParticipacionGateway>;
  let store: SimuladorStore;

  function crearStore(): SimuladorStore {
    TestBed.configureTestingModule({
      providers: [SimuladorStore, { provide: ParticipacionGateway, useValue: gateway }],
    });
    return TestBed.inject(SimuladorStore);
  }

  beforeEach(() => {
    gateway = jasmine.createSpyObj<ParticipacionGateway>('ParticipacionGateway', [
      'consultarSesionesAutorizadas',
      'iniciarIntento',
      'consultarIntento',
      'registrarRespuesta',
      'consultarProgreso',
      'reanudarIntento',
      'finalizarIntento',
    ]);
  });

  afterEach(() => jasmine.clock().uninstall());

  describe('al crearse (equivalente a recargar la vista)', () => {
    beforeEach(() => (store = crearStore()));

    it('queda en la pantalla inicial sin caso ni intento', () => {
      expect(store.fase()).toBe('inicio');
      expect(store.caso()).toBeNull();
      expect(store.origen()).toBeNull();
    });

    it('no invoca ninguna operación de M5', () => {
      for (const spy of Object.values(gateway)) {
        expect(spy).not.toHaveBeenCalled();
      }
    });
  });

  describe('consultar sesiones', () => {
    it('muestra el estado de carga mientras espera', () => {
      gateway.consultarSesionesAutorizadas.and.returnValue(NEVER);
      store = crearStore();

      store.consultarSesiones();

      expect(store.fase()).toBe('cargando');
      expect(store.error()).toBeNull();
    });

    it('ignora solicitudes repetidas mientras carga', () => {
      gateway.consultarSesionesAutorizadas.and.returnValue(NEVER);
      store = crearStore();

      store.consultarSesiones();
      store.consultarSesiones();

      expect(gateway.consultarSesionesAutorizadas).toHaveBeenCalledTimes(1);
    });

    it('informa que el contrato está pendiente sin iniciar un intento', () => {
      gateway.consultarSesionesAutorizadas.and.returnValue(
        throwError(() => new ContratoPendienteError('consultarSesionesAutorizadas')),
      );
      store = crearStore();

      store.consultarSesiones();

      expect(store.fase()).toBe('error');
      expect(store.error()).toContain('No se inició ningún intento');
      expect(gateway.iniciarIntento).not.toHaveBeenCalled();
      expect(store.caso()).toBeNull();
    });

    it('muestra un error genérico ante otras fallas', () => {
      gateway.consultarSesionesAutorizadas.and.returnValue(throwError(() => new Error('red')));
      store = crearStore();

      store.consultarSesiones();

      expect(store.fase()).toBe('error');
      expect(store.error()).toContain('No fue posible comunicarse');
    });

    it('no interpreta respuestas sin contrato aprobado', () => {
      gateway.consultarSesionesAutorizadas.and.returnValue(of({ cualquier: 'cosa' }));
      store = crearStore();

      store.consultarSesiones();

      expect(store.fase()).toBe('error');
      expect(store.caso()).toBeNull();
    });

    it('volver al inicio limpia el error', () => {
      const respuesta = new Subject<unknown>();
      gateway.consultarSesionesAutorizadas.and.returnValue(respuesta);
      store = crearStore();
      store.consultarSesiones();
      respuesta.error(new Error('red'));

      store.volverAlInicio();

      expect(store.fase()).toBe('inicio');
      expect(store.error()).toBeNull();
    });
  });

  describe('vista de demostración', () => {
    beforeEach(() => {
      jasmine.clock().install();
      store = crearStore();
      store.explorarDemostracion();
    });

    it('se identifica como datos simulados y no llama a M5', () => {
      expect(store.esDemostracion()).toBeTrue();
      expect(store.fase()).toBe('en-curso');
      expect(store.caso()).toBe(CASO_DEMOSTRACION);
      expect(gateway.iniciarIntento).not.toHaveBeenCalled();
    });

    it('navega entre preguntas dentro de los límites', () => {
      expect(store.esPrimera()).toBeTrue();
      store.anterior();
      expect(store.indice()).toBe(0);

      store.siguiente();
      store.siguiente();
      expect(store.esUltima()).toBeTrue();
      store.siguiente();
      expect(store.indice()).toBe(store.totalPreguntas() - 1);

      store.irAPregunta(0);
      expect(store.preguntaActual()).toBe(CASO_DEMOSTRACION.preguntas[0]);
    });

    it('registra la selección visual y permite cambiarla', () => {
      const [primera, segunda] = CASO_DEMOSTRACION.preguntas[0].opciones;

      store.seleccionarOpcion(primera.id);
      expect(store.seleccionActual()).toBe(primera.id);

      store.seleccionarOpcion(segunda.id);
      expect(store.seleccionActual()).toBe(segunda.id);
      expect(store.respondidas()).toBe(1);
    });

    it('ignora opciones que no pertenecen a la pregunta actual', () => {
      store.seleccionarOpcion(CASO_DEMOSTRACION.preguntas[1].opciones[0].id);

      expect(store.seleccionActual()).toBeNull();
      expect(store.respondidas()).toBe(0);
    });

    it('calcula el progreso según las preguntas respondidas', () => {
      store.seleccionarOpcion(CASO_DEMOSTRACION.preguntas[0].opciones[0].id);
      store.siguiente();
      store.seleccionarOpcion(CASO_DEMOSTRACION.preguntas[1].opciones[2].id);

      expect(store.respondidas()).toBe(2);
      expect(store.totalPreguntas()).toBe(3);
    });

    it('descuenta el tiempo de forma informativa sin bloquear la selección', () => {
      expect(store.segundosRestantes()).toBe(300);
      jasmine.clock().tick(3000);
      expect(store.segundosRestantes()).toBe(297);

      jasmine.clock().tick(400_000);
      expect(store.segundosRestantes()).toBe(0);
      expect(store.tiempoAgotado()).toBeTrue();
      expect(store.fase()).toBe('en-curso');

      store.seleccionarOpcion(CASO_DEMOSTRACION.preguntas[0].opciones[0].id);
      expect(store.respondidas()).toBe(1);
    });

    it('pide confirmación antes de finalizar y permite cancelar', () => {
      store.solicitarFinalizacion();
      expect(store.fase()).toBe('confirmando');

      store.seleccionarOpcion(CASO_DEMOSTRACION.preguntas[0].opciones[0].id);
      expect(store.respondidas()).toBe(0);

      store.cancelarFinalizacion();
      expect(store.fase()).toBe('en-curso');
    });

    it('finaliza la vista y detiene el temporizador', () => {
      store.solicitarFinalizacion();
      store.confirmarFinalizacion();
      const restantes = store.segundosRestantes();

      jasmine.clock().tick(5000);

      expect(store.fase()).toBe('finalizado');
      expect(store.segundosRestantes()).toBe(restantes);
      expect(gateway.finalizarIntento).not.toHaveBeenCalled();
    });

    it('volver al inicio descarta las selecciones locales', () => {
      store.seleccionarOpcion(CASO_DEMOSTRACION.preguntas[0].opciones[0].id);

      store.volverAlInicio();

      expect(store.fase()).toBe('inicio');
      expect(store.respondidas()).toBe(0);
      expect(store.segundosRestantes()).toBeNull();
    });
  });
});
