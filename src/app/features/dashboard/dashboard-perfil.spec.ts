import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { capacidadesDe, DashboardPerfil } from './dashboard-perfil';

/** DC-FE-60: «Mi perfil» muestra la identidad de `/me` y capacidades legibles, sin códigos. */
function montar(estado: unknown) {
  const actualizar = jasmine.createSpy('actualizarIdentidad').and.returnValue(of('vigente'));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: M1_PERSONAL_LOCAL, useValue: true },
      {
        provide: SesionPersonalM1,
        useValue: { estado: signal(estado), actualizarIdentidad: actualizar },
      },
    ],
  });
  const f = TestBed.createComponent(DashboardPerfil);
  f.detectChanges();
  return { f, raiz: f.nativeElement as HTMLElement, actualizar };
}
const valida = (rol: string, permisos: string[]) => ({
  tipo: 'valida',
  identidad: { userId: 'u', nombre: 'Docente QA', correo: 'd@x.test', rol, permisos },
});

describe('DC-FE-60 Mi perfil', () => {
  it('distingue lectura, creación, edición y publicación', () => {
    expect(capacidadesDe(['CONSULTAR_CASO', 'PUBLICAR_CASO'])).toEqual([
      'Lectura de casos académicos',
      'Publicación de casos',
    ]);
    expect(capacidadesDe(['DESCONOCIDO'])).toEqual([]);
  });

  it('docente: datos del servidor, capacidades legibles y sin códigos internos', () => {
    const { raiz } = montar(
      valida('DocenteBruno', [
        'CONSULTAR_CASO',
        'CREAR_CASO',
        'MODIFICAR_CASO',
        'GESTIONAR_SESION',
      ]),
    );
    expect(raiz.querySelector('[data-prueba="perfil-servidor"]')).not.toBeNull();
    expect(raiz.querySelector('[data-prueba="perfil-nombre"]')?.textContent).toBe('Docente QA');
    expect(raiz.querySelector('[data-prueba="perfil-rol"]')?.textContent?.trim()).toBe(
      'Personal académico',
    );
    const lista = raiz.querySelector('[data-prueba="perfil-capacidades"]')!.textContent!;
    expect(lista).toContain('Creación de casos académicos');
    expect(lista).not.toContain('Publicación de casos');
    expect(raiz.textContent).not.toMatch(/CONSULTAR_CASO|GESTIONAR_SESION|DocenteBruno/);
  });

  it('administrador: perfil de administración', () => {
    const { raiz } = montar(valida('ADMINISTRADOR', []));
    expect(raiz.querySelector('[data-prueba="perfil-rol"]')?.textContent?.trim()).toBe(
      'Administración',
    );
    expect(raiz.textContent).toContain('Gestión de docentes');
  });

  it('sin sesión válida no muestra datos de cuenta', () => {
    const { raiz } = montar({ tipo: 'expirada' });
    expect(raiz.querySelector('[data-prueba="perfil-nombre"]')).toBeNull();
    expect(raiz.textContent).toContain('Inicia sesión');
  });

  it('actualiza la identidad desde el servidor', () => {
    const { f, raiz, actualizar } = montar(valida('DocenteBruno', ['CONSULTAR_CASO']));
    raiz.querySelector<HTMLButtonElement>('button')!.click();
    f.detectChanges();
    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(raiz.querySelector('[role="status"]')?.textContent).toContain('actualizados');
  });
});
