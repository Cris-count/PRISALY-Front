import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CasosM3Api, GuionGuardado, NarrativaDocente } from './casos-m3.api';
import { ConstructorCasoVisual, contarIntervenciones } from './constructor-caso-visual';

/** FE-UX-06: constructor por etapas, cambios sin guardar y vista previa solo de la versión guardada. */
describe('ConstructorCasoVisual (FE-UX-06)', () => {
  const ID = '0b6f5a52-6d0e-4a43-9a0e-2f1d7c3b9e11';
  let respuesta: NarrativaDocente;
  let guardados: object[];
  /** DC-MVP-09-R12: el servidor no expone la narrativa (flag M3 apagado) y responde 404. */
  let narrativa404 = false;
  beforeEach(() => (narrativa404 = false));

  async function crear() {
    respuesta = { idCaso: ID, borrador: null, publicado: null };
    guardados = [];
    const api: Pick<CasosM3Api, 'narrativa' | 'guardarNarrativa'> = {
      narrativa: () => (narrativa404 ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(respuesta)),
      guardarNarrativa: (_id: string, doc: object) => {
        guardados.push(doc);
        const g: GuionGuardado = { idGuion: '6a1d2b3c-4e5f-4a7b-8c9d-0e1f2a3b4c5d', version: guardados.length, estado: 'Borrador',
          hashDefinicion: 'b'.repeat(64), fechaActualizacion: '', definicion: doc as Record<string, unknown> };
        respuesta = { idCaso: ID, borrador: g, publicado: null };
        return of(g);
      },
    };
    TestBed.configureTestingModule({ imports: [ConstructorCasoVisual], providers: [provideRouter([]), { provide: CasosM3Api, useValue: api }] });
    const f = TestBed.createComponent(ConstructorCasoVisual);
    f.componentRef.setInput('idCaso', ID);
    f.detectChanges();
    const raiz = f.nativeElement as HTMLElement;
    for (let i = 0; i < 100 && !raiz.querySelector('[data-prueba="edificio-hospital_entrada"]'); i++) {
      await new Promise((r) => setTimeout(r, 20));
      f.detectChanges();
    }
    const $ = (sel: string) => raiz.querySelector(`[data-prueba="${sel}"]`) as HTMLInputElement & HTMLButtonElement;
    const etapas = () => [...raiz.querySelectorAll('.etapa')].map((e) => (e as HTMLElement).dataset['estado']);
    const escribir = (sel: string, v: string) => { const el = $(sel); el.value = v; el.dispatchEvent(new Event('input')); f.detectChanges(); };
    const clic = (sel: string) => { $(sel).click(); f.detectChanges(); };
    return { f, raiz, $, etapas, escribir, clic };
  }

  it('sin diseño: la etapa 1 completa, el resto pendiente o bloqueada, y sin guardar ni vista previa', async () => {
    const t = await crear();
    expect(t.etapas()).toEqual(['completa', 'pendiente', 'bloqueada', 'bloqueada', 'bloqueada', 'bloqueada', 'bloqueada']);
    expect(t.$('estado-guardado').textContent).toContain('Caso sin diseño 3D');
    expect(t.$('guardar-narrativa').disabled).toBeTrue();
    expect(t.$('vista-previa').disabled).toBeTrue();
  });

  it('Hospital + médico con dos intervenciones: etapas 2-6 completas, ocupación y contador visibles; aún sin vista previa', async () => {
    const t = await crear();
    t.clic('edificio-hospital_entrada');
    t.clic('puesto-hosp-npc-doctor');
    t.escribir('nombre-hosp-npc-doctor', 'Dra. López');
    t.escribir('rol-hosp-npc-doctor', 'Médica');
    t.escribir('dialogo-hosp-npc-doctor', 'Primera intervención.\n\nSegunda intervención.');
    expect(t.etapas()).toEqual(['completa', 'completa', 'completa', 'completa', 'completa', 'completa', 'bloqueada']);
    expect(t.raiz.textContent).toContain('1 de 2 puestos en uso');
    expect(t.raiz.textContent).toContain('2 intervenciones');
    expect(t.$('revision').textContent).toContain('Dra. López — Médico, Médica · 2 intervenciones');
    expect(t.$('estado-guardado').textContent).toContain('Sin guardar');
    expect(t.$('guardar-narrativa').disabled).toBeFalse();
    expect(t.$('vista-previa').disabled).toBeTrue();
  });

  it('guardar vuelve a leer el servidor; un cambio posterior bloquea la vista previa hasta volver a guardar', async () => {
    const t = await crear();
    t.clic('edificio-hospital_entrada');
    t.clic('puesto-hosp-npc-doctor');
    t.escribir('nombre-hosp-npc-doctor', 'Dra. López');
    t.escribir('dialogo-hosp-npc-doctor', 'Hola.');
    t.clic('guardar-narrativa');
    expect(guardados.length).toBe(1);
    expect(t.$('estado-guardado').textContent).toContain('Guardado · versión 1');
    expect(t.$('vista-previa').disabled).toBeFalse();
    expect(t.$('guardar-narrativa').disabled).toBeTrue(); // nada que guardar
    t.escribir('nombre-hosp-npc-doctor', 'Dra. López Ruiz');
    expect(t.$('estado-guardado').textContent).toContain('Cambios sin guardar');
    expect(t.$('vista-previa').disabled).toBeTrue();
    const nav = spyOn(TestBed.inject(Router), 'navigate');
    t.clic('vista-previa');
    expect(nav).not.toHaveBeenCalled();
  });

  it('narrativa no disponible (404): lo explica y no ofrece editar, guardar ni previsualizar (DC-MVP-09-R12)', async () => {
    narrativa404 = true;
    const t = await crear();
    expect(t.$('diseno-no-disponible').textContent).toContain('no está disponible en este servidor');
    expect(t.raiz.querySelector('.mensaje.error')).toBeNull(); // no es un fallo del docente
    expect(t.$('edificio-hospital_entrada').disabled).toBeTrue();
    expect(t.$('guardar-narrativa').disabled).toBeTrue();
    expect(t.$('vista-previa').disabled).toBeTrue();
    expect(t.raiz.textContent).toContain('no se puede guardar ni abrir la vista previa');
    expect(guardados.length).toBe(0);
  });

  it('un rechazo de validación del servidor se lee en lenguaje del docente y se anuncia como alerta (R07-IMP)', async () => {
    const t = await crear();
    const api = TestBed.inject(CasosM3Api) as unknown as { guardarNarrativa: unknown };
    api.guardarNarrativa = () => throwError(() => new HttpErrorResponse({ status: 422, error: { errores: [{ campo: 'personajes[0].dialogo', codigo: 'DIALOGO_REQUERIDO' }] } }));
    t.clic('edificio-hospital_entrada');
    t.clic('puesto-hosp-npc-doctor');
    t.escribir('nombre-hosp-npc-doctor', 'Dra. López');
    t.escribir('dialogo-hosp-npc-doctor', 'Hola.');
    t.clic('guardar-narrativa');
    const alerta = t.raiz.querySelector('.mensaje.error') as HTMLElement;
    expect(alerta.getAttribute('role')).toBe('alert');
    expect(alerta.textContent).toContain('Falta el diálogo del personaje.');
    expect(alerta.textContent).not.toContain('DIALOGO_REQUERIDO');
  });

  it('contarIntervenciones separa por líneas en blanco e ignora espacios', () => {
    expect(contarIntervenciones('')).toBe(0);
    expect(contarIntervenciones('Uno.\n\n  \nDos.\n\nTres.')).toBe(3);
  });
});
