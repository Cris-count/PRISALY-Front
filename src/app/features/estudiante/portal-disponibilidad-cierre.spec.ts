import { VISOR_QA_HABILITADO } from '../simulador/unreal/acceso-simulador';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalEstudiante } from './portal-estudiante';
import { FalloPortal, PortalEstudianteApi } from './portal-estudiante.api';
import { SESION_VISUAL_UNREAL } from '../simulador/unreal/configuracion-unreal';
describe('Cierre: simulador pendiente no bloquea el portal', () => {
  function crear(visual: unknown = null) {
    TestBed.configureTestingModule({
      imports: [PortalEstudiante],
      providers: [
        provideRouter([]),
        { provide: VISOR_QA_HABILITADO, useValue: true },
        { provide: PortalEstudianteApi, useValue: { convocatorias: () => of([]) } },
        { provide: SESION_VISUAL_UNREAL, useValue: visual },
      ],
    });
    const f = TestBed.createComponent(PortalEstudiante);
    return f.componentInstance as unknown as {
      comprobarSimulador(): void;
      abrirSimulador(): void;
      simulador(): string;
    };
  }
  it('no consulta un player provisional cuando no existe asignación', () => {
    const socket = spyOn(globalThis, 'WebSocket');
    const c = crear();
    c.comprobarSimulador();
    expect(c.simulador()).toBe('configuracion-pendiente');
    expect(socket).not.toHaveBeenCalled();
  });
  it('no conecta sin un intento y caso académico correspondientes', () => {
    const socket = spyOn(globalThis, 'WebSocket');
    const c = crear({
      urlSenalizacion: 'ws://127.0.0.1:8898',
      streamerId: 'referencia',
      sesion: 'sesion-de-prueba',
      casoId: 'caso-ajeno',
    });
    c.comprobarSimulador();
    expect(c.simulador()).toBe('contexto-pendiente');
    expect(socket).not.toHaveBeenCalled();
  });
  it('abre con contexto de navegación, nunca con identificadores en la URL', () => {
    const c = crear() as any;
    const id = '11111111-1111-4111-8111-111111111111';
    c.intento.set({ idIntento: id });
    c.contenido.set({ idIntento: id, idSesion: id, caso: { idCaso: id, titulo: 'Caso' } });
    const nav = spyOn(TestBed.inject(Router), 'navigate');
    c.abrirSimulador();
    expect(nav).toHaveBeenCalledOnceWith(['/simulador-unreal'], {
      state: { idIntento: id, idSesion: id, idCaso: id, tituloCaso: 'Caso' },
    });
  });
  it('no redirige al laboratorio como sustituto del simulador académico', () => {
    const c = crear();
    const nav = spyOn(TestBed.inject(Router), 'navigate');
    c.abrirSimulador();
    expect(nav).not.toHaveBeenCalled();
  });
});

describe('FE-UX-03: portal estudiantil sin sesión (obs. 2 de DC-OPS-81)', () => {
  function crear(convocatorias: () => unknown) {
    TestBed.configureTestingModule({
      imports: [PortalEstudiante],
      providers: [
        provideRouter([]),
        { provide: VISOR_QA_HABILITADO, useValue: true },
        { provide: PortalEstudianteApi, useValue: { convocatorias } },
        { provide: SESION_VISUAL_UNREAL, useValue: null },
      ],
    });
    const nav = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const f = TestBed.createComponent(PortalEstudiante);
    f.detectChanges();
    return { f, nav };
  }

  it('un 401 lleva al acceso por código con aviso en lugar de dejar la estructura vacía', () => {
    const { nav } = crear(() => throwError(() => new FalloPortal(401, 'NO_AUTENTICADO')));
    expect(nav).toHaveBeenCalledWith(['/estudiante/acceso'], { queryParams: { aviso: 'sesion-estudiante' }, replaceUrl: true });
  });

  it('un 500 no saca al estudiante: muestra el aviso de error en el portal', () => {
    const { f, nav } = crear(() => throwError(() => new FalloPortal(500, null)));
    f.detectChanges();
    expect(nav).not.toHaveBeenCalled();
    expect((f.nativeElement as HTMLElement).textContent).not.toContain('Tu sesión estudiantil terminó');
  });
});
