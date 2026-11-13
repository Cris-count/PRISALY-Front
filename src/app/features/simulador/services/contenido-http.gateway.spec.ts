import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideApiConfig } from '../../../core/config/api.config';
import { contenidoPrueba, ID_INTENTO_CONTENIDO as ID } from '../testing/contenido-intento.fixture';
import { FalloParticipacionError, provideParticipacionHttp } from './participacion-http.gateway';
import { ParticipacionGateway } from './participacion.gateway';

describe('N9: contenido estudiantil integrado en bf47bdd3 (#88)', () => {
  let gateway: ParticipacionGateway;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig('/api'),
        provideParticipacionHttp(),
      ],
    });
    gateway = TestBed.inject(ParticipacionGateway);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function consultar() {
    return firstValueFrom(gateway.consultarContenidoIntento(ID));
  }
  function req() {
    return http.expectOne(`/api/v1/estudiantes/intentos/${ID}/contenido`);
  }
  const fallo = () =>
    consultar().then(
      () => {
        throw new Error('Debía rechazar');
      },
      (e) => e as FalloParticipacionError,
    );

  it('usa la URL base una sola vez y sesión estudiantil sin identidad del cliente', async () => {
    const pendiente = consultar();
    const r = req();
    expect(r.request.method).toBe('GET');
    expect(r.request.withCredentials).toBeTrue();
    expect(r.request.body).toBeNull();
    expect(r.request.params.keys()).toEqual([]);
    expect(r.request.headers.has('Authorization')).toBeFalse();
    r.flush(contenidoPrueba(), { headers: { 'Cache-Control': 'no-store' } });
    expect(await pendiente).toEqual(contenidoPrueba());
  });

  it('conserva todos los campos nulos y los textos vacíos sin inventar reemplazos', async () => {
    const cuerpo = contenidoPrueba();
    const mutable = JSON.parse(JSON.stringify(cuerpo));
    mutable.caso.historia = '';
    mutable.caso.desarrolloSituacional = null;
    const pendiente = consultar();
    req().flush(mutable);
    const recibido = await pendiente;
    expect(recibido.caso.historia).toBe('');
    expect(recibido.caso.desarrolloSituacional).toBeNull();
    expect(recibido.caso.escenarios[0].titulo).toBeNull();
    expect(recibido.caso.escenarios[0].contexto).toBeNull();
    expect(recibido.caso.escenarios[0].instrucciones).toBeNull();
  });

  it('preserva el orden y acepta desempates por UUID sin ordenar el cuerpo localmente', async () => {
    const cuerpo = JSON.parse(JSON.stringify(contenidoPrueba()));
    cuerpo.caso.escenarios.forEach((e: any) => {
      e.orden = 1;
      e.preguntas.forEach((p: any) => {
        p.orden = 1;
        p.opciones.forEach((o: any) => (o.orden = 1));
      });
    });
    const pendiente = consultar();
    req().flush(cuerpo);
    expect(await pendiente).toEqual(cuerpo);
  });

  it('proyecta únicamente campos permitidos aunque el servidor envíe datos reservados', async () => {
    const cuerpo = JSON.parse(JSON.stringify(contenidoPrueba()));
    cuerpo.calificacion = 5;
    cuerpo.caso.rubrica = { peso: 20 };
    cuerpo.caso.guion = 'no permitido';
    cuerpo.caso.escenarios[0].preguntas[0].retroalimentacion = 'reservado';
    cuerpo.caso.escenarios[0].preguntas[0].opciones[0].esCorrecta = true;
    cuerpo.caso.escenarios[0].preguntas[0].opciones[0].explicacion = 'reservado';
    const pendiente = consultar();
    req().flush(cuerpo);
    expect(await pendiente).toEqual(contenidoPrueba());
  });

  const mutaciones: [string, (cuerpo: any) => void][] = [
    ['intento ajeno', (c) => (c.idIntento = c.idSesion)],
    ['sesión inválida', (c) => (c.idSesion = 'sesion')],
    ['caso inválido', (c) => (c.caso.idCaso = '../caso')],
    ['escenario inválido', (c) => (c.caso.escenarios[0].idEscenario = 12)],
    ['pregunta inválida', (c) => (c.caso.escenarios[0].preguntas[0].idPregunta = 'demo-p1')],
    [
      'opción inválida',
      (c) => (c.caso.escenarios[0].preguntas[0].opciones[0].idOpcion = 'demo-o1'),
    ],
    ['null no permitido', (c) => (c.caso.titulo = null)],
    ['campo nullable ausente', (c) => delete c.caso.historia],
    ['lista inválida', (c) => (c.caso.escenarios = {})],
    ['orden no entero', (c) => (c.caso.escenarios[0].orden = 1.5)],
    ['escenarios desordenados', (c) => c.caso.escenarios.reverse()],
    ['preguntas desordenadas', (c) => c.caso.escenarios[0].preguntas.reverse()],
    ['opciones desordenadas', (c) => c.caso.escenarios[0].preguntas[0].opciones.reverse()],
    [
      'escenario duplicado',
      (c) => (c.caso.escenarios[1].idEscenario = c.caso.escenarios[0].idEscenario),
    ],
    [
      'pregunta duplicada entre escenarios',
      (c) =>
        (c.caso.escenarios[1].preguntas[0].idPregunta =
          c.caso.escenarios[0].preguntas[0].idPregunta),
    ],
    [
      'opción duplicada entre preguntas',
      (c) =>
        (c.caso.escenarios[0].preguntas[1].opciones[0].idOpcion =
          c.caso.escenarios[0].preguntas[0].opciones[0].idOpcion),
    ],
  ];
  for (const [nombre, mutar] of mutaciones) {
    it(`rechaza ${nombre} sin entregar un contenido válido`, async () => {
      const cuerpo = JSON.parse(JSON.stringify(contenidoPrueba()));
      mutar(cuerpo);
      const pendiente = fallo();
      req().flush(cuerpo);
      expect(await pendiente).toBeInstanceOf(FalloParticipacionError);
    });
  }

  for (const id of ['../otro', 'demo', '', null as unknown as string]) {
    it(`rechaza ID de entrada inválido (${id}) sin HTTP`, async () => {
      const error = await firstValueFrom(gateway.consultarContenidoIntento(id)).catch((e) => e);
      expect(error).toBeInstanceOf(FalloParticipacionError);
      http.expectNone(() => true);
    });
  }

  for (const [status, tipo] of [
    [400, 'desconocido'],
    [401, 'sesion-no-valida'],
    [403, 'acceso-denegado'],
    [404, 'no-encontrado'],
    [409, 'conflicto'],
    [500, 'servidor'],
    [503, 'servidor'],
  ] as const) {
    it(`clasifica ${status} sin convertirlo en éxito`, async () => {
      const pendiente = fallo();
      req().flush(
        {
          code: status === 409 ? 'CONTENIDO_INTENTO_NO_DISPONIBLE' : 'ERROR_PRUEBA',
          message: 'interno',
        },
        { status, statusText: 'Error' },
      );
      const e = await pendiente;
      expect(e.estado).toBe(status);
      expect(e.fallo.tipo).toBe(tipo);
      expect(e.message).not.toContain('interno');
      if (status === 409) expect(e.codigo).toBe('CONTENIDO_INTENTO_NO_DISPONIBLE');
    });
  }

  it('conserva el código real de indisponibilidad M4 del contrato integrado', async () => {
    const pendiente = fallo();
    req().flush(
      {
        code: 'M4-CONSULTA-PROGRAMACION-NO-DISPONIBLE',
        message: 'La consulta de programación no está disponible; inténtelo más tarde',
      },
      { status: 503, statusText: 'Service Unavailable' },
    );
    const e = await pendiente;
    expect(e.codigo).toBe('M4-CONSULTA-PROGRAMACION-NO-DISPONIBLE');
    expect(e.estado).toBe(503);
    expect(e.fallo.tipo).toBe('servidor');
    expect(e.fallo.reintentable).toBeTrue();
    expect(e.message).not.toContain('programación');
  });

  it('interpreta el 409 definitivo de dos campos sin depender de ProblemDetail', async () => {
    const pendiente = fallo();
    req().flush(
      {
        code: 'CONTENIDO_INTENTO_NO_DISPONIBLE',
        message: 'Contenido académico no disponible para esta lectura',
      },
      { status: 409, statusText: 'Conflict' },
    );
    const e = await pendiente;
    expect(e.codigo).toBe('CONTENIDO_INTENTO_NO_DISPONIBLE');
    expect(e.fallo.tipo).toBe('conflicto');
    expect(e.fallo.reintentable).toBeFalse();
    expect(e.message).not.toContain('esta lectura');
  });
});
