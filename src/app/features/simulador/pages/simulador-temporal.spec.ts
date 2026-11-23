import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
// FE-58 H-58-01: la ruta técnica solo existe en el entorno demo; esta prueba la ejercita en ese entorno.
import { provideEntornoDemostracionAutorizado } from '../../autenticacion/entorno-demostracion';
import { FABRICA_MUNDO, FabricaMundo } from '../mundo-tecnico/puerto-mundo';
import { SimuladorTemporal } from './simulador-temporal';
import type { ControlMundo } from '../mundo-tecnico/phaser-mundo';
import type { EventoMundo } from '../mundo-tecnico/mundo-tecnico.models';
import { MUNDO_PRUEBA } from '../mundo-tecnico/mundo-tecnico.fixture';

describe('ciclo de vida del mundo técnico', () => {
  const esperarCreacion = () => new Promise<void>(resolve => setTimeout(resolve, 30));
  it('conserva posición y un único canvas Phaser tras dos entradas y regresos al hospital', async () => {
    const { iniciarMundoPhaser } = await import('../mundo-tecnico/phaser-mundo');
    const eventos: EventoMundo[] = [];
    let control!: ControlMundo;
    let avisarListo!: () => void;
    let avisarLlegada!: () => void;
    const listo = new Promise<void>(resolve => { avisarListo = resolve; });
    const llegada = new Promise<void>(resolve => { avisarLlegada = resolve; });
    const fabrica = jasmine.createSpy('fabricaReal').and.callFake(async (elemento: HTMLElement, emitir: (evento: EventoMundo) => void) => {
      control = iniciarMundoPhaser(elemento, MUNDO_PRUEBA, evento => {
        eventos.push(evento); emitir(evento);
        if (evento.tipo === 'listo') avisarListo();
        if (evento.tipo === 'llegada' && evento.entradaId === 'hospital-prueba') avisarLlegada();
      });
      spyOn(control, 'destruir').and.callThrough();
      return control;
    });
    TestBed.configureTestingModule({ providers: [{ provide: FABRICA_MUNDO, useValue: fabrica }] });
    const fixture = TestBed.createComponent(SimuladorTemporal);
    try {
      fixture.detectChanges(); await listo;
      control.irA('entrada'); await llegada; fixture.detectChanges();
      const canvas = fixture.nativeElement.querySelector('canvas');
      expect(canvas).not.toBeNull();
      const boton = (texto: string) => [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent?.trim() === texto) as HTMLButtonElement;
      for (let i = 0; i < 2; i++) {
        boton('Entrar a Hospital').click(); fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#interior-titulo').textContent).toContain('Hospital');
        expect(fixture.componentInstance.estadoExploracion.suspendido()).toBeTrue();
        const eventosAntes = eventos.length;
        control.irA('inicio'); control.direccion({ x: 1, y: 0 });
        expect(eventos.length).toBe(eventosAntes);
        boton('Volver al mapa').click(); fixture.detectChanges();
        expect(fixture.componentInstance.estadoExploracion.suspendido()).toBeFalse();
        expect(fixture.nativeElement.querySelector('canvas')).toBe(canvas);
        expect(fixture.nativeElement.querySelectorAll('canvas').length).toBe(1);
        expect(control.destruir).not.toHaveBeenCalled();
        // Pedir el mismo destino debe llegar sin emitir movimiento: la escena retuvo (795,300).
        const antes = eventos.length;
        control.irA('entrada');
        expect(eventos.slice(antes)).toEqual([{ tipo: 'llegada', posicion: { x: 795, y: 300 }, entradaId: 'hospital-prueba' }]);
      }
      expect(fabrica).toHaveBeenCalledTimes(1);
      expect(eventos.filter(e => e.tipo === 'listo').length).toBe(1);
    } finally { fixture.destroy(); }
    expect(control.destruir).toHaveBeenCalledTimes(1);
  }, 15000);
  it('abre dos veces la libreta, conserva notas y mantiene el bloqueo al cerrarla dentro de un interior', async () => {
    let emitir!: (evento: EventoMundo) => void;
    const control = jasmine.createSpyObj<ControlMundo>('ControlMundo', ['irA', 'direccion', 'suspenderInteraccion', 'consultarEstado', 'actualizarTamano', 'destruir']);
    const fabrica: FabricaMundo = async (_elemento, receptor) => { emitir = receptor; return control; };
    TestBed.configureTestingModule({ providers: [{ provide: FABRICA_MUNDO, useValue: fabrica }] });
    const fixture = TestBed.createComponent(SimuladorTemporal);
    try {
      fixture.detectChanges(); await esperarCreacion();
      emitir({ tipo: 'listo', posicion: { x: 795, y: 300 } });
      emitir({ tipo: 'llegada', posicion: { x: 795, y: 300 }, entradaId: 'hospital-prueba' }); fixture.detectChanges();
      const boton = (texto: string) => [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent?.trim() === texto) as HTMLButtonElement;
      fixture.componentInstance.investigacion.crearNota('Conservar al cambiar de interfaz');
      for (let i = 0; i < 2; i++) {
        boton('Libreta').click(); fixture.detectChanges(); await fixture.whenStable();
        expect(control.suspenderInteraccion).toHaveBeenCalledWith(true);
        expect(fixture.nativeElement.querySelector('dialog').textContent).toContain('Conservar al cambiar de interfaz');
        boton('Cerrar').click(); fixture.detectChanges();
        expect(control.suspenderInteraccion).toHaveBeenCalledWith(false);
      }
      boton('Entrar a Hospital').click(); fixture.detectChanges();
      boton('Libreta').click(); fixture.detectChanges(); await fixture.whenStable();
      boton('Cerrar').click(); fixture.detectChanges();
      expect(fixture.componentInstance.estadoExploracion.motivos()).toEqual(['interior']);
      expect(control.suspenderInteraccion.calls.mostRecent().args).toEqual([true]);
      boton('Volver al mapa').click(); fixture.detectChanges();
      expect(control.suspenderInteraccion.calls.mostRecent().args).toEqual([false]);
      expect(fixture.componentInstance.investigacion.estado().notas.length).toBe(1);
      expect(control.destruir).not.toHaveBeenCalled();
    } finally { fixture.destroy(); }
  });
  it('desactiva el control de movimiento por teclado y conserva botones accesibles', async () => {
    const control = jasmine.createSpyObj<ControlMundo>('ControlMundo', ['irA', 'direccion', 'suspenderInteraccion', 'consultarEstado', 'actualizarTamano', 'destruir']);
    const fabrica: FabricaMundo = async () => control;
    TestBed.configureTestingModule({ providers: [{ provide: FABRICA_MUNDO, useValue: fabrica }] });
    const fixture = TestBed.createComponent(SimuladorTemporal);
    fixture.detectChanges(); await esperarCreacion();
    const escena = fixture.nativeElement.querySelector('[role="application"]') as HTMLElement;
    escena.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    escena.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(control.direccion).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Caminar a Hospital');
    fixture.destroy();
  });
  it('destruye el renderer al salir y crea uno solo al regresar a la ruta', async () => {
    const controles: jasmine.SpyObj<ControlMundo>[] = [];
    const fabrica: FabricaMundo = async (_elemento, emitir) => {
      const control = jasmine.createSpyObj<ControlMundo>('ControlMundo', ['irA', 'direccion', 'suspenderInteraccion', 'consultarEstado', 'actualizarTamano', 'destruir']);
      controles.push(control); emitir({ tipo: 'listo', posicion: { x: 0, y: 0 } }); return control;
    };
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideEntornoDemostracionAutorizado(), { provide: FABRICA_MUNDO, useValue: fabrica }] });
    const harness = await RouterTestingHarness.create('/simulador-tecnico-2d5');
    await esperarCreacion();
    expect(controles.length).toBe(1);
    await harness.navigateByUrl('/login');
    expect(controles[0].destruir).toHaveBeenCalledTimes(1);
    await harness.navigateByUrl('/simulador-tecnico-2d5');
    await esperarCreacion();
    expect(controles.length).toBe(2);
    expect(controles[1].destruir).not.toHaveBeenCalled();
    await TestBed.inject(Router).navigateByUrl('/login');
    expect(controles[1].destruir).toHaveBeenCalledTimes(1);
  });
  it('destruye una creación que termine después de abandonar el componente', async () => {
    let resolver!: (control: ControlMundo) => void;
    const control = jasmine.createSpyObj<ControlMundo>('ControlMundo', ['irA', 'direccion', 'suspenderInteraccion', 'consultarEstado', 'actualizarTamano', 'destruir']);
    const fabrica: FabricaMundo = () => new Promise(resolve => { resolver = resolve; });
    TestBed.configureTestingModule({ providers: [{ provide: FABRICA_MUNDO, useValue: fabrica }] });
    const fixture = TestBed.createComponent(SimuladorTemporal);
    fixture.detectChanges();
    await esperarCreacion();
    expect(resolver).toBeDefined();
    fixture.destroy();
    resolver(control);
    await Promise.resolve();
    expect(control.destruir).toHaveBeenCalledTimes(1);
  });

  it('abre y cierra el interior al llegar, conserva el renderer y acepta una salida repetida', async () => {
    let emitir!: (evento: EventoMundo) => void;
    const control = jasmine.createSpyObj<ControlMundo>('ControlMundo', ['irA', 'direccion', 'suspenderInteraccion', 'consultarEstado', 'actualizarTamano', 'destruir']);
    const fabrica: FabricaMundo = async (_elemento, receptor) => { emitir = receptor; return control; };
    TestBed.configureTestingModule({ providers: [{ provide: FABRICA_MUNDO, useValue: fabrica }] });
    const fixture = TestBed.createComponent(SimuladorTemporal);
    fixture.detectChanges();
    await esperarCreacion();
    emitir({ tipo: 'listo', posicion: { x: 0, y: 0 } });
    emitir({ tipo: 'llegada', posicion: { x: 260, y: 200 }, entradaId: 'fiscalia-prueba' });
    fixture.detectChanges();
    const boton = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent?.includes('Entrar a Fiscalía')) as HTMLButtonElement;
    expect(boton).toBeDefined();
    boton.click(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Interior técnico: Fiscalía');
    expect(control.destruir).not.toHaveBeenCalled();
    const salir = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent?.includes('Volver al mapa')) as HTMLButtonElement;
    salir.click(); salir.click(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Regresaste al mapa desde Fiscalía.');
    expect(fixture.componentInstance.transiciones().map(e => e.tipo)).toEqual(['entrada-solicitada', 'entrada-autorizada', 'interior-abierto', 'salida-solicitada', 'regreso-mapa']);
    expect(control.destruir).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
