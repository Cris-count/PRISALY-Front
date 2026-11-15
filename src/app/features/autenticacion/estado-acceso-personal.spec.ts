import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EstadoAccesoPersonalPanel } from './estado-acceso-personal';
import { EstadoAccesoPersonal } from './m1-personal.models';

describe('Presentación independiente de acceso de personal', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [EstadoAccesoPersonalPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  for (const [tipo, texto, selector] of [
    ['pendiente', 'El login permanece demostrativo', '[role="status"]'],
    ['cargando', 'Verificando acceso de personal', '[aria-busy="true"]'],
    ['denegado', 'No fue posible verificar el acceso', '[role="status"]'],
    ['error', 'No se ha confirmado una sesión', '[role="alert"]'],
  ] as const) {
    it(`presenta ${tipo} sin consultar servicios ni atribuir identidad`, () => {
      const fixture = TestBed.createComponent(EstadoAccesoPersonalPanel);
      fixture.componentRef.setInput('estado', { tipo } satisfies EstadoAccesoPersonal);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(texto);
      expect(fixture.nativeElement.querySelector(selector)).not.toBeNull();
      TestBed.inject(HttpTestingController).expectNone(() => true);
    });
  }

  it('presenta solo la proyección de personal recibida, sin convertirla en acceso estudiantil', () => {
    const fixture = TestBed.createComponent(EstadoAccesoPersonalPanel);
    fixture.componentRef.setInput('estado', {
      tipo: 'verificado-local',
      identidad: {
        userId: 'prueba',
        correo: 'personal@example.invalid',
        nombre: 'Nombre de prueba',
        rol: 'ROL_DE_PRUEBA',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    } satisfies EstadoAccesoPersonal);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nombre de prueba');
    expect(fixture.nativeElement.textContent).toContain('No habilita participación estudiantil');
    expect(fixture.nativeElement.textContent).toContain('ni acredita una sesión vigente');
    expect(fixture.nativeElement.querySelector('button, a, input')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
