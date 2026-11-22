import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { provideM1PersonalLocal } from '../autenticacion/m1-personal-http';
import { CredencialPersonalMemoria } from '../autenticacion/m1-personal-memoria';
import { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import {
  contextoAcademico,
  esRutaAcademicaAutorizada,
  FalloAcademico,
  personalAcademicoInterceptor,
} from './academico-http';
import { CasosM3Api } from './casos-m3.api';
import { PanelContenidoM3 } from './panel-contenido-m3';

// Todas las respuestas de este archivo son dobles HTTP (simulación); no son datos académicos reales.
const B = '/api-prueba';
const YO = '11111111-1111-4111-8111-111111111111';
const C = '22222222-2222-4222-8222-222222222222';
const E = '33333333-3333-4333-8333-333333333333';
const P = '44444444-4444-4444-8444-444444444444';
const O = '66666666-6666-4666-8666-666666666666';
const V1 = '"m3-v2:v1"';
const V2 = '"m3-v2:v2"';
const V3 = '"m3-v2:v3"';
const URL_CONTENIDO = `${B}/v1/casos/${C}/contenido`;

let http: HttpTestingController;
beforeEach(() => (http = undefined as unknown as HttpTestingController));
afterEach(() => http?.verify());

function contenido(escenarios: unknown[] = [], estado = 'BORRADOR'): Record<string, unknown> {
  return {
    idCaso: C,
    titulo: 'Caso simulado',
    tiempoEstimadoSegundos: 1800,
    estado,
    historia: 'Historia simulada',
    desarrolloSituacional: null,
    escenarios,
  };
}

const ESCENARIO = {
  idEscenario: E,
  titulo: 'Escenario simulado',
  contexto: 'Contexto',
  instrucciones: 'Instrucciones',
  orden: 1,
  activo: true,
  preguntas: [
    {
      idPregunta: P,
      enunciado: 'Pregunta simulada',
      textoAyuda: null,
      estadoEdicion: 'Borrador',
      visible: true,
      orden: 1,
      opciones: [
        {
          idOpcion: O,
          texto: 'Opción simulada',
          esCorrecta: true,
          explicacion: 'Porque sí',
          orden: 1,
        },
      ],
    },
  ],
};

describe('FE-54 CasosM3Api: contenido (HTTP simulado)', () => {
  let api: CasosM3Api;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(CasosM3Api);
  });

  it('lee escenarios, preguntas y opciones con el ETag de la misma respuesta', () => {
    let leido: unknown;
    api.contenido(C).subscribe((r) => (leido = r));
    http.expectOne(URL_CONTENIDO).flush(contenido([ESCENARIO]), { headers: { ETag: V1 } });
    const r = leido as {
      etag: string;
      datos: { escenarios: { preguntas: { opciones: unknown[] }[]; contexto: string }[] };
    };
    expect(r.etag).toBe(V1);
    expect(r.datos.escenarios[0].contexto).toBe('Contexto');
    expect(r.datos.escenarios[0].preguntas[0].opciones).toEqual([
      {
        idOpcion: O,
        texto: 'Opción simulada',
        esCorrecta: true,
        explicacion: 'Porque sí',
        orden: 1,
      },
    ]);
  });

  it('rechaza opciones con formato inválido', () => {
    let fallo: unknown;
    api.contenido(C).subscribe({ error: (e: unknown) => (fallo = e) });
    const roto = structuredClone(ESCENARIO) as { preguntas: { opciones: unknown }[] };
    roto.preguntas[0].opciones = [{ idOpcion: O, texto: 'x', esCorrecta: 'sí' }];
    http.expectOne(URL_CONTENIDO).flush(contenido([roto]));
    expect(fallo).toEqual(jasmine.any(FalloAcademico));
  });

  it('envía cuerpos cerrados con If-Match y devuelve el id y el nuevo ETag', () => {
    const resultados: unknown[] = [];
    api
      .agregarEscenario(
        C,
        { idEscenario: E, titulo: 'T', contexto: null, instrucciones: null, orden: 1 },
        V1,
      )
      .subscribe((r) => resultados.push(r));
    let req = http.expectOne(`${B}/v1/casos/${C}/escenarios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('If-Match')).toBe(V1);
    expect(req.request.body).toEqual({
      idEscenario: E,
      titulo: 'T',
      contexto: null,
      instrucciones: null,
      orden: 1,
    });
    req.flush({ id: E }, { status: 201, statusText: 'Created', headers: { ETag: V2 } });

    api
      .agregarPregunta(C, E, { idPregunta: P, enunciado: 'Q', textoAyuda: null, orden: 1 }, V2)
      .subscribe((r) => resultados.push(r));
    req = http.expectOne(`${B}/v1/casos/${C}/escenarios/${E}/preguntas`);
    expect(req.request.body).toEqual({ idPregunta: P, enunciado: 'Q', textoAyuda: null, orden: 1 });
    req.flush({ id: P }, { status: 201, statusText: 'Created', headers: { ETag: V3 } });

    api
      .agregarOpcion(
        C,
        P,
        { idOpcion: O, texto: 'A', esCorrecta: false, explicacion: 'X', orden: 2 },
        V3,
      )
      .subscribe((r) => resultados.push(r));
    req = http.expectOne(`${B}/v1/casos/${C}/preguntas/${P}/opciones`);
    expect(req.request.body).toEqual({
      idOpcion: O,
      texto: 'A',
      esCorrecta: false,
      explicacion: 'X',
      orden: 2,
    });
    req.flush({ id: O }, { status: 201, statusText: 'Created', headers: { ETag: V1 } });

    expect(resultados).toEqual([
      { datos: { id: E }, etag: V2 },
      { datos: { id: P }, etag: V3 },
      { datos: { id: O }, etag: V1 },
    ]);
  });

  it('no escribe sin versión ni con identificadores inválidos', () => {
    const fallos: unknown[] = [];
    api
      .agregarEscenario(
        C,
        { idEscenario: E, titulo: null, contexto: null, instrucciones: null, orden: 1 },
        '',
      )
      .subscribe({ error: (e: unknown) => fallos.push(e) });
    api
      .agregarPregunta(
        C,
        'no-uuid',
        { idPregunta: P, enunciado: 'Q', textoAyuda: null, orden: 1 },
        V1,
      )
      .subscribe({ error: (e: unknown) => fallos.push(e) });
    http.expectNone(() => true);
    expect(fallos.length).toBe(2);
  });

  it('trata como inválida una respuesta 201 con otro identificador', () => {
    let fallo: unknown;
    api
      .agregarEscenario(
        C,
        { idEscenario: E, titulo: null, contexto: null, instrucciones: null, orden: 1 },
        V1,
      )
      .subscribe({ error: (e: unknown) => (fallo = e) });
    http
      .expectOne(`${B}/v1/casos/${C}/escenarios`)
      .flush({ id: P }, { status: 201, statusText: 'Created' });
    expect((fallo as FalloAcademico).estado).toBe(-1);
  });

  for (const [estado, codigo] of [
    [412, 'STALE_CASE'],
    [428, 'IF_MATCH_REQUIRED'],
    [409, 'SCENARIO_ORDER_IN_USE'],
  ] as const) {
    it(`propaga ${estado} ${codigo} sin convertirlo en éxito`, () => {
      let fallo: unknown;
      api
        .agregarEscenario(
          C,
          { idEscenario: E, titulo: null, contexto: null, instrucciones: null, orden: 1 },
          V1,
        )
        .subscribe({ error: (e: unknown) => (fallo = e) });
      http
        .expectOne(`${B}/v1/casos/${C}/escenarios`)
        .flush({ code: codigo, message: 'x' }, { status: estado, statusText: 'Error' });
      expect((fallo as FalloAcademico).estado).toBe(estado);
      expect((fallo as FalloAcademico).codigo).toBe(codigo);
    });
  }
});

describe('FE-54 interceptor académico: rutas de contenido', () => {
  it('autoriza solo las tres altas publicadas y no las lecturas parciales', () => {
    expect(esRutaAcademicaAutorizada('POST', `v1/casos/${C}/escenarios`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('POST', `v1/casos/${C}/escenarios/${E}/preguntas`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('POST', `v1/casos/${C}/preguntas/${P}/opciones`)).toBeTrue();
    expect(esRutaAcademicaAutorizada('GET', `v1/casos/${C}/escenarios`)).toBeFalse();
    expect(esRutaAcademicaAutorizada('PUT', `v1/casos/${C}/escenarios`)).toBeFalse();
    expect(
      esRutaAcademicaAutorizada('DELETE', `v1/casos/${C}/preguntas/${P}/opciones`),
    ).toBeFalse();
    expect(esRutaAcademicaAutorizada('POST', `v1/casos/${C}/escenarios/x/preguntas`)).toBeFalse();
    expect(esRutaAcademicaAutorizada('POST', `v1/casos/${C}/narrativa`)).toBeFalse();
  });

  it('añade Bearer al alta de escenario con opt-in QA', () => {
    TestBed.configureTestingModule({
      providers: [
        provideApiConfig(B),
        provideM1PersonalLocal(),
        provideHttpClient(withInterceptors([personalAcademicoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    // Doble de prueba; no es una credencial real.
    TestBed.inject(CredencialPersonalMemoria).guardar('token-de-prueba-no-real');
    TestBed.inject(HttpClient)
      .post(`${B}/v1/casos/${C}/escenarios`, {}, { context: contextoAcademico() })
      .subscribe();
    const req = http.expectOne(`${B}/v1/casos/${C}/escenarios`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba-no-real');
    req.flush({ id: E }, { status: 201, statusText: 'Created' });
  });
});

describe('FE-54 PanelContenidoM3 (HTTP simulado)', () => {
  let estado: WritableSignal<EstadoSesionPersonal>;

  function montar(): ComponentFixture<PanelContenidoM3> {
    estado = signal({
      tipo: 'valida',
      identidad: {
        userId: YO,
        correo: 'qa@example.invalid',
        nombre: 'Persona QA',
        rol: 'ROL_DE_PRUEBA',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    } as EstadoSesionPersonal);
    TestBed.configureTestingModule({
      imports: [PanelContenidoM3],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        { provide: SesionPersonalM1, useValue: { estado } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PanelContenidoM3);
    f.detectChanges();
    return f;
  }

  const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const texto = (f: ComponentFixture<unknown>) => el(f).textContent ?? '';
  const formulario = (f: ComponentFixture<unknown>, titulo: string) =>
    [...el(f).querySelectorAll('form')].find((x) =>
      x.querySelector('h3')?.textContent?.includes(titulo),
    );
  function escribir(
    f: ComponentFixture<unknown>,
    form: HTMLFormElement,
    nombre: string,
    valor: string,
  ): void {
    const campo = form.querySelector(`[formcontrolname="${nombre}"]`) as
      HTMLInputElement | HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event(campo.tagName === 'SELECT' ? 'change' : 'input'));
  }
  function enviar(f: ComponentFixture<unknown>, form: HTMLFormElement): void {
    form.dispatchEvent(new Event('submit'));
    f.detectChanges();
  }
  function cargar(
    f: ComponentFixture<PanelContenidoM3>,
    cuerpo = contenido([ESCENARIO]),
    etag: string | null = V1,
  ): void {
    const form = formulario(f, 'Consultar contenido')!;
    escribir(f, form, 'idCaso', C);
    enviar(f, form);
    http.expectOne(URL_CONTENIDO).flush(cuerpo, { headers: etag ? { ETag: etag } : {} });
    f.detectChanges();
  }
  function altaEscenario(f: ComponentFixture<PanelContenidoM3>): HTMLFormElement {
    const form = formulario(f, 'Añadir escenario')!;
    escribir(f, form, 'titulo', 'Nuevo');
    escribir(f, form, 'orden', '2');
    enviar(f, form);
    return form;
  }

  it('pide sesión sin consultar el servidor', () => {
    const f = montar();
    estado.set({ tipo: 'no-autenticada' });
    f.detectChanges();
    expect(texto(f)).toContain('Inicia sesión de personal');
  });

  it('muestra escenarios, preguntas y opciones persistidos', () => {
    const f = montar();
    cargar(f);
    expect(el(f).querySelectorAll('[data-prueba="escenario"]').length).toBe(1);
    expect(el(f).querySelectorAll('[data-prueba="pregunta"]').length).toBe(1);
    expect(el(f).querySelectorAll('[data-prueba="opcion"]').length).toBe(1);
    expect(texto(f)).toContain('Opción simulada');
    expect(texto(f)).toContain('(correcta)');
    expect(el(f).querySelector('[data-prueba="observaciones"]')).toBeNull();
  });

  it('presenta el estado vacío y las observaciones de contenido incompleto', () => {
    const f = montar();
    cargar(f, contenido([]));
    expect(el(f).querySelector('[data-prueba="sin-escenarios"]')).not.toBeNull();
    expect(texto(f)).toContain('El caso no tiene escenarios.');
    expect(formulario(f, 'Añadir pregunta')).toBeUndefined();
    expect(formulario(f, 'Añadir opción')).toBeUndefined();
  });

  it('valida el formulario sin enviar solicitudes', () => {
    const f = montar();
    cargar(f);
    const form = formulario(f, 'Añadir escenario')!;
    escribir(f, form, 'orden', 'uno');
    enviar(f, form);
    expect(texto(f)).toContain('número entero');
  });

  it('tras un alta relee el contenido y usa el ETag de la relectura, no el del 201', () => {
    const f = montar();
    cargar(f);
    altaEscenario(f);
    const alta = http.expectOne(`${B}/v1/casos/${C}/escenarios`);
    expect(alta.request.headers.get('If-Match')).toBe(V1);
    const id = (alta.request.body as { idEscenario: string }).idEscenario;
    expect(alta.request.body).toEqual({
      idEscenario: id,
      titulo: 'Nuevo',
      contexto: null,
      instrucciones: null,
      orden: 2,
    });
    alta.flush({ id }, { status: 201, statusText: 'Created', headers: { ETag: V2 } });
    expect(texto(f)).not.toContain('verificado por relectura');
    // La relectura pertenece a una versión posterior (otra escritura intermedia): V3.
    const nuevo = { ...ESCENARIO, idEscenario: id, titulo: 'Nuevo', orden: 2, preguntas: [] };
    http.expectOne(URL_CONTENIDO).flush(contenido([ESCENARIO, nuevo]), { headers: { ETag: V3 } });
    f.detectChanges();
    expect(texto(f)).toContain('Escenario guardado en el servidor (verificado por relectura).');
    altaEscenario(f);
    expect(http.expectOne(`${B}/v1/casos/${C}/escenarios`).request.headers.get('If-Match')).toBe(
      V3,
    );
  });

  it('no confirma si la relectura no contiene el elemento creado', () => {
    const f = montar();
    cargar(f);
    altaEscenario(f);
    const alta = http.expectOne(`${B}/v1/casos/${C}/escenarios`);
    alta.flush(
      { id: (alta.request.body as { idEscenario: string }).idEscenario },
      { status: 201, statusText: 'Created', headers: { ETag: V2 } },
    );
    http.expectOne(URL_CONTENIDO).flush(contenido([ESCENARIO]), { headers: { ETag: V2 } });
    f.detectChanges();
    expect(texto(f)).toContain('no aparece en la relectura');
    expect(texto(f)).not.toContain('verificado por relectura');
  });

  it('si el alta se aplicó pero la relectura falla, bloquea hasta recargar', () => {
    const f = montar();
    cargar(f);
    altaEscenario(f);
    const alta = http.expectOne(`${B}/v1/casos/${C}/escenarios`);
    alta.flush(
      { id: (alta.request.body as { idEscenario: string }).idEscenario },
      { status: 201, statusText: 'Created', headers: { ETag: V2 } },
    );
    http
      .expectOne(URL_CONTENIDO)
      .flush({ code: 'CASE_OPERATION_FAILED' }, { status: 500, statusText: 'Error' });
    f.detectChanges();
    expect(texto(f)).toContain('no se pudo releer');
    expect(formulario(f, 'Añadir escenario')).toBeUndefined();
  });

  for (const [estadoHttp, codigo] of [
    [412, 'STALE_CASE'],
    [428, 'IF_MATCH_REQUIRED'],
  ] as const) {
    it(`${estadoHttp} ${codigo} no sobrescribe y exige recargar antes de otra alta`, () => {
      const f = montar();
      cargar(f);
      altaEscenario(f);
      http
        .expectOne(`${B}/v1/casos/${C}/escenarios`)
        .flush({ code: codigo, message: 'x' }, { status: estadoHttp, statusText: 'Error' });
      f.detectChanges();
      expect(texto(f)).toContain(`HTTP ${estadoHttp} · ${codigo}`);
      expect(texto(f)).toContain('Recarga el contenido');
      expect(formulario(f, 'Añadir escenario')).toBeUndefined();
      // El contenido mostrado sigue siendo el de V1; recargar trae la versión vigente.
      (
        [...el(f).querySelectorAll('button')].find((b) =>
          b.textContent?.includes('Recargar'),
        ) as HTMLButtonElement
      ).click();
      http.expectOne(URL_CONTENIDO).flush(contenido([ESCENARIO]), { headers: { ETag: V2 } });
      f.detectChanges();
      altaEscenario(f);
      expect(http.expectOne(`${B}/v1/casos/${C}/escenarios`).request.headers.get('If-Match')).toBe(
        V2,
      );
    });
  }

  for (const [estadoHttp, codigo, esperado] of [
    [400, 'INVALID_CASE_REQUEST', 'validaciones del servidor'],
    [401, 'UNAUTHENTICATED', 'Inicia sesión de nuevo'],
    [403, 'FORBIDDEN', 'propietario del caso'],
    [404, 'ELEMENT_NOT_IN_CASE', 'no pertenece a este caso'],
    [409, 'SCENARIO_ORDER_IN_USE', 'ese orden'],
    [409, 'SCENARIO_ADD_REQUIRES_DRAFT', 'caso en borrador'],
  ] as const) {
    it(`muestra ${estadoHttp} ${codigo} sin confirmar guardado`, () => {
      const f = montar();
      cargar(f);
      altaEscenario(f);
      http
        .expectOne(`${B}/v1/casos/${C}/escenarios`)
        .flush({ code: codigo, message: 'x' }, { status: estadoHttp, statusText: 'Error' });
      f.detectChanges();
      expect(texto(f)).toContain(esperado);
      expect(texto(f)).not.toContain('verificado por relectura');
    });
  }

  for (const [estadoHttp, codigo, esperado] of [
    [401, 'UNAUTHENTICATED', 'Inicia sesión de nuevo'],
    [403, 'FORBIDDEN', 'propietario del caso'],
    [404, 'CASE_NOT_FOUND', 'no existe o no es accesible'],
  ] as const) {
    it(`la consulta con ${estadoHttp} no muestra contenido`, () => {
      const f = montar();
      const form = formulario(f, 'Consultar contenido')!;
      escribir(f, form, 'idCaso', C);
      enviar(f, form);
      http
        .expectOne(URL_CONTENIDO)
        .flush({ code: codigo }, { status: estadoHttp, statusText: 'Error' });
      f.detectChanges();
      expect(texto(f)).toContain(esperado);
      expect(el(f).querySelector('[data-prueba="contenido-caso"]')).toBeNull();
    });
  }

  it('sin ETag en la lectura no ofrece altas', () => {
    const f = montar();
    cargar(f, contenido([ESCENARIO]), null);
    expect(formulario(f, 'Añadir escenario')).toBeUndefined();
  });

  it('un caso publicado se muestra sin formularios de alta', () => {
    const f = montar();
    cargar(f, contenido([ESCENARIO], 'PUBLICADO'));
    expect(texto(f)).toContain('no admite añadir contenido');
    expect(formulario(f, 'Añadir escenario')).toBeUndefined();
  });

  it('añade pregunta y opción conservando la asociación con su escenario y pregunta', () => {
    const f = montar();
    cargar(f);
    const fp = formulario(f, 'Añadir pregunta')!;
    escribir(f, fp, 'idEscenario', E);
    escribir(f, fp, 'enunciado', 'Nueva pregunta');
    escribir(f, fp, 'orden', '2');
    enviar(f, fp);
    const rp = http.expectOne(`${B}/v1/casos/${C}/escenarios/${E}/preguntas`);
    const idP = (rp.request.body as { idPregunta: string }).idPregunta;
    rp.flush({ id: idP }, { status: 201, statusText: 'Created', headers: { ETag: V2 } });
    const conPregunta = structuredClone(ESCENARIO) as typeof ESCENARIO;
    conPregunta.preguntas.push({
      ...ESCENARIO.preguntas[0],
      idPregunta: idP,
      enunciado: 'Nueva pregunta',
      orden: 2,
      opciones: [],
    });
    http.expectOne(URL_CONTENIDO).flush(contenido([conPregunta]), { headers: { ETag: V2 } });
    f.detectChanges();
    expect(texto(f)).toContain('Pregunta guardada en el servidor');
    expect(texto(f)).toContain('no tiene opciones de respuesta');

    const fo = formulario(f, 'Añadir opción')!;
    escribir(f, fo, 'idPregunta', idP);
    escribir(f, fo, 'texto', 'Respuesta');
    escribir(f, fo, 'explicacion', 'Motivo');
    escribir(f, fo, 'orden', '1');
    enviar(f, fo);
    const ro = http.expectOne(`${B}/v1/casos/${C}/preguntas/${idP}/opciones`);
    expect(ro.request.headers.get('If-Match')).toBe(V2);
    expect(ro.request.body).toEqual(
      jasmine.objectContaining({
        texto: 'Respuesta',
        esCorrecta: false,
        explicacion: 'Motivo',
        orden: 1,
      }),
    );
    ro.flush(
      { id: (ro.request.body as { idOpcion: string }).idOpcion },
      { status: 201, statusText: 'Created', headers: { ETag: V3 } },
    );
    const conOpcion = structuredClone(conPregunta);
    conOpcion.preguntas[1].opciones.push({
      idOpcion: (ro.request.body as { idOpcion: string }).idOpcion,
      texto: 'Respuesta',
      esCorrecta: false,
      explicacion: 'Motivo',
      orden: 1,
    });
    http.expectOne(URL_CONTENIDO).flush(contenido([conOpcion]), { headers: { ETag: V3 } });
    f.detectChanges();
    expect(texto(f)).toContain('Opción guardada en el servidor');
  });
});
