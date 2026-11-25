import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfig } from '../../core/config/api.config';
import { provideM1PersonalLocal } from '../autenticacion/m1-personal-http';
import { CredencialPersonalMemoria } from '../autenticacion/m1-personal-memoria';
import { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { FalloAcademico, personalAcademicoInterceptor } from './academico-http';
import { CapacidadesBackendDc99, provideCapacidadesDc99 } from './capacidades-dc99';
import { GUARDAR_ARCHIVO, PanelParticipacionesDc92 } from './panel-participaciones-dc92';
import { PanelSesionesM4 } from './panel-sesiones-m4';
import {
  FilaParticipacion,
  leerFilaParticipacion,
  mensajeFalloParticipaciones,
  nombreDesdeCabecera,
  ParticipacionesDc92Api,
  ReporteDescargado,
} from './participaciones-dc92.api';

/**
 * FE-61 Fase 2 · DD-09 / DD-11. Todas las respuestas son DOBLES HTTP con la forma de
 * `ParticipacionesDocenteController` (`VistaParticipacionDc92.Fila`), `ErroresDc92` y
 * `ReporteParticipacionController` (Backend DC-99 32922bb). No hay Backend DC-99 QA con esos
 * interruptores ni el esquema DC-92: estas pruebas NO son E2E.
 */
const B = '/api-prueba';
const S = '33333333-3333-4333-8333-333333333333';
const C1 = '44444444-4444-4444-8444-444444444444';
const C2 = '55555555-5555-4555-8555-555555555555';
const E1 = '66666666-6666-4666-8666-666666666666';
const E2 = '77777777-7777-4777-8777-777777777777';
const P1 = '88888888-8888-4888-8888-888888888888';
const I1 = '99999999-9999-4999-8999-999999999999';
const URL_DD09 = `${B}/v1/docente/sesiones/${S}/participaciones`;
const URL_DD11 = `${B}/v1/docente/sesiones/${S}/reporte-participacion`;
// Doble de prueba; no es una credencial real.
const TOKEN = 'token-de-prueba-no-real';

/** Fila con nota publicada (PARTICIPACION_FINALIZADA / PUBLICADA). Datos ficticios. */
const PUBLICADA = {
  idConvocatoria: C1,
  idEstudiante: E1,
  nombreEstudiante: 'Estudiante Uno QA',
  caso: 'Caso QA',
  sesion: 'Sesión QA',
  fechaSesion: '2026-12-01T14:00:00Z',
  estadoConvocatoria: 'Autorizado',
  fechaRetiro: null,
  idParticipacion: P1,
  fechaIngreso: '2026-12-01T14:05:00Z',
  numeroIntentos: 1,
  estadoParticipacion: 'PARTICIPACION_FINALIZADA',
  idIntentoConsiderado: I1,
  inicioIntento: '2026-12-01T14:05:00Z',
  finIntento: '2026-12-01T14:35:00Z',
  estadoEvaluacion: 'PUBLICADA',
  calificacionPublicada: 4.5,
  fechaPublicacion: '2026-12-02T10:00:00Z',
};
/** Fila de un convocado sin participación. */
const CONVOCADO = {
  idConvocatoria: C2,
  idEstudiante: E2,
  nombreEstudiante: null,
  caso: 'Caso QA',
  sesion: 'Sesión QA',
  fechaSesion: '2026-12-01T14:00:00Z',
  estadoConvocatoria: 'Autorizado',
  fechaRetiro: null,
  idParticipacion: null,
  fechaIngreso: null,
  numeroIntentos: 0,
  estadoParticipacion: 'CONVOCADO',
  idIntentoConsiderado: null,
  inicioIntento: null,
  finIntento: null,
  estadoEvaluacion: 'SIN_INTENTOS',
  calificacionPublicada: null,
  fechaPublicacion: null,
};
const csv = () =>
  new Blob(['\ufeffid_estudiante,nombre_estudiante\r\n'], { type: 'text/csv;charset=UTF-8' });
const errorJson = (cuerpo: unknown) =>
  new Blob([JSON.stringify(cuerpo)], { type: 'application/json' });

/**
 * Cuerpo de error JSON como Blob (así llega con `responseType: 'blob'`) cuya lectura se puede
 * esperar de forma determinista. El servicio lo lee con `Blob.text()`, que el navegador resuelve
 * asíncronamente y sin plazo fijo. `TestRequest.flush` entrega este mismo Blob como cuerpo del
 * error, y el servicio se suscribe a su promesa de lectura antes de que la prueba la espere. Por
 * eso, cuando `lectura()` se resuelve, el manejador del servicio ya se ejecutó: el error ya llegó
 * al componente. No hay temporizadores ni número fijo de ciclos.
 */
function errorJsonObservado(cuerpo: unknown): { blob: Blob; lectura: () => Promise<string> } {
  const blob = errorJson(cuerpo);
  const leer = blob.text.bind(blob);
  let pendiente: Promise<string> | null = null;
  spyOn(blob, 'text').and.callFake(() => (pendiente = leer()));
  return {
    blob,
    lectura: () => {
      if (!pendiente) throw new Error('El servicio no leyó el cuerpo de error del reporte.');
      return pendiente;
    },
  };
}

describe('FE-61 DD-09 DTO VistaParticipacionDc92.Fila', () => {
  it('lee la fila con todos los campos del contrato, sin añadir otros', () => {
    const f = leerFilaParticipacion({ ...PUBLICADA, extra: 'ignorado' });
    expect(f).toEqual(PUBLICADA as FilaParticipacion);
    expect(Object.keys(f)).not.toContain('extra');
  });

  it('acepta los nulos del contrato (convocado sin participación)', () => {
    expect(leerFilaParticipacion(CONVOCADO)).toEqual(CONVOCADO as FilaParticipacion);
  });

  it('rechaza identificadores que no son UUID y conteos inválidos', () => {
    for (const malo of [
      { ...PUBLICADA, idConvocatoria: 'x' },
      { ...PUBLICADA, idParticipacion: 'no-uuid' },
      { ...PUBLICADA, idIntentoConsiderado: 7 },
      { ...PUBLICADA, numeroIntentos: -1 },
      { ...PUBLICADA, numeroIntentos: 1.5 },
      { ...PUBLICADA, estadoParticipacion: '' },
    ])
      expect(() => leerFilaParticipacion(malo)).toThrowError(FalloAcademico);
  });

  it('nunca acepta una nota que el servidor no declara publicada', () => {
    expect(() =>
      leerFilaParticipacion({ ...PUBLICADA, estadoEvaluacion: 'EVALUADA_NO_PUBLICADA' }),
    ).toThrowError(FalloAcademico);
    expect(() =>
      leerFilaParticipacion({ ...PUBLICADA, calificacionPublicada: '4.5' }),
    ).toThrowError(FalloAcademico);
  });

  it('solo toma nombres de archivo CSV simples de Content-Disposition', () => {
    expect(nombreDesdeCabecera(`attachment; filename="participacion-sesion-${S}.csv"`)).toBe(
      `participacion-sesion-${S}.csv`,
    );
    expect(nombreDesdeCabecera('attachment; filename="../x.csv"')).toBeNull();
    expect(nombreDesdeCabecera('attachment; filename="x.exe"')).toBeNull();
    expect(nombreDesdeCabecera(null)).toBeNull();
  });
});

describe('FE-61 DD-09/DD-11 ParticipacionesDc92Api (doble HTTP)', () => {
  let http: HttpTestingController;
  let api: ParticipacionesDc92Api;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ParticipacionesDc92Api);
  });
  afterEach(() => http.verify());

  it('sesión válida: GET sin cuerpo ni parámetros y lectura de {items}', () => {
    let filas: FilaParticipacion[] | undefined;
    api.participaciones(S).subscribe((f) => (filas = f));
    const req = http.expectOne({ method: 'GET', url: URL_DD09 });
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [PUBLICADA, CONVOCADO] });
    expect(filas?.map((f) => f.idParticipacion)).toEqual([P1, null]);
    expect(filas?.[0].idIntentoConsiderado).toBe(I1);
  });

  it('sesión sin participaciones: lista vacía', () => {
    let filas: FilaParticipacion[] | undefined;
    api.participaciones(S).subscribe((f) => (filas = f));
    http.expectOne(URL_DD09).flush({ items: [] });
    expect(filas).toEqual([]);
  });

  it('respuesta sin envoltorio items: fallo, no lista vacía', () => {
    let error: unknown;
    api.participaciones(S).subscribe({ error: (e) => (error = e) });
    http.expectOne(URL_DD09).flush([PUBLICADA]);
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('conserva estado y código de 401, 403 y 404', () => {
    const casos: [number, string][] = [
      [401, 'UNAUTHENTICATED'],
      [403, 'M4-SESION-AJENA'],
      [403, 'M4-SIN-PERMISO'],
      [404, 'M4-SESION-NO-ENCONTRADA'],
    ];
    const errores: FalloAcademico[] = [];
    for (const [estado, code] of casos) {
      api.participaciones(S).subscribe({ error: (e) => errores.push(e) });
      http.expectOne(URL_DD09).flush({ code, message: 'x' }, { status: estado, statusText: 'x' });
    }
    expect(errores.map((e) => [e.estado, e.codigo])).toEqual(casos);
  });

  it('no hace HTTP con un identificador de sesión inválido', () => {
    let error: unknown;
    api.participaciones('no-uuid').subscribe({ error: (e) => (error = e) });
    api.reporte('no-uuid').subscribe({ error: () => undefined });
    http.expectNone(() => true);
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('DD-11: devuelve el Blob del servidor sin modificarlo y usa el nombre del Backend', () => {
    let r: ReporteDescargado | undefined;
    const cuerpo = csv();
    api.reporte(S).subscribe((x) => (r = x));
    const req = http.expectOne({ method: 'GET', url: URL_DD11 });
    expect(req.request.responseType).toBe('blob');
    req.flush(cuerpo, { headers: { 'Content-Type': 'text/csv;charset=UTF-8' } });
    expect(r?.contenido).toBe(cuerpo);
    // Sin Content-Disposition legible (CORS): el mismo nombre que fija ReporteParticipacionService.
    expect(r?.nombreArchivo).toBe(`participacion-sesion-${S}.csv`);
  });

  it('DD-11: reporte vacío (solo BOM y cabecera) se entrega tal cual, sin filas añadidas', async () => {
    let r: ReporteDescargado | undefined;
    // Forma de `ReporteParticipacionCsv` para una sesión sin convocatorias: BOM + 10 columnas + CRLF.
    const cabecera =
      'id_estudiante,nombre_estudiante,caso,sesion,fecha_sesion,estado_convocatoria,' +
      'estado_participacion,numero_intentos,estado_evaluacion,calificacion_publicada\r\n';
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(cabecera)]);
    const cuerpo = new Blob([bytes], { type: 'text/csv;charset=UTF-8' });
    api.reporte(S).subscribe((x) => (r = x));
    http
      .expectOne(URL_DD11)
      .flush(cuerpo, { headers: { 'Content-Type': 'text/csv;charset=UTF-8' } });
    expect(r?.contenido).toBe(cuerpo);
    // Byte a byte (Blob.text() descartaría el BOM al decodificar): BOM conservado, sin filas.
    expect(new Uint8Array(await r!.contenido.arrayBuffer())).toEqual(bytes);
    expect(cabecera.split(',').length).toBe(10);
  });

  it('DD-11: usa Content-Disposition cuando es legible', () => {
    let r: ReporteDescargado | undefined;
    api.reporte(S).subscribe((x) => (r = x));
    http.expectOne(URL_DD11).flush(csv(), {
      headers: {
        'Content-Type': 'text/csv;charset=UTF-8',
        'Content-Disposition': 'attachment; filename="participacion-sesion-otro.csv"',
      },
    });
    expect(r?.nombreArchivo).toBe('participacion-sesion-otro.csv');
  });

  it('DD-11: un 200 que no es CSV no se acepta como reporte', () => {
    let error: unknown;
    api.reporte(S).subscribe({ error: (e) => (error = e) });
    http.expectOne(URL_DD11).flush(new Blob(['<html>'], { type: 'text/html' }), {
      headers: { 'Content-Type': 'text/html' },
    });
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('DD-11: el error JSON llega como Blob y se conserva su código', async () => {
    const error = new Promise<FalloAcademico>((ok) =>
      api.reporte(S).subscribe({ error: (e) => ok(e) }),
    );
    http.expectOne(URL_DD11).flush(errorJson({ code: 'M4-SESION-AJENA', message: 'x' }), {
      status: 403,
      statusText: 'x',
    });
    const f = await error;
    expect([f.estado, f.codigo]).toEqual([403, 'M4-SESION-AJENA']);
  });
});

describe('FE-61 DD-09/DD-11 mensajes', () => {
  const m = (status: number, error: unknown, tipo: 'consulta' | 'reporte' = 'consulta') =>
    mensajeFalloParticipaciones(new HttpErrorResponse({ status, error }), tipo);
  it('distingue interruptor apagado, titularidad, permiso, inexistencia y sesión vencida', () => {
    expect(m(404, null)).toContain('no tiene habilitada la consulta');
    expect(m(404, null, 'reporte')).toContain('no tiene habilitado el reporte');
    expect(m(404, { code: 'M4-SESION-NO-ENCONTRADA' })).toContain('no existe');
    expect(m(403, { code: 'M4-SESION-AJENA' })).toContain('otro docente');
    expect(m(403, { code: 'M4-SIN-PERMISO' })).toContain('GESTIONAR_SESION');
    expect(m(401, { code: 'UNAUTHENTICATED' })).toContain('Inicia sesión');
    expect(m(400, { code: 'VALIDACION', message: 'interno' })).not.toContain('interno');
  });
});

describe('FE-61 DD-09/DD-11 transporte de credencial', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideApiConfig(B),
        provideM1PersonalLocal(),
        provideHttpClient(withInterceptors([personalAcademicoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(CredencialPersonalMemoria).guardar(TOKEN);
  });
  afterEach(() => http.verify());

  it('ambas rutas llevan Bearer de personal y no cookies; un 401 limpia la credencial', () => {
    const api = TestBed.inject(ParticipacionesDc92Api);
    api.participaciones(S).subscribe({ error: () => undefined });
    api.reporte(S).subscribe({ error: () => undefined });
    const consulta = http.expectOne(URL_DD09);
    const reporte = http.expectOne(URL_DD11);
    for (const r of [consulta, reporte]) {
      expect(r.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      expect(r.request.withCredentials).toBeFalse();
    }
    consulta.flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'x' });
    reporte.flush(errorJson({ code: 'UNAUTHENTICATED' }), { status: 401, statusText: 'x' });
    expect(TestBed.inject(CredencialPersonalMemoria).leerParaHttp()).toBeNull();
  });
});

describe('FE-61 DD-09/DD-11 PanelParticipacionesDc92', () => {
  let http: HttpTestingController;
  let estado: WritableSignal<EstadoSesionPersonal>;
  let guardados: { nombre: string; contenido: Blob }[];

  const valida = () =>
    ({
      tipo: 'valida',
      identidad: {
        userId: E1,
        correo: 'docente@example.invalid',
        nombre: 'Docente QA',
        rol: 'DOCENTE',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    }) as EstadoSesionPersonal;

  function montar(c: Partial<CapacidadesBackendDc99>): ComponentFixture<PanelParticipacionesDc92> {
    estado = signal(valida());
    guardados = [];
    TestBed.configureTestingModule({
      imports: [PanelParticipacionesDc92],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        provideCapacidadesDc99(c),
        { provide: SesionPersonalM1, useValue: { estado } },
        {
          provide: GUARDAR_ARCHIVO,
          useValue: (nombre: string, contenido: Blob) => guardados.push({ nombre, contenido }),
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PanelParticipacionesDc92);
    f.componentRef.setInput('idSesion', S);
    f.detectChanges();
    return f;
  }
  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const prueba = (f: ComponentFixture<unknown>, id: string) =>
    raiz(f).querySelector(`[data-prueba="${id}"]`);
  const boton = (f: ComponentFixture<unknown>, texto: string) =>
    [...raiz(f).querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as
      HTMLButtonElement | undefined;
  function pulsar(f: ComponentFixture<unknown>, texto: string): void {
    boton(f, texto)!.click();
    f.detectChanges();
  }

  afterEach(() => http.verify());

  it('restricción por entorno: sin capacidades no hay botones ni solicitudes', () => {
    const f = montar({});
    expect(prueba(f, 'participaciones-no-habilitado')).not.toBeNull();
    expect(raiz(f).querySelectorAll('button').length).toBe(0);
    http.expectNone(() => true);
  });

  it('solo DD-09 habilitada: consulta disponible y reporte marcado como no habilitado', () => {
    const f = montar({ consultaParticipaciones: true });
    expect(boton(f, 'Consultar participaciones')).toBeDefined();
    expect(boton(f, 'Descargar CSV')).toBeUndefined();
    expect(prueba(f, 'reporte-no-habilitado')).not.toBeNull();
  });

  it('acceso a pantalla: sin sesión de personal válida no ofrece acciones', () => {
    const f = montar({ consultaParticipaciones: true, reporteParticipacion: true });
    estado.set({ tipo: 'no-autenticada' } as EstadoSesionPersonal);
    f.detectChanges();
    expect(raiz(f).querySelectorAll('button').length).toBe(0);
    http.expectNone(() => true);
  });

  it('no consulta al montarse; carga, muestra filas e identificadores del servidor', () => {
    const f = montar({ consultaParticipaciones: true });
    http.expectNone(() => true);
    pulsar(f, 'Consultar participaciones');
    expect(prueba(f, 'participaciones-cargando')).not.toBeNull();
    expect(boton(f, 'Consultar participaciones')!.disabled).toBeTrue();
    http.expectOne(URL_DD09).flush({ items: [PUBLICADA, CONVOCADO] });
    f.detectChanges();
    expect(prueba(f, 'participaciones-cargando')).toBeNull();
    const tabla = raiz(f).querySelector('table')!.textContent ?? '';
    expect(tabla).toContain('Estudiante Uno QA');
    expect(tabla).toContain('Participación finalizada');
    expect(tabla).toContain('Publicada');
    expect(tabla).toContain(I1);
    expect(tabla).toContain('4.5');
    expect(tabla).toContain('Sin nombre registrado');
    expect(tabla).toContain('Sin intentos');
  });

  it('un estado no catalogado se muestra tal cual, sin inventar otro', () => {
    const f = montar({ consultaParticipaciones: true });
    pulsar(f, 'Consultar participaciones');
    http
      .expectOne(URL_DD09)
      .flush({ items: [{ ...CONVOCADO, estadoParticipacion: 'NUEVO_ESTADO' }] });
    f.detectChanges();
    expect(raiz(f).querySelector('table')!.textContent).toContain('NUEVO_ESTADO');
  });

  it('sesión sin participaciones: estado vacío; «Actualizar» vuelve a consultar', () => {
    const f = montar({ consultaParticipaciones: true });
    pulsar(f, 'Consultar participaciones');
    http.expectOne(URL_DD09).flush({ items: [] });
    f.detectChanges();
    expect(prueba(f, 'participaciones-vacio')).not.toBeNull();
    pulsar(f, 'Actualizar participaciones');
    http.expectOne(URL_DD09).flush({ items: [CONVOCADO] });
    f.detectChanges();
    expect(prueba(f, 'participaciones-vacio')).toBeNull();
    expect(raiz(f).querySelector('table')).not.toBeNull();
  });

  it('sesión inexistente (404), ajena (403) y 401: error comprensible sin tabla', () => {
    const f = montar({ consultaParticipaciones: true });
    const casos: [number, string, string][] = [
      [404, 'M4-SESION-NO-ENCONTRADA', 'no existe'],
      [403, 'M4-SESION-AJENA', 'otro docente'],
      [401, 'M4-NO-AUTENTICADO', 'Inicia sesión'],
    ];
    for (const [status, code, texto] of casos) {
      pulsar(f, 'participaciones');
      http.expectOne(URL_DD09).flush({ code, message: 'x' }, { status, statusText: 'x' });
      f.detectChanges();
      expect(prueba(f, 'participaciones-error')?.textContent).toContain(texto);
      expect(raiz(f).querySelector('table')).toBeNull();
    }
  });

  it('interruptor DD-09 apagado en el servidor (404 sin código)', () => {
    const f = montar({ consultaParticipaciones: true });
    pulsar(f, 'Consultar participaciones');
    http.expectOne(URL_DD09).flush(null, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    expect(prueba(f, 'participaciones-error')?.textContent).toContain('no tiene habilitada');
  });

  it('descarga CSV: solo tras pulsar, guarda el Blob del servidor con su nombre', () => {
    const f = montar({ reporteParticipacion: true });
    http.expectNone(() => true);
    expect(guardados).toEqual([]);
    pulsar(f, 'Descargar CSV');
    expect(boton(f, 'Generando CSV')!.disabled).toBeTrue();
    const cuerpo = csv();
    http
      .expectOne(URL_DD11)
      .flush(cuerpo, { headers: { 'Content-Type': 'text/csv;charset=UTF-8' } });
    f.detectChanges();
    expect(guardados.length).toBe(1);
    expect(guardados[0].nombre).toBe(`participacion-sesion-${S}.csv`);
    expect(guardados[0].contenido).toBe(cuerpo);
    expect(prueba(f, 'reporte-aviso')?.textContent).toContain('generado por el servidor');
  });

  it('error en descarga: no guarda nada y explica el motivo', async () => {
    const f = montar({ reporteParticipacion: true });
    pulsar(f, 'Descargar CSV');
    const ajena = errorJsonObservado({ code: 'M4-SESION-AJENA', message: 'x' });
    http.expectOne(URL_DD11).flush(ajena.blob, { status: 403, statusText: 'x' });
    await ajena.lectura();
    f.detectChanges();
    expect(guardados).toEqual([]);
    expect(boton(f, 'Descargar CSV')!.disabled).toBeFalse();
    expect(prueba(f, 'reporte-aviso')?.textContent).toContain('otro docente');
    expect(prueba(f, 'reporte-aviso')?.textContent).toContain('HTTP 403 · M4-SESION-AJENA');
    pulsar(f, 'Descargar CSV');
    const apagado = errorJsonObservado({});
    http.expectOne(URL_DD11).flush(apagado.blob, { status: 404, statusText: 'x' });
    await apagado.lectura();
    f.detectChanges();
    expect(guardados).toEqual([]);
    expect(prueba(f, 'reporte-aviso')?.textContent).toContain('no tiene habilitado el reporte');
    expect(prueba(f, 'reporte-aviso')?.textContent).toContain('HTTP 404');
  });

  it('cambiar de sesión descarta las participaciones de la anterior', () => {
    const f = montar({ consultaParticipaciones: true });
    pulsar(f, 'Consultar participaciones');
    http.expectOne(URL_DD09).flush({ items: [PUBLICADA] });
    f.detectChanges();
    expect(raiz(f).querySelector('table')).not.toBeNull();
    f.componentRef.setInput('idSesion', C1);
    f.detectChanges();
    expect(raiz(f).querySelector('table')).toBeNull();
    http.expectNone(() => true);
  });
});

describe('FE-61 DD-09 integración en el detalle de la sesión (PanelSesionesM4)', () => {
  it('la sección de participaciones aparece solo dentro del detalle de una sesión de M4', () => {
    const estado = signal({
      tipo: 'valida',
      identidad: {
        userId: E1,
        correo: 'docente@example.invalid',
        nombre: 'Docente QA',
        rol: 'DOCENTE',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    } as EstadoSesionPersonal);
    TestBed.configureTestingModule({
      imports: [PanelSesionesM4],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        { provide: SesionPersonalM1, useValue: { estado } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PanelSesionesM4);
    f.detectChanges();
    const raiz = f.nativeElement as HTMLElement;
    expect(raiz.querySelector('app-panel-participaciones-dc92')).toBeNull();
    [...raiz.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Consultar sesiones'))!
      .click();
    f.detectChanges();
    http.expectOne(`${B}/m4/sesiones`).flush([
      {
        id: S,
        casoId: C1,
        docenteId: E1,
        titulo: 'Sesión QA',
        mensajePersonalizado: null,
        fechaInicio: '2026-12-01T14:00:00Z',
        fechaFin: '2026-12-01T16:00:00Z',
        estado: 'Finalizado',
        creadoEn: null,
        fechaInicioReal: null,
        fechaFinReal: null,
        tiempoMaximoParticipacionSegundos: 1800,
        lugarFisico: null,
      },
    ]);
    f.detectChanges();
    [...raiz.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Ver detalle'))!
      .click();
    f.detectChanges();
    http.expectOne(`${B}/m4/sesiones/${S}`).flush({
      id: S,
      casoId: C1,
      docenteId: E1,
      titulo: 'Sesión QA',
      mensajePersonalizado: null,
      fechaInicio: '2026-12-01T14:00:00Z',
      fechaFin: '2026-12-01T16:00:00Z',
      estado: 'Finalizado',
      creadoEn: null,
      fechaInicioReal: null,
      fechaFinReal: null,
      tiempoMaximoParticipacionSegundos: 1800,
      lugarFisico: null,
    });
    f.detectChanges();
    const seccion = raiz.querySelector('app-panel-participaciones-dc92');
    expect(seccion).not.toBeNull();
    // Entorno real (sin capacidades): deshabilitada y sin solicitudes DD-09/DD-11.
    expect(seccion!.querySelector('[data-prueba="participaciones-no-habilitado"]')).not.toBeNull();
    http.expectNone((r) => r.url.includes('/v1/docente/'));
    http.verify();
  });
});
