import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { FalloAcademico } from './academico-http';
import { AdministracionM1Api, EstudianteRegistrado } from './administracion-m1.api';
import { CAPACIDADES_DC99, leerCapacidadesDc99, provideCapacidadesDc99 } from './capacidades-dc99';
import { mensajeFalloEstudiantes, PanelEstudiantesM1 } from './panel-estudiantes-m1';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * FE-61 Fase 2 · P-78. Respuestas = DOBLES HTTP con la forma de `AdministracionEstudiantesController`
 * y su `ExceptionHandler` (Backend DC-99 32922bb). No hay Backend DC-99 QA: no acredita E2E.
 */
const B = '/api-prueba';
const U = '11111111-1111-4111-8111-111111111111';
const E = '22222222-2222-4222-8222-222222222222';
const REGISTRADO: EstudianteRegistrado = {
  idUsuario: U,
  idEstudiante: E,
  nombre: 'Estudiante QA',
  correo: 'est.qa@example.invalid',
  estado: 'Activo',
};

describe('FE-61 capacidades DC-99', () => {
  it('todo queda deshabilitado salvo un `true` explícito', () => {
    expect(leerCapacidadesDc99(undefined)).toEqual({
      altaEstudiantes: false,
      activacionDocente: false,
      consultaParticipaciones: false,
      reporteParticipacion: false,
    });
    expect(
      leerCapacidadesDc99({
        altaEstudiantes: 'true',
        activacionDocente: 1,
        consultaParticipaciones: 'yes',
        reporteParticipacion: {},
      }),
    ).toEqual({
      altaEstudiantes: false,
      activacionDocente: false,
      consultaParticipaciones: false,
      reporteParticipacion: false,
    });
  });

  it('ningún entorno compilado las habilita hoy', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(CAPACIDADES_DC99)).toEqual({
      altaEstudiantes: false,
      activacionDocente: false,
      consultaParticipaciones: false,
      reporteParticipacion: false,
    });
  });
});

describe('FE-61 P-78 AdministracionM1Api (doble HTTP)', () => {
  let http: HttpTestingController;
  let api: AdministracionM1Api;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(AdministracionM1Api);
  });
  afterEach(() => http.verify());

  it('alta envía solo nombre y correo recortados y lee EstudianteRegistrado (201)', () => {
    let creado: EstudianteRegistrado | undefined;
    api
      .altaEstudiante({
        nombre: ' Estudiante QA ',
        correo: ' est.qa@example.invalid ',
        password: 'x',
      } as never)
      .subscribe((e) => (creado = e));
    const req = http.expectOne({ method: 'POST', url: `${B}/v1/admin/estudiantes` });
    expect(req.request.body).toEqual({ nombre: 'Estudiante QA', correo: 'est.qa@example.invalid' });
    req.flush(REGISTRADO, { status: 201, statusText: 'Created' });
    expect(creado).toEqual(REGISTRADO);
  });

  it('rechaza una respuesta sin idEstudiante', () => {
    let error: unknown;
    api
      .altaEstudiante({ nombre: 'a', correo: 'a@example.invalid' })
      .subscribe({ error: (e) => (error = e) });
    http
      .expectOne(`${B}/v1/admin/estudiantes`)
      .flush({ ...REGISTRADO, idEstudiante: undefined }, { status: 201, statusText: 'Created' });
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('busca por correo exacto con ?correo= y lee el envoltorio items', () => {
    let lista: EstudianteRegistrado[] | undefined;
    api.buscarEstudiantePorCorreo(' est.qa@example.invalid ').subscribe((l) => (lista = l));
    const req = http.expectOne((r) => r.url === `${B}/v1/admin/estudiantes`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual(['correo']);
    expect(req.request.params.get('correo')).toBe('est.qa@example.invalid');
    req.flush({ items: [REGISTRADO] });
    expect(lista).toEqual([REGISTRADO]);
  });

  it('no consulta con un correo vacío', () => {
    let error: unknown;
    api.buscarEstudiantePorCorreo('  ').subscribe({ error: (e) => (error = e) });
    http.expectNone(() => true);
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('conserva los códigos del contrato (409, 503) para la interfaz', () => {
    const errores: FalloAcademico[] = [];
    for (let i = 0; i < 2; i++)
      api
        .altaEstudiante({ nombre: 'a', correo: 'a@example.invalid' })
        .subscribe({ error: (e) => errores.push(e) });
    const [a, b] = http.match(`${B}/v1/admin/estudiantes`);
    a.flush({ code: 'DUPLICATE_EMAIL', message: 'x' }, { status: 409, statusText: 'Conflict' });
    b.flush(
      { code: 'STUDENT_ROLE_NOT_CONFIGURED', message: 'x' },
      { status: 503, statusText: 'Unavailable' },
    );
    expect(errores.map((e) => [e.estado, e.codigo])).toEqual([
      [409, 'DUPLICATE_EMAIL'],
      [503, 'STUDENT_ROLE_NOT_CONFIGURED'],
    ]);
  });
});

describe('FE-61 P-78 mensajes', () => {
  const m = (status: number, error: unknown) =>
    mensajeFalloEstudiantes(new HttpErrorResponse({ status, error }));
  it('distingue el interruptor apagado (404 sin código) de los errores de dominio', () => {
    expect(m(404, null)).toContain('no tiene habilitada');
    expect(m(409, { code: 'DUPLICATE_EMAIL' })).toContain('Ya existe');
    expect(m(403, { code: 'ADMIN_REQUIRED' })).toContain('administrador');
    expect(m(503, { code: 'ROLE_NOT_FOUND' })).toContain('ESTUDIANTE');
    expect(m(400, { code: 'VALIDATION_ERROR', message: 'interno' })).not.toContain('interno');
  });
});

describe('FE-61 P-78 PanelEstudiantesM1', () => {
  let http: HttpTestingController;
  let estado: WritableSignal<EstadoSesionPersonal>;

  const valida = () =>
    ({
      tipo: 'valida',
      identidad: {
        userId: U,
        correo: 'admin@example.invalid',
        nombre: 'Admin QA',
        rol: 'ADMINISTRADOR',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    }) as EstadoSesionPersonal;

  function montar(habilitada: boolean): ComponentFixture<PanelEstudiantesM1> {
    estado = signal(valida());
    TestBed.configureTestingModule({
      imports: [PanelEstudiantesM1],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        provideCapacidadesDc99({ altaEstudiantes: habilitada }),
        { provide: SesionPersonalM1, useValue: { estado } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PanelEstudiantesM1);
    f.detectChanges();
    return f;
  }
  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  function escribir(f: ComponentFixture<unknown>, form: number, campo: string, valor: string) {
    const el = raiz(f)
      .querySelectorAll('form')
      [form].querySelector(`[formcontrolname="${campo}"]`) as HTMLInputElement;
    el.value = valor;
    el.dispatchEvent(new Event('input'));
  }
  function enviar(f: ComponentFixture<unknown>, form: number) {
    raiz(f).querySelectorAll('form')[form].dispatchEvent(new Event('submit'));
    f.detectChanges();
  }

  afterEach(() => http.verify());

  it('deshabilitado por el entorno: sin formularios ni solicitudes', () => {
    const f = montar(false);
    expect(raiz(f).querySelector('[data-prueba="estudiantes-no-habilitado"]')).not.toBeNull();
    expect(raiz(f).querySelectorAll('form').length).toBe(0);
    http.expectNone(() => true);
  });

  it('sin sesión válida no ofrece operaciones', () => {
    const f = montar(true);
    estado.set({ tipo: 'no-autenticada' } as EstadoSesionPersonal);
    f.detectChanges();
    expect(raiz(f).querySelectorAll('form').length).toBe(0);
  });

  it('no ofrece listado general: solo alta y búsqueda por correo', () => {
    const f = montar(true);
    expect(raiz(f).querySelectorAll('form').length).toBe(2);
    http.expectNone(() => true);
    expect(raiz(f).textContent).not.toMatch(/página|paginación|filtrar/i);
  });

  it('alta: muestra el estudiante solo tras el 201 y aclara que no activa DD-02', () => {
    const f = montar(true);
    escribir(f, 0, 'nombre', 'Estudiante QA');
    escribir(f, 0, 'correo', 'est.qa@example.invalid');
    enviar(f, 0);
    http
      .expectOne({ method: 'POST', url: `${B}/v1/admin/estudiantes` })
      .flush(REGISTRADO, { status: 201, statusText: 'Created' });
    f.detectChanges();
    const texto = raiz(f).textContent ?? '';
    expect(texto).toContain(E);
    expect(texto).toContain('No se creó credencial ni se activó el acceso estudiantil');
  });

  it('valida el formulario sin llamar al servidor', () => {
    const f = montar(true);
    escribir(f, 0, 'nombre', 'Estudiante QA');
    escribir(f, 0, 'correo', 'no-es-correo');
    enviar(f, 0);
    http.expectNone(() => true);
    expect(raiz(f).textContent).toContain('correo válido');
  });

  it('búsqueda: sin coincidencias lo dice y con coincidencia muestra el idEstudiante', () => {
    const f = montar(true);
    escribir(f, 1, 'correo', 'nadie@example.invalid');
    enviar(f, 1);
    http.expectOne((r) => r.url === `${B}/v1/admin/estudiantes`).flush({ items: [] });
    f.detectChanges();
    expect(raiz(f).textContent).toContain(
      'No hay ningún estudiante registrado con el correo nadie@example.invalid',
    );
    escribir(f, 1, 'correo', 'est.qa@example.invalid');
    enviar(f, 1);
    http.expectOne((r) => r.url === `${B}/v1/admin/estudiantes`).flush({ items: [REGISTRADO] });
    f.detectChanges();
    expect(raiz(f).querySelector('[data-prueba="resultados-estudiantes"]')?.textContent).toContain(
      E,
    );
  });

  it('interruptor apagado en el servidor (404): informa sin presentar éxito', () => {
    const f = montar(true);
    escribir(f, 0, 'nombre', 'Estudiante QA');
    escribir(f, 0, 'correo', 'est.qa@example.invalid');
    enviar(f, 0);
    http
      .expectOne(`${B}/v1/admin/estudiantes`)
      .flush({ status: 404, error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    expect(raiz(f).textContent).toContain(
      'El servidor no tiene habilitada la administración de estudiantes',
    );
    expect(raiz(f).querySelector('[data-prueba="estudiante-creado"]')).toBeNull();
  });
});
