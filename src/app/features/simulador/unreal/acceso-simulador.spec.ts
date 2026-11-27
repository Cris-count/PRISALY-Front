import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { DEMOSTRACIONES_HABILITADAS } from '../../autenticacion/entorno-demostracion';
import { PortalEstudianteApi } from '../../estudiante/portal-estudiante.api';
import {
  ContextoAcademicoUnreal,
  requiereAccesoSimulador,
  VISOR_QA_HABILITADO,
} from './acceso-simulador';
const id = '11111111-1111-4111-8111-111111111111';
describe('Visor académico protegido', () => {
  function montar(
    habilitado = true,
    state: unknown = { idIntento: id, idSesion: id, idCaso: id },
    error = false,
    ajeno = false,
  ) {
    const api = {
      contenido: jasmine
        .createSpy()
        .and.returnValue(
          error
            ? throwError(() => new Error('denegado'))
            : of({
                idIntento: id,
                idSesion: id,
                caso: { idCaso: ajeno ? 'ajeno' : id, titulo: 'Título autorizado' },
              }),
        ),
    };
    const salida = {} as UrlTree;
    const router = {
      getCurrentNavigation: () => ({ extras: { state } }),
      createUrlTree: () => salida,
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: PortalEstudianteApi, useValue: api },
        { provide: VISOR_QA_HABILITADO, useValue: habilitado },
        { provide: DEMOSTRACIONES_HABILITADAS, useValue: false },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      requiereAccesoSimulador({} as never, {} as never),
    );
    return { result, api, salida };
  }
  it('apagado rechaza antes de consultar M5', () => {
    const x = montar(false);
    expect(x.result).toBe(x.salida);
    expect(x.api.contenido).not.toHaveBeenCalled();
  });
  it('entrada directa sin contexto no consulta M5', () => {
    const x = montar(true, null);
    expect(x.result).toBe(x.salida);
    expect(x.api.contenido).not.toHaveBeenCalled();
  });
  it('401 o titularidad denegada no abre el visor', async () => {
    const x = montar(true, { idIntento: id, idSesion: id, idCaso: id }, true);
    expect(await firstValueFrom(x.result as any)).toBe(x.salida);
    expect(TestBed.inject(ContextoAcademicoUnreal).actual()).toBeNull();
  });
  it('rechaza correspondencia de caso distinta sin conservar contexto', async () => {
    const x = montar(true, { idIntento: id, idSesion: id, idCaso: id }, false, true);
    expect(await firstValueFrom(x.result as any)).toBe(x.salida);
    expect(TestBed.inject(ContextoAcademicoUnreal).actual()).toBeNull();
  });
  it('M5 confirma identidad, titularidad y vinculación antes del acceso', async () => {
    const x = montar();
    expect(await firstValueFrom(x.result as any)).toBeTrue();
    expect(x.api.contenido).toHaveBeenCalledOnceWith(id);
    expect(TestBed.inject(ContextoAcademicoUnreal).actual()?.tituloCaso).toBe('Título autorizado');
  });
});
