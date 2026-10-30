import { TestBed } from '@angular/core/testing';

import { EscenarioVista } from '../models/simulador.models';
import { Escenario2d } from './escenario-2d';

const ESCENARIO: EscenarioVista = {
  titulo: 'Sala',
  contexto: 'Contexto',
  elementos: [
    { id: 'a', etiqueta: 'Persona A', tipo: 'persona', x: 20, y: 80 },
    { id: 'b', etiqueta: 'Mesa', tipo: 'objeto', x: 50, y: 90 },
  ],
};

describe('Escenario2d', () => {
  it('dibuja cada elemento y describe la escena para lectores de pantalla', async () => {
    const fixture = TestBed.createComponent(Escenario2d);
    fixture.componentRef.setInput('escenario', ESCENARIO);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    const svg = elemento.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(elemento.querySelectorAll('[data-elemento]').length).toBe(2);
    expect(elemento.querySelectorAll('.escena__persona').length).toBe(2);
    expect(elemento.querySelectorAll('.escena__objeto').length).toBe(1);
    expect(elemento.querySelector('desc')?.textContent).toContain('Persona A, Mesa');
  });
});
