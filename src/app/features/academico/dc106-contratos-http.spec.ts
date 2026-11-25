import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { provideM1PersonalLocal, M1PersonalApi } from '../autenticacion/m1-personal-api';
import { aFalloAcademico, FalloAcademico, mensajeFallo } from './academico-http';
import { AdministracionM1Api } from './administracion-m1.api';
import { CasosM3Api } from './casos-m3.api';
import { SesionesM4Api } from './sesiones-m4.api';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * DC-DEV-106. Dobles HTTP de los clientes ya existentes. No llama a un JAR
 * ni enciende flags. Un fallo no puede leerse como un guardado.
 */
const B = '/api-prueba';
const CASO = '22222222-2222-4222-8222-222222222222';
const ESCENA = '55555555-5555-4555-8555-555555555555';
const SESION = '33333333-3333-4333-8333-333333333333';
const ESTUDIANTE = '44444444-4444-4444-8444-444444444444';

const ESTADOS = [400, 401, 403, 404, 405, 500] as const;

function fallo(estado: number): FalloAcademico {
  return aFalloAcademico(
    new HttpErrorResponse({ status: estado, error: { code: 'INTERNO', message: 'detalle-interno' } }),
  );
}

describe('DC-106 mensajes de fallo académico', () => {
  for (const estado of ESTADOS) {
    it(`HTTP ${estado} no afirma un guardado ni copia el cuerpo del servidor`, () => {
      const texto = mensajeFallo(fallo(estado));
      expect(texto).toContain('No se guardó ningún cambio.');
      expect(texto).not.toContain('detalle-interno');
      expect(texto).not.toMatch(/éxito|guardado correctamente|se creó/i);
    });
  }
});

describe('DC-106 clientes M1 M3 M4 ante operación no publicada o fallida', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        provideM1PersonalLocal(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('el login rechaza 401 sin abrir sesión', () => {
    let error: unknown;
    TestBed.inject(M1PersonalApi)
      .autenticar({ correo: 'personal@example.invalid', password: 'clave-de-prueba' })
      .subscribe({ next: () => fail('no debía autenticar'), error: (e) => (error = e) });
    http
      .expectOne({ method: 'POST', url: `${B}/v1/personal/autenticar` })
      .flush({ message: 'detalle-interno' }, { status: 401, statusText: 'Unauthorized' });
    expect(String(error)).not.toContain('detalle-interno');
  });

  it('el perfil no fabrica una identidad cuando no hay sesión', () => {
    let error: unknown;
    TestBed.inject(M1PersonalApi)
      .consultarIdentidad()
      .subscribe({ next: () => fail('no debía haber perfil'), error: (e) => (error = e) });
    http.expectNone(() => true);
    expect(String(error)).toContain('No hay una sesión de personal verificable.');
  });

  it('alta de docente, caso, escenario y convocatoria tratan 405 como no publicado', () => {
    const admin = TestBed.inject(AdministracionM1Api);
    const casos = TestBed.inject(CasosM3Api);
    const sesiones = TestBed.inject(SesionesM4Api);
    const vistos: FalloAcademico[] = [];
    const anotar = (e: unknown) => vistos.push(aFalloAcademico(e));

    admin.altaDocente({ nombre: 'Docente QA', correo: 'docente.qa@example.invalid' }).subscribe({
      next: () => fail('no debía crear'),
      error: anotar,
    });
    casos
      .crear({
        idCaso: CASO,
        titulo: 'Caso',
        tiempoEstimadoSegundos: 60,
        historia: null,
        desarrolloSituacional: null,
      })
      .subscribe({ next: () => fail('no debía crear'), error: anotar });
    casos
      .agregarEscenario(
        CASO,
        {
          idEscenario: ESCENA,
          titulo: 'Escena',
          contexto: null,
          instrucciones: null,
          orden: 1,
        },
        '"v1"',
      )
      .subscribe({ next: () => fail('no debía crear'), error: anotar });
    sesiones.convocar(SESION, ESTUDIANTE).subscribe({
      next: () => fail('no debía convocar'),
      error: anotar,
    });

    for (const url of [
      `${B}/v1/admin/docentes`,
      `${B}/v1/casos`,
      `${B}/v1/casos/${CASO}/escenarios`,
      `${B}/m4/sesiones/${SESION}/convocatorias`,
    ]) {
      http
        .expectOne({ method: 'POST', url })
        .flush({ message: 'detalle-interno' }, { status: 405, statusText: 'Method Not Allowed' });
    }

    expect(vistos.length).toBe(4);
    for (const f of vistos) {
      expect(f.estado).toBe(405);
      expect(mensajeFallo(f)).toContain('no está publicada');
      expect(mensajeFallo(f)).not.toContain('detalle-interno');
    }
  });

  it('roles y permisos no entregan catálogo ante 403 o 500', () => {
    const admin = TestBed.inject(AdministracionM1Api);
    const estados: number[] = [];
    admin.roles().subscribe({
      next: () => fail('no debía listar roles'),
      error: (e) => estados.push(aFalloAcademico(e).estado),
    });
    admin.permisos().subscribe({
      next: () => fail('no debía listar permisos'),
      error: (e) => estados.push(aFalloAcademico(e).estado),
    });
    http
      .expectOne({ method: 'GET', url: `${B}/v1/admin/roles` })
      .flush({}, { status: 403, statusText: 'Forbidden' });
    http
      .expectOne({ method: 'GET', url: `${B}/v1/admin/permisos` })
      .flush({}, { status: 500, statusText: 'Error' });
    expect(estados).toEqual([403, 500]);
    expect(mensajeFallo(aFalloAcademico(new HttpErrorResponse({ status: 403 })))).toContain(
      'No tienes acceso',
    );
    expect(mensajeFallo(aFalloAcademico(new HttpErrorResponse({ status: 500 })))).toContain(
      'No se guardó ningún cambio.',
    );
  });
});
