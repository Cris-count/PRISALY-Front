import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../../core/config/api.config';
import { GUION_DEMOSTRACION } from '../demo/guion-demostracion';
import { provideParticipacionHttp } from '../services/participacion-http.gateway';
import { ContextoNarrativoAcademico, SimuladorPage } from './simulador-page';

const ID = '11111111-1111-4111-8111-111111111111';
const P = '22222222-2222-4222-8222-222222222222';
const O = '33333333-3333-4333-8333-333333333333';
// Contexto ficticio solo de pruebas. No se registra como contenido de aplicación.
const contexto: ContextoNarrativoAcademico = {
  idIntento: ID,
  guion: GUION_DEMOSTRACION,
  preguntas: [{ id: P, enunciado: 'Prueba', opciones: [{ id: O, texto: 'Prueba' }] }],
  vinculos: [
    {
      guionId: GUION_DEMOSTRACION.id,
      escenaId: 'bienvenida',
      decisionId: 'conversar',
      idPregunta: P,
      idOpcionSeleccionada: O,
    },
  ],
};
const intento = {
  idIntento: ID,
  estado: 'EnCurso',
  inicio: '2026-11-13T10:00:00Z',
  limiteTemporal: '2026-11-13T11:00:00Z',
  ahoraServidor: '2026-11-13T10:10:00Z',
  motivoFinalizacion: null,
  respuestas: [],
};

describe('SimuladorPage: participación por contexto explícito', () => {
  let fixture: ComponentFixture<SimuladorPage>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = () => html().textContent ?? '';
  const boton = (etiqueta: string) =>
    Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.includes(etiqueta));
  async function pulsar(etiqueta: string) {
    boton(etiqueta)!.click();
    await fixture.whenStable();
  }
  async function cargar() {
    fixture.componentRef.setInput('contextoAcademico', contexto);
    await fixture.whenStable();
    http.expectOne(`/api/v1/estudiantes/intentos/${ID}`).flush(intento);
    await fixture.whenStable();
  }
  async function decidir() {
    await pulsar('Siguiente diálogo');
    await pulsar('Siguiente diálogo');
    await pulsar('Conversar primero');
  }
  function put() {
    return http.expectOne(`/api/v1/estudiantes/intentos/${ID}/respuestas/${P}`);
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig('/api'),
        provideParticipacionHttp(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SimuladorPage);
    await fixture.whenStable();
  });
  afterEach(() => http.verify());

  it('no realiza HTTP sin contexto, incluso con proveedor HTTP registrado explícitamente', () => {
    expect(texto()).toContain('Ver demostración');
    http.expectNone(() => true);
  });

  it('muestra la carga y mantiene los controles bloqueados hasta consultar el intento', async () => {
    fixture.componentRef.setInput('contextoAcademico', contexto);
    await fixture.whenStable();
    expect(texto()).toContain('Consultando participación');
    expect(html().querySelector('fieldset')?.disabled).toBeTrue();
    http.expectOne(() => true).flush(intento);
    await fixture.whenStable();
    expect(html().querySelector('fieldset')?.disabled).toBeFalse();
    expect(boton('Reiniciar historia')).toBeUndefined();
    expect(boton('Finalizar')).toBeUndefined();
  });

  it('actualiza la escena y el progreso después de confirmar HTTP, conservando respuestas al retroceder', async () => {
    await cargar();
    await decidir();
    expect(texto()).toContain('Guardando respuesta');
    expect(texto()).toContain('0 de 1 respuestas confirmadas');
    expect(boton('Entrar a la escena')).toBeUndefined();
    expect(html().querySelector('fieldset')?.disabled).toBeTrue();
    put().flush({ idPregunta: P, idOpcionSeleccionada: O, revision: 1 });
    await fixture.whenStable();
    expect(texto()).toContain('1 de 1 respuestas confirmadas');
    expect(boton('Entrar a la escena')).toBeDefined();
    await pulsar('Entrar a la escena');
    expect(texto()).toContain('Una conversación ficticia');
    await pulsar('Atrás en la historia');
    expect(texto()).toContain('1 de 1 respuestas confirmadas');
    http.expectNone(() => true);
  });

  it('verifica una respuesta perdida sin avanzar ni repetir PUT automáticamente', async () => {
    await cargar();
    await decidir();
    put().error(new ProgressEvent('error'), { status: 0 });
    await fixture.whenStable();
    expect(texto()).toContain('El guardado no está confirmado');
    await pulsar('Verificar intento');
    http
      .expectOne(() => true)
      .flush({ ...intento, respuestas: [{ idPregunta: P, idOpcionSeleccionada: O, revision: 1 }] });
    await fixture.whenStable();
    expect(boton('Entrar a la escena')).toBeUndefined();
    await pulsar('Conversar primero');
    expect(boton('Entrar a la escena')).toBeDefined();
    http.expectNone(() => true);
  });

  it('muestra 401 sin detalles internos ni permitir nuevas decisiones', async () => {
    await cargar();
    await decidir();
    put().flush(
      { code: 'UNAUTHENTICATED', message: 'secreto interno' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    expect(texto()).toContain('Vuelve a ingresar');
    expect(texto()).not.toContain('secreto interno');
    expect(html().querySelector('fieldset')?.disabled).toBeTrue();
    expect(boton('Verificar intento')).toBeUndefined();
  });

  it('rechaza contenido inconsistente sin consultar M5', async () => {
    fixture.componentRef.setInput('contextoAcademico', {
      ...contexto,
      vinculos: [{ ...contexto.vinculos[0], decisionId: 'inexistente' }],
    });
    await fixture.whenStable();
    expect(texto()).toContain('No se pudo cargar el caso');
    expect(html().querySelector('app-panel-narrativo')).toBeNull();
    http.expectNone(() => true);
  });

  it('salir cancela el guardado, muestra el inicio y permite entrar a la demo sin HTTP', async () => {
    await cargar();
    await decidir();
    const req = put();
    await pulsar('Salir de la participación');
    expect(req.cancelled).toBeTrue();
    expect(html().querySelector('app-pantalla-inicio')).not.toBeNull();
    await pulsar('Ver demostración');
    expect(texto()).toContain('Historia demostrativa');
    expect(boton('Reiniciar historia')).toBeDefined();
    http.expectNone(() => true);
  });

  it('destruir la página cancela la escritura pendiente', async () => {
    await cargar();
    await decidir();
    const req = put();
    fixture.destroy();
    expect(req.cancelled).toBeTrue();
  });

  it('cambiar el contexto cancela la carga previa y conserva el panel nuevo bloqueado', async () => {
    fixture.componentRef.setInput('contextoAcademico', contexto);
    await fixture.whenStable();
    const anterior = http.expectOne(() => true);
    fixture.componentRef.setInput('contextoAcademico', { ...contexto, idIntento: O });
    await fixture.whenStable();
    expect(anterior.cancelled).toBeTrue();
    expect(html().querySelector('fieldset')?.disabled).toBeTrue();
    http.expectOne(`/api/v1/estudiantes/intentos/${O}`).flush({ ...intento, idIntento: O });
    await fixture.whenStable();
    expect(html().querySelector('fieldset')?.disabled).toBeFalse();
    expect(texto()).toContain('0 de 1 respuestas confirmadas');
  });

  it('no ofrece cambiar una respuesta confirmada al volver a una decisión', async () => {
    const otra = '77777777-7777-4777-8777-777777777777';
    fixture.componentRef.setInput('contextoAcademico', {
      ...contexto,
      preguntas: [
        {
          ...contexto.preguntas[0],
          opciones: [...contexto.preguntas[0].opciones, { id: otra, texto: 'Otra' }],
        },
      ],
      vinculos: [
        ...contexto.vinculos,
        { ...contexto.vinculos[0], decisionId: 'observar', idOpcionSeleccionada: otra },
      ],
    });
    await fixture.whenStable();
    http
      .expectOne(() => true)
      .flush({ ...intento, respuestas: [{ idPregunta: P, idOpcionSeleccionada: O, revision: 2 }] });
    await fixture.whenStable();
    await pulsar('Siguiente diálogo');
    await pulsar('Siguiente diálogo');
    expect(boton('Observar primero')!.disabled).toBeTrue();
    await pulsar('Observar primero');
    expect(boton('Entrar a la escena')).toBeUndefined();
    await pulsar('Conversar primero');
    expect(boton('Entrar a la escena')).toBeDefined();
    await pulsar('Atrás en la historia');
    expect(boton('Observar primero')!.disabled).toBeTrue();
    http.expectNone(() => true);
  });

  it('un intento finalizado no permite interacción narrativa académica', async () => {
    fixture.componentRef.setInput('contextoAcademico', contexto);
    await fixture.whenStable();
    http.expectOne(() => true).flush({ ...intento, estado: 'Finalizado' });
    await fixture.whenStable();
    expect(texto()).toContain('El intento está finalizado');
    expect(html().querySelector('fieldset')?.disabled).toBeTrue();
  });
});
