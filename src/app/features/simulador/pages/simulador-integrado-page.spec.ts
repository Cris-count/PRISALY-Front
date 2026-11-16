import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimuladorIntegradoPage } from './simulador-integrado-page';
import { AdaptadorMundoSimulador } from '../mundo-tecnico/adaptador-mundo-simulador';
import { FABRICA_MUNDO } from '../mundo-tecnico/puerto-mundo';
import { MUNDO_PRUEBA } from '../mundo-tecnico/mundo-tecnico.fixture';
import type { ControlMundo } from '../mundo-tecnico/phaser-mundo';
import { ParticipacionGateway } from '../services/participacion.gateway';
import { of } from 'rxjs';
import { LibretaStore } from '../investigacion/libreta.store';
import { EstadoExploracion } from '../mundo-tecnico/estado-exploracion';
import { SimuladorStore } from '../services/simulador.store';

describe('SimuladorIntegradoPage (Fase 7)', () => {
  let fixture: ComponentFixture<SimuladorIntegradoPage>;
  let component: SimuladorIntegradoPage;
  let mockControl: jasmine.SpyObj<ControlMundo>;
  let mockGateway: jasmine.SpyObj<ParticipacionGateway>;

  beforeEach(async () => {
    mockControl = jasmine.createSpyObj<ControlMundo>('ControlMundo', [
      'irA',
      'direccion',
      'suspenderInteraccion',
      'consultarEstado',
      'actualizarTamano',
      'destruir',
    ]);

    mockGateway = jasmine.createSpyObj<ParticipacionGateway>('ParticipacionGateway', [
      'consultarSesionesAutorizadas',
      'iniciarIntento',
      'consultarIntento',
      'registrarRespuesta',
      'consultarProgreso',
      'reanudarIntento',
      'finalizarIntento',
    ]);
    mockGateway.consultarSesionesAutorizadas.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SimuladorIntegradoPage],
      providers: [
        {
          provide: FABRICA_MUNDO,
          useValue: jasmine.createSpy('fabricaMundo').and.returnValue(Promise.resolve(mockControl)),
        },
        {
          provide: ParticipacionGateway,
          useValue: mockGateway,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SimuladorIntegradoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicia en fase de bienvenida con el título de integración', () => {
    expect(component).toBeTruthy();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Simulador PRISALY — Ciudad Integrada');
    expect(texto).toContain('Iniciar experiencia integrada');
  });

  it('inicia la demostración unificando el visor 2.5D con el panel académico', () => {
    const botonIniciar = fixture.nativeElement.querySelector('.tarjeta-inicio .boton--primario');
    expect(botonIniciar).toBeTruthy();
    botonIniciar.click();
    fixture.detectChanges();

    const visor = fixture.nativeElement.querySelector('app-visor-ciudad-2d5');
    const preguntas = fixture.nativeElement.querySelector('app-panel-preguntas');
    const temporizador = fixture.nativeElement.querySelector('app-temporizador');
    const progreso = fixture.nativeElement.querySelector('app-indicador-progreso');

    expect(visor).not.toBeNull();
    expect(preguntas).not.toBeNull();
    expect(temporizador).not.toBeNull();
    expect(progreso).not.toBeNull();
  });

  it('abre y cierra la libreta en memoria suspendiendo la interacción de Phaser', () => {
    // Iniciar demo
    const botonIniciar = fixture.nativeElement.querySelector('.tarjeta-inicio .boton--primario');
    botonIniciar.click();
    fixture.detectChanges();

    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);

    const botonLibreta = fixture.nativeElement.querySelector('.boton-libreta');
    expect(botonLibreta).toBeTruthy();

    botonLibreta.click();
    fixture.detectChanges();

    expect(mockControl.suspenderInteraccion).toHaveBeenCalledWith(true);
    expect(fixture.nativeElement.querySelector('app-libreta-panel')).not.toBeNull();

    // Cerrar libreta
    const botonCerrar = fixture.nativeElement.querySelector('app-libreta-panel button[aria-label="Cerrar libreta"]');
    if (botonCerrar) {
      botonCerrar.click();
      fixture.detectChanges();
      expect(mockControl.suspenderInteraccion).toHaveBeenCalledWith(false);
      expect(fixture.nativeElement.querySelector('app-libreta-panel')).toBeNull();
    }
  });

  it('suspende Phaser y muestra el interior al solicitar entrada a un edificio', () => {
    const botonIniciar = fixture.nativeElement.querySelector('.tarjeta-inicio .boton--primario');
    botonIniciar.click();
    fixture.detectChanges();

    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);

    const hospital = MUNDO_PRUEBA.edificios.find((e) => e.id === 'hospital-prueba')!;
    adaptador.procesarEvento({ tipo: 'listo', posicion: { x: 110, y: 400 } });
    adaptador.procesarEvento({ tipo: 'llegada', posicion: { x: 795, y: 300 }, entradaId: hospital.id });
    adaptador.solicitarEntrada(hospital);
    fixture.detectChanges();

    expect(mockControl.suspenderInteraccion).toHaveBeenCalledWith(true);
    const interior = fixture.nativeElement.querySelector('.interior-panel');
    expect(interior).not.toBeNull();
    expect(interior.textContent).toContain(hospital.nombre);

    // Salir del interior
    const botonSalir = fixture.nativeElement.querySelector('.boton-salir-interior');
    botonSalir.click();
    fixture.detectChanges();

    expect(mockControl.suspenderInteraccion).toHaveBeenCalledWith(false);
    expect(fixture.nativeElement.querySelector('.interior-panel')).toBeNull();
  });

  it('no altera automáticamente las respuestas académicas al recopilar pistas o notas', () => {
    const botonIniciar = fixture.nativeElement.querySelector('.tarjeta-inicio .boton--primario');
    botonIniciar.click();
    fixture.detectChanges();

    const store = fixture.debugElement.injector.get(SimuladorStore);
    const libreta = fixture.debugElement.injector.get(LibretaStore);

    expect(store.respondidas()).toBe(0);

    // Agregar una nota en la libreta
    libreta.crearNota('Nota de investigación sobre síntomas en el hospital');
    fixture.detectChanges();

    // Las preguntas académicas siguen sin responderse
    expect(store.respondidas()).toBe(0);
    expect(store.seleccionActual()).toBeNull();
  });

  it('cerrar la libreta conserva la pausa del interior y una confirmación simultánea', async () => {
    fixture.nativeElement.querySelector('.tarjeta-inicio .boton--primario').click(); fixture.detectChanges();
    await fixture.whenStable();
    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    const store = fixture.debugElement.injector.get(SimuladorStore);
    const exploracion = fixture.debugElement.injector.get(EstadoExploracion);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);
    adaptador.procesarEvento({ tipo: 'listo', posicion: { x: 110, y: 400 } });
    adaptador.procesarEvento({ tipo: 'llegada', posicion: { x: 795, y: 300 }, entradaId: 'hospital-prueba' });
    adaptador.solicitarEntrada(MUNDO_PRUEBA.edificios[0]); fixture.detectChanges();
    fixture.nativeElement.querySelector('.boton-libreta').click(); fixture.detectChanges(); await fixture.whenStable();
    fixture.nativeElement.querySelector('[aria-label="Cerrar libreta"]').click(); fixture.detectChanges();
    expect(exploracion.motivos()).toContain('interior');
    expect(mockControl.suspenderInteraccion.calls.mostRecent().args).toEqual([true]);
    store.solicitarFinalizacion(); fixture.detectChanges();
    fixture.nativeElement.querySelector('.boton-salir-interior').click(); fixture.detectChanges();
    expect(exploracion.motivos()).toEqual(['confirmacion-modal']);
    expect(mockControl.suspenderInteraccion.calls.mostRecent().args).toEqual([true]);
    store.cancelarFinalizacion(); fixture.detectChanges();
    expect(mockControl.suspenderInteraccion.calls.mostRecent().args).toEqual([false]);
  });

  it('crea una sesión de libreta nueva al reiniciar la demostración sin iniciar intentos reales', () => {
    fixture.nativeElement.querySelector('.tarjeta-inicio .boton--primario').click(); fixture.detectChanges();
    const libreta = fixture.debugElement.injector.get(LibretaStore);
    const contextoAnterior = libreta.estado().contexto;
    libreta.crearNota('No debe aparecer en otra demostración');
    fixture.nativeElement.querySelector('.boton-volver-inicio').click(); fixture.detectChanges();
    fixture.nativeElement.querySelector('.tarjeta-inicio .boton--primario').click(); fixture.detectChanges();
    expect(libreta.estado().notas).toEqual([]);
    expect(libreta.estado().contexto).not.toEqual(contextoAnterior);
    expect(mockGateway.iniciarIntento).not.toHaveBeenCalled();
    expect(mockGateway.registrarRespuesta).not.toHaveBeenCalled();
  });
});
