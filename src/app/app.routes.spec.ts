import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
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
      providers: [provideRouter(routes), { provide: ParticipacionGateway, useValue: gateway }],
    });
  });

  for (const ruta of ['/', '/login', '/dashboard', '/simulador', '/simulador-unreal', '/simulador-tecnico-2d5', '/simulador-integrado', '/ruta-inexistente']) {
    it(`resuelve ${ruta} hacia el inicio público sin atribuir identidad ni iniciar intentos`, async () => {
      const harness = await RouterTestingHarness.create(ruta);
      const esUnreal = ruta === '/simulador' || ruta === '/simulador-unreal';
      const esTecnico = ruta === '/simulador-tecnico-2d5';
      const esIntegrado = ruta === '/simulador-integrado';
      const esDashboard = ruta === '/dashboard';
      expect(TestBed.inject(Router).url).toBe(
        esUnreal ? '/simulador-unreal' : esTecnico ? '/simulador-tecnico-2d5' : esIntegrado ? '/simulador-integrado' : esDashboard ? '/dashboard' : '/login',
      );
      expect(
        harness.routeNativeElement?.querySelector(
          esUnreal ? '#titulo-disponibilidad' : esTecnico ? '#simulador-titulo' : esIntegrado ? '.pantalla-inicio-integrada' : esDashboard ? '#bienvenida-dashboard' : 'form',
        ),
      ).not.toBeNull();
      for (const operacion of Object.values(gateway)) {
        expect(operacion).not.toHaveBeenCalled();
      }
    });
  }

  it('presenta la escena técnica sin mapa anterior ni consultas académicas', async () => {
    const harness = await RouterTestingHarness.create('/simulador-tecnico-2d5');
    const pantalla = harness.routeNativeElement as HTMLElement;
    expect(pantalla.textContent).toContain('Ciudad PRISALY');
    expect(pantalla.textContent).toContain('Selecciona un lugar o camino.');
    expect(pantalla.querySelector('[role="application"]')).not.toBeNull();
    expect(pantalla.querySelector('img, svg, app-mapa-interactivo, app-recorrido-mapa')).toBeNull();
    for (const operacion of Object.values(gateway)) expect(operacion).not.toHaveBeenCalled();
  });

  it('el acceso principal al simulador abre Unreal y nunca arranca el mapa Phaser como alternativa automática', async () => {
    const harness = await RouterTestingHarness.create('/simulador');
    const pantalla = harness.routeNativeElement as HTMLElement;
    expect(TestBed.inject(Router).url).toBe('/simulador-unreal');
    expect(pantalla.textContent).toContain('Ciudad 3D pendiente de habilitación');
    expect(pantalla.textContent).toContain('Pixel Streaming');
    expect(pantalla.querySelector('canvas, app-visor-ciudad-2d5')).toBeNull();
    expect(pantalla.querySelector('video')).toBeNull();
  });
});
