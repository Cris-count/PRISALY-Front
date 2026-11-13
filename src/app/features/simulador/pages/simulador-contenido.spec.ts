import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../../core/config/api.config';
import { ParticipacionCoordinador } from '../services/participacion.coordinador';
import { provideParticipacionHttp } from '../services/participacion-http.gateway';
import { contenidoPrueba, ID_INTENTO_CONTENIDO as ID } from '../testing/contenido-intento.fixture';
import { SimuladorPage } from './simulador-page';

describe('I5: composición de contenido sin vínculo narrativo', () => {
  let fixture: ComponentFixture<SimuladorPage>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = () => html().textContent ?? '';
  async function cargar(id = ID) {
    fixture.componentRef.setInput('idIntentoContenido', id);
    await fixture.whenStable();
  }
  function req(id = ID) {
    return http.expectOne(`/api/v1/estudiantes/intentos/${id}/contenido`);
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

  it('muestra contenido académico en orden, sin botones de respuesta ni guion inferido', async () => {
    await cargar();
    expect(texto()).toContain('Consultando contenido académico');
    req().flush(contenidoPrueba());
    await fixture.whenStable();
    expect(texto()).toContain(
      'Contenido académico disponible. Experiencia narrativa no vinculada.',
    );
    expect(texto()).toContain('Caso de prueba');
    expect(texto()).toContain('Desarrollo de prueba');
    expect(texto()).not.toContain('null');
    expect(texto().indexOf('Pregunta 1.1')).toBeLessThan(texto().indexOf('Pregunta 1.2'));
    expect(texto().indexOf('Pregunta 1.2')).toBeLessThan(texto().indexOf('Pregunta 2.1'));
    expect(html().querySelector('app-panel-narrativo')).toBeNull();
    expect(html().querySelector('input, textarea, select')).toBeNull();
    expect(html().querySelectorAll('button').length).toBe(1);
    const coordinador = fixture.debugElement.injector.get(ParticipacionCoordinador);
    const p = contenidoPrueba().caso.escenarios[0].preguntas[0];
    coordinador.guardar({ idPregunta: p.idPregunta, idOpcionSeleccionada: p.opciones[0].idOpcion });
    expect(coordinador.intento()).toBeNull();
    http.expectNone(() => true);
  });

  it('presenta texto como texto, sin HTML ejecutable ni escrituras en storage', async () => {
    const storage = spyOn(Storage.prototype, 'setItem');
    await cargar();
    const cuerpo = JSON.parse(JSON.stringify(contenidoPrueba()));
    cuerpo.caso.titulo = '<img src=x onerror=alert(1)>';
    req().flush(cuerpo);
    await fixture.whenStable();
    expect(texto()).toContain('<img src=x onerror=alert(1)>');
    expect(html().querySelector('img')).toBeNull();
    expect(storage).not.toHaveBeenCalled();
  });

  it('cambiar contexto cancela la solicitud anterior y elimina el contenido previo', async () => {
    await cargar();
    const primera = req();
    const otro = contenidoPrueba().idSesion;
    await cargar(otro);
    expect(primera.cancelled).toBeTrue();
    req(otro).flush({ ...contenidoPrueba(), idIntento: otro });
    await fixture.whenStable();
    expect(texto()).toContain('Caso de prueba');
    await cargar(ID);
    expect(texto()).not.toContain('Caso de prueba');
    req().flush(contenidoPrueba());
    await fixture.whenStable();
  });

  it('salir cancela la consulta y permite usar SIM-01 sin HTTP académico', async () => {
    await cargar();
    const pendiente = req();
    html().querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(pendiente.cancelled).toBeTrue();
    const boton = Array.from(html().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ver demostración'),
    )!;
    boton.click();
    await fixture.whenStable();
    expect(texto()).toContain('Historia demostrativa');
    http.expectNone(() => true);
  });

  it('destruir la página cancela la consulta de contenido', async () => {
    await cargar();
    const pendiente = req();
    fixture.destroy();
    expect(pendiente.cancelled).toBeTrue();
  });

  it('409 mantiene la vista sin contenido ni operaciones de respuesta', async () => {
    await cargar();
    req().flush(
      { code: 'CONTENIDO_INTENTO_NO_DISPONIBLE', detail: 'interno' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    expect(texto()).toContain('El contenido académico de este intento no está disponible');
    expect(texto()).not.toContain('interno');
    expect(html().querySelector('app-contenido-academico, app-panel-narrativo, input')).toBeNull();
    http.expectNone(() => true);
  });

  it('un ID inválido falla sin HTTP ni posibilidad de guardar', async () => {
    await cargar('demo-intento');
    expect(texto()).toContain('No se pudo consultar el contenido');
    expect(html().querySelector('app-contenido-academico')).toBeNull();
    const coordinador = fixture.debugElement.injector.get(ParticipacionCoordinador);
    coordinador.guardar({ idPregunta: ID, idOpcionSeleccionada: ID });
    http.expectNone(() => true);
  });
});
