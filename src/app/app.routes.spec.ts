import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { ParticipacionGateway } from './features/simulador/services/participacion.gateway';

describe('Rutas públicas de presentación', () => {
  let gateway: jasmine.SpyObj<ParticipacionGateway>;

  beforeEach(() => {
    gateway = jasmine.createSpyObj<ParticipacionGateway>('ParticipacionGateway', [
      'consultarSesionesAutorizadas', 'iniciarIntento', 'consultarIntento',
      'registrarRespuesta', 'consultarProgreso', 'reanudarIntento', 'finalizarIntento',
    ]);
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: ParticipacionGateway, useValue: gateway }],
    });
  });

  for (const ruta of ['/', '/simulador', '/ruta-inexistente']) {
    it(`resuelve ${ruta} hacia el inicio público sin atribuir identidad ni iniciar intentos`, async () => {
      const harness = await RouterTestingHarness.create(ruta);
      expect(TestBed.inject(Router).url).toBe('/simulador');
      expect(harness.routeNativeElement?.querySelector('app-pantalla-inicio')).not.toBeNull();
      for (const operacion of Object.values(gateway)) {
        expect(operacion).not.toHaveBeenCalled();
      }
    });
  }
});
