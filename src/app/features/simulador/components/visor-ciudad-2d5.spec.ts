import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisorCiudad2d5 } from './visor-ciudad-2d5';
import { AdaptadorMundoSimulador } from '../mundo-tecnico/adaptador-mundo-simulador';
import { FABRICA_MUNDO } from '../mundo-tecnico/puerto-mundo';
import { MUNDO_PRUEBA } from '../mundo-tecnico/mundo-tecnico.fixture';
import type { ControlMundo } from '../mundo-tecnico/phaser-mundo';

describe('VisorCiudad2d5', () => {
  let fixture: ComponentFixture<VisorCiudad2d5>;
  let component: VisorCiudad2d5;
  let adaptador: AdaptadorMundoSimulador;
  let mockControl: jasmine.SpyObj<ControlMundo>;

  beforeEach(async () => {
    mockControl = jasmine.createSpyObj<ControlMundo>('ControlMundo', [
      'irA',
      'direccion',
      'suspenderInteraccion',
      'consultarEstado',
      'actualizarTamano',
      'destruir',
    ]);

    await TestBed.configureTestingModule({
      imports: [VisorCiudad2d5],
      providers: [
        AdaptadorMundoSimulador,
        {
          provide: FABRICA_MUNDO,
          useValue: jasmine.createSpy('fabricaMundo').and.returnValue(Promise.resolve(mockControl)),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VisorCiudad2d5);
    component = fixture.componentInstance;
    adaptador = TestBed.inject(AdaptadorMundoSimulador);
    fixture.detectChanges();
  });

  afterEach(() => {
    adaptador.desconectar();
  });

  it('se crea correctamente con la lista de edificios accesibles', () => {
    expect(component).toBeTruthy();
    const botones = fixture.nativeElement.querySelectorAll('.boton-destino');
    // Hospital, Fiscalía, Policía + Punto Inicial
    expect(botones.length).toBe(MUNDO_PRUEBA.edificios.length + 1);
  });

  it('despliega el botón Entrar cuando el avatar alcanza la entrada del Hospital', () => {
    const hospital = MUNDO_PRUEBA.edificios.find((e) => e.id === 'hospital-prueba')!;
    adaptador.entradaActual.set(hospital);
    fixture.detectChanges();

    const botonEntrar = fixture.nativeElement.querySelector('.boton-entrar');
    expect(botonEntrar).toBeTruthy();
    expect(botonEntrar.textContent).toContain('Hospital');

    spyOn(adaptador, 'solicitarEntrada');
    botonEntrar.click();
    expect(adaptador.solicitarEntrada).toHaveBeenCalledWith(hospital);
  });

  it('oculta el escenario de Phaser mientras un interior está activo', () => {
    const hospital = MUNDO_PRUEBA.edificios[0];
    adaptador.interiorActivo.set(hospital);
    fixture.detectChanges();

    const escenario = fixture.nativeElement.querySelector('.visor-ciudad__escenario');
    expect(escenario.style.display).toBe('none');
  });
});

describe('ciclo asíncrono del visor integrado', () => {
  it('descarta eventos tardíos y destruye una creación que termina después de salir', async () => {
    let resolver!: (control: ControlMundo) => void;
    let emitir!: Parameters<import('../mundo-tecnico/puerto-mundo').FabricaMundo>[1];
    const control = jasmine.createSpyObj<ControlMundo>('controlTardio', ['destruir']);
    TestBed.configureTestingModule({
      imports: [VisorCiudad2d5],
      providers: [AdaptadorMundoSimulador, {
        provide: FABRICA_MUNDO,
        useValue: (_elemento: HTMLElement, receptor: typeof emitir) => {
          emitir = receptor;
          return new Promise<ControlMundo>(resolve => { resolver = resolve; });
        },
      }],
    });
    const fixture = TestBed.createComponent(VisorCiudad2d5);
    const adaptador = TestBed.inject(AdaptadorMundoSimulador);
    const conectar = spyOn(adaptador, 'conectar').and.callThrough();
    fixture.detectChanges(); await new Promise(resolve => setTimeout(resolve, 0));
    expect(resolver).toBeDefined();
    fixture.destroy();
    emitir({ tipo: 'listo', posicion: { x: 110, y: 400 } });
    resolver(control); await Promise.resolve(); await Promise.resolve();
    expect(adaptador.listo()).toBeFalse();
    expect(conectar).not.toHaveBeenCalled();
    expect(control.destruir).toHaveBeenCalledTimes(1);
  });
});
