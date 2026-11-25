import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { FalloAcademico } from './academico-http';
import { AdministracionM1Api } from './administracion-m1.api';
import { CasosM3Api } from './casos-m3.api';
import { SesionesM4Api } from './sesiones-m4.api';

const B = '/api-prueba';
const U = '11111111-1111-4111-8111-111111111111';
const C = '22222222-2222-4222-8222-222222222222';
const S = '33333333-3333-4333-8333-333333333333';
const E = '44444444-4444-4444-8444-444444444444';
const ETAG = '"m3-v2:abc"';

function configurar(): HttpTestingController {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
  });
  return TestBed.inject(HttpTestingController);
}

describe('FE-53-A AdministracionM1Api (doble HTTP)', () => {
  let http: HttpTestingController;
  let api: AdministracionM1Api;
  beforeEach(() => {
    http = configurar();
    api = TestBed.inject(AdministracionM1Api);
  });
  afterEach(() => http.verify());

  it('lee roles y permisos del envoltorio items', () => {
    let roles: unknown;
    let permisos: unknown;
    api.roles().subscribe((r) => (roles = r));
    api.permisos().subscribe((p) => (permisos = p));
    http
      .expectOne({ method: 'GET', url: `${B}/v1/admin/roles` })
      .flush({ items: [{ idRol: 1, nombre: 'ADMINISTRADOR' }] });
    http
      .expectOne({ method: 'GET', url: `${B}/v1/admin/permisos` })
      .flush({ items: [{ idPermiso: 5, codigo: 'CREAR_CASO', nombre: 'Crear caso' }] });
    expect(roles).toEqual([{ idRol: 1, nombre: 'ADMINISTRADOR' }]);
    expect(permisos).toEqual([{ idPermiso: 5, codigo: 'CREAR_CASO', nombre: 'Crear caso' }]);
  });

  it('rechaza una respuesta con forma inesperada', () => {
    let error: FalloAcademico | undefined;
    api.roles().subscribe({ error: (e) => (error = e) });
    http.expectOne(`${B}/v1/admin/roles`).flush([{ idRol: 1 }]);
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('asigna con PUT sin cuerpo y revoca exigiendo 204', () => {
    let asignado: unknown;
    let revocado = false;
    api.asignarPermiso(U, 5).subscribe((a) => (asignado = a));
    const put = http.expectOne({ method: 'PUT', url: `${B}/v1/admin/usuarios/${U}/permisos/5` });
    expect(put.request.body).toBeNull();
    put.flush({ idUsuario: U, idPermiso: 5, habilitado: true });
    api.revocarPermiso(U, 5).subscribe(() => (revocado = true));
    http
      .expectOne({ method: 'DELETE', url: `${B}/v1/admin/usuarios/${U}/permisos/5` })
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(asignado).toEqual({ idUsuario: U, idPermiso: 5, habilitado: true });
    expect(revocado).toBeTrue();
  });

  it('conserva el código 403 de autoasignación y no lo presenta como éxito', () => {
    let error: FalloAcademico | undefined;
    api
      .asignarPermiso(U, 5)
      .subscribe({ next: () => fail('no debe tener éxito'), error: (e) => (error = e) });
    http
      .expectOne(`${B}/v1/admin/usuarios/${U}/permisos/5`)
      .flush(
        { code: 'PERMISSION_SELF_ASSIGNMENT_NOT_ALLOWED', message: 'x' },
        { status: 403, statusText: 'Forbidden' },
      );
    expect(error?.estado).toBe(403);
    expect(error?.codigo).toBe('PERMISSION_SELF_ASSIGNMENT_NOT_ALLOWED');
  });

  it('alta de docente envía solo nombre y correo', () => {
    api
      .altaDocente({ nombre: ' Docente QA ', correo: 'd@example.invalid', password: 'x' } as never)
      .subscribe();
    const req = http.expectOne({ method: 'POST', url: `${B}/v1/admin/docentes` });
    expect(req.request.body).toEqual({ nombre: 'Docente QA', correo: 'd@example.invalid' });
    req.flush(
      { idUsuario: U, nombre: 'Docente QA', correo: 'd@example.invalid', estado: 'Activo' },
      { status: 201, statusText: 'Created' },
    );
  });

  it('no hace HTTP con un identificador inválido', () => {
    let error: unknown;
    api.permisosDeUsuario('no-uuid').subscribe({ error: (e) => (error = e) });
    http.expectNone(() => true);
    expect(error).toBeInstanceOf(FalloAcademico);
  });
});

describe('FE-53-B/C CasosM3Api (doble HTTP)', () => {
  let http: HttpTestingController;
  let api: CasosM3Api;
  beforeEach(() => {
    http = configurar();
    api = TestBed.inject(CasosM3Api);
  });
  afterEach(() => http.verify());

  it('crea con el DTO exacto (sin docenteId ni campos extra)', () => {
    let r: unknown;
    api
      .crear({ idCaso: C, titulo: 'Caso', tiempoEstimadoSegundos: 1800, docenteId: U } as never)
      .subscribe((x) => (r = x));
    const req = http.expectOne({ method: 'POST', url: `${B}/v1/casos` });
    expect(req.request.body).toEqual({
      idCaso: C,
      titulo: 'Caso',
      tiempoEstimadoSegundos: 1800,
      historia: null,
      desarrolloSituacional: null,
    });
    req.flush({ idCaso: C, estado: 'BORRADOR' }, { status: 201, statusText: 'Created' });
    expect(r).toEqual({ idCaso: C, estado: 'BORRADOR' });
  });

  it('consulta y devuelve el ETag sin modificarlo', () => {
    let v: unknown;
    api.consultar(C).subscribe((x) => (v = x));
    http
      .expectOne(`${B}/v1/casos/${C}`)
      .flush(
        { idCaso: C, titulo: 'Caso', tiempoEstimadoSegundos: 60, estado: 'BORRADOR' },
        { headers: { ETag: ETAG } },
      );
    expect(v).toEqual({
      datos: { idCaso: C, titulo: 'Caso', tiempoEstimadoSegundos: 60, estado: 'BORRADOR' },
      etag: ETAG,
    });
  });

  it('PATCH envía If-Match y un 412 llega como fallo, no como éxito', () => {
    let error: FalloAcademico | undefined;
    api
      .actualizar(C, { titulo: 'Nuevo' }, ETAG)
      .subscribe({ next: () => fail('412 no es éxito'), error: (e) => (error = e) });
    const req = http.expectOne({ method: 'PATCH', url: `${B}/v1/casos/${C}` });
    expect(req.request.headers.get('If-Match')).toBe(ETAG);
    expect(req.request.body).toEqual({ titulo: 'Nuevo' });
    req.flush({ code: 'STALE_CASE' }, { status: 412, statusText: 'Precondition Failed' });
    expect(error?.estado).toBe(412);
    expect(error?.codigo).toBe('STALE_CASE');
  });

  it('no escribe sin versión (evita un 428 evitable)', () => {
    let error: unknown;
    api.actualizar(C, { titulo: 'x' }, '').subscribe({ error: (e) => (error = e) });
    http.expectNone(() => true);
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('propaga un 428 del servidor', () => {
    let error: FalloAcademico | undefined;
    api.publicar(C, ETAG).subscribe({ error: (e) => (error = e) });
    const req = http.expectOne({ method: 'POST', url: `${B}/v1/casos/${C}/publicar` });
    expect(req.request.headers.get('If-Match')).toBe(ETAG);
    req.flush({ code: 'IF_MATCH_REQUIRED' }, { status: 428, statusText: 'Precondition Required' });
    expect(error?.estado).toBe(428);
  });

  it('guarda la rúbrica con If-Match y devuelve el nuevo ETag', () => {
    let v: { etag: string | null } | undefined;
    const rubrica = {
      nombre: 'R',
      descripcion: null,
      puntajeTotal: 5,
      criterios: [{ id: 'c1', descripcion: 'Criterio', puntaje: 5, ponderacion: null }],
      preguntas: [{ idPregunta: E, valorPregunta: 5, criterio: 'c1' }],
    };
    api.guardarRubrica(C, rubrica, ETAG).subscribe((x) => (v = x));
    const req = http.expectOne({ method: 'PUT', url: `${B}/v1/casos/${C}/rubrica` });
    expect(req.request.headers.get('If-Match')).toBe(ETAG);
    expect(req.request.body).toEqual(rubrica);
    req.flush(
      { idRubrica: 'r1', completa: true, ...rubrica },
      { headers: { ETag: '"m3-v2:def"' } },
    );
    expect(v?.etag).toBe('"m3-v2:def"');
  });

  it('lee el contenido con sus preguntas', () => {
    let v: { datos: { escenarios: readonly { preguntas: readonly unknown[] }[] } } | undefined;
    api.contenido(C).subscribe((x) => (v = x));
    http.expectOne(`${B}/v1/casos/${C}/contenido`).flush({
      idCaso: C,
      titulo: 'Caso',
      tiempoEstimadoSegundos: 60,
      estado: 'BORRADOR',
      historia: null,
      desarrolloSituacional: null,
      escenarios: [
        {
          idEscenario: 'e1',
          titulo: 'E',
          orden: 1,
          preguntas: [{ idPregunta: E, enunciado: '¿?', orden: 1 }],
        },
      ],
    });
    expect(v?.datos.escenarios[0].preguntas.length).toBe(1);
  });
});

describe('FE-53-D/E SesionesM4Api (doble HTTP)', () => {
  let http: HttpTestingController;
  let api: SesionesM4Api;
  const sesion = {
    id: S,
    casoId: C,
    docenteId: U,
    titulo: 'Sesión',
    mensajePersonalizado: null,
    fechaInicio: '2026-12-01T13:00:00Z',
    fechaFin: '2026-12-01T15:00:00Z',
    estado: 'SinIniciar',
    creadoEn: '2026-11-21T00:00:00Z',
    fechaInicioReal: null,
    fechaFinReal: null,
    tiempoMaximoParticipacionSegundos: 1800,
    lugarFisico: null,
  };
  beforeEach(() => {
    http = configurar();
    api = TestBed.inject(SesionesM4Api);
  });
  afterEach(() => http.verify());

  it('crea sin X-Docente-Id y con el DTO exacto', () => {
    api
      .crear({
        casoId: C,
        titulo: 'Sesión',
        mensajePersonalizado: null,
        fechaInicio: sesion.fechaInicio,
        fechaFin: sesion.fechaFin,
        tiempoMaximoParticipacionSegundos: 1800,
        lugarFisico: null,
      })
      .subscribe();
    const req = http.expectOne({ method: 'POST', url: `${B}/m4/sesiones` });
    expect(req.request.headers.has('X-Docente-Id')).toBeFalse();
    expect(Object.keys(req.request.body).sort()).toEqual([
      'casoId',
      'fechaFin',
      'fechaInicio',
      'lugarFisico',
      'mensajePersonalizado',
      'tiempoMaximoParticipacionSegundos',
      'titulo',
    ]);
    req.flush(sesion, { status: 201, statusText: 'Created' });
  });

  it('lista y valida el catálogo de estados', () => {
    let lista: unknown[] = [];
    let error: unknown;
    api.listar().subscribe((l) => (lista = l));
    http.expectOne(`${B}/m4/sesiones`).flush([sesion]);
    expect(lista.length).toBe(1);
    api.listar().subscribe({ error: (e) => (error = e) });
    http.expectOne(`${B}/m4/sesiones`).flush([{ ...sesion, estado: 'Cancelada' }]);
    expect(error).toBeInstanceOf(FalloAcademico);
  });

  it('cambia el estado con el cuerpo { nuevoEstado } y propaga un 409', () => {
    let error: FalloAcademico | undefined;
    api.cambiarEstado(S, 'Finalizado').subscribe({ error: (e) => (error = e) });
    const req = http.expectOne({ method: 'PATCH', url: `${B}/m4/sesiones/${S}/estado` });
    expect(req.request.body).toEqual({ nuevoEstado: 'Finalizado' });
    req.flush({ code: 'M4-TRANSICION' }, { status: 409, statusText: 'Conflict' });
    expect(error?.estado).toBe(409);
  });

  it('convoca con { estudianteId } y consulta las convocatorias', () => {
    let lista: unknown[] = [];
    api.convocar(S, E).subscribe();
    const post = http.expectOne({ method: 'POST', url: `${B}/m4/sesiones/${S}/convocatorias` });
    expect(post.request.body).toEqual({ estudianteId: E });
    post.flush(
      {
        id: U,
        sesionId: S,
        estudianteId: E,
        convocadoEn: null,
        estadoAutorizacion: null,
        fechaRetiro: null,
      },
      { status: 201, statusText: 'Created' },
    );
    api.convocatorias(S).subscribe((l) => (lista = l));
    http.expectOne(`${B}/m4/sesiones/${S}/convocatorias`).flush([]);
    expect(lista).toEqual([]);
  });
});
