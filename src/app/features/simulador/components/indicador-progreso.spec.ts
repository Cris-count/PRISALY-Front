import { TestBed } from '@angular/core/testing';

import { IndicadorProgreso } from './indicador-progreso';

describe('IndicadorProgreso', () => {
  async function crear(actual: number, total: number, respondidas: number) {
    const fixture = TestBed.createComponent(IndicadorProgreso);
    fixture.componentRef.setInput('actual', actual);
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('respondidas', respondidas);
    await fixture.whenStable();
    return fixture;
  }

  it('presenta la posición y las preguntas respondidas', async () => {
    const fixture = await crear(2, 4, 1);
    const elemento = fixture.nativeElement as HTMLElement;
    const barra = elemento.querySelector('[role=progressbar]');

    expect(elemento.textContent).toContain('Pregunta 2 de 4');
    expect(elemento.textContent).toContain('1 respondidas');
    expect(barra?.getAttribute('aria-valuenow')).toBe('1');
    expect(barra?.getAttribute('aria-valuemax')).toBe('4');
    expect(fixture.componentInstance.porcentaje()).toBe(25);
  });

  it('no divide por cero sin preguntas', async () => {
    const fixture = await crear(1, 0, 0);

    expect(fixture.componentInstance.porcentaje()).toBe(0);
  });
});
