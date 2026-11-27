import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { provideEntornoDemostracionAutorizado } from './features/autenticacion/entorno-demostracion';
import { ParticipacionGateway } from './features/simulador/services/participacion.gateway';

describe('Rutas públicas de presentación', () => {
  let gateway: jasmine.SpyObj<ParticipacionGateway>;

  beforeEach(() => {
    gateway = jasmine.createSpyObj<ParticipacionGateway>('ParticipacionGateway', [
      'consultarSesionesAutorizadas',
      'iniciarIntento',
      'consultarIntento',
      'registrarRespuesta',
      'consultarProgreso',
      'reanudarIntento',
      'finalizarIntento',
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: ParticipacionGateway, useValue: gateway },
        // FE-58-05 (H-58-01): el inicio público del dashboard solo existe en el entorno de
        // demostración autorizado; el bloqueo en producción se prueba en fe58-resolucion.spec.ts.
        provideEntornoDemostracionAutorizado(),
      ],
    });
  });

  // DC-SIM-LIMPIEZA-01: las direcciones del simulador 2D/2.5D retirado llevan al visor de MUNDO-24.
  const RUTAS_SIMULADOR = ['/simulador', '/simulador-unreal', '/simulador-tecnico-2d5', '/simulador-integrado'];

  for (const ruta of ['/', '/login', '/dashboard', ...RUTAS_SIMULADOR, '/ruta-inexistente']) {
    it(`resuelve ${ruta} hacia el inicio público sin atribuir identidad ni iniciar intentos`, async () => {
      const harness = await RouterTestingHarness.create(ruta);
      const esUnreal = RUTAS_SIMULADOR.includes(ruta);
      const esDashboard = ruta === '/dashboard';
      expect(TestBed.inject(Router).url).toBe(
        ruta === '/' ? '/acceso' : esUnreal ? '/simulador-unreal' : esDashboard ? '/dashboard' : '/login',
      );
      expect(
        harness.routeNativeElement?.querySelector(
          ruta === '/' ? 'h1' : esUnreal ? '#titulo-disponibilidad' : esDashboard ? '#bienvenida-dashboard' : 'form',
        ),
      ).not.toBeNull();
      for (const operacion of Object.values(gateway)) {
        expect(operacion).not.toHaveBeenCalled();
      }
    });
  }

  for (const ruta of RUTAS_SIMULADOR) {
    it(`${ruta} abre el visor de MUNDO-24 y nunca un simulador 2D/2.5D`, async () => {
      const harness = await RouterTestingHarness.create(ruta);
      const pantalla = harness.routeNativeElement as HTMLElement;
      expect(TestBed.inject(Router).url).toBe('/simulador-unreal');
      expect(pantalla.textContent).toContain('Ciudad 3D pendiente de habilitación');
      // DC-MVP-09-R07-IMP: el aviso ya no expone «Pixel Streaming» al estudiante; se identifica el visor por su bloque.
      expect(pantalla.querySelector('#titulo-disponibilidad')).not.toBeNull();
      expect(pantalla.textContent).not.toContain('2.5D');
      expect(pantalla.querySelector('canvas, app-visor-ciudad-2d5, app-simulador-temporal, app-simulador-integrado-page')).toBeNull();
      expect(pantalla.querySelector('video')).toBeNull();
    });
  }
});
