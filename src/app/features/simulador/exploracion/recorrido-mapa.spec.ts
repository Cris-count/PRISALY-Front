import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ParticipacionGateway } from '../services/participacion.gateway';
import { SimuladorPage } from '../pages/simulador-page';
import { RecorridoMapa } from './recorrido-mapa';
import { ExploracionStore } from './exploracion.store';

@Component({
  imports: [RecorridoMapa],
  template: ` <ng-template
      #exterior
      let-espacio
      let-seleccionado="seleccionado"
      let-visitas="visitas"
    >
      <span
        >Exterior externo: {{ espacio.plantillaVisual }} · {{ seleccionado }} · {{ visitas }}</span
      >
    </ng-template>
    <ng-template #interior let-espacio let-emitir="emitir" let-activa="interaccionActiva">
      <p>Interior externo: {{ espacio.plantillaVisual }} · {{ activa }}</p>
      <button (click)="emitir({ tipo: 'interaccion-iniciada', espacioId: espacio.id })">
        Consultar personaje externo
      </button>
      <button (click)="emitir({ tipo: 'interaccion-finalizada', espacioId: espacio.id })">
        Terminar interacción externa
      </button>
      <button (click)="emitir({ tipo: 'salida-solicitada', espacioId: espacio.id })">
        Abandonar interior externo
      </button>
    </ng-template>
    <app-recorrido-mapa [plantillas]="{ exterior, interior }" />`,
})
class HostBibliotecaVisual {}

describe('RecorridoMapa', () => {
  let fixture: ComponentFixture<RecorridoMapa>;
  let http: HttpTestingController;
  let gateway: ParticipacionGateway;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = () => html().textContent ?? '';
  const boton = (nombre: string) =>
    Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim() === nombre)!;
  async function pulsar(nombre: string) {
    boton(nombre).click();
    await fixture.whenStable();
  }
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    gateway = TestBed.inject(ParticipacionGateway);
    for (const operacion of [
      'consultarSesionesAutorizadas',
      'iniciarIntento',
      'consultarIntento',
      'consultarContenidoIntento',
      'registrarRespuesta',
      'consultarProgreso',
      'reanudarIntento',
      'finalizarIntento',
    ] as const)
      spyOn(gateway, operacion);
    fixture = TestBed.createComponent(RecorridoMapa);
    await fixture.whenStable();
  });
  afterEach(() => {
    for (const spy of Object.values(gateway))
      if (jasmine.isSpy(spy)) expect(spy).not.toHaveBeenCalled();
    http.expectNone(() => true);
    http.verify();
  });
  async function abrirMapa() {
    await pulsar('Entrar al mapa');
  }
  async function seleccionar(nombre: string) {
    html()
      .querySelector<HTMLButtonElement>(`button[aria-label="${nombre}, seleccionar espacio"]`)!
      .click();
    await fixture.whenStable();
  }
  async function cuestionario() {
    await abrirMapa();
    await pulsar('PreguntasPuedes entrar sin visitar espacios');
    await pulsar('Comenzar preguntas');
  }

  it('presenta el caso sin consultas académicas y renderiza edificios y punto central', async () => {
    expect(texto()).toContain('No hay un caso académico real');
    await abrirMapa();
    expect(html().querySelectorAll('button[aria-pressed]').length).toBe(3);
    expect(html().querySelector('img')?.getAttribute('src')).toBe('images/prisaly-logo.png');
    expect(texto()).toContain('Plantilla pendiente');
  });
  it('selecciona, entra, regresa y repite visitas en orden libre', async () => {
    await abrirMapa();
    await seleccionar('Oficinas');
    expect(html().querySelector('[aria-pressed="true"]')?.textContent).toContain('Oficinas');
    await pulsar('Entrar a Oficinas');
    expect(texto()).toContain('Interior demostrativo pendiente');
    await pulsar('Volver al mapa');
    await seleccionar('Hospital');
    await pulsar('Entrar a Hospital');
    await pulsar('Volver al mapa');
    await seleccionar('Oficinas');
    await pulsar('Entrar a Oficinas');
    await pulsar('Volver al mapa');
    expect(fixture.debugElement.injector.get(ExploracionStore).visitas().get('demo-oficinas')).toBe(
      2,
    );
  });
  it('la confirmación es modal, cancelar o Escape conserva visitas y selección', async () => {
    await abrirMapa();
    await seleccionar('Hospital');
    await pulsar('Entrar a Hospital');
    await pulsar('Volver al mapa');
    await pulsar('PreguntasPuedes entrar sin visitar espacios');
    const dialogo = html().querySelector('dialog')!;
    expect(dialogo.open).toBeTrue();
    expect(dialogo.contains(document.activeElement)).toBeTrue();
    await pulsar('Seguir explorando');
    expect(html().querySelector('dialog')).toBeNull();
    expect(boton('Entrar a Hospital')).toBeDefined();
    await pulsar('PreguntasPuedes entrar sin visitar espacios');
    html()
      .querySelector('dialog')!
      .dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();
    expect(html().querySelector('dialog')).toBeNull();
    expect(fixture.debugElement.injector.get(ExploracionStore).visitas().get('demo-hospital')).toBe(
      1,
    );
  });
  it('admite preguntas directamente y oculta mapa, salida e interiores durante el bloque', async () => {
    await cuestionario();
    expect(texto()).toContain('Preguntas de ejemplo');
    expect(html().querySelector('app-mapa-interactivo')).toBeNull();
    expect(boton('Salir del recorrido')).toBeUndefined();
    expect(boton('Volver al mapa')).toBeUndefined();
    expect(boton('Pregunta anterior')).toBeUndefined();
    const store = fixture.debugElement.injector.get(ExploracionStore);
    store.volverAlMapa();
    store.seleccionar('demo-hospital');
    store.entrar();
    await fixture.whenStable();
    expect(store.fase()).toBe('cuestionario');
    expect(store.visitas().size).toBe(0);
  });
  it('reutiliza las preguntas y termina solo el ejemplo sin emitir finalización académica', async () => {
    await cuestionario();
    expect(boton('Terminar demostración').disabled).toBeTrue();
    for (let n = 0; n < 3; n++) {
      expect(boton('Pregunta siguiente').disabled).toBeTrue();
      expect(boton('Pregunta anterior')).toBeUndefined();
      html().querySelector<HTMLInputElement>('input[type="radio"]')!.click();
      await fixture.whenStable();
      if (n < 2) await pulsar('Pregunta siguiente');
    }
    expect(html().querySelector('input:checked')).not.toBeNull();
    await pulsar('Terminar demostración');
    expect(texto()).toContain('Recorrido demostrativo completado');
    expect(texto()).toContain('no se enviaron respuestas');
    expect(boton('Salir del recorrido')).toBeDefined();
  });
  it('conserva SIM-01 como historia independiente y permite volver al mapa', async () => {
    await abrirMapa();
    await seleccionar('Comisaría');
    await pulsar('Entrar a Comisaría');
    await pulsar('Ver historia independiente SIM-01');
    expect(html().querySelector('app-panel-narrativo')).not.toBeNull();
    await pulsar('Siguiente diálogo');
    await pulsar('Volver al mapa');
    expect(html().querySelector('app-panel-narrativo')).toBeNull();
    expect(texto()).toContain('Visitado');
  });
  it('los espacios y punto central son botones nativos enfocados por teclado, sin animación de movimiento', async () => {
    await abrirMapa();
    const hospital = html().querySelector<HTMLButtonElement>(
      'button[aria-label="Hospital, seleccionar espacio"]',
    )!;
    hospital.focus();
    expect(document.activeElement).toBe(hospital);
    expect(hospital.tabIndex).toBe(0);
    expect(getComputedStyle(hospital).animationName).toBe('none');
    hospital.click();
    await fixture.whenStable();
    expect(hospital.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Puntos de composición del mapa', () => {
  it('admite una biblioteca externa con eventos, sin conocer el motor narrativo', async () => {
    const fixture = TestBed.createComponent(HostBibliotecaVisual);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;
    const pulsar = async (nombre: string) => {
      Array.from(html.querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === nombre)!
        .click();
      await fixture.whenStable();
    };
    await pulsar('Entrar al mapa');
    expect(html.textContent).toContain('Exterior externo: hospital');
    html
      .querySelector<HTMLButtonElement>('button[aria-label="Hospital, seleccionar espacio"]')!
      .click();
    await fixture.whenStable();
    await pulsar('Entrar a Hospital');
    expect(html.textContent).toContain('Interior externo: hospital');
    expect(html.textContent).not.toContain('Interior demostrativo pendiente');
    await pulsar('Consultar personaje externo');
    expect(html.textContent).toContain('Interacción visual en curso');
    await pulsar('Terminar interacción externa');
    expect(html.textContent).toContain('Puedes regresar al mapa');
    await pulsar('Abandonar interior externo');
    expect(html.querySelector('app-mapa-interactivo')).not.toBeNull();
  });
  it('se abre desde la página del simulador sin alterar la demostración original', async () => {
    const fixture = TestBed.createComponent(SimuladorPage);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;
    const pulsar = async (nombre: string) => {
      Array.from(html.querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === nombre)!
        .click();
      await fixture.whenStable();
    };
    await pulsar('Explorar mapa demostrativo');
    expect(html.querySelector('app-recorrido-mapa')).not.toBeNull();
    await pulsar('Salir del recorrido');
    expect(html.querySelector('app-pantalla-inicio')).not.toBeNull();
    await pulsar('Ver demostración con datos simulados');
    expect(html.querySelector('app-panel-narrativo')).not.toBeNull();
  });
});
