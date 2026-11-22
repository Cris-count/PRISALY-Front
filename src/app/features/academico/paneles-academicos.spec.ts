import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, Type, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { PanelAdministracionM1 } from './panel-administracion-m1';
import { PanelCasosM3 } from './panel-casos-m3';
import { PanelConvocatoriasM4 } from './panel-convocatorias-m4';
import { PanelRubricaM3 } from './panel-rubrica-m3';
import { PanelSesionesM4 } from './panel-sesiones-m4';

const B = '/api-prueba';
const YO = '11111111-1111-4111-8111-111111111111';
const OTRO = '55555555-5555-4555-8555-555555555555';
const C = '22222222-2222-4222-8222-222222222222';
const S = '33333333-3333-4333-8333-333333333333';
const P = '44444444-4444-4444-8444-444444444444';
const ETAG = '"m3-v2:abc"';

let estado: WritableSignal<EstadoSesionPersonal>;
let http: HttpTestingController;

function valida(): EstadoSesionPersonal {
  return {
    tipo: 'valida',
    identidad: {
      userId: YO,
      correo: 'qa@example.invalid',
      nombre: 'Persona QA',
      rol: 'ROL_DE_PRUEBA',
      permisos: [],
      authPrototype: 'TD-M1-AUTH-PROVISIONAL',
    },
  } as EstadoSesionPersonal;
}

function montar<T>(tipo: Type<T>): ComponentFixture<T> {
  estado = signal(valida());
  TestBed.configureTestingModule({
    imports: [tipo],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiConfig(B),
      { provide: SesionPersonalM1, useValue: { estado } },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(tipo);
  f.detectChanges();
  return f;
}

const texto = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).textContent ?? '';
const boton = (f: ComponentFixture<unknown>, etiqueta: string) =>
  [...(f.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
    b.textContent?.includes(etiqueta),
  ) as HTMLButtonElement | undefined;
function escribir(f: ComponentFixture<unknown>, selector: string, valor: string): void {
  const el = (f.nativeElement as HTMLElement).querySelector(selector) as HTMLInputElement;
  el.value = valor;
  el.dispatchEvent(new Event('input'));
}
function enviar(f: ComponentFixture<unknown>, indice = 0): void {
  const form = (f.nativeElement as HTMLElement).querySelectorAll('form')[indice];
  form.dispatchEvent(new Event('submit'));
  f.detectChanges();
}

// Algunos casos no crean TestBed: se reinicia para no verificar un controlador anterior.
beforeEach(() => (http = undefined as unknown as HttpTestingController));
afterEach(() => http?.verify());

describe('FE-53-A PanelAdministracionM1', () => {
  it('sin sesión válida no consulta ni muestra acciones', () => {
    const f = montar(PanelAdministracionM1);
    estado.set({ tipo: 'no-autenticada' } as EstadoSesionPersonal);
    f.detectChanges();
    expect(texto(f)).toContain('Inicia sesión de personal');
    expect(boton(f, 'Consultar roles')).toBeUndefined();
  });

  it('consulta el catálogo real y lo presenta', () => {
    const f = montar(PanelAdministracionM1);
    boton(f, 'Consultar roles y permisos')!.click();
    http!
      .expectOne(`${B}/v1/admin/roles`)
      .flush({ items: [{ idRol: 1, nombre: 'ADMINISTRADOR' }] });
    http
      .expectOne(`${B}/v1/admin/permisos`)
      .flush({ items: [{ idPermiso: 7, codigo: 'CREAR_CASO', nombre: 'Crear caso' }] });
    f.detectChanges();
    expect(texto(f)).toContain('ADMINISTRADOR');
    expect(texto(f)).toContain('CREAR_CASO');
  });

  it('refleja la separación de funciones: sin autoasignación de PUBLICAR_CASO/ARCHIVAR_CASO', () => {
    const f = montar(PanelAdministracionM1);
    boton(f, 'Consultar roles y permisos')!.click();
    http.expectOne(`${B}/v1/admin/roles`).flush({ items: [] });
    http.expectOne(`${B}/v1/admin/permisos`).flush({
      items: [
        { idPermiso: 7, codigo: 'CREAR_CASO', nombre: 'Crear caso' },
        { idPermiso: 3, codigo: 'PUBLICAR_CASO', nombre: 'Publicar caso' },
      ],
    });
    f.detectChanges();
    escribir(f, 'input[formControlName="idUsuario"]', YO);
    enviar(f, 0);
    http.expectOne(`${B}/v1/admin/usuarios/${YO}/permisos`).flush({ items: [] });
    f.detectChanges();
    expect(texto(f)).toContain('Es tu propio usuario');
    expect(texto(f)).toContain('No permitido (separación de funciones)');
    // CREAR_CASO no está sujeto a separación de funciones en la política vigente.
    expect(boton(f, 'Asignar')!.disabled).toBeFalse();
  });

  it('asigna a otro usuario y vuelve a leer los permisos efectivos', () => {
    const f = montar(PanelAdministracionM1);
    boton(f, 'Consultar roles y permisos')!.click();
    http.expectOne(`${B}/v1/admin/roles`).flush({ items: [] });
    http
      .expectOne(`${B}/v1/admin/permisos`)
      .flush({ items: [{ idPermiso: 7, codigo: 'CREAR_CASO', nombre: 'Crear caso' }] });
    f.detectChanges();
    escribir(f, 'input[formControlName="idUsuario"]', OTRO);
    enviar(f, 0);
    http.expectOne(`${B}/v1/admin/usuarios/${OTRO}/permisos`).flush({ items: [] });
    f.detectChanges();
    boton(f, 'Asignar')!.click();
    http
      .expectOne({ method: 'PUT', url: `${B}/v1/admin/usuarios/${OTRO}/permisos/7` })
      .flush({ idUsuario: OTRO, idPermiso: 7, habilitado: true });
    http
      .expectOne(`${B}/v1/admin/usuarios/${OTRO}/permisos`)
      .flush({ items: [{ idPermiso: 7, codigo: 'CREAR_CASO', nombre: 'Crear caso' }] });
    f.detectChanges();
    expect(texto(f)).toContain('Permiso CREAR_CASO asignado');
    expect(boton(f, 'Revocar')).toBeDefined();
  });

  it('muestra el rechazo del Backend y no un éxito', () => {
    const f = montar(PanelAdministracionM1);
    boton(f, 'Consultar roles y permisos')!.click();
    http
      .expectOne(`${B}/v1/admin/roles`)
      .flush({ code: 'ADMIN_REQUIRED' }, { status: 403, statusText: 'Forbidden' });
    expect(http.expectOne(`${B}/v1/admin/permisos`).cancelled).toBeTrue();
    f.detectChanges();
    expect(texto(f)).toContain('No tienes acceso');
    expect(texto(f)).toContain('HTTP 403');
  });

  it('alta de docente informa la limitación D-05', () => {
    const f = montar(PanelAdministracionM1);
    escribir(f, 'input[formControlName="nombre"]', 'Docente QA');
    escribir(f, 'input[formControlName="correo"]', 'docente@example.invalid');
    enviar(f, 1);
    http.expectOne({ method: 'POST', url: `${B}/v1/admin/docentes` }).flush(
      {
        idUsuario: OTRO,
        nombre: 'Docente QA',
        correo: 'docente@example.invalid',
        estado: 'Activo',
      },
      { status: 201, statusText: 'Created' },
    );
    f.detectChanges();
    expect(texto(f)).toContain('D-05');
    expect(texto(f)).toContain(OTRO);
  });
});

describe('FE-53-B PanelCasosM3', () => {
  const caso = { idCaso: C, titulo: 'Caso QA', tiempoEstimadoSegundos: 1800, estado: 'BORRADOR' };

  it('no envía un formulario inválido', () => {
    const f = montar(PanelCasosM3);
    escribir(f, 'input[formControlName="titulo"]', '');
    enviar(f, 0);
    http.expectNone(() => true);
    expect(texto(f)).toContain('El título');
  });

  it('crea, vuelve a consultar el caso persistido y lo presenta', () => {
    const f = montar(PanelCasosM3);
    escribir(f, 'input[formControlName="titulo"]', 'Caso QA');
    enviar(f, 0);
    const post = http.expectOne({ method: 'POST', url: `${B}/v1/casos` });
    expect(post.request.body.titulo).toBe('Caso QA');
    expect(post.request.body.tiempoEstimadoSegundos).toBe(1800);
    post.flush(
      { idCaso: post.request.body.idCaso, estado: 'BORRADOR' },
      { status: 201, statusText: 'Created' },
    );
    http
      .expectOne(`${B}/v1/casos/${post.request.body.idCaso}`)
      .flush({ ...caso, idCaso: post.request.body.idCaso }, { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(texto(f)).toContain('verificado en el servidor');
    expect(texto(f)).toContain('BORRADOR');
  });

  it('un 412 bloquea la edición hasta volver a consultar', () => {
    const f = montar(PanelCasosM3);
    escribir(f, 'input[formControlName="idCaso"]', C);
    enviar(f, 1);
    http.expectOne(`${B}/v1/casos/${C}`).flush(caso, { headers: { ETag: ETAG } });
    f.detectChanges();
    const editar = (f.nativeElement as HTMLElement).querySelectorAll('form')[2];
    const titulo = editar.querySelector('input[formControlName="titulo"]') as HTMLInputElement;
    titulo.value = 'Editado';
    titulo.dispatchEvent(new Event('input'));
    enviar(f, 2);
    const patch = http.expectOne({ method: 'PATCH', url: `${B}/v1/casos/${C}` });
    expect(patch.request.headers.get('If-Match')).toBe(ETAG);
    patch.flush({ code: 'STALE_CASE' }, { status: 412, statusText: 'Precondition Failed' });
    f.detectChanges();
    expect(texto(f)).toContain('HTTP 412');
    expect(boton(f, 'Guardar cambios')!.disabled).toBeTrue();
    expect(boton(f, 'Volver a consultar el caso')).toBeDefined();
  });

  it('muestra el rechazo de publicación del Backend', () => {
    const f = montar(PanelCasosM3);
    escribir(f, 'input[formControlName="idCaso"]', C);
    enviar(f, 1);
    http.expectOne(`${B}/v1/casos/${C}`).flush(caso, { headers: { ETag: ETAG } });
    f.detectChanges();
    boton(f, 'Solicitar publicación')!.click();
    http
      .expectOne({ method: 'POST', url: `${B}/v1/casos/${C}/publicar` })
      .flush({ code: 'CASE_INCOMPLETE' }, { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(texto(f)).toContain('requisitos de publicación');
    expect(texto(f)).not.toContain('Publicación aceptada');
  });

  it('acceso no autorizado', () => {
    const f = montar(PanelCasosM3);
    escribir(f, 'input[formControlName="idCaso"]', C);
    enviar(f, 1);
    http
      .expectOne(`${B}/v1/casos/${C}`)
      .flush({ code: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });
    f.detectChanges();
    expect(texto(f)).toContain('No tienes acceso');
  });
});

describe('FE-53-C PanelRubricaM3', () => {
  const contenido = {
    idCaso: C,
    titulo: 'Caso QA',
    tiempoEstimadoSegundos: 60,
    estado: 'BORRADOR',
    historia: null,
    desarrolloSituacional: null,
    escenarios: [
      {
        idEscenario: 'e1',
        titulo: 'E',
        orden: 1,
        preguntas: [{ idPregunta: P, enunciado: '¿Qué hace?', orden: 1 }],
      },
    ],
  };

  function cargar(f: ComponentFixture<PanelRubricaM3>, rubrica: 'ninguna' | object): void {
    escribir(f, 'input[formControlName="idCaso"]', C);
    enviar(f, 0);
    http.expectOne(`${B}/v1/casos/${C}/contenido`).flush(contenido, { headers: { ETag: ETAG } });
    const r = http.expectOne(`${B}/v1/casos/${C}/rubrica`);
    if (rubrica === 'ninguna')
      r.flush({ code: 'RUBRIC_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    else r.flush(rubrica, { headers: { ETag: ETAG } });
    f.detectChanges();
  }

  it('sin rúbrica: permite definirla usando la versión del caso', () => {
    const f = montar(PanelRubricaM3);
    cargar(f, 'ninguna');
    expect(texto(f)).toContain('todavía no tiene rúbrica');
    expect(texto(f)).toContain('¿Qué hace?');
    escribir(f, 'input[formControlName="nombre"]', 'Rúbrica QA');
    boton(f, 'Agregar criterio')!.click();
    f.detectChanges();
    escribir(f, 'input[formControlName="id"]', 'c1');
    escribir(f, 'input[formControlName="descripcion"]', 'Argumenta');
    escribir(f, 'input[formControlName="puntaje"]', '5');
    f.detectChanges();
    const select = (f.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    escribir(f, 'input[formControlName="valor"]', '5');
    enviar(f, 1);
    const put = http.expectOne({ method: 'PUT', url: `${B}/v1/casos/${C}/rubrica` });
    expect(put.request.headers.get('If-Match')).toBe(ETAG);
    expect(put.request.body.preguntas).toEqual([
      { idPregunta: P, criterio: 'c1', valorPregunta: 5 },
    ]);
    put.flush(
      {
        idRubrica: 'r1',
        nombre: 'Rúbrica QA',
        descripcion: null,
        puntajeTotal: null,
        completa: true,
        criterios: put.request.body.criterios,
        preguntas: put.request.body.preguntas,
      },
      { headers: { ETag: '"m3-v2:nuevo"' } },
    );
    f.detectChanges();
    expect(texto(f)).toContain('Rúbrica guardada por el servidor (completa)');
  });

  it('un 412 al guardar exige recargar y no sobrescribe', () => {
    const f = montar(PanelRubricaM3);
    cargar(f, {
      idRubrica: 'r1',
      nombre: 'R',
      descripcion: null,
      puntajeTotal: 5,
      completa: false,
      criterios: [{ id: 'c1', descripcion: 'x', puntaje: 5, ponderacion: null }],
      preguntas: [],
    });
    enviar(f, 1);
    const put = http.expectOne({ method: 'PUT', url: `${B}/v1/casos/${C}/rubrica` });
    expect(put.request.headers.get('If-Match')).toBe(ETAG);
    put.flush({ code: 'STALE_CASE' }, { status: 412, statusText: 'Precondition Failed' });
    f.detectChanges();
    expect(texto(f)).toContain('HTTP 412');
    expect(boton(f, 'Guardar rúbrica')!.disabled).toBeTrue();
    expect(boton(f, 'Volver a cargar la rúbrica')).toBeDefined();
  });

  it('un 428 también bloquea el guardado', () => {
    const f = montar(PanelRubricaM3);
    cargar(f, {
      idRubrica: 'r1',
      nombre: 'R',
      descripcion: null,
      puntajeTotal: null,
      completa: false,
      criterios: [],
      preguntas: [],
    });
    enviar(f, 1);
    http
      .expectOne(`${B}/v1/casos/${C}/rubrica`)
      .flush({ code: 'IF_MATCH_REQUIRED' }, { status: 428, statusText: 'Precondition Required' });
    f.detectChanges();
    expect(texto(f)).toContain('HTTP 428');
    expect(boton(f, 'Guardar rúbrica')!.disabled).toBeTrue();
  });
});

describe('FE-53-D PanelSesionesM4', () => {
  const sesion = {
    id: S,
    casoId: C,
    docenteId: YO,
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

  it('valida el rango de fechas antes de enviar', () => {
    const f = montar(PanelSesionesM4);
    escribir(f, 'input[formControlName="casoId"]', C);
    escribir(f, 'input[formControlName="titulo"]', 'Sesión QA');
    escribir(f, 'input[formControlName="fechaInicio"]', '2026-12-01T10:00');
    escribir(f, 'input[formControlName="fechaFin"]', '2026-12-01T09:00');
    enviar(f, 0);
    http.expectNone(() => true);
    expect(texto(f)).toContain('posterior al inicio');
  });

  it('programa la sesión y recarga el listado real', () => {
    const f = montar(PanelSesionesM4);
    escribir(f, 'input[formControlName="casoId"]', C);
    escribir(f, 'input[formControlName="titulo"]', 'Sesión QA');
    escribir(f, 'input[formControlName="fechaInicio"]', '2026-12-01T08:00');
    escribir(f, 'input[formControlName="fechaFin"]', '2026-12-01T10:00');
    enviar(f, 0);
    const post = http.expectOne({ method: 'POST', url: `${B}/m4/sesiones` });
    expect(post.request.body.fechaInicio).toMatch(/Z$/);
    post.flush(sesion, { status: 201, statusText: 'Created' });
    http.expectOne(`${B}/m4/sesiones`).flush([sesion]);
    f.detectChanges();
    expect(texto(f)).toContain('Sesión programada');
    expect(texto(f)).toContain('Sesión QA');
  });

  it('solo ofrece la transición siguiente y muestra un 409 como rechazo', () => {
    const f = montar(PanelSesionesM4);
    boton(f, 'Consultar sesiones')!.click();
    http.expectOne(`${B}/m4/sesiones`).flush([sesion]);
    f.detectChanges();
    boton(f, 'Ver detalle')!.click();
    http.expectOne(`${B}/m4/sesiones/${S}`).flush(sesion);
    f.detectChanges();
    expect(boton(f, 'Pasar a «En curso»')).toBeDefined();
    expect(boton(f, 'Pasar a «Finalizado»')).toBeUndefined();
    boton(f, 'Pasar a «En curso»')!.click();
    const patch = http.expectOne({ method: 'PATCH', url: `${B}/m4/sesiones/${S}/estado` });
    expect(patch.request.body).toEqual({ nuevoEstado: 'EnCurso' });
    patch.flush({ code: 'M4-REGLA' }, { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(texto(f)).toContain('regla académica');
  });

  it('una sesión iniciada no ofrece edición', () => {
    const f = montar(PanelSesionesM4);
    boton(f, 'Consultar sesiones')!.click();
    http.expectOne(`${B}/m4/sesiones`).flush([{ ...sesion, estado: 'EnCurso' }]);
    f.detectChanges();
    boton(f, 'Ver detalle')!.click();
    http.expectOne(`${B}/m4/sesiones/${S}`).flush({ ...sesion, estado: 'EnCurso' });
    f.detectChanges();
    expect(boton(f, 'Guardar programación')).toBeUndefined();
    expect(texto(f)).toContain('ya no admite cambios');
  });
});

describe('FE-53-E PanelConvocatoriasM4', () => {
  const sesion = {
    id: S,
    casoId: C,
    docenteId: YO,
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

  function abrir(f: ComponentFixture<PanelConvocatoriasM4>, s = sesion): void {
    boton(f, 'Consultar sesiones')!.click();
    http.expectOne(`${B}/m4/sesiones`).flush([s]);
    f.detectChanges();
    boton(f, 'Sesión QA')!.click();
    http.expectOne(`${B}/m4/sesiones/${S}/convocatorias`).flush([]);
    f.detectChanges();
  }

  it('convoca y vuelve a consultar el listado persistido', () => {
    const f = montar(PanelConvocatoriasM4);
    abrir(f);
    expect(texto(f)).toContain('no tiene estudiantes convocados');
    escribir(f, 'input[formControlName="estudianteId"]', P);
    enviar(f, 0);
    http.expectOne({ method: 'POST', url: `${B}/m4/sesiones/${S}/convocatorias` }).flush(
      {
        id: OTRO,
        sesionId: S,
        estudianteId: P,
        convocadoEn: '2026-11-21T10:00:00Z',
        estadoAutorizacion: null,
        fechaRetiro: null,
      },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne(`${B}/m4/sesiones/${S}/convocatorias`).flush([
      {
        id: OTRO,
        sesionId: S,
        estudianteId: P,
        convocadoEn: '2026-11-21T10:00:00Z',
        estadoAutorizacion: null,
        fechaRetiro: null,
      },
    ]);
    f.detectChanges();
    expect(texto(f)).toContain('verificado en el servidor');
    expect(texto(f)).toContain(P);
  });

  it('muestra un 409 de convocatoria como rechazo', () => {
    const f = montar(PanelConvocatoriasM4);
    abrir(f);
    escribir(f, 'input[formControlName="estudianteId"]', P);
    enviar(f, 0);
    http
      .expectOne(`${B}/m4/sesiones/${S}/convocatorias`)
      .flush({ code: 'M4-DUPLICADA' }, { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(texto(f)).toContain('rechazó la convocatoria');
  });

  it('no ofrece convocar en una sesión iniciada', () => {
    const f = montar(PanelConvocatoriasM4);
    abrir(f, { ...sesion, estado: 'EnCurso' });
    expect(boton(f, 'Convocar estudiante')).toBeUndefined();
    expect(texto(f)).toContain('no admite nuevas convocatorias');
  });
});
