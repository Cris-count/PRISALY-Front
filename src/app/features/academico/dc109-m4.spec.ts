import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { FalloAcademico } from './academico-http';
import { PanelConvocatoriasM4 } from './panel-convocatorias-m4';
import { SesionesM4Api } from './sesiones-m4.api';

/** DC-DEV-109. No repite FE-53. */
const B = '/api-prueba';
const CASO = '22222222-2222-4222-8222-222222222222';
const SESION = '33333333-3333-4333-8333-333333333333';
const OTRA = '66666666-6666-4666-8666-666666666666';
const ESTUDIANTE = '44444444-4444-4444-8444-444444444444';

const sesion = {
  id: SESION,
  casoId: CASO,
  docenteId: '11111111-1111-4111-8111-111111111111',
  titulo: 'Sesión QA',
  mensajePersonalizado: null,
  fechaInicio: '2026-12-01T13:00:00Z',
  fechaFin: '2026-12-01T15:00:00Z',
  estado: 'SinIniciar',
  creadoEn: null,
  fechaInicioReal: null,
  fechaFinReal: null,
  tiempoMaximoParticipacionSegundos: 1800,
  lugarFisico: null,
};

describe('DC-109 relación sesión y convocatoria', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('rechaza una convocatoria cuyo sesionId no es el de la consulta', () => {
    let error: unknown;
    TestBed.inject(SesionesM4Api)
      .convocatorias(SESION)
      .subscribe({ next: () => fail('no debía aceptar otra sesión'), error: (e) => (error = e) });
    http.expectOne(`${B}/m4/sesiones/${SESION}/convocatorias`).flush([
      {
        id: '55555555-5555-4555-8555-555555555555',
        sesionId: OTRA,
        estudianteId: ESTUDIANTE,
        convocadoEn: null,
        estadoAutorizacion: null,
        fechaRetiro: null,
      },
    ]);
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('al abrir la sesión muestra el caso al que pertenece', () => {
    const estado = signal({
      tipo: 'valida',
      identidad: {
        userId: sesion.docenteId,
        correo: 'qa@example.invalid',
        nombre: 'Persona QA',
        rol: 'ROL_DE_PRUEBA',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    } as EstadoSesionPersonal);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PanelConvocatoriasM4],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        { provide: SesionPersonalM1, useValue: { estado } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PanelConvocatoriasM4);
    f.detectChanges();
    const raiz = f.nativeElement as HTMLElement;
    const boton = (texto: string) =>
      [...raiz.querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as
        HTMLButtonElement;
    boton('Consultar sesiones').click();
    http.expectOne(`${B}/m4/sesiones`).flush([sesion]);
    f.detectChanges();
    boton('Sesión QA').click();
    http.expectOne(`${B}/m4/sesiones/${SESION}/convocatorias`).flush([]);
    f.detectChanges();
    expect(raiz.querySelector('[data-prueba="caso-de-sesion"]')?.textContent).toContain(CASO);
  });
});
