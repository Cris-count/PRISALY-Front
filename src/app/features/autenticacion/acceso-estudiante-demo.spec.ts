import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment as entornoProduccion } from '../../../environments/environment';
import { environment as entornoDemo } from '../../../environments/environment.demo';
import { environment as entornoQa } from '../../../environments/environment.qa';
import { environment as entornoQaNavegacion } from '../../../environments/environment.qa-navegacion';
import { routes } from '../../app.routes';
import {
  AccesoEstudianteDemo,
  ESTUDIANTE_DEMO_CONFIG,
  leerEstudianteDemo,
  SesionEstudianteDemo,
} from './acceso-estudiante-demo';
import { DEMOSTRACIONES_HABILITADAS } from './entorno-demostracion';

/** DC-FULLSTACK-DEMO-ESTUDIANTE-04: entrada estudiantil demostrativa, local y aislada. */
const CORREO = 'estudiante.demo@prisaly.local';
// Valor exclusivo de esta prueba; la clave demo real no aparece en el repositorio (solo su hash).
const CLAVE = 'clave-solo-para-esta-prueba';
const CONFIG_PRUEBA = {
  correo: CORREO,
  hashClave: 'c1b1f2b95d90a9f57a85f93846e82ede4ffe84dd1dc334fd2588f4182a05c737',
};

function configurar(demo: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: DEMOSTRACIONES_HABILITADAS, useValue: demo },
      { provide: ESTUDIANTE_DEMO_CONFIG, useValue: demo ? CONFIG_PRUEBA : null },
    ],
  });
}

describe('DC-FULLSTACK-DEMO-ESTUDIANTE-04 entrada estudiantil demo', () => {
  it('solo el entorno demo trae configuración, y sin la clave en claro', () => {
    const demo = leerEstudianteDemo(entornoDemo);
    expect(demo?.correo).toBe(CORREO);
    // Solo un SHA-256 en hexadecimal, nunca la clave en claro.
    expect(demo?.hashClave).toMatch(/^[0-9a-f]{64}$/);
    for (const e of [entornoProduccion, entornoQa, entornoQaNavegacion])
      expect(leerEstudianteDemo(e)).toBeNull();
  });

  it('acepta las credenciales de demostración sin ninguna petición HTTP', async () => {
    configurar(true);
    const sesion = TestBed.inject(SesionEstudianteDemo);
    expect(await sesion.iniciar(' Estudiante.Demo@prisaly.local ', CLAVE)).toBeTrue();
    expect(sesion.activa()?.correo).toBe(CORREO);
    TestBed.inject(HttpTestingController).verify();
    sesion.cerrar();
    expect(sesion.activa()).toBeNull();
  });

  it('rechaza clave o correo incorrectos', async () => {
    configurar(true);
    const sesion = TestBed.inject(SesionEstudianteDemo);
    expect(await sesion.iniciar(CORREO, 'otra')).toBeFalse();
    expect(await sesion.iniciar('docente.bruno@prisaly.local', CLAVE)).toBeFalse();
    expect(sesion.activa()).toBeNull();
  });

  it('fuera del entorno demo nunca abre sesión y la ruta queda bloqueada', async () => {
    configurar(false);
    expect(await TestBed.inject(SesionEstudianteDemo).iniciar(CORREO, CLAVE)).toBeFalse();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/acceso-estudiante');
    expect(router.url).not.toBe('/acceso-estudiante');
  });

  it('el formulario entra al espacio de aprendizaje con credenciales válidas', async () => {
    configurar(true);
    const router = TestBed.inject(Router);
    const f = TestBed.createComponent(AccesoEstudianteDemo);
    f.detectChanges();
    const raiz = f.nativeElement as HTMLElement;
    expect(raiz.querySelector('[data-prueba="distintivo-demo"]')?.textContent).toContain(
      'Demostración',
    );
    const navegar = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fijar = (id: string, v: string) => {
      const i = raiz.querySelector<HTMLInputElement>('#' + id)!;
      i.value = v;
      i.dispatchEvent(new Event('input'));
    };
    fijar('correo-estudiante', CORREO);
    fijar('clave-estudiante', 'incorrecta');
    raiz.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    f.detectChanges();
    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain('incorrectos');
    expect(navegar).not.toHaveBeenCalled();
    fijar('clave-estudiante', CLAVE);
    raiz.querySelector('form')!.dispatchEvent(new Event('submit'));
    await f.whenStable();
    expect(navegar).toHaveBeenCalledWith('/dashboard/estudiante');
  });
});
