import { TestBed } from '@angular/core/testing';

import { Temporizador } from './temporizador';

describe('Temporizador', () => {
  async function crear(segundos: number | null) {
    const fixture = TestBed.createComponent(Temporizador);
    fixture.componentRef.setInput('segundos', segundos);
    await fixture.whenStable();
    return fixture;
  }

  it('formatea minutos y segundos', async () => {
    const fixture = await crear(125);

    expect(fixture.componentInstance.formato()).toBe('02:05');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 minutos y 5 segundos');
  });

  it('indica cuando no hay límite informado', async () => {
    const fixture = await crear(null);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin límite informado');
  });

  it('al agotarse solo informa: la validez la decide el servidor', async () => {
    const fixture = await crear(0);
    const elemento = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.agotado()).toBeTrue();
    expect(elemento.textContent).toContain('determina el servidor');
    expect(elemento.querySelector('button')).toBeNull();
  });
});
