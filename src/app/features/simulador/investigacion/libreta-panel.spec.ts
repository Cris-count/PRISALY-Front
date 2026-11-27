import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContextoAcademicoUnreal } from '../unreal/acceso-simulador';
import { HospitalUnreal } from '../unreal/hospital-unreal';
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
      // Acción irreversible: pide confirmación y se puede conservar.
      expect(fixture.nativeElement.querySelector('.nota')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('No se puede deshacer');
      boton('Conservar').click(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.nota')).not.toBeNull();
      boton('Eliminar').click(); fixture.detectChanges();
      boton('Confirmar eliminación').click(); fixture.detectChanges();
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
      expect(fixture.nativeElement.querySelector('.lugar').textContent).toContain('Hospital · demostración');
      expect(fixture.nativeElement.querySelectorAll('.pista').length).toBe(1);
      expect(fixture.nativeElement.querySelector('.pista .tipo').textContent).toBe('Pista');
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

  describe('FE-UX-09 · organización de la libreta (R07-IMP)', () => {
    const registrar = (store: LibretaStore, id: string, lugar: string) => store.registrarPista({
      tipo: 'pista-obtenida', contexto: store.estado().contexto,
      pista: { id, titulo: `Pista ${id}`, descripcion: 'Descripción.', origen: { espacioId: 'e', interaccionId: 'i', lugar } },
    });

    it('sin datos muestra estados vacíos que explican cómo obtenerlos y no inventa conversaciones', async () => {
      TestBed.configureTestingModule({ providers: [LibretaStore] });
      const fixture = TestBed.createComponent(LibretaPanel);
      try {
        fixture.detectChanges(); await fixture.whenStable();
        const texto = fixture.nativeElement.textContent as string;
        expect(texto).toContain('Aparecen aquí cuando un personaje te entrega información');
        expect(texto).toContain('Tus anotaciones personales aparecerán aquí');
        // Fuera del visor no hay recorrido: no se muestra una sección de conversaciones vacía y engañosa.
        expect(fixture.nativeElement.querySelector('#libreta-conversaciones')).toBeNull();
        expect(fixture.nativeElement.querySelector('.modo').textContent).toContain('Demostración');
      } finally { fixture.destroy(); }
    });

    it('agrupa las pistas por lugar en el orden en que se obtuvieron, sin repetirlas', async () => {
      TestBed.configureTestingModule({ providers: [LibretaStore] });
      const fixture = TestBed.createComponent(LibretaPanel);
      try {
        const store = TestBed.inject(LibretaStore);
        registrar(store, 'a', 'Hospital Central');
        registrar(store, 'b', 'Comisaría Sectorial');
        registrar(store, 'c', 'Hospital Central');
        registrar(store, 'a', 'Hospital Central');
        fixture.detectChanges(); await fixture.whenStable();
        const lugares = [...fixture.nativeElement.querySelectorAll('.lugar')].map((h: HTMLElement) => h.textContent?.trim());
        expect(lugares).toEqual(['Hospital Central', 'Comisaría Sectorial']);
        const listas = fixture.nativeElement.querySelectorAll('ul.lista') as NodeListOf<HTMLElement>;
        expect(listas[0].querySelectorAll('.pista').length).toBe(2);
        expect(listas[1].querySelectorAll('.pista').length).toBe(1);
        expect(fixture.nativeElement.querySelectorAll('.pista').length).toBe(3);
      } finally { fixture.destroy(); }
    });

    it('en el intento académico no se presenta como demostración ni como entrega al docente', async () => {
      TestBed.configureTestingModule({ providers: [LibretaStore] });
      TestBed.inject(ContextoAcademicoUnreal).actual.set({ idIntento: 'i', idSesion: 's', idCaso: 'c', tituloCaso: 'Caso' });
      const fixture = TestBed.createComponent(LibretaPanel);
      try {
        fixture.detectChanges(); await fixture.whenStable();
        const aviso = fixture.nativeElement.querySelector('[data-prueba="aviso-libreta"]').textContent as string;
        expect(aviso).toContain('Todavía no se guardan en el servidor ni se envían a tu docente');
        expect(fixture.nativeElement.querySelector('.modo')).toBeNull();
        expect(fixture.nativeElement.querySelector('details')).toBeNull();
      } finally { fixture.destroy(); }
    });

    it('lista las conversaciones del recorrido, distinguiendo las terminadas de las que siguen en curso', async () => {
      const recorrido = signal([
        { edificioId: 'h', zonaId: 'hospital_entrada', nombre: 'Hospital Central', visitado: true, npcs: [
          { espacialId: 'hosp-npc-doctor', nombre: 'Dra. López', estado: 'completado' as const },
          { espacialId: 'hosp-npc-paciente-01', nombre: 'Paciente', estado: 'pendiente' as const }] },
        { edificioId: 'p', zonaId: 'policia_entrada', nombre: 'Comisaría Sectorial', visitado: true, npcs: [
          { espacialId: 'pol-npc-oficial', nombre: 'Oficial Ríos', estado: 'en_curso' as const }] },
      ]);
      TestBed.configureTestingModule({ providers: [LibretaStore, { provide: HospitalUnreal, useValue: { recorridoVisible: recorrido } }] });
      const fixture = TestBed.createComponent(LibretaPanel);
      try {
        fixture.detectChanges(); await fixture.whenStable();
        const filas = [...fixture.nativeElement.querySelectorAll('[data-prueba="libreta-conversacion"]')] as HTMLElement[];
        expect(filas.length).toBe(2); // el paciente pendiente no aparece
        expect(filas[0].textContent).toContain('Dra. López');
        expect(filas[0].textContent).toContain('Hospital Central');
        expect(filas[0].textContent).toContain('Terminada');
        expect(filas[1].textContent).toContain('En curso');
        expect(fixture.nativeElement.textContent).toContain('Conversaciones (2)');
      } finally { fixture.destroy(); }
    });
  });
});
