import { TestBed } from '@angular/core/testing';
import { LibretaPanel } from './libreta-panel';
import { LibretaStore } from './libreta.store';

describe('panel accesible de libreta', () => {
  it('crea, consulta, edita y elimina notas mediante sus controles', async () => {
    TestBed.configureTestingModule({ providers: [LibretaStore] });
    const fixture = TestBed.createComponent(LibretaPanel);
    try {
      fixture.detectChanges(); await fixture.whenStable();
      const boton = (texto: string) => [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent?.trim() === texto) as HTMLButtonElement;
      const escribir = async (texto: string) => {
        const editor = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
        editor.value = texto; editor.dispatchEvent(new Event('input')); await fixture.whenStable(); fixture.detectChanges();
      };
      await escribir('Revisar la entrevista');
      boton('Añadir nota').click(); await fixture.whenStable(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.nota').textContent).toContain('Revisar la entrevista');
      boton('Editar').click(); fixture.detectChanges();
      await escribir('Comparar las dos entrevistas');
      boton('Aplicar cambios').click(); await fixture.whenStable(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.nota').textContent).toContain('Comparar las dos entrevistas');
      boton('Eliminar').click(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.nota')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('se perderán al recargar');
    } finally { fixture.destroy(); }
  });
  it('recopila solo al pulsar la acción explícita y no duplica la pista', async () => {
    TestBed.configureTestingModule({ providers: [LibretaStore] });
    const fixture = TestBed.createComponent(LibretaPanel);
    try {
      fixture.detectChanges(); await fixture.whenStable();
      const store = TestBed.inject(LibretaStore);
      expect(store.estado().pistas).toEqual([]);
      const boton = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent?.includes('Recopilar pista')) as HTMLButtonElement;
      boton.click(); fixture.detectChanges(); boton.click(); fixture.detectChanges();
      expect(store.estado().pistas.length).toBe(1);
      expect(store.estado().notas).toEqual([]);
      expect(boton.disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('.pista').textContent).toContain('Hospital · demostración');
    } finally { fixture.destroy(); }
  });
  it('abre como diálogo modal, permite Escape y restaura el foco al desmontar', async () => {
    const origen = document.createElement('button'); document.body.appendChild(origen); origen.focus();
    TestBed.configureTestingModule({ providers: [LibretaStore] });
    const fixture = TestBed.createComponent(LibretaPanel);
    const cerrar = jasmine.createSpy('cerrar'); fixture.componentInstance.cerrar.subscribe(cerrar);
    try {
      fixture.detectChanges(); await fixture.whenStable();
      const dialogo = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      expect(dialogo.open).toBeTrue();
      expect(dialogo.contains(document.activeElement)).toBeTrue();
      const ruta = location.href;
      (fixture.nativeElement.querySelector('nav button') as HTMLButtonElement).click();
      expect(location.href).toBe(ruta);
      expect(document.activeElement?.id).toBe('libreta-pistas');
      const cancelar = new Event('cancel', { cancelable: true }); dialogo.dispatchEvent(cancelar);
      expect(cancelar.defaultPrevented).toBeTrue(); expect(cerrar).toHaveBeenCalledTimes(1);
    } finally { fixture.destroy(); }
    expect(document.activeElement).toBe(origen); origen.remove();
  });
});
