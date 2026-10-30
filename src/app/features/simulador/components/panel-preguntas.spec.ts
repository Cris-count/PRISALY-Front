import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreguntaVista } from '../models/simulador.models';
import { PanelPreguntas } from './panel-preguntas';

const PREGUNTA: PreguntaVista = {
  id: 'p1',
  enunciado: 'Enunciado de prueba',
  opciones: [
    { id: 'o1', texto: 'Primera' },
    { id: 'o2', texto: 'Segunda' },
  ],
};

describe('PanelPreguntas', () => {
  let fixture: ComponentFixture<PanelPreguntas>;
  let elemento: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(PanelPreguntas);
    fixture.componentRef.setInput('pregunta', PREGUNTA);
    fixture.componentRef.setInput('numero', 2);
    await fixture.whenStable();
    elemento = fixture.nativeElement;
  });

  const radios = () => Array.from(elemento.querySelectorAll<HTMLInputElement>('input[type=radio]'));

  it('muestra el enunciado como leyenda del grupo y una opción por radio', () => {
    expect(elemento.querySelector('legend')?.textContent).toContain('Pregunta 2');
    expect(elemento.querySelector('legend')?.textContent).toContain('Enunciado de prueba');
    expect(radios().length).toBe(2);
    expect(radios().every((r) => r.name === 'pregunta-p1')).toBeTrue();
  });

  it('emite la opción elegida', () => {
    const elegidas: string[] = [];
    fixture.componentInstance.seleccionar.subscribe((id) => elegidas.push(id));

    radios()[1].click();

    expect(elegidas).toEqual(['o2']);
  });

  it('marca visualmente la selección recibida', async () => {
    fixture.componentRef.setInput('seleccion', 'o1');
    await fixture.whenStable();

    expect(radios()[0].checked).toBeTrue();
    expect(elemento.querySelectorAll('.opcion--seleccionada').length).toBe(1);
  });

  it('puede deshabilitarse', async () => {
    fixture.componentRef.setInput('deshabilitado', true);
    await fixture.whenStable();

    expect(elemento.querySelector('fieldset')?.disabled).toBeTrue();
  });
});
