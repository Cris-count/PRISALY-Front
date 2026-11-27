import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { PanelAdministracionM1 } from './panel-administracion-m1';
import { AdministracionM1Api } from './administracion-m1.api';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { CAPACIDADES_DC99 } from './capacidades-dc99';
describe('Cierre: selección administrativa sin identificadores manuales', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  function crear(rol = 'DOCENTE') {
    const usuario = {
      idUsuario: id,
      idEstudiante: rol === 'ESTUDIANTE' ? id : null,
      nombre: 'Persona QA',
      correo: 'persona@prisaly.test',
      rol,
      estado: 'Activo',
      credencialPersonalConfigurada: false,
      estadoInvitacion: 'NO_EMITIDA',
    };
    const api = jasmine.createSpyObj('AdministracionM1Api', [
      'buscarUsuarios',
      'permisosDeUsuario',
    ]);
    api.buscarUsuarios.and.returnValue(of({ items: [usuario], hayMas: false }));
    api.permisosDeUsuario.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [PanelAdministracionM1],
      providers: [
        { provide: AdministracionM1Api, useValue: api },
        {
          provide: SesionPersonalM1,
          useValue: {
            estado: signal({
              tipo: 'valida',
              identidad: { userId: 'admin', rol: 'ADMINISTRADOR' },
            }),
          },
        },
        { provide: CAPACIDADES_DC99, useValue: { activacionDocente: true } },
      ],
    });
    const f = TestBed.createComponent(PanelAdministracionM1);
    if (rol === 'ESTUDIANTE') f.componentRef.setInput('vista', 'estudiantes');
    f.detectChanges();
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    f.detectChanges();
    return { f, api };
  }
  it('consulta y selecciona al docente para leer sus permisos sin escribir su UUID', () => {
    const { f, api } = crear();
    expect(f.nativeElement.textContent).toContain('Persona QA');
    expect(f.nativeElement.textContent).not.toContain(id);
    const boton = Array.from(f.nativeElement.querySelectorAll('button')).find(
      (b: any) => b.textContent.trim() === 'Seleccionar',
    ) as HTMLButtonElement;
    boton.click();
    f.detectChanges();
    expect(api.permisosDeUsuario).toHaveBeenCalledOnceWith(id);
  });
  it('seleccionar un estudiante no consulta ni presenta asignación de permisos de personal', () => {
    const { f, api } = crear('ESTUDIANTE');
    const boton = Array.from(f.nativeElement.querySelectorAll('button')).find(
      (b: any) => b.textContent.trim() === 'Seleccionar',
    ) as HTMLButtonElement;
    boton.click();
    f.detectChanges();
    expect(api.permisosDeUsuario).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).toContain('no se les asignan permisos');
  });
});
