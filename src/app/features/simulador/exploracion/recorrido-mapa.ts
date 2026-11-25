import { NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PanelNarrativo } from '../components/panel-narrativo';
import { PanelPreguntas } from '../components/panel-preguntas';
import { IndicadorProgreso } from '../components/indicador-progreso';
import { SimuladorStore } from '../services/simulador.store';
import { ConfirmacionEntrada } from './confirmacion-entrada';
import { ExploracionStore } from './exploracion.store';
import { MAPA_DEMOSTRACION } from './mapa-demo';
import { MapaInteractivo } from './mapa-interactivo';
import { ConfiguracionMapa, EventoEspacioVisual, PlantillasEspacio } from './mapa.models';

/** Punto de composición de Nicolás. Las piezas interiores/exteriores se reciben de Cristian. */
@Component({
  selector: 'app-recorrido-mapa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExploracionStore, SimuladorStore],
  imports: [
    NgTemplateOutlet,
    MapaInteractivo,
    ConfirmacionEntrada,
    PanelNarrativo,
    PanelPreguntas,
    IndicadorProgreso,
  ],
  template: `
    <section aria-label="Recorrido demostrativo del mapa" class="recorrido">
      <header>
        <p class="etiqueta">DEMOSTRACIÓN · SIN REGISTRO ACADÉMICO</p>
        <h1 #titulo tabindex="-1">{{ exploracion.configuracion().titulo }}</h1>
        <p>Explora en el orden que prefieras o ve directamente a las preguntas.</p>
        @if (exploracion.fase() !== 'cuestionario' && exploracion.fase() !== 'confirmando') {
          <button type="button" class="boton" (click)="salir.emit()">Salir del recorrido</button>
        }
      </header>
      @switch (exploracion.fase()) {
        @case ('presentacion') {
          <article class="tarjeta">
            <h2>Investiga a tu ritmo</h2>
            <p>
              Este mapa contiene espacios de ejemplo. Selecciona uno y entra para explorar su
              integración visual.
            </p>
            <p>
              Las plantillas, personajes y conversaciones de cada lugar se incorporarán con
              Cristian. No hay un caso académico real asociado.
            </p>
            <button type="button" class="boton boton--primario" (click)="exploracion.comenzar()">
              Entrar al mapa
            </button>
          </article>
        }
        @case ('cuestionario') {
          <article class="tarjeta" aria-label="Cuestionario demostrativo">
            <h2>Preguntas de ejemplo</h2>
            <p>
              La exploración está cerrada durante este bloque. Para completar este ejemplo,
              selecciona una opción en cada pregunta. No es una regla académica oficial.
            </p>
            <app-indicador-progreso
              [actual]="preguntas.indice() + 1"
              [total]="preguntas.totalPreguntas()"
              [respondidas]="preguntas.respondidas()"
            />
            @if (preguntas.preguntaActual(); as pregunta) {
              <app-panel-preguntas
                [pregunta]="pregunta"
                [numero]="preguntas.indice() + 1"
                [seleccion]="preguntas.seleccionActual()"
                (seleccionar)="preguntas.seleccionarOpcion($event)"
              />
            }
            <div class="acciones">
              <button
                type="button"
                class="boton"
                [disabled]="preguntas.esUltima() || !preguntas.seleccionActual()"
                (click)="preguntas.siguiente()"
              >
                Pregunta siguiente
              </button>
              <button
                type="button"
                class="boton boton--primario"
                [disabled]="!puedeTerminar()"
                (click)="terminar()"
              >
                Terminar demostración
              </button>
            </div>
          </article>
        }
        @case ('completado') {
          <article class="tarjeta" role="status">
            <h2>Recorrido demostrativo completado</h2>
            <p>
              Completaste las preguntas de ejemplo. No se creó un intento, no se enviaron respuestas
              ni se calculó una calificación.
            </p>
            <p>
              La finalización académica y la recuperación del progreso real dependen de contratos
              Backend aún pendientes.
            </p>
          </article>
        }
        @default {
          @if (exploracion.espacioAbierto(); as espacio) {
            <article class="tarjeta" aria-label="Interior del espacio">
              <h2>{{ espacio.nombre }}</h2>
              <button type="button" class="boton" (click)="volver()">Volver al mapa</button>
              @if (plantillas().interior; as interior) {
                <ng-container
                  [ngTemplateOutlet]="interior"
                  [ngTemplateOutletContext]="{
                    $implicit: espacio,
                    interaccionActiva: exploracion.interaccionActiva(),
                    emitir: emitirEvento,
                  }"
                />
              } @else {
                <p class="sustituto">
                  Interior demostrativo pendiente de la plantilla «{{ espacio.plantillaVisual }}» de
                  Cristian.
                </p>
                <p>No se inventaron personajes ni testimonios para este lugar.</p>
                <button type="button" class="boton" (click)="verSim01.set(!verSim01())">
                  {{ verSim01() ? 'Ocultar historia SIM-01' : 'Ver historia independiente SIM-01' }}
                </button>
                @if (verSim01()) {
                  <p>
                    Historia original de ejemplo, independiente del edificio seleccionado y de las
                    preguntas.
                  </p>
                  <app-panel-narrativo />
                }
              }
              <p role="status">
                {{
                  exploracion.interaccionActiva()
                    ? 'Interacción visual en curso'
                    : 'Puedes regresar al mapa cuando quieras'
                }}
              </p>
            </article>
          } @else {
            <div class="area-mapa">
            <app-mapa-interactivo
              [configuracion]="exploracion.configuracion()"
              [seleccionado]="exploracion.seleccionado()"
              [visitas]="exploracion.visitas()"
              [exterior]="plantillas().exterior"
              (seleccionar)="exploracion.seleccionar($event)"
              (entrar)="exploracion.entrar()"
              (preguntas)="exploracion.solicitarPreguntas()"
            />
            <aside class="herramientas" aria-label="Herramientas de exploración">
              <div class="herramientas__botones" role="group" aria-label="Herramientas del mapa">
                <button type="button" class="herramienta" [attr.aria-expanded]="panelActivo() === 'lugares'"
                  aria-controls="panel-herramienta" (click)="alternarPanel('lugares')">
                  <span aria-hidden="true">📍</span> Lugares
                </button>
                <button type="button" class="herramienta" [attr.aria-expanded]="panelActivo() === 'caso'"
                  aria-controls="panel-herramienta" (click)="alternarPanel('caso')">
                  <span aria-hidden="true">📋</span> Información del caso
                </button>
                <button type="button" class="herramienta" [attr.aria-expanded]="panelActivo() === 'ayuda'"
                  aria-controls="panel-herramienta" (click)="alternarPanel('ayuda')">
                  <span aria-hidden="true">❔</span> Ayuda
                </button>
              </div>
              <div id="panel-herramienta" class="panel-herramienta" [hidden]="!panelActivo()">
                @switch (panelActivo()) {
                  @case ('lugares') {
                    <h2>Lugares</h2>
                    <p>Elige un lugar para seleccionarlo en el mapa.</p>
                    <ul class="lista-lugares">
                      @for (lugar of exploracion.configuracion().espacios; track lugar.id) {
                        <li>
                          <button type="button" class="lugar" [disabled]="!lugar.disponible"
                            [attr.aria-pressed]="exploracion.seleccionado() === lugar.id"
                            (click)="exploracion.seleccionar(lugar.id)">
                            <strong>{{ lugar.nombre }}</strong>
                            <span>{{ !lugar.disponible ? 'No disponible' : (exploracion.visitas().get(lugar.id) ? 'Visitado · ' + exploracion.visitas().get(lugar.id) : 'Sin visitar') }}</span>
                          </button>
                        </li>
                      }
                    </ul>
                  }
                  @case ('caso') {
                    <h2>Información del caso</h2>
                    <p>Esta es una demostración del recorrido. Todavía no hay un caso académico asociado.</p>
                  }
                  @case ('ayuda') {
                    <h2>Ayuda</h2>
                    <p>Selecciona un lugar en el mapa o en la lista y pulsa «Entrar» junto a él. Puedes visitarlos en cualquier orden o ir directamente a las preguntas desde PRISALY.</p>
                    <p>Al confirmar las preguntas de esta demostración, terminarás ese bloque antes de salir.</p>
                  }
                }
              </div>
            </aside>
            </div>
          }
          @if (exploracion.fase() === 'confirmando') {
            <app-confirmacion-entrada
              (cancelar)="exploracion.cancelarPreguntas()"
              (confirmar)="comenzarPreguntas()"
            />
          }
        }
      }
      <p class="nota">
        Estado visual temporal: recargar reinicia esta demostración. No representa una fase
        persistida de M5.
      </p>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .recorrido {
      display: grid;
      gap: 1rem;
      max-width: 1100px;
      margin: 0 auto;
    }
    .etiqueta {
      color: var(--color-aviso);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .area-mapa { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 1rem; align-items: start; }
    .herramientas { display: grid; gap: 0.75rem; }
    .herramientas__botones { display: grid; gap: 0.5rem; }
    .herramienta, .lugar {
      width: 100%; border: 1px solid #bdcfe0; border-radius: 0.65rem;
      background: #fff; color: #203b4d; padding: 0.75rem; font: inherit; text-align: left; cursor: pointer;
    }
    .herramienta[aria-expanded='true'], .lugar[aria-pressed='true'] { background: #e8f1fb; border-color: #315f8c; }
    .herramienta:focus-visible, .lugar:focus-visible { outline: 3px solid #a65300; outline-offset: 3px; }
    .lugar:disabled { opacity: 0.55; cursor: not-allowed; }
    .panel-herramienta { padding: 1rem; border: 1px solid #bdcfe0; border-radius: 0.75rem; background: #fff; }
    .panel-herramienta h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
    .panel-herramienta p { font-size: 0.9rem; }
    .lista-lugares { display: grid; gap: 0.4rem; list-style: none; margin: 0; padding: 0; }
    .lugar { display: grid; gap: 0.2rem; }
    .lugar span { font-size: 0.8rem; }
    @media (max-width: 760px) {
      .area-mapa { grid-template-columns: minmax(0, 1fr); }
      .herramientas { grid-row: 1; }
      .herramientas__botones { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .herramienta { text-align: center; overflow-wrap: anywhere; }
    }
    .sustituto {
      padding: 2rem 1rem;
      margin-top: 1rem;
      border: 2px dashed var(--color-borde);
      border-radius: 0.5rem;
    }
    .nota {
      font-size: 0.85rem;
      color: var(--color-texto-suave);
    }
    header .boton {
      margin-top: 0.5rem;
    }
  `,
})
export class RecorridoMapa {
  readonly configuracion = input<ConfiguracionMapa>(MAPA_DEMOSTRACION);
  readonly plantillas = input<PlantillasEspacio>({});
  readonly salir = output<void>();
  protected readonly exploracion = inject(ExploracionStore);
  protected readonly preguntas = inject(SimuladorStore);
  protected readonly verSim01 = signal(false);
  protected readonly panelActivo = signal<'lugares' | 'caso' | 'ayuda' | null>(null);
  private readonly titulo = viewChild.required<ElementRef<HTMLElement>>('titulo');
  protected readonly puedeTerminar = computed(
    () =>
      this.preguntas.totalPreguntas() > 0 &&
      this.preguntas.respondidas() === this.preguntas.totalPreguntas(),
  );
  protected readonly emitirEvento = (evento: EventoEspacioVisual) =>
    this.exploracion.recibirEvento(evento);
  constructor() {
    effect(() => {
      this.exploracion.configurar(this.configuracion());
      this.preguntas.volverAlInicio();
      this.verSim01.set(false);
      this.panelActivo.set(null);
    });
    afterRenderEffect({
      write: () => {
        const fase = this.exploracion.fase();
        this.exploracion.espacioAbierto();
        if (fase !== 'confirmando') this.titulo().nativeElement.focus({ preventScroll: true });
      },
    });
  }
  protected volver(): void {
    this.verSim01.set(false);
    this.exploracion.volverAlMapa();
  }
  protected alternarPanel(panel: 'lugares' | 'caso' | 'ayuda'): void {
    this.panelActivo.update(actual => actual === panel ? null : panel);
  }
  protected comenzarPreguntas(): void {
    if (this.exploracion.fase() !== 'confirmando') return;
    this.exploracion.confirmarPreguntas();
    this.preguntas.explorarDemostracion();
  }
  protected terminar(): void {
    if (this.exploracion.fase() !== 'cuestionario' || !this.puedeTerminar()) return;
    this.preguntas.solicitarFinalizacion();
    this.preguntas.confirmarFinalizacion();
    this.exploracion.completarDemostracion();
  }
}
