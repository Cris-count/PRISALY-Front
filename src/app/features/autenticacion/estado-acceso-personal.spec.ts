import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EstadoAccesoPersonalPanel } from './estado-acceso-personal';
import { EstadoAccesoPersonal, PersonalMeResponse } from './m1-personal.models';

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
    ['consultando-sesion', 'La sesión aún no está confirmada', '[aria-busy="true"]'],
    ['sesion-no-verificada', 'No se deduce si venció, fue revocada o no existe', '[role="status"]'],
    ['cerrando-sesion', 'Esperando confirmación del cierre', '[aria-busy="true"]'],
    ['cierre-no-confirmado', 'No se acredita la revocación', '[role="status"]'],
    ['no-autenticada', 'Sin sesión de personal autenticada', '[role="status"]'],
    ['cierre-confirmado', 'El servidor confirmó el cierre', '[role="status"]'],
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

  it('prepara la identidad de /me con token nulo sin renovarlo, almacenarlo ni consumir la extensión pendiente', () => {
    // Proyección de una respuesta simulada exclusivamente para probar presentación.
    const respuesta: PersonalMeResponse = {
      accessToken: null,
      tokenType: 'Bearer',
      userId: '11111111-1111-4111-8111-111111111111',
      correo: 'personal@example.invalid',
      nombre: 'Identidad consultada de prueba',
      rol: 'ROL_DE_PRUEBA',
      permisos: [],
      authPrototype: 'TD-M1-AUTH-PROVISIONAL',
    };
    const { accessToken, tokenType, ...identidad } = respuesta;
    expect(accessToken).toBeNull();
    expect(tokenType).toBe('Bearer');
    const guardar = spyOn(Storage.prototype, 'setItem');
    const fixture = TestBed.createComponent(EstadoAccesoPersonalPanel);
    fixture.componentRef.setInput('estado', {
      tipo: 'sesion-consultada-local',
      identidad,
    } satisfies EstadoAccesoPersonal);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Identidad de personal consultada localmente',
    );
    expect(fixture.nativeElement.textContent).toContain('Identidad consultada de prueba');
    expect(fixture.nativeElement.textContent).toContain(
      'No renueva el token ni habilita participación estudiantil',
    );
    expect(fixture.nativeElement.querySelector('button, input, a')).toBeNull();
    expect(guardar).not.toHaveBeenCalled();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('retira la identidad anterior al recibir un estado de sesión no verificada o cierre no confirmado', () => {
    const fixture = TestBed.createComponent(EstadoAccesoPersonalPanel);
    fixture.componentRef.setInput('estado', {
      tipo: 'verificado-local',
      identidad: {
        userId: 'prueba',
        correo: 'personal@example.invalid',
        nombre: 'Nombre que debe retirarse',
        rol: 'ROL_DE_PRUEBA',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    } satisfies EstadoAccesoPersonal);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nombre que debe retirarse');
    for (const tipo of ['sesion-no-verificada', 'cierre-no-confirmado'] as const) {
      fixture.componentRef.setInput('estado', { tipo } satisfies EstadoAccesoPersonal);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Nombre que debe retirarse');
      expect(fixture.nativeElement.querySelector('[aria-busy="true"], [role="alert"]')).toBeNull();
    }
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
