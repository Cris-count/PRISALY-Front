import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideApiConfig } from '../../core/config/api.config';
import { DashboardAdministracion } from './dashboard-administracion';

/** FE-UX-04B: los accesos del Inicio abren la pestaña pedida con `?vista=`; un valor desconocido no cambia nada. */
describe('DashboardAdministracion · vista inicial por enlace', () => {
  function pestanaCon(vista: string | null): string {
    TestBed.configureTestingModule({
      imports: [DashboardAdministracion],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideApiConfig('/api-prueba'),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(vista ? { vista } : {}) } } },
      ],
    });
    const c = TestBed.createComponent(DashboardAdministracion).componentInstance;
    return (c as unknown as { pestana: () => string }).pestana();
  }

  it('abre Estudiantes con ?vista=estudiantes', () => expect(pestanaCon('estudiantes')).toBe('estudiantes'));
  it('abre Roles y permisos con ?vista=permisos', () => expect(pestanaCon('permisos')).toBe('permisos'));
  it('sin parámetro o con un valor desconocido queda en Docentes', () => {
    expect(pestanaCon(null)).toBe('docentes');
    TestBed.resetTestingModule();
    expect(pestanaCon('../admin')).toBe('docentes');
  });
});
