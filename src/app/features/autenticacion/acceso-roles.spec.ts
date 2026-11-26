import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AccesoRoles } from './acceso-roles';
describe('DC-106 acceso por roles sin atajos de autenticación', () => {
  it('no autentica al elegir pantalla ni ofrece credenciales o rutas demo', () => {
    TestBed.configureTestingModule({
      imports: [AccesoRoles],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const f = TestBed.createComponent(AccesoRoles);
    f.detectChanges();
    const links = Array.from(f.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/login?perfil=administrador',
      '/login?perfil=docente',
      '/estudiante/acceso',
    ]);
    expect(f.nativeElement.querySelector('input')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(() => true);
    TestBed.inject(HttpTestingController).verify();
  });
});
