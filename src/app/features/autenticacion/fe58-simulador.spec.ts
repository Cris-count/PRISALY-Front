import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { App } from '../../app';
import { FABRICA_MUNDO, FabricaMundo } from '../simulador/mundo-tecnico/puerto-mundo';
import { ParticipacionGateway } from '../simulador/services/participacion.gateway';
import { EstadoSesionPersonal } from './m1-personal.models';
import { provideEntornoDemostracionAutorizado } from './entorno-demostracion';
import { provideM1PersonalLocal } from './m1-personal-http';
import { SesionPersonalM1 } from './m1-personal-sesion';

/**
 * FE-58 · DC-FE-58-H58-01-EJECUCION-12. Matriz ratificada del simulador: `/simulador-tecnico-2d5`,
 * `/simulador-unreal` y `/simulador` (A) solo en demo; `/simulador-integrado` (A/B) solo su
 * modalidad demostrativa en demo, la académica deshabilitada. Entornos simulados con proveedores
 * (equivalentes a los valores de compilación de cada `environment`). HTTP simulado.
 */
const RUTAS_SIMULADOR = ['/simulador-tecnico-2d5', '/simulador-unreal', '/simulador-integrado'];

type Entorno = 'produccion' | 'desarrollo' | 'qa' | 'demo';
type Sesion = 'ninguna' | 'docente' | 'administrador';

let fabricaLlamadas = 0;
let gateway: jasmine.SpyObj<ParticipacionGateway>;
let http: HttpTestingController;

function identidad(rol: string): EstadoSesionPersonal {
  return {
    tipo: 'valida',
    identidad: {
      userId: '11111111-1111-4111-8111-111111111111',
      correo: 'personal@example.invalid',
      nombre: 'Personal prueba',
      rol,
      permisos: rol === 'ADMINISTRADOR' ? [] : ['CONSULTAR_CASO', 'GESTIONAR_SESION'],
      authPrototype: 'TD-M1-AUTH-PROVISIONAL',
    },
  } as EstadoSesionPersonal;
}

function preparar(entorno: Entorno, sesion: Sesion = 'ninguna'): void {
  fabricaLlamadas = 0;
  gateway = jasmine.createSpyObj<ParticipacionGateway>('ParticipacionGateway', [
    'consultarSesionesAutorizadas',
    'iniciarIntento',
    'consultarIntento',
    'registrarRespuesta',
    'consultarProgreso',
    'reanudarIntento',
    'finalizarIntento',
  ]);
  const fabrica: FabricaMundo = async () => {
    fabricaLlamadas++;
    throw new Error('Phaser no debe inicializarse en esta prueba');
  };
  const estado = signal<EstadoSesionPersonal>(
    sesion === 'ninguna'
      ? { tipo: 'no-autenticada' }
      : identidad(sesion === 'docente' ? 'DOCENTE' : 'ADMINISTRADOR'),
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ParticipacionGateway, useValue: gateway },
      { provide: FABRICA_MUNDO, useValue: fabrica },
      ...(entorno === 'qa' ? [provideM1PersonalLocal()] : []),
      ...(entorno === 'demo' ? [provideEntornoDemostracionAutorizado()] : []),
      ...(sesion !== 'ninguna'
        ? [
            {
              provide: SesionPersonalM1,
              useValue: {
                estado,
                tienePermisos: () => false,
                tieneRol: () => false,
                identidadRequiereConfirmacion: () => false,
                actualizarIdentidad: () => {
                  throw new Error('no debe consultarse /me');
                },
              },
            },
          ]
        : []),
    ],
  });
  http = TestBed.inject(HttpTestingController);
}

/** Sin peticiones HTTP ni operaciones de participación (se registra dentro de cada `describe`). */
function verificarSinEfectos(): void {
  http?.expectNone(() => true);
  http?.verify();
  if (gateway)
    for (const operacion of Object.values(gateway)) expect(operacion).not.toHaveBeenCalled();
}

const selectores = [
  'app-simulador-temporal',
  'app-simulador-unreal-page',
  'app-simulador-integrado-page',
];
const simuladorMontado = (raiz: HTMLElement | null) =>
  !!raiz && selectores.some((s) => raiz.querySelector(s) || raiz.matches?.(s));

describe('FE-58 H-58-01 simulador protegido por entorno (Router)', () => {
  beforeEach(() => (http = undefined as unknown as HttpTestingController));
  afterEach(verificarSinEfectos);

  for (const entorno of ['produccion', 'desarrollo'] as const) {
    it(`${entorno}: el acceso directo a cada ruta del simulador redirige a /login y no monta el simulador`, async () => {
      preparar(entorno);
      const harness = await RouterTestingHarness.create();
      for (const ruta of RUTAS_SIMULADOR) {
        await harness.navigateByUrl(ruta);
        expect(TestBed.inject(Router).url).withContext(ruta).toBe('/login');
        expect(simuladorMontado(harness.fixture.nativeElement as HTMLElement))
          .withContext(ruta)
          .toBeFalse();
      }
      expect(fabricaLlamadas).toBe(0);
    });
  }

  it('QA sin sesión: deniega y termina en /login', async () => {
    preparar('qa');
    const harness = await RouterTestingHarness.create();
    for (const ruta of RUTAS_SIMULADOR) {
      await harness.navigateByUrl(ruta);
      expect(TestBed.inject(Router).url).withContext(ruta).toBe('/login');
    }
    expect(fabricaLlamadas).toBe(0);
  });

  for (const sesion of ['docente', 'administrador'] as const) {
    it(`QA con sesión ${sesion}: deniega con aviso y no monta el simulador`, async () => {
      preparar('qa', sesion);
      const harness = await RouterTestingHarness.create();
      for (const ruta of RUTAS_SIMULADOR) {
        await harness.navigateByUrl(ruta);
        expect(TestBed.inject(Router).url)
          .withContext(ruta)
          .toBe('/dashboard?aviso=demostracion-no-autorizada');
        expect(simuladorMontado(harness.fixture.nativeElement as HTMLElement))
          .withContext(ruta)
          .toBeFalse();
      }
      expect(fabricaLlamadas).toBe(0);
    });
  }

  it('demo: las tres rutas se activan', async () => {
    preparar('demo');
    const harness = await RouterTestingHarness.create();
    for (const ruta of ['/simulador-unreal', '/simulador-integrado']) {
      await harness.navigateByUrl(ruta);
      expect(TestBed.inject(Router).url).withContext(ruta).toBe(ruta);
      expect(simuladorMontado(harness.routeNativeElement)).withContext(ruta).toBeTrue();
    }
  });

  it('demo: la ruta técnica inicializa el mundo; fuera de demo no lo hace', async () => {
    preparar('demo');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/simulador-tecnico-2d5');
    expect(TestBed.inject(Router).url).toBe('/simulador-tecnico-2d5');
    await new Promise((r) => setTimeout(r));
    expect(fabricaLlamadas).toBe(1);
  });

  it('/simulador redirige a Unreal solo en demo; fuera de demo el destino no se monta', async () => {
    preparar('demo');
    let harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/simulador');
    expect(TestBed.inject(Router).url).toBe('/simulador-unreal');
    TestBed.resetTestingModule();
    preparar('produccion');
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/simulador');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(simuladorMontado(harness.fixture.nativeElement as HTMLElement)).toBeFalse();
  });

  it('parámetros de URL no habilitan el modo demo', async () => {
    preparar('produccion');
    const harness = await RouterTestingHarness.create();
    for (const consulta of ['?demo=true', '?demostracionesHabilitadas=true', '?entorno=demo#demo'])
      for (const ruta of RUTAS_SIMULADOR) {
        await harness.navigateByUrl(ruta + consulta);
        expect(TestBed.inject(Router).url)
          .withContext(ruta + consulta)
          .toBe('/login');
      }
  });

  it('historial y recarga: volver atrás o repetir la navegación sigue sujeto al guard', async () => {
    preparar('produccion');
    const harness = await RouterTestingHarness.create('/login');
    await harness.navigateByUrl('/simulador-unreal');
    expect(TestBed.inject(Router).url).toBe('/login');
    const location = TestBed.inject(Location);
    location.back();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).not.toContain('simulador');
    // «Recarga»: una navegación inicial nueva a la misma URL vuelve a ejecutar el guard.
    TestBed.resetTestingModule();
    preparar('produccion');
    await RouterTestingHarness.create('/simulador-integrado');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('cambio de configuración: el mismo destino depende solo del entorno compilado', async () => {
    for (const [entorno, esperado] of [
      ['produccion', '/login'],
      ['demo', '/simulador-unreal'],
      ['desarrollo', '/login'],
    ] as const) {
      TestBed.resetTestingModule();
      preparar(entorno);
      await RouterTestingHarness.create('/simulador-unreal');
      expect(TestBed.inject(Router).url).withContext(entorno).toBe(esperado);
    }
  });

  it('modalidad académica: los parámetros no activan la participación en /simulador-integrado (demo)', async () => {
    preparar('demo');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(
      '/simulador-integrado?idIntento=22222222-2222-4222-8222-222222222222&idIntentoContenido=22222222-2222-4222-8222-222222222222&contextoAcademico=1',
    );
    expect(simuladorMontado(harness.routeNativeElement)).toBeTrue();
    // afterEach verifica: ninguna operación del gateway de participación y ninguna petición HTTP.
  });
});

describe('FE-58 H-58-01 identificación visible del entorno demo', () => {
  beforeEach(() => (http = undefined as unknown as HttpTestingController));
  afterEach(verificarSinEfectos);

  it('en demo la aplicación muestra el distintivo; fuera de demo no', async () => {
    for (const entorno of ['demo', 'produccion'] as const) {
      TestBed.resetTestingModule();
      preparar(entorno);
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const distintivo = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-prueba="distintivo-demo"]',
      );
      if (entorno === 'demo') expect(distintivo?.textContent).toContain('Entorno de demostración');
      else expect(distintivo).toBeNull();
    }
  });
});
