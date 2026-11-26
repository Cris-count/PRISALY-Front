import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { provideCapacidadesDc99 } from './capacidades-dc99';
import { PanelEstudiantesM1 } from './panel-estudiantes-m1';
import { PanelParticipacionesDc92 } from './panel-participaciones-dc92';

/** DC-DEV-108. Solo los dos huecos encontrados. No repite la batería FE-61. */
const B = '/api-prueba';
const S = '33333333-3333-4333-8333-333333333333';
const C = '44444444-4444-4444-8444-444444444444';
const E = '55555555-5555-4555-8555-555555555555';

describe('DC-108 alta de estudiante', () => {
  let http: HttpTestingController;

  afterEach(() => http.verify());

  it('un nombre en blanco no llama al servidor y muestra la validación', () => {
    const estado = signal({
      tipo: 'valida',
      identidad: {
        userId: '11111111-1111-4111-8111-111111111111',
        correo: 'admin@example.invalid',
        nombre: 'Admin QA',
        rol: 'ADMINISTRADOR',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    } as EstadoSesionPersonal);
    TestBed.configureTestingModule({
      imports: [PanelEstudiantesM1],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        provideCapacidadesDc99({ altaEstudiantes: true }),
        { provide: SesionPersonalM1, useValue: { estado } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PanelEstudiantesM1);
    f.detectChanges();
    const raiz = f.nativeElement as HTMLElement;
    const nombre = raiz.querySelector('[formcontrolname="nombre"]') as HTMLInputElement;
    const correo = raiz.querySelector('[formcontrolname="correo"]') as HTMLInputElement;
    nombre.value = '   ';
    nombre.dispatchEvent(new Event('input'));
    correo.value = 'est.qa@example.invalid';
    correo.dispatchEvent(new Event('input'));
    raiz.querySelector('form')!.dispatchEvent(new Event('submit'));
    f.detectChanges();
    http.expectNone(() => true);
    expect(raiz.textContent).toContain('Nombre y correo válido son obligatorios.');
  });
});

describe('DC-108 intento considerado DD-04', () => {
  let http: HttpTestingController;
  let estado: WritableSignal<EstadoSesionPersonal>;

  afterEach(() => http.verify());

  it('sin intento seleccionado no presenta una recuperación ya hecha', () => {
    estado = signal({
      tipo: 'valida',
      identidad: {
        userId: '11111111-1111-4111-8111-111111111111',
        correo: 'docente@example.invalid',
        nombre: 'Docente QA',
        rol: 'DOCENTE',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    } as EstadoSesionPersonal);
    TestBed.configureTestingModule({
      imports: [PanelParticipacionesDc92],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        provideCapacidadesDc99({ consultaParticipaciones: true }),
        { provide: SesionPersonalM1, useValue: { estado } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PanelParticipacionesDc92);
    f.componentRef.setInput('idSesion', S);
    f.detectChanges();
    const boton = [...(f.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Consultar participaciones'),
    ) as HTMLButtonElement;
    boton.click();
    f.detectChanges();
    http.expectOne(`${B}/v1/docente/sesiones/${S}/participaciones`).flush({
      items: [
        {
          idConvocatoria: C,
          idEstudiante: E,
          nombreEstudiante: 'Estudiante QA',
          caso: null,
          sesion: null,
          fechaSesion: null,
          estadoConvocatoria: 'Autorizado',
          fechaRetiro: null,
          idParticipacion: null,
          fechaIngreso: null,
          numeroIntentos: 2,
          estadoParticipacion: 'PARTICIPACION_FINALIZADA',
          idIntentoConsiderado: null,
          inicioIntento: null,
          finIntento: null,
          estadoEvaluacion: 'SELECCION_PENDIENTE',
          calificacionPublicada: null,
          fechaPublicacion: null,
        },
      ],
    });
    f.detectChanges();
    const aviso = (f.nativeElement as HTMLElement).querySelector('[data-prueba="seleccion-dd04"]');
    expect(aviso?.textContent).toContain('Pendiente');
    expect(aviso?.textContent).not.toMatch(/recuperad[oa] con éxito/i);
  });
});
