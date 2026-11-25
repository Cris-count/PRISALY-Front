import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal, Type, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Route, Router, Routes } from '@angular/router';
import { firstValueFrom, toArray } from 'rxjs';
import { provideApiConfig } from '../../core/config/api.config';
import { requiereMapeoPersonalQa } from '../autenticacion/m1-personal-rutas-qa';
import { personalM1Interceptor, provideM1PersonalLocal } from '../autenticacion/m1-personal-http';
import { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { DASHBOARD_ROUTES } from '../dashboard/dashboard.routes';
import { CasoDocente } from './casos-m3.api';
import { CasosSesionStore } from './casos-sesion.store';
import { ParametroRecorrido, uuidDeParametro } from './contexto-recorrido';
import { PanelCasosM3 } from './panel-casos-m3';
import { PanelContenidoM3 } from './panel-contenido-m3';
import { PanelConvocatoriasM4 } from './panel-convocatorias-m4';
import { PanelRubricaM3 } from './panel-rubrica-m3';
import { PanelSesionesM4 } from './panel-sesiones-m4';
import { PASOS_RECORRIDO, RecorridoDocente } from './recorrido-docente';

/**
 * FE-55. Continuidad del recorrido docente entre paneles existentes. Todas las respuestas del
 * servidor son HTTP simulado; los identificadores son ficticios.
 */
const B = '/api-prueba';
const YO = '11111111-1111-4111-8111-111111111111';
const C = '22222222-2222-4222-8222-222222222222';
const C2 = '66666666-6666-4666-8666-666666666666';
const S = '33333333-3333-4333-8333-333333333333';
const P = '44444444-4444-4444-8444-444444444444';
const E = '77777777-7777-4777-8777-777777777777';
const EST = '88888888-8888-4888-8888-888888888888';
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

function configurar(rutas: Routes | null = []): void {
  estado = signal(valida());
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiConfig(B),
      { provide: SesionPersonalM1, useValue: { estado } },
      ...(rutas ? [provideRouter(rutas)] : []),
    ],
  });
  http = TestBed.inject(HttpTestingController);
}

async function montarEn<T>(tipo: Type<T>, url: string): Promise<ComponentFixture<T>> {
  configurar();
  await TestBed.inject(Router).navigateByUrl(url);
  const f = TestBed.createComponent(tipo);
  f.detectChanges();
  return f;
}

const urlActual = () => TestBed.inject(Router).url;
const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const texto = (f: ComponentFixture<unknown>) => el(f).textContent ?? '';
const boton = (f: ComponentFixture<unknown>, etiqueta: string) =>
  [...el(f).querySelectorAll('button')].find((b) => b.textContent?.includes(etiqueta));
function escribir(f: ComponentFixture<unknown>, selector: string, valor: string): void {
  const campo = el(f).querySelector(selector) as HTMLInputElement;
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

const caso = (estadoCaso = 'BORRADOR', id = C): CasoDocente => ({
  idCaso: id,
  titulo: 'Caso FE-55',
  tiempoEstimadoSegundos: 1800,
  estado: estadoCaso as CasoDocente['estado'],
});

function contenido(opciones: { esCorrecta: boolean }[] = [{ esCorrecta: true }], id = C) {
  return {
    idCaso: id,
    titulo: 'Caso FE-55',
    tiempoEstimadoSegundos: 1800,
    estado: 'BORRADOR',
    historia: null,
    desarrolloSituacional: null,
    escenarios: [
      {
        idEscenario: E,
        titulo: 'Escenario',
        contexto: null,
        instrucciones: null,
        orden: 1,
        activo: true,
        preguntas: [
          {
            idPregunta: P,
            enunciado: 'Pregunta FE-55',
            textoAyuda: null,
            estadoEdicion: 'Borrador',
            visible: true,
            orden: 1,
            opciones: opciones.map((o, i) => ({
              idOpcion: `9999999${i}-9999-4999-8999-999999999999`,
              texto: `Opción ${i + 1}`,
              esCorrecta: o.esCorrecta,
              explicacion: 'Explicación',
              orden: i + 1,
            })),
          },
        ],
      },
    ],
  };
}

const sesionM4 = (estadoSesion = 'SinIniciar') => ({
  id: S,
  casoId: C,
  docenteId: YO,
  titulo: 'Sesión FE-55',
  mensajePersonalizado: null,
  fechaInicio: '2026-12-01T13:00:00Z',
  fechaFin: '2026-12-01T15:00:00Z',
  estado: estadoSesion,
  creadoEn: null,
  fechaInicioReal: null,
  fechaFinReal: null,
  tiempoMaximoParticipacionSegundos: 1800,
  lugarFisico: null,
});

beforeEach(() => (http = undefined as unknown as HttpTestingController));
afterEach(() => http?.verify());

describe('FE-55 ParametroRecorrido (unitarias)', () => {
  it('solo acepta UUID y los normaliza a minúsculas', () => {
    expect(uuidDeParametro(C.toUpperCase())).toBe(C);
    expect(uuidDeParametro('../v1/admin')).toBeNull();
    expect(uuidDeParametro('')).toBeNull();
    expect(uuidDeParametro(null)).toBeNull();
  });

  it('al fijar un identificador elimina par?metros ajenos incluso si el id no cambia', async () => {
    configurar();
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/?caso=${C}&token=secreto-ficticio`);
    const p = TestBed.runInInjectionContext(() => new ParametroRecorrido('caso'));
    p.fijar(C);
    await new Promise((r) => setTimeout(r));
    expect(router.url).toBe(`/?caso=${C}`);
  });

  it('sin enrutador no emite ni navega', async () => {
    configurar(null);
    const p = TestBed.runInInjectionContext(() => new ParametroRecorrido('caso'));
    expect(await firstValueFrom(p.cambios().pipe(toArray()))).toEqual([]);
    expect(() => p.fijar(C)).not.toThrow();
  });

  it('ignora valores no válidos y fija el identificador conservando otros parámetros', async () => {
    configurar();
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/?caso=no-es-uuid&sesion=${S}`);
    const p = TestBed.runInInjectionContext(() => new ParametroRecorrido('caso'));
    const vistos: string[] = [];
    p.cambios().subscribe((v) => vistos.push(v));
    expect(vistos).toEqual([]);
    p.fijar(C.toUpperCase());
    await new Promise((r) => setTimeout(r));
    expect(router.url).toBe(`/?caso=${C}&sesion=${S}`);
    expect(vistos).toEqual([C]);
    const navegar = spyOn(router, 'navigate').and.callThrough();
    p.fijar(C);
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe('FE-55 continuidad entre paneles (componentes con HTTP simulado)', () => {
  it('contenido carga el caso m?s reciente mientras otra lectura est? activa', async () => {
    const f = await montarEn(PanelContenidoM3, `/?caso=${C}`);
    const anterior = http.expectOne(`${B}/v1/casos/${C}/contenido`);
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    anterior.flush(contenido([], C), { headers: { ETag: ETAG } });
    http
      .expectOne(`${B}/v1/casos/${C2}/contenido`)
      .flush({ ...contenido([], C2), titulo: 'Contenido B' }, { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(texto(f)).toContain('Contenido B');
  });

  it('r?brica cambia al caso m?s reciente durante la lectura', async () => {
    const f = await montarEn(PanelRubricaM3, `/?caso=${C}`);
    const anterior = http.expectOne(`${B}/v1/casos/${C}/contenido`);
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    anterior.flush(contenido([], C), { headers: { ETag: ETAG } });
    http
      .expectOne(`${B}/v1/casos/${C}/rubrica`)
      .flush({ code: 'RUBRIC_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    http
      .expectOne(`${B}/v1/casos/${C2}/contenido`)
      .flush(contenido([], C2), { headers: { ETag: ETAG } });
    http
      .expectOne(`${B}/v1/casos/${C2}/rubrica`)
      .flush({ code: 'RUBRIC_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    expect(texto(f)).toContain('no tiene');
    expect(urlActual()).toContain(`caso=${C2}`);
  });

  it('sesiones procesa la ?ltima sesi?n solicitada durante una consulta', async () => {
    const s2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const f = await montarEn(PanelSesionesM4, `/?sesion=${S}`);
    const anterior = http.expectOne(`${B}/m4/sesiones/${S}`);
    await TestBed.inject(Router).navigateByUrl(`/?sesion=${s2}`);
    anterior.flush(sesionM4());
    http.expectOne(`${B}/m4/sesiones/${s2}`).flush({ ...sesionM4(), id: s2, titulo: 'Sesi?n B' });
    f.detectChanges();
    expect(texto(f)).toContain(s2);
    expect(urlActual()).toContain(`sesion=${s2}`);
  });

  it('convocatorias procesa la ?ltima sesi?n solicitada durante una consulta', async () => {
    const s2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const f = await montarEn(PanelConvocatoriasM4, `/?sesion=${S}`);
    const anterior = http.expectOne(`${B}/m4/sesiones/${S}`);
    await TestBed.inject(Router).navigateByUrl(`/?sesion=${s2}`);
    anterior.flush(sesionM4());
    http.expectOne(`${B}/m4/sesiones/${s2}`).flush({ ...sesionM4(), id: s2, titulo: 'Sesi?n B' });
    http.expectOne(`${B}/m4/sesiones/${s2}/convocatorias`).flush([]);
    f.detectChanges();
    expect(texto(f)).toContain('Convocatorias de');
    expect(urlActual()).toContain(`sesion=${s2}`);
  });

  it('casos no conserva el detalle anterior si la nueva lectura falla', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    http.expectOne(`${B}/v1/casos/${C}`).flush(caso(), { headers: { ETag: ETAG } });
    f.detectChanges();
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    http
      .expectOne(`${B}/v1/casos/${C2}`)
      .flush({ code: 'CASE_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    expect(boton(f, 'Guardar cambios')).toBeUndefined();
    expect(urlActual()).toContain(`caso=${C2}`);
  });

  it('contenido oculta el caso anterior al cambiar de identificador', async () => {
    const f = await montarEn(PanelContenidoM3, `/?caso=${C}`);
    http
      .expectOne(`${B}/v1/casos/${C}/contenido`)
      .flush({ ...contenido([], C), titulo: 'Caso anterior' }, { headers: { ETag: ETAG } });
    f.detectChanges();
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    const siguiente = http.expectOne(`${B}/v1/casos/${C2}/contenido`);
    f.detectChanges();
    expect(el(f).querySelector('[data-prueba="contenido-caso"]')).toBeNull();
    siguiente.flush(contenido([], C2), { headers: { ETag: ETAG } });
  });

  it('casos oculta el detalle anterior cuando cambia la URL durante una lectura', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    http.expectOne(`${B}/v1/casos/${C}`).flush(caso(), { headers: { ETag: ETAG } });
    f.detectChanges();
    escribir(f, 'input[formControlName="idCaso"]', C);
    el(f).querySelectorAll('form')[1].dispatchEvent(new Event('submit'));
    const anterior = http.expectOne(`${B}/v1/casos/${C}`);
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    f.detectChanges();
    expect(boton(f, 'Guardar cambios')).toBeUndefined();
    anterior.flush(caso(), { headers: { ETag: ETAG } });
    http.expectOne(`${B}/v1/casos/${C2}`).flush(caso('BORRADOR', C2), { headers: { ETag: ETAG } });
  });

  it('casos mantiene A en una secuencia A-B-A', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    const anterior = http.expectOne(`${B}/v1/casos/${C}`);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/?caso=${C2}`);
    await router.navigateByUrl(`/?caso=${C}`);
    anterior.flush(caso(), { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(texto(f)).toContain('Caso FE-55');
    expect(urlActual()).toContain(`caso=${C}`);
    http.expectNone(`${B}/v1/casos/${C2}`);
  });

  it('casos invalida la seleccion pendiente al retirar el parametro', async () => {
    await montarEn(PanelCasosM3, `/?caso=${C}`);
    const anterior = http.expectOne(`${B}/v1/casos/${C}`);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/?caso=${C2}`);
    await router.navigateByUrl('/');
    anterior.flush(caso(), { headers: { ETag: ETAG } });
    http.expectNone(`${B}/v1/casos/${C2}`);
    expect(router.url).toBe('/');
  });

  it('casos ignora el error anterior y carga la ultima seleccion', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    const anterior = http.expectOne(`${B}/v1/casos/${C}`);
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    anterior.flush({ code: 'CASE_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${B}/v1/casos/${C2}`).flush(caso('BORRADOR', C2), { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(urlActual()).toContain(`caso=${C2}`);
    expect(texto(f)).not.toContain('HTTP 404');
  });

  it('destruir el panel cancela la lectura y no inicia la pendiente', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    const anterior = http.expectOne(`${B}/v1/casos/${C}`);
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    f.destroy();
    expect(anterior.cancelled).toBeTrue();
    http.expectNone(`${B}/v1/casos/${C2}`);
  });

  it('no duplica una escritura mientras cambia la seleccion', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    http.expectOne(`${B}/v1/casos/${C}`).flush(caso(), { headers: { ETag: ETAG } });
    f.detectChanges();
    escribir(f, 'input[formControlName="titulo"]', 'Caso nuevo');
    el(f).querySelectorAll('form')[0].dispatchEvent(new Event('submit'));
    const post = http.expectOne({ method: 'POST', url: `${B}/v1/casos` });
    const creado = post.request.body.idCaso as string;
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    post.flush({ idCaso: creado, estado: 'BORRADOR' }, { status: 201, statusText: 'Created' });
    http
      .expectOne(`${B}/v1/casos/${creado}`)
      .flush(caso('BORRADOR', creado), { headers: { ETag: ETAG } });
    http.expectOne(`${B}/v1/casos/${C2}`).flush(caso('BORRADOR', C2), { headers: { ETag: ETAG } });
    http.expectNone({ method: 'POST', url: `${B}/v1/casos` });
    expect(urlActual()).toContain(`caso=${C2}`);
  });

  it('convocatorias invalida la sesion pendiente cuando la URL es invalida', async () => {
    const s2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const f = await montarEn(PanelConvocatoriasM4, `/?sesion=${S}`);
    const anterior = http.expectOne(`${B}/m4/sesiones/${S}`);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/?sesion=${s2}`);
    await router.navigateByUrl('/?sesion=invalida');
    anterior.flush(sesionM4());
    f.detectChanges();
    http.expectNone(`${B}/m4/sesiones/${s2}`);
    http.expectNone(`${B}/m4/sesiones/${S}/convocatorias`);
    expect(texto(f)).not.toContain('Convocatorias de');
  });

  it('sesiones limpia el caso del formulario si la URL se invalida', async () => {
    const f = await montarEn(PanelSesionesM4, `/?caso=${C}`);
    await TestBed.inject(Router).navigateByUrl('/?caso=invalido');
    f.detectChanges();
    expect((el(f).querySelector('input[formControlName="casoId"]') as HTMLInputElement).value).toBe(
      '',
    );
    http.expectNone(() => true);
  });

  it('sesiones actualiza el caso cuando cambia la URL aun si el campo estaba editado', async () => {
    const f = await montarEn(PanelSesionesM4, `/?caso=${C}`);
    escribir(f, 'input[formControlName="casoId"]', C);
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    f.detectChanges();
    expect((el(f).querySelector('input[formControlName="casoId"]') as HTMLInputElement).value).toBe(
      C2,
    );
  });

  it('casos no procesa un identificador pendiente tras una URL invalida', async () => {
    await montarEn(PanelCasosM3, `/?caso=${C}`);
    const anterior = http.expectOne(`${B}/v1/casos/${C}`);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/?caso=${C2}`);
    await router.navigateByUrl('/?caso=invalido');
    anterior.flush(caso(), { headers: { ETag: ETAG } });
    http.expectNone(`${B}/v1/casos/${C2}`);
  });

  it('casos procesa la selecci?n m?s reciente durante una consulta', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    const solicitudA = http.expectOne(`${B}/v1/casos/${C}`);
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    solicitudA.flush(caso('BORRADOR', C), { headers: { ETag: ETAG } });
    const solicitudB = http.expectOne(`${B}/v1/casos/${C2}`);
    solicitudB.flush({ ...caso('BORRADOR', C2), titulo: 'Caso B' }, { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(texto(f)).toContain('Caso B');
    expect(urlActual()).toContain(`caso=${C2}`);
  });

  it('casos: ?caso consulta el caso en el servidor y orienta el siguiente paso', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    http.expectOne(`${B}/v1/casos/${C}`).flush(caso(), { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(texto(f)).toContain('Caso FE-55');
    expect(el(f).querySelector('[data-prueba="siguiente-paso"]')?.textContent).toContain(
      'Contenido del caso',
    );
  });

  it('casos: un ?caso inválido no genera solicitudes', async () => {
    await montarEn(PanelCasosM3, '/?caso=1%20OR%201=1');
    http.expectNone(() => true);
  });

  it('casos: tras crear y releer, el caso queda en la URL para los demás paneles', async () => {
    const f = await montarEn(PanelCasosM3, '/');
    escribir(f, 'input[formControlName="titulo"]', 'Caso FE-55');
    el(f).querySelectorAll('form')[0].dispatchEvent(new Event('submit'));
    const post = http.expectOne({ method: 'POST', url: `${B}/v1/casos` });
    const id = post.request.body.idCaso as string;
    post.flush({ idCaso: id, estado: 'BORRADOR' }, { status: 201, statusText: 'Created' });
    http.expectOne(`${B}/v1/casos/${id}`).flush(caso('BORRADOR', id), { headers: { ETag: ETAG } });
    await f.whenStable();
    expect(urlActual()).toBe(`/?caso=${id}`);
    // El cambio de URL lo originó el propio panel: no se repite la consulta.
    http.expectNone(`${B}/v1/casos/${id}`);
  });

  it('casos: un caso publicado orienta hacia la programación de sesiones', async () => {
    const f = await montarEn(PanelCasosM3, `/?caso=${C}`);
    http.expectOne(`${B}/v1/casos/${C}`).flush(caso('PUBLICADO'), { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(el(f).querySelector('[data-prueba="siguiente-paso"]')?.textContent).toContain(
      'programarse una sesión',
    );
  });

  it('contenido: sigue el caso de la URL y lo recarga al cambiar', async () => {
    const f = await montarEn(PanelContenidoM3, `/?caso=${C}`);
    http.expectOne(`${B}/v1/casos/${C}/contenido`).flush(contenido(), { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(texto(f)).toContain('Pregunta FE-55');
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C2}`);
    http
      .expectOne(`${B}/v1/casos/${C2}/contenido`)
      .flush(
        { ...contenido([{ esCorrecta: true }], C2), titulo: 'Otro caso' },
        { headers: { ETag: ETAG } },
      );
    f.detectChanges();
    expect(texto(f)).toContain('Otro caso');
  });

  it('contenido: si otro panel lee un estado distinto, bloquea las altas hasta recargar', async () => {
    const f = await montarEn(PanelContenidoM3, `/?caso=${C}`);
    http.expectOne(`${B}/v1/casos/${C}/contenido`).flush(contenido(), { headers: { ETag: ETAG } });
    f.detectChanges();
    expect(boton(f, 'Añadir escenario')).toBeDefined();
    // Simula la relectura del panel de casos tras una publicación aceptada.
    TestBed.inject(CasosSesionStore).recordar(caso('PUBLICADO'));
    f.detectChanges();
    expect(el(f).querySelector('[data-prueba="estado-desactualizado"]')?.textContent).toContain(
      'PUBLICADO',
    );
    expect(boton(f, 'Añadir escenario')).toBeUndefined();
    http.expectNone(() => true);
    boton(f, 'Recargar contenido')!.click();
    http
      .expectOne(`${B}/v1/casos/${C}/contenido`)
      .flush({ ...contenido(), estado: 'PUBLICADO' }, { headers: { ETag: '"m3-v2:def"' } });
    f.detectChanges();
    expect(el(f).querySelector('[data-prueba="estado-desactualizado"]')).toBeNull();
    expect(texto(f)).toContain('el servidor no admite añadir contenido');
  });

  for (const [opciones, esperado] of [
    [[{ esCorrecta: false }, { esCorrecta: false }], 'ninguna opción marcada como correcta'],
    [[{ esCorrecta: true }, { esCorrecta: true }], 'más de una opción marcada como correcta'],
  ] as const) {
    it(`contenido: informa «${esperado}» sin bloquear (lo valida el servidor)`, async () => {
      const f = await montarEn(PanelContenidoM3, `/?caso=${C}`);
      http
        .expectOne(`${B}/v1/casos/${C}/contenido`)
        .flush(contenido([...opciones]), { headers: { ETag: ETAG } });
      f.detectChanges();
      expect(el(f).querySelector('[data-prueba="observaciones"]')?.textContent).toContain(esperado);
      expect(texto(f)).toContain('exactamente una correcta');
      expect(boton(f, 'Añadir opción')).toBeDefined();
    });
  }

  it('rúbrica: ?caso carga contenido y rúbrica con la misma versión', async () => {
    const f = await montarEn(PanelRubricaM3, `/?caso=${C}`);
    http.expectOne(`${B}/v1/casos/${C}/contenido`).flush(contenido(), { headers: { ETag: ETAG } });
    http
      .expectOne(`${B}/v1/casos/${C}/rubrica`)
      .flush({ code: 'RUBRIC_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    expect(texto(f)).toContain('todavía no tiene rúbrica');
    expect(texto(f)).toContain('Pregunta FE-55');
  });

  it('sesiones: ?caso solo rellena el campo y separa los casos no publicados', async () => {
    configurar();
    TestBed.inject(CasosSesionStore).recordar({ ...caso('BORRADOR', C2), titulo: 'Borrador' });
    TestBed.inject(CasosSesionStore).recordar({ ...caso('PUBLICADO'), titulo: 'Publicado' });
    await TestBed.inject(Router).navigateByUrl(`/?caso=${C}`);
    const f = TestBed.createComponent(PanelSesionesM4);
    f.detectChanges();
    http.expectNone(() => true);
    const campo = el(f).querySelector('input[formControlName="casoId"]') as HTMLInputElement;
    expect(campo.value).toBe(C);
    expect(el(f).querySelector('[data-prueba="casos-publicados"]')?.textContent).toContain(
      'Publicado',
    );
    expect(el(f).querySelector('[data-prueba="casos-publicados"]')?.textContent).not.toContain(
      'Borrador',
    );
    expect(el(f).querySelector('[data-prueba="casos-no-publicados"]')?.textContent).toContain(
      'Borrador · BORRADOR',
    );
  });

  it('sesiones: ?sesion consulta la sesión y la creación deja la nueva sesión en la URL', async () => {
    const f = await montarEn(PanelSesionesM4, `/?sesion=${S}`);
    http.expectOne(`${B}/m4/sesiones/${S}`).flush(sesionM4());
    f.detectChanges();
    expect(texto(f)).toContain(S);

    const nueva = { ...sesionM4(), id: C2, titulo: 'Nueva' };
    escribir(f, 'input[formControlName="casoId"]', C);
    escribir(f, 'input[formControlName="titulo"]', 'Nueva');
    escribir(f, 'input[formControlName="fechaInicio"]', '2026-12-01T10:00');
    escribir(f, 'input[formControlName="fechaFin"]', '2026-12-01T12:00');
    const formCrear = [...el(f).querySelectorAll('form')].find((x) =>
      x.textContent?.includes('Programar sesión'),
    )!;
    formCrear.dispatchEvent(new Event('submit'));
    http.expectOne({ method: 'POST', url: `${B}/m4/sesiones` }).flush(nueva);
    http.expectOne(`${B}/m4/sesiones`).flush([sesionM4(), nueva]);
    await f.whenStable();
    expect(urlActual()).toBe(`/?sesion=${C2}`);
    http.expectNone(`${B}/m4/sesiones/${C2}`);
  });

  it('sesiones: traduce M4-CASO-NO-PUBLICADO sin simular una sesión válida', async () => {
    const f = await montarEn(PanelSesionesM4, '/');
    escribir(f, 'input[formControlName="casoId"]', C);
    escribir(f, 'input[formControlName="titulo"]', 'Nueva');
    escribir(f, 'input[formControlName="fechaInicio"]', '2026-12-01T10:00');
    escribir(f, 'input[formControlName="fechaFin"]', '2026-12-01T12:00');
    const formCrear = [...el(f).querySelectorAll('form')].find((x) =>
      x.textContent?.includes('Programar sesión'),
    )!;
    formCrear.dispatchEvent(new Event('submit'));
    http
      .expectOne({ method: 'POST', url: `${B}/m4/sesiones` })
      .flush({ code: 'M4-CASO-NO-PUBLICADO' }, { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(texto(f)).toContain('solo se programan casos publicados');
    expect(texto(f)).toContain('HTTP 409 · M4-CASO-NO-PUBLICADO');
    expect(urlActual()).toBe('/');
  });

  it('convocatorias: ?sesion vuelve a consultar la sesión y sus convocados', async () => {
    const f = await montarEn(PanelConvocatoriasM4, `/?sesion=${S}`);
    http.expectOne(`${B}/m4/sesiones/${S}`).flush(sesionM4());
    http.expectOne(`${B}/m4/sesiones/${S}/convocatorias`).flush([]);
    f.detectChanges();
    expect(texto(f)).toContain('Sesión FE-55');
    expect(texto(f)).toContain('no tiene estudiantes convocados');
  });

  it('convocatorias: muestra la duplicidad publicada por M4', async () => {
    const f = await montarEn(PanelConvocatoriasM4, `/?sesion=${S}`);
    http.expectOne(`${B}/m4/sesiones/${S}`).flush(sesionM4());
    http.expectOne(`${B}/m4/sesiones/${S}/convocatorias`).flush([]);
    f.detectChanges();
    escribir(f, 'input[formControlName="estudianteId"]', EST);
    el(f).querySelector('form')!.dispatchEvent(new Event('submit'));
    http
      .expectOne({ method: 'POST', url: `${B}/m4/sesiones/${S}/convocatorias` })
      .flush({ code: 'M4-CONVOCATORIA-DUPLICADA' }, { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(texto(f)).toContain('ya está convocado');
  });

  it('convocatorias: una sesión ajena o inexistente no se presenta', async () => {
    const f = await montarEn(PanelConvocatoriasM4, `/?sesion=${S}`);
    http
      .expectOne(`${B}/m4/sesiones/${S}`)
      .flush({ code: 'M4-SESION-AJENA' }, { status: 403, statusText: 'Forbidden' });
    f.detectChanges();
    expect(texto(f)).toContain('pertenece a otro docente');
    expect(texto(f)).not.toContain('Sesión FE-55');
    http.expectNone(`${B}/m4/sesiones/${S}/convocatorias`);
  });
});

@Component({ template: '' })
class Vacia {}

describe('FE-55 RecorridoDocente (componente)', () => {
  async function montarRecorrido(url: string, etapa = 'sesiones') {
    configurar([{ path: '**', component: Vacia }]);
    await TestBed.inject(Router).navigateByUrl(url);
    const f = TestBed.createComponent(RecorridoDocente);
    f.componentRef.setInput('etapa', etapa);
    f.detectChanges();
    return f;
  }
  const enlaces = (f: ComponentFixture<unknown>) =>
    [...el(f).querySelectorAll('a')] as HTMLAnchorElement[];

  it('no se muestra sin sesión de personal válida', async () => {
    const f = await montarRecorrido(`/x?caso=${C}`);
    estado.set({ tipo: 'no-autenticada' } as EstadoSesionPersonal);
    f.detectChanges();
    expect(el(f).querySelector('nav')).toBeNull();
  });

  it('enlaza las pantallas existentes conservando solo identificadores válidos', async () => {
    const f = await montarRecorrido(`/x?caso=${C}&sesion=${S}&token=abc&aviso=permiso`);
    const lista = enlaces(f);
    expect(lista.map((a) => a.textContent?.trim())).toEqual([
      'Caso y contenido',
      'Rúbrica',
      'Publicación',
      'Sesión',
      'Convocatoria',
    ]);
    for (const a of lista) {
      const href = a.getAttribute('href')!;
      expect(href).toContain(`caso=${C}`);
      expect(href).toContain(`sesion=${S}`);
      expect(href).not.toContain('token');
      expect(href).not.toContain('aviso');
    }
    expect(lista.filter((a) => a.getAttribute('aria-current') === 'step').length).toBe(1);
    expect(lista[3].getAttribute('aria-current')).toBe('step');
    // DC-FE-UX-ROLES-24: sin lectura del servidor no se muestran identificadores técnicos.
    expect(el(f).querySelector('[data-prueba="contexto-recorrido"]')).toBeNull();
  });

  it('muestra el estado del caso solo si se leyó del servidor en esta sesión', async () => {
    const f = await montarRecorrido(`/x?caso=${C}`, 'casos');
    TestBed.inject(CasosSesionStore).recordar(caso('PUBLICADO'));
    f.detectChanges();
    expect(el(f).querySelector('[data-prueba="contexto-recorrido"]')?.textContent).toContain(
      'Caso FE-55 · PUBLICADO',
    );
    expect(enlaces(f)[0].getAttribute('href')).toBe(`/dashboard/casos-academicos?caso=${C}`);
  });

  it('sin parámetros válidos los enlaces no llevan identificadores', async () => {
    const f = await montarRecorrido('/x?caso=no-uuid');
    expect(enlaces(f)[0].getAttribute('href')).toBe('/dashboard/casos-academicos');
    expect(el(f).querySelector('[data-prueba="contexto-recorrido"]')).toBeNull();
  });
});

describe('FE-55 el recorrido no eleva privilegios (configuración de rutas y guard)', () => {
  it('cada paso apunta a una ruta del dashboard protegida por el guard de mapeo', () => {
    const hijos = (DASHBOARD_ROUTES[0].children ?? []) as Route[];
    for (const paso of PASOS_RECORRIDO) {
      const segmento = paso.ruta.replace('/dashboard/', '');
      const ruta = hijos.find((r) => r.path === segmento);
      expect(ruta).withContext(paso.ruta).toBeDefined();
      expect(ruta!.canActivate).withContext(paso.ruta).toContain(requiereMapeoPersonalQa);
    }
  });

  it('con sesión real simulada y mapeo pendiente, el enlace del recorrido se redirige', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Vacia },
          {
            path: 'dashboard',
            children: [
              { path: '', component: Vacia },
              { path: 'sesiones', canActivate: [requiereMapeoPersonalQa], component: Vacia },
            ],
          },
        ]),
        provideApiConfig(B),
        provideHttpClient(withInterceptors([personalM1Interceptor])),
        provideHttpClientTesting(),
        provideM1PersonalLocal(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const respuesta = {
      accessToken: 'token-prueba',
      tokenType: 'Bearer',
      userId: YO,
      correo: 'docente@example.invalid',
      nombre: 'Docente prueba',
      rol: 'DOCENTE',
      permisos: ['GESTIONAR_SESION', 'CONSULTAR_CASO'],
      authPrototype: 'TD-M1-AUTH-PROVISIONAL',
    };
    TestBed.inject(SesionPersonalM1)
      .autenticar({ correo: respuesta.correo, password: 'solo-prueba' })
      .subscribe();
    http.expectOne(`${B}/v1/personal/autenticar`).flush(respuesta);
    http.expectOne(`${B}/v1/personal/me`).flush({ ...respuesta, accessToken: null });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/dashboard/sesiones?caso=${C}&sesion=${S}`);
    expect(router.url).toBe('/dashboard?aviso=habilitacion-pendiente');
  });
});
