import { TestBed } from '@angular/core/testing';

import { BarraAcciones } from './barra-acciones';
import { ConfirmacionFinalizacion } from './confirmacion-finalizacion';
import { PantallaInicio } from './pantalla-inicio';

function botones(elemento: HTMLElement): HTMLButtonElement[] {
  return Array.from(elemento.querySelectorAll('button'));
}

describe('PantallaInicio', () => {
  it('ofrece consultar sesiones y la demostración sin iniciar nada al crearse', async () => {
    const fixture = TestBed.createComponent(PantallaInicio);
    const eventos: string[] = [];
    fixture.componentInstance.consultarSesiones.subscribe(() => eventos.push('sesiones'));
    fixture.componentInstance.explorarDemostracion.subscribe(() => eventos.push('demo'));
    await fixture.whenStable();

    expect(eventos).toEqual([]);
    const [sesiones, demo] = botones(fixture.nativeElement);
    sesiones.click();
    demo.click();
    expect(eventos).toEqual(['sesiones', 'demo']);
  });
});

describe('BarraAcciones', () => {
  it('deshabilita Anterior en la primera pregunta y Continuar en la última', async () => {
    const fixture = TestBed.createComponent(BarraAcciones);
    fixture.componentRef.setInput('esPrimera', true);
    fixture.componentRef.setInput('esUltima', true);
    await fixture.whenStable();

    const [anterior, continuar, finalizar] = botones(fixture.nativeElement);
    expect(anterior.disabled).toBeTrue();
    expect(continuar.disabled).toBeTrue();
    expect(finalizar.disabled).toBeFalse();
  });

  it('emite las acciones', async () => {
    const fixture = TestBed.createComponent(BarraAcciones);
    fixture.componentRef.setInput('esPrimera', false);
    const eventos: string[] = [];
    fixture.componentInstance.anterior.subscribe(() => eventos.push('anterior'));
    fixture.componentInstance.continuar.subscribe(() => eventos.push('continuar'));
    fixture.componentInstance.finalizar.subscribe(() => eventos.push('finalizar'));
    await fixture.whenStable();

    botones(fixture.nativeElement).forEach((b) => b.click());

    expect(eventos).toEqual(['anterior', 'continuar', 'finalizar']);
  });
});

describe('ConfirmacionFinalizacion', () => {
  it('resume el avance, recibe el foco y emite la decisión', async () => {
    const fixture = TestBed.createComponent(ConfirmacionFinalizacion);
    fixture.componentRef.setInput('respondidas', 2);
    fixture.componentRef.setInput('total', 3);
    const eventos: string[] = [];
    fixture.componentInstance.cancelar.subscribe(() => eventos.push('cancelar'));
    fixture.componentInstance.confirmar.subscribe(() => eventos.push('confirmar'));
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('[role=alertdialog]')).not.toBeNull();
    expect(elemento.textContent).toContain('2 de 3');
    expect(document.activeElement?.id).toBe('confirmacion-titulo');

    const [cancelar, confirmar] = botones(elemento);
    cancelar.click();
    confirmar.click();
    expect(eventos).toEqual(['cancelar', 'confirmar']);
  });
});
