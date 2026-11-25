import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { provideApiConfig } from '../../core/config/api.config';
import { FalloAcademico, mensajeFallo } from './academico-http';
import { CrearSesionRequest, SesionesM4Api } from './sesiones-m4.api';

/**
 * DC-DEV-112. Dobles HTTP de SesionesM4Api. No repite las dos pruebas de DC-DEV-109
 * ni llama al backend.
 */
const B = '/api-prueba';
const CASO = '22222222-2222-4222-8222-222222222222';
const SESION = '33333333-3333-4333-8333-333333333333';
const DOCENTE = '11111111-1111-4111-8111-111111111111';
const ESTUDIANTE = '44444444-4444-4444-8444-444444444444';
const CONVOCATORIA = '55555555-5555-4555-8555-555555555555';

const alta: CrearSesionRequest = {
  casoId: CASO,
  titulo: 'Sesión de integración',
  mensajePersonalizado: null,
  fechaInicio: '2026-12-01T13:00:00Z',
  fechaFin: '2026-12-01T15:00:00Z',
  tiempoMaximoParticipacionSegundos: 1800,
  lugarFisico: null,
};

const sesion = {
  id: SESION,
  casoId: CASO,
  docenteId: DOCENTE,
  titulo: alta.titulo,
  mensajePersonalizado: null,
  fechaInicio: alta.fechaInicio,
  fechaFin: alta.fechaFin,
  estado: 'SinIniciar',
  creadoEn: '2026-11-25T12:00:00Z',
  fechaInicioReal: null,
  fechaFinReal: null,
  tiempoMaximoParticipacionSegundos: 1800,
  lugarFisico: null,
};

const convocatoria = {
  id: CONVOCATORIA,
  sesionId: SESION,
  estudianteId: ESTUDIANTE,
  convocadoEn: '2026-11-25T12:05:00Z',
  estadoAutorizacion: null,
  fechaRetiro: null,
};

describe('DC-112 HTTP M4 sesiones y convocatorias', () => {
  let http: HttpTestingController;
  let api: SesionesM4Api;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(SesionesM4Api);
  });

  afterEach(() => http.verify());

  it('consulta el listado con GET y acepta un arreglo vacío', () => {
    let lista: unknown;
    api.listar().subscribe((l) => (lista = l));
    const req = http.expectOne({ method: 'GET', url: `${B}/m4/sesiones` });
    req.flush([]);
    expect(lista).toEqual([]);
  });

  it('al crear envía el caso y conserva esa asociación en la sesión recibida', () => {
    let creada: { id: string; casoId: string } | undefined;
    api.crear(alta).subscribe((s) => (creada = s));
    const req = http.expectOne({ method: 'POST', url: `${B}/m4/sesiones` });
    expect(req.request.body).toEqual(alta);
    expect(req.request.headers.has('X-Docente-Id')).toBeFalse();
    req.flush(sesion, { status: 201, statusText: 'Created' });
    expect(creada).toEqual(jasmine.objectContaining({ id: SESION, casoId: CASO }));
  });

  it('consulta una sesión por GET y lee el caso publicado en el DTO', () => {
    let leida: { casoId: string } | undefined;
    api.consultar(SESION).subscribe((s) => (leida = s));
    http.expectOne({ method: 'GET', url: `${B}/m4/sesiones/${SESION}` }).flush(sesion);
    expect(leida?.casoId).toBe(CASO);
  });

  it('consulta convocatorias con GET y acepta un arreglo vacío', () => {
    let lista: unknown;
    api.convocatorias(SESION).subscribe((l) => (lista = l));
    http.expectOne({ method: 'GET', url: `${B}/m4/sesiones/${SESION}/convocatorias` }).flush([]);
    expect(lista).toEqual([]);
  });

  it('crea la convocatoria con POST y exige que la respuesta pertenezca a esa sesión', () => {
    let creada: { sesionId: string; estudianteId: string } | undefined;
    api.convocar(SESION, ESTUDIANTE).subscribe((c) => (creada = c));
    const req = http.expectOne({
      method: 'POST',
      url: `${B}/m4/sesiones/${SESION}/convocatorias`,
    });
    expect(req.request.body).toEqual({ estudianteId: ESTUDIANTE });
    req.flush(convocatoria, { status: 201, statusText: 'Created' });
    expect(creada).toEqual(
      jasmine.objectContaining({ sesionId: SESION, estudianteId: ESTUDIANTE }),
    );
  });

  it('un identificador de sesión inválido no llama al servidor', () => {
    const errores: unknown[] = [];
    const guardar = { error: (e: unknown) => errores.push(e) };
    api.consultar('no-es-uuid').subscribe(guardar);
    api.convocatorias('no-es-uuid').subscribe(guardar);
    api.convocar('no-es-uuid', ESTUDIANTE).subscribe(guardar);
    api.crear({ ...alta, casoId: 'no-es-uuid' }).subscribe(guardar);
    http.expectNone(() => true);
    expect(errores.length).toBe(4);
    expect(errores.every((e) => e instanceof FalloAcademico)).toBeTrue();
  });

  it('un cuerpo vacío o sin caso no se presenta como sesión creada', () => {
    const errores: unknown[] = [];
    api.consultar(SESION).subscribe({ error: (e) => errores.push(e) });
    http.expectOne(`${B}/m4/sesiones/${SESION}`).flush(null);
    api.crear(alta).subscribe({ error: (e) => errores.push(e) });
    http.expectOne(`${B}/m4/sesiones`).flush({ ...sesion, casoId: null }, { status: 201, statusText: 'Created' });
    expect(errores.length).toBe(2);
    expect(errores.every((e) => e instanceof FalloAcademico)).toBeTrue();
  });

  const fallos = [
    [401, 'UNAUTHENTICATED'],
    [403, 'M4-SIN-PERMISO'],
    [404, 'M4-SESION-NO-ENCONTRADA'],
    [500, 'M4-PROVEEDOR-NO-DISPONIBLE'],
  ] as const;

  for (const [estado, codigo] of fallos) {
    it(`HTTP ${estado} en listar, crear, consultar y convocar no entrega datos`, () => {
      const vistos: FalloAcademico[] = [];
      const operaciones: Observable<unknown>[] = [
        api.listar(),
        api.crear(alta),
        api.consultar(SESION),
        api.convocatorias(SESION),
        api.convocar(SESION, ESTUDIANTE),
      ];
      for (const operacion of operaciones) {
        operacion.subscribe({ error: (e: FalloAcademico) => vistos.push(e) });
      }
      const peticiones = http.match(() => true);
      expect(peticiones.map((p) => `${p.request.method} ${p.request.url}`)).toEqual([
        `GET ${B}/m4/sesiones`,
        `POST ${B}/m4/sesiones`,
        `GET ${B}/m4/sesiones/${SESION}`,
        `GET ${B}/m4/sesiones/${SESION}/convocatorias`,
        `POST ${B}/m4/sesiones/${SESION}/convocatorias`,
      ]);
      for (const peticion of peticiones) {
        peticion.flush({ code: codigo, message: 'detalle-interno' }, { status: estado, statusText: 'x' });
      }
      expect(vistos.map((f) => f.estado)).toEqual([estado, estado, estado, estado, estado]);
      expect(vistos.every((f) => f.codigo === codigo)).toBeTrue();
      for (const fallo of vistos) {
        const texto = mensajeFallo(fallo);
        expect(texto).toContain('No se guardó ningún cambio.');
        expect(texto).not.toContain('detalle-interno');
      }
      if (estado === 403) {
        expect(mensajeFallo(vistos[0])).toContain('No tienes acceso');
      }
    });
  }
});
