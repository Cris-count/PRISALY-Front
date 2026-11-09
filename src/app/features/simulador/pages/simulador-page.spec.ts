import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Subject, throwError } from 'rxjs';

import { ContratoPendienteError, ParticipacionGateway } from '../services/participacion.gateway';
import { SimuladorStore } from '../services/simulador.store';
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

  it('permite salir de una carga pendiente sin que un fallo tardío sustituya la pantalla inicial', async () => {
    const respuesta = new Subject<unknown>();
    gateway.consultarSesionesAutorizadas.and.returnValue(respuesta);
    await pulsar('Consultar sesiones');
    await pulsar('Volver al inicio');
    respuesta.error(new HttpErrorResponse({ status: 503 }));
    await fixture.whenStable();

    expect(respuesta.observed).toBeFalse();
    expect(elemento().querySelector('app-pantalla-inicio')).not.toBeNull();
    expect(elemento().querySelector('[role=alert]')).toBeNull();
    expect(gateway.iniciarIntento).not.toHaveBeenCalled();
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

  describe('SIM-01: narrativa desacoplada', () => {
    for (const ruta of ['Conversar primero', 'Observar primero']) {
      it(`completa la ruta ${ruta} sin cambiar preguntas ni llamar a M5`, async () => {
        await pulsar('Ver demostración');
        const store = fixture.debugElement.injector.get(SimuladorStore);
        elemento().querySelector<HTMLInputElement>('input[type=radio]')!.click();
        await fixture.whenStable();
        const caso = store.caso();
        const selecciones = [...store.selecciones()];
        await pulsar('Siguiente diálogo'); await pulsar('Siguiente diálogo');
        await pulsar(ruta);
        expect(texto()).toContain(ruta === 'Conversar primero' ? 'expresión alegre' : 'expresión atenta');
        await pulsar('Entrar a la escena');
        await pulsar('Siguiente diálogo'); await pulsar('Reunir al grupo');
        await pulsar('Entrar a la escena');
        expect(texto()).toContain(ruta === 'Conversar primero' ? 'conversación inicial' : 'observación inicial');
        await pulsar('Siguiente diálogo'); await pulsar('Despedirse');
        await pulsar('Entrar a la escena'); await pulsar('Siguiente diálogo');
        expect(texto()).toContain('Historia demostrativa terminada');
        expect(texto()).toContain('Escenas visitadas: 4 de 6');
        expect(store.caso()).toBe(caso);
        expect([...store.selecciones()]).toEqual(selecciones);
        expect(store.indice()).toBe(0);
        expect(store.fase()).toBe('en-curso');
        await pulsar('Reiniciar historia');
        expect(texto()).toContain('Encuentro de demostración');
        expect([...store.selecciones()]).toEqual(selecciones);
        for (const spy of Object.values(gateway)) expect(spy).not.toHaveBeenCalled();
      });
    }

    it('pausa la narrativa durante la confirmación y reinicia al salir y volver', async () => {
      await pulsar('Ver demostración');
      await pulsar('Siguiente diálogo'); await pulsar('Siguiente diálogo');
      await pulsar('Conversar primero');
      await pulsar('Finalizar');
      expect(boton('Entrar a la escena').closest('fieldset')!.disabled).toBeTrue();
      await pulsar('Seguir respondiendo');
      expect(boton('Entrar a la escena').closest('fieldset')!.disabled).toBeFalse();
      await pulsar('Entrar a la escena');
      await pulsar('Atrás en la historia');
      expect(texto()).toContain('Los personajes se acercan para conversar');
      await pulsar('Finalizar'); await pulsar('Sí, finalizar');
      await pulsar('Volver al inicio'); await pulsar('Ver demostración');
      expect(texto()).toContain('Escenas visitadas: 1 de 6');
      expect(texto()).toContain('expresión serena');
      for (const spy of Object.values(gateway)) expect(spy).not.toHaveBeenCalled();
    });
  });
});
