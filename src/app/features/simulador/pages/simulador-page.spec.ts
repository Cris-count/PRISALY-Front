import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, throwError } from 'rxjs';

import { ContratoPendienteError, ParticipacionGateway } from '../services/participacion.gateway';
import { SimuladorPage } from './simulador-page';

describe('SimuladorPage', () => {
  let fixture: ComponentFixture<SimuladorPage>;
  let gateway: jasmine.SpyObj<ParticipacionGateway>;

  const elemento = () => fixture.nativeElement as HTMLElement;
  const texto = () => elemento().textContent ?? '';
  const boton = (etiqueta: string) =>
    Array.from(elemento().querySelectorAll('button')).find((b) =>
      b.textContent?.includes(etiqueta),
    ) as HTMLButtonElement;

  async function pulsar(etiqueta: string) {
    boton(etiqueta).click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
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
      providers: [{ provide: ParticipacionGateway, useValue: gateway }],
    });
    fixture = TestBed.createComponent(SimuladorPage);
    await fixture.whenStable();
  });

  it('al cargarse (o recargarse) muestra la pantalla inicial sin contactar a M5', () => {
    expect(elemento().querySelector('app-pantalla-inicio')).not.toBeNull();
    for (const spy of Object.values(gateway)) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('muestra el estado de carga al consultar sesiones', async () => {
    gateway.consultarSesionesAutorizadas.and.returnValue(NEVER);

    await pulsar('Consultar sesiones');

    expect(elemento().querySelector('app-estado-carga [role=status]')).not.toBeNull();
  });

  it('muestra el error de contrato pendiente y permite volver', async () => {
    gateway.consultarSesionesAutorizadas.and.returnValue(
      throwError(() => new ContratoPendienteError('consultarSesionesAutorizadas')),
    );

    await pulsar('Consultar sesiones');

    expect(elemento().querySelector('[role=alert]')?.textContent).toContain(
      'No se inició ningún intento',
    );
    expect(gateway.iniciarIntento).not.toHaveBeenCalled();

    await pulsar('Volver al inicio');
    expect(elemento().querySelector('app-pantalla-inicio')).not.toBeNull();
  });

  it('ofrece reintentar solo cuando el fallo es reintentable', async () => {
    gateway.consultarSesionesAutorizadas.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    await pulsar('Consultar sesiones');
    expect(boton('Reintentar')).toBeDefined();

    gateway.consultarSesionesAutorizadas.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    await pulsar('Reintentar');

    expect(gateway.consultarSesionesAutorizadas).toHaveBeenCalledTimes(2);
    expect(texto()).toContain('Vuelve a ingresar');
    expect(boton('Reintentar')).toBeUndefined();
  });

  describe('recorrido de demostración', () => {
    beforeEach(async () => {
      await pulsar('Ver demostración');
    });

    it('identifica los datos como simulados y muestra todas las áreas', () => {
      expect(texto()).toContain('Modo demostración');
      for (const selector of [
        'app-escenario-2d',
        'app-panel-contexto',
        'app-panel-preguntas',
        'app-indicador-progreso',
        'app-temporizador',
        'app-barra-acciones',
      ]) {
        expect(elemento().querySelector(selector)).withContext(selector).not.toBeNull();
      }
    });

    it('selecciona respuestas, navega y actualiza el progreso', async () => {
      elemento().querySelectorAll<HTMLInputElement>('input[type=radio]')[0].click();
      await fixture.whenStable();
      expect(texto()).toContain('Pregunta 1 de 3 · 1 respondidas');

      await pulsar('Continuar');
      expect(texto()).toContain('Pregunta 2 de 3');

      await pulsar('Anterior');
      const marcada = elemento().querySelector<HTMLInputElement>('input[type=radio]:checked');
      expect(marcada).not.toBeNull();
    });

    it('confirma la finalización y aclara que no se registró nada', async () => {
      await pulsar('Finalizar');
      expect(elemento().querySelector('app-confirmacion-finalizacion')).not.toBeNull();
      expect(elemento().querySelector('fieldset')?.disabled).toBeTrue();

      await pulsar('Seguir respondiendo');
      expect(elemento().querySelector('app-barra-acciones')).not.toBeNull();

      await pulsar('Finalizar');
      await pulsar('Sí, finalizar');
      expect(texto()).toContain('no se registró ningún intento ni respuesta');
      expect(gateway.finalizarIntento).not.toHaveBeenCalled();
    });
  });
});
