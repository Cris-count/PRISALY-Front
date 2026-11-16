import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  NgZone,
  viewChild,
} from '@angular/core';
import { AdaptadorMundoSimulador } from '../mundo-tecnico/adaptador-mundo-simulador';
import { MUNDO_PRUEBA } from '../mundo-tecnico/mundo-tecnico.fixture';
import { EdificioTecnico, MundoTecnico } from '../mundo-tecnico/mundo-tecnico.models';
import { FABRICA_MUNDO } from '../mundo-tecnico/puerto-mundo';

/**
 * Componente reutilizable del visor de la ciudad 2.5D (Phaser 3).
 * Encapsula el canvas, la proyección axonométrica de 40°, el menú accesible
 * de lugares y el botón contextual de entrada a edificios.
 */
@Component({
  selector: 'app-visor-ciudad-2d5',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="visor-ciudad">
      <div
        #escenario
        class="visor-ciudad__escenario"
        role="application"
        aria-label="Exploración de la ciudad PRISALY. Selecciona un punto o edificio transitable."
        [style.display]="adaptador.interiorActivo() ? 'none' : 'block'"
      ></div>

      @if (!adaptador.interiorActivo()) {
        <nav class="visor-ciudad__controles" aria-label="Navegación y destinos de la ciudad">
          <details class="visor-ciudad__lugares">
            <summary>Lugares accesibles</summary>
            <div class="visor-ciudad__botones-destino">
              @for (edificio of mundo.edificios; track edificio.id) {
                <button
                  type="button"
                  class="boton-destino"
                  [disabled]="!adaptador.listo() || adaptador.suspendida()"
                  (click)="adaptador.caminarA(edificio.entrada)"
                >
                  Caminar a {{ edificio.nombre }}
                </button>
              }
              <button
                type="button"
                class="boton-destino"
                [disabled]="!adaptador.listo() || adaptador.suspendida()"
                (click)="adaptador.caminarA(mundo.inicio)"
              >
                Caminar al punto inicial
              </button>
            </div>
          </details>

          @if (adaptador.entradaActual(); as edificio) {
            <button
              type="button"
              class="boton-entrar"
              [disabled]="adaptador.suspendida()"
              (click)="adaptador.solicitarEntrada(edificio)"
            >
              Entrar a {{ edificio.nombre }}
            </button>
          }

          <span class="visor-ciudad__indicacion" aria-live="polite">
            {{ adaptador.mensaje() }}
          </span>
        </nav>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .visor-ciudad {
      position: relative;
      width: 100%;
      background: #e9f1ea;
      border-radius: 8px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .visor-ciudad__escenario {
      width: 100%;
      height: 72dvh;
      min-height: 380px;
      background: #d8e9da;
    }
    .visor-ciudad__controles {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem;
      background: #f7fafc;
      border-top: 1px solid #d5e2eb;
    }
    .visor-ciudad__lugares summary {
      cursor: pointer;
      font-weight: 600;
      color: #183d53;
      padding: 0.3rem 0.5rem;
    }
    .visor-ciudad__botones-destino {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding-top: 0.4rem;
    }
    button {
      padding: 0.45rem 0.8rem;
      font-size: 0.88rem;
      border: 1px solid #a8bfce;
      border-radius: 6px;
      background: #ffffff;
      color: #183d53;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    button:hover:not(:disabled) {
      background: #eaf2f7;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .boton-entrar {
      background: #1b6d4b;
      color: #ffffff;
      border-color: #15553b;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(27, 109, 75, 0.3);
    }
    .boton-entrar:hover:not(:disabled) {
      background: #15553b;
    }
    .visor-ciudad__indicacion {
      font-size: 0.84rem;
      color: #3b5f73;
      margin-left: auto;
    }
    @media (max-width: 640px) {
      .visor-ciudad__escenario {
        height: auto;
        aspect-ratio: 5 / 3;
        min-height: 240px;
      }
      .visor-ciudad__indicacion {
        width: 100%;
        margin-left: 0;
      }
    }
  `,
})
export class VisorCiudad2d5 {
  readonly mundo = MUNDO_PRUEBA;
  readonly adaptador = inject(AdaptadorMundoSimulador);
  private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
  private readonly zona = inject(NgZone);
  private readonly destruccion = inject(DestroyRef);
  private readonly crearMundo = inject(FABRICA_MUNDO);
  private observador: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => {
        const elemento = this.escenario().nativeElement;
        void this.crearMundo(elemento, (evento) => {
          if (!this.destruccion.destroyed) this.zona.run(() => this.adaptador.procesarEvento(evento));
        })
          .then((control) => {
            if (this.destruccion.destroyed) {
              control.destruir();
              return;
            }
            this.zona.run(() => this.adaptador.conectar(control, this.mundo));
            if (typeof ResizeObserver !== 'undefined') {
              this.observador = new ResizeObserver(() => control.actualizarTamano());
              this.observador.observe(elemento);
            }
          })
          .catch((error) => {
            if (!this.destruccion.destroyed) {
              this.zona.run(() => {
                this.adaptador.mensaje.set('No se pudo inicializar la escena técnica de la ciudad.');
              });
            }
          });

        this.destruccion.onDestroy(() => {
          this.observador?.disconnect();
          this.observador = null;
          this.adaptador.desconectar();
        });
      });
    });
  }
}
