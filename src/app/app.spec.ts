import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('se crea', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('presenta login y dashboard a pantalla completa y conserva la cabecera del simulador', async () => {
    // Esta prueba verifica el layout; la secuencia cinematográfica tiene pruebas propias.
    // Evita que whenStable espere los 6,8 s de animación CSS y exceda el límite de Jasmine.
    const matchMedia = window.matchMedia.bind(window);
    spyOn(window, 'matchMedia').and.callFake((consulta) => {
      const resultado = matchMedia(consulta);
      if (consulta === '(prefers-reduced-motion: reduce)') {
        Object.defineProperty(resultado, 'matches', { value: true });
      }
      return resultado;
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const elemento = fixture.nativeElement as HTMLElement;
    for (const ruta of ['/login', '/dashboard', '/dashboard/sesiones', '/simulador']) {
      await router.navigateByUrl(ruta);
      await fixture.whenStable();
      fixture.detectChanges();
      const completa = ruta !== '/simulador';
      expect(elemento.querySelector<HTMLElement>('.encabezado')!.hidden).toBe(completa);
      expect(elemento.querySelector('main')!.classList.contains('contenido--completa')).toBe(
        completa,
      );
      expect(elemento.querySelector('.saltar')?.getAttribute('href')).toBe('#contenido');
    }
  });

  it('muestra la identidad de PRISALY y el área de contenido', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('.encabezado__marca')?.textContent).toContain('PRISALY');
    expect(elemento.querySelector('main#contenido router-outlet')).not.toBeNull();
  });
});
