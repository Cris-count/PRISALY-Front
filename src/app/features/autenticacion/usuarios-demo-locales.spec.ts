import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { AccesoDemoLocal, USUARIOS_DEMO } from './acceso-demo-local';
import { LoginPage } from './login-page';
import { USUARIOS_DEMO_LOCALES } from './usuarios-demo-locales';

describe('Cuentas demo locales', () => {
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: USUARIOS_DEMO, useValue: USUARIOS_DEMO_LOCALES },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  function escribir(selector: string, valor: string): void {
    const raiz = fixture.nativeElement as HTMLElement;
    const input = raiz.querySelector<HTMLInputElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    const raiz = fixture.nativeElement as HTMLElement;
    raiz.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  it('muestra un acceso por cada espacio', () => {
    const raiz = fixture.nativeElement as HTMLElement;
    const botones = [...raiz.querySelectorAll('.cuentas-demo button')].map(
      (boton: Element) => boton.textContent?.trim(),
    );
    expect(botones).toEqual([
      'Entrar como Administrador',
      'Entrar como Docente',
      'Entrar como Mi espacio de aprendizaje',
    ]);
  });

  it('el administrador local entra a su inicio', async () => {
    escribir('#correo', 'admin.demo@prisaly.local');
    escribir('#clave', 'DemoLocal!234');
    enviar();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(TestBed.inject(AccesoDemoLocal).actual()?.rol).toBe('ADMINISTRADOR');
  });

  it('el docente local entra a su inicio', async () => {
    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.cuentas-demo button')[1]
      .click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(TestBed.inject(AccesoDemoLocal).actual()?.rol).toBe('DOCENTE');
  });

  it('el estudiante local entra a su espacio', async () => {
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.cuentas-demo button')[2].click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/dashboard/estudiante');
    expect(TestBed.inject(AccesoDemoLocal).actual()?.rol).toBe('ESTUDIANTE');
  });

  it('un correo ajeno sigue sin sesión y sin HTTP', () => {
    escribir('#correo', 'demo@example.org');
    escribir('#clave', 'solo-demostracion');
    enviar();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')!.textContent).toBe(
      'Esta pantalla es una demostración visual. La autenticación todavía no está conectada',
    );
    expect(TestBed.inject(Router).url).toBe('/');
    expect(TestBed.inject(AccesoDemoLocal).actual()).toBeNull();
  });
});

describe('Espacios abiertos por una cuenta demo', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: USUARIOS_DEMO, useValue: USUARIOS_DEMO_LOCALES },
      ],
    });
  });

  it('el administrador ve su menú y no abre casos', async () => {
    TestBed.inject(AccesoDemoLocal).entrar(USUARIOS_DEMO_LOCALES[0]);
    const harness = await RouterTestingHarness.create('/dashboard');
    const menu = harness.routeNativeElement!.querySelector('nav')!.textContent ?? '';
    expect(menu).toContain('Gestión de docentes');
    expect(menu).not.toContain('Casos académicos');
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    expect(TestBed.inject(Router).url).toContain('/dashboard/usuarios-docentes');
    await harness.navigateByUrl('/dashboard/casos-academicos');
    expect(TestBed.inject(Router).url).toContain('aviso=permiso-insuficiente');
  });

  it('el docente local abre casos y no la gestión de docentes', async () => {
    TestBed.inject(AccesoDemoLocal).entrar(USUARIOS_DEMO_LOCALES[1]);
    const harness = await RouterTestingHarness.create('/dashboard/casos-academicos');
    expect(TestBed.inject(Router).url).toContain('/dashboard/casos-academicos');
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    expect(TestBed.inject(Router).url).toContain('aviso=rol-insuficiente');
  });

  it('el estudiante permanece en su espacio', async () => {
    TestBed.inject(AccesoDemoLocal).entrar(USUARIOS_DEMO_LOCALES[2]);
    const harness = await RouterTestingHarness.create('/dashboard/estudiante');
    expect(TestBed.inject(Router).url).toBe('/dashboard/estudiante');
    expect(harness.routeNativeElement!.textContent).toContain('Mi espacio de aprendizaje');
  });
});
