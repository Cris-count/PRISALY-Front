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
    expect(texto).toContain('Simulador PRISALY');
    expect(texto).toContain('Iniciar demostración anterior (Phaser 2.5D)');
  });

  it('inicia la demostración en fase de exploración con visor 2.5D y guía investigativa', () => {
    const botonIniciar = fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]');
    expect(botonIniciar).toBeTruthy();
    botonIniciar.click();
    fixture.detectChanges();

    const visor = fixture.nativeElement.querySelector('app-visor-ciudad-2d5');
    const guia = fixture.nativeElement.querySelector('.panel-guia-investigacion');
    const preguntas = fixture.nativeElement.querySelector('app-panel-preguntas');
    const temporizador = fixture.nativeElement.querySelector('app-temporizador');
    const progreso = fixture.nativeElement.querySelector('app-indicador-progreso');

    expect(visor).not.toBeNull();
    expect(guia).not.toBeNull();
    expect(preguntas).toBeNull();
    expect(temporizador).not.toBeNull();
    expect(progreso).not.toBeNull();
    expect(component.faseExperiencia()).toBe('explorando');
  });

  it('ofrece Unreal como acceso principal y exige elegir explícitamente la demostración anterior', () => {
    const inicio = fixture.nativeElement as HTMLElement;
    const principal = inicio.querySelector<HTMLAnchorElement>('.tarjeta-inicio .boton--primario');
    expect(principal?.tagName).toBe('A');
    expect(principal?.getAttribute('href')).toBe('simulador-unreal');
    expect(principal?.textContent).toContain('Abrir simulador Unreal (3D)');
    expect(inicio.querySelector('[data-testid="iniciar-demo-anterior"]')?.textContent).toContain('Phaser 2.5D');
    expect(inicio.querySelector('app-visor-ciudad-2d5')).toBeNull();
    expect(component.faseExperiencia()).toBe('preparado');
  });

  it('solicita confirmación al llegar a Plaza Central y cancela regresando a exploración', () => {
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click();
    fixture.detectChanges();

    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);

    component.solicitarInicioCuestionario();
    fixture.detectChanges();

    expect(component.faseExperiencia()).toBe('confirmando-inicio');
    const modal = fixture.nativeElement.querySelector('.dialogo-inicio-cuestionario');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('¿Comenzar el cuestionario de demostración?');

    component.cancelarInicioCuestionario();
    fixture.detectChanges();

    expect(component.faseExperiencia()).toBe('explorando');
    expect(fixture.nativeElement.querySelector('.dialogo-inicio-cuestionario')).toBeNull();
    expect(adaptador.enCuestionario()).toBeFalse();
  });

  it('confirma el inicio del cuestionario, bloquea la exploración y activa las preguntas', () => {
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click();
    fixture.detectChanges();

    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);

    component.solicitarInicioCuestionario();
    component.confirmarInicioCuestionario();
    fixture.detectChanges();

    expect(component.faseExperiencia()).toBe('en-cuestionario');
    expect(adaptador.enCuestionario()).toBeTrue();
    expect(mockControl.suspenderInteraccion).toHaveBeenCalledWith(true);

    const preguntas = fixture.nativeElement.querySelector('app-panel-preguntas');
    expect(preguntas).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.panel-guia-investigacion')).toBeNull();

    adaptador.caminarA('inicio');
    expect(mockControl.irA).not.toHaveBeenCalled();
  });

  it('cancelar la confirmación de finalización no desbloquea la exploración de la ciudad', () => {
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click();
    fixture.detectChanges();

    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);

    component.solicitarInicioCuestionario();
    component.confirmarInicioCuestionario();
    fixture.detectChanges();

    component.solicitarFinalizacionCuestionario();
    fixture.detectChanges();
    expect(component.faseExperiencia()).toBe('confirmando-finalizacion');

    component.cancelarFinalizacionCuestionario();
    fixture.detectChanges();

    expect(component.faseExperiencia()).toBe('en-cuestionario');
    expect(adaptador.enCuestionario()).toBeTrue();
    expect(mockControl.suspenderInteraccion.calls.mostRecent().args).toEqual([true]);
  });

  it('abre y cierra la libreta en memoria suspendiendo la interacción de Phaser', () => {
    // Iniciar demo
    const botonIniciar = fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]');
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
    const botonIniciar = fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]');
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
    const botonIniciar = fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]');
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
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click(); fixture.detectChanges();
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
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click(); fixture.detectChanges();
    const libreta = fixture.debugElement.injector.get(LibretaStore);
    const contextoAnterior = libreta.estado().contexto;
    libreta.crearNota('No debe aparecer en otra demostración');
    fixture.nativeElement.querySelector('.boton-volver-inicio').click(); fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click(); fixture.detectChanges();
    expect(libreta.estado().notas).toEqual([]);
    expect(libreta.estado().contexto).not.toEqual(contextoAnterior);
    expect(mockGateway.iniciarIntento).not.toHaveBeenCalled();
    expect(mockGateway.registrarRespuesta).not.toHaveBeenCalled();
  });

  it('permite acceso directo a Plaza Central sin investigar con advertencia informativa sin bloqueo', () => {
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click();
    fixture.detectChanges();

    // Sin visitar ningún edificio
    expect(component.advertenciaSinInvestigar()).toBeTrue();

    component.solicitarInicioCuestionario();
    fixture.detectChanges();

    const advertencia = fixture.nativeElement.querySelector('.advertencia-sin-pistas');
    expect(advertencia).not.toBeNull();
    expect(advertencia.textContent).toContain('Aún no has investigado en los edificios ni recopilado pistas');

    // El botón de inicio debe estar presente y habilitado
    const botonConfirmar = fixture.nativeElement.querySelector('.dialogo-inicio-cuestionario .boton--primario');
    expect(botonConfirmar).not.toBeNull();
    expect(botonConfirmar.disabled).toBeFalse();

    // Confirmamos directamente
    botonConfirmar.click();
    fixture.detectChanges();

    expect(component.faseExperiencia()).toBe('en-cuestionario');
  });

  it('muestra personajes y diálogo interactivo al ingresar al Hospital con continuidad narrativa', () => {
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click();
    fixture.detectChanges();

    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);

    const hospital = MUNDO_PRUEBA.edificios.find((e) => e.id === 'hospital-prueba')!;
    adaptador.procesarEvento({ tipo: 'listo', posicion: { x: 110, y: 400 } });
    adaptador.procesarEvento({ tipo: 'llegada', posicion: { x: 795, y: 300 }, entradaId: hospital.id });
    adaptador.solicitarEntrada(hospital);
    fixture.detectChanges();

    // Comprobamos la carga del motor narrativo del interior
    expect(component.motorInterior()).not.toBeNull();
    const textoInterior = fixture.nativeElement.querySelector('.interior-panel').textContent;
    expect(textoInterior).toContain('Dr. Mendoza');
    expect(textoInterior).toContain('Bienvenido al Hospital Central');

    // Avanzamos diálogo
    component.avanzarDialogoInterior();
    fixture.detectChanges();
    component.avanzarDialogoInterior();
    fixture.detectChanges();

    // Seleccionamos opción
    component.elegirOpcionInterior('consultar-expediente');
    component.completarTransicionInterior();
    fixture.detectChanges();

    const libreta = fixture.debugElement.injector.get(LibretaStore);
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().pistas[0].id).toBe('pista-historial-clinico');

    // Salimos del Hospital
    component.salirDeInterior();
    fixture.detectChanges();
    expect(adaptador.interiorActivo()).toBeNull();

    // Entramos a Policía
    const policia = MUNDO_PRUEBA.edificios.find((e) => e.id === 'policia-prueba')!;
    adaptador.procesarEvento({ tipo: 'llegada', posicion: { x: 640, y: 400 }, entradaId: policia.id });
    adaptador.solicitarEntrada(policia);
    fixture.detectChanges();

    expect(component.motorInterior()?.dialogoActual?.texto).toContain('Comisaría Sectorial');

    // Salimos de Policía y regresamos al Hospital
    component.salirDeInterior();
    fixture.detectChanges();

    adaptador.procesarEvento({ tipo: 'llegada', posicion: { x: 795, y: 300 }, entradaId: hospital.id });
    adaptador.solicitarEntrada(hospital);
    fixture.detectChanges();

    // Verificamos que se restauró en la escena donde se dejó (sala-consulta con el informe médico)
    expect(component.motorInterior()?.estado.escenaId).toBe('sala-consulta');
    expect(libreta.estado().pistas.length).toBe(1); // No duplicó pistas
  });

  it('restaura el foco al elemento disparador al cancelar el modal nativo de cuestionario', async () => {
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click();
    fixture.detectChanges();

    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);

    const botonPrueba = document.createElement('button');
    botonPrueba.id = 'boton-disparador-prueba';
    document.body.appendChild(botonPrueba);
    botonPrueba.focus();

    component.solicitarInicioCuestionario(botonPrueba);
    fixture.detectChanges();
    await fixture.whenStable();

    const modal = fixture.nativeElement.querySelector('.dialogo-inicio-cuestionario');
    expect(modal).not.toBeNull();

    // Cancelar modal
    component.cancelarInicioCuestionario();
    fixture.detectChanges();

    expect(component.faseExperiencia()).toBe('explorando');
    expect(document.activeElement).toBe(botonPrueba);
    document.body.removeChild(botonPrueba);
  });

  it('el evento cancel del diálogo nativo (Escape) cancela la confirmación sin activar movimientos', () => {
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click();
    fixture.detectChanges();

    const adaptador = fixture.debugElement.injector.get(AdaptadorMundoSimulador);
    adaptador.conectar(mockControl, MUNDO_PRUEBA);

    component.solicitarInicioCuestionario();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.dialogo-inicio-cuestionario') as HTMLDialogElement;
    expect(modal).not.toBeNull();

    // Simular evento cancel nativo (Escape)
    const cancelEvt = new Event('cancel', { cancelable: true });
    modal.dispatchEvent(cancelEvt);
    fixture.detectChanges();

    expect(component.faseExperiencia()).toBe('explorando');
    expect(adaptador.enCuestionario()).toBeFalse();
    // No se emitieron comandos de movimiento a Phaser
    expect(mockControl.irA).not.toHaveBeenCalled();
  });

  it('auditoría de textos: todas las vistas rotulan estrictamente demostración sin implicar persistencia oficial', () => {
    // 1. Pantalla de inicio
    const textoInicio = fixture.nativeElement.textContent;
    expect(textoInicio).toContain('SIMULADOR 2.0 · ACCESO WEB');
    expect(textoInicio).toContain('cuestionario de demostración');

    // 2. Exploración
    fixture.nativeElement.querySelector('[data-testid="iniciar-demo-anterior"]').click();
    fixture.detectChanges();

    const textoExploracion = fixture.nativeElement.textContent;
    expect(textoExploracion).toContain('FASE 1 · INVESTIGACIÓN Y RECOPILACIÓN DEMO');
    expect(textoExploracion).toContain('Acceso al Cuestionario de Demostración');

    // 3. Modal de confirmación
    component.solicitarInicioCuestionario();
    fixture.detectChanges();
    const textoModal = fixture.nativeElement.querySelector('.dialogo-inicio-cuestionario').textContent;
    expect(textoModal).toContain('TRANSICIÓN AL CUESTIONARIO DEMO');
    expect(textoModal).toContain('¿Comenzar el cuestionario de demostración?');
    expect(textoModal).toContain('No se transmiten ni persisten en el Backend oficial');

    // 4. Cuestionario activo
    component.confirmarInicioCuestionario();
    fixture.detectChanges();
    const textoCuestionario = fixture.nativeElement.textContent;
    expect(textoCuestionario).toContain('FASE 2 · CUESTIONARIO DE DEMOSTRACIÓN (EJEMPLO)');
    expect(textoCuestionario).toContain('Fase Cuestionario Demo');
  });
});
