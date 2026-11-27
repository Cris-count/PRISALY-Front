import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CambiosSinGuardarService, protegerCambiosSinGuardar } from './cambios-sin-guardar';

describe('DC-MVP-09 protección de cambios sin guardar y cambio de caso', () => {
  let servicio: CambiosSinGuardarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(CambiosSinGuardarService);
  });

  function ejecutarGuard(): boolean {
    return TestBed.runInInjectionContext(() =>
      protegerCambiosSinGuardar(
        null,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    ) as boolean;
  }

  it('permite navegar cuando no hay cambios pendientes', () => {
    const confirmSpy = spyOn(window, 'confirm');
    expect(ejecutarGuard()).toBeTrue();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('bloquea la navegación interna si hay cambios sin guardar y el usuario cancela', () => {
    servicio.marcar('casos-m3', true);
    spyOn(window, 'confirm').and.returnValue(false);
    expect(ejecutarGuard()).toBeFalse();
    expect(servicio.tienePendientes()).toBeTrue();
  });

  it('permite navegar y limpia las marcas si el usuario confirma salir sin guardar', () => {
    servicio.marcar('casos-m3', true);
    spyOn(window, 'confirm').and.returnValue(true);
    expect(ejecutarGuard()).toBeTrue();
    expect(servicio.tienePendientes()).toBeFalse();
  });

  it('solicita confirmación al cambiar a un caso distinto con cambios sin guardar', () => {
    servicio.marcar('casos-m3', true);
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    expect(servicio.confirmarCambioCaso('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')).toBeFalse();
    expect(confirmSpy).toHaveBeenCalledTimes(1);

    confirmSpy.and.returnValue(true);
    expect(servicio.confirmarCambioCaso('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')).toBeTrue();
    expect(servicio.tienePendientes()).toBeFalse();
  });

  it('vincula formularios reactivos y limpia el estado al resetear', () => {
    const form = new FormGroup({ titulo: new FormControl('') });
    const destroyRef = TestBed.inject(DestroyRef);
    servicio.vincularFormularios('casos-m3', [form], destroyRef);

    form.controls.titulo.markAsDirty();
    form.controls.titulo.setValue('Caso editado');
    expect(servicio.tienePendientes()).toBeTrue();

    form.reset({ titulo: '' });
    expect(servicio.tienePendientes()).toBeFalse();
  });
});
