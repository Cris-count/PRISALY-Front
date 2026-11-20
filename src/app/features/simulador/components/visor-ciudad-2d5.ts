import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  viewChild,
} from '@angular/core';
import { AdaptadorMundoSimulador } from '../mundo-tecnico/adaptador-mundo-simulador';
import { MUNDO_PRUEBA } from '../mundo-tecnico/mundo-tecnico.fixture';
import { EdificioTecnico, MundoTecnico } from '../mundo-tecnico/mundo-tecnico.models';
import { FABRICA_MUNDO, PAQUETE_VISUAL } from '../mundo-tecnico/puerto-mundo';
import type { PaqueteVisual } from '../mundo-tecnico/contrato-visual';

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
                  [disabled]="!adaptador.listo() || adaptador.suspendida() || adaptador.enCuestionario()"
                  (click)="adaptador.caminarA(edificio.entrada)"
                >
                  Caminar a {{ edificio.nombre }}
                </button>
              }
              @if (mundo.plazaCentral; as plaza) {
                <button
                  type="button"
                  class="boton-destino boton-destino--plaza"
                  [disabled]="!adaptador.listo() || adaptador.suspendida() || adaptador.enCuestionario()"
                  (click)="adaptador.caminarA(plaza.nodo)"
                >
                  Caminar a {{ plaza.nombre }}
                </button>
              }
              <button
                type="button"
                class="boton-destino"
                [disabled]="!adaptador.listo() || adaptador.suspendida() || adaptador.enCuestionario()"
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
              [disabled]="adaptador.suspendida() || adaptador.enCuestionario()"
              (click)="adaptador.solicitarEntrada(edificio)"
            >
              Entrar a {{ edificio.nombre }}
            </button>
          }

          @if (adaptador.enPlazaCentral() && !adaptador.enCuestionario()) {
            <button
              type="button"
              class="boton-iniciar-cuestionario"
              [disabled]="adaptador.suspendida()"
              (click)="iniciarCuestionarioSolicitado.emit()"
            >
              Iniciar cuestionario
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
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .visor-ciudad {
      position: relative;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      background: #e9f1ea;
      border-radius: 8px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .visor-ciudad__escenario {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      height: 72dvh;
      min-height: 380px;
      background: #d8e9da;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }
    .visor-ciudad__escenario canvas {
      max-width: 100% !important;
      display: block;
    }
    .visor-ciudad__controles {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem;
      background: #f7fafc;
      border-top: 1px solid #d5e2eb;
      box-sizing: border-box;
      max-width: 100%;
      min-width: 0;
    }
    .visor-ciudad__lugares {
      width: 100%;
      max-width: 100%;
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
      max-width: 100%;
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
      box-sizing: border-box;
      max-width: 100%;
      white-space: normal;
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
    .boton-iniciar-cuestionario {
      background: #c27d00;
      color: #ffffff;
      border-color: #9c6400;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(194, 125, 0, 0.35);
    }
    .boton-iniciar-cuestionario:hover:not(:disabled) {
      background: #9c6400;
    }
    .visor-ciudad__indicacion {
      font-size: 0.84rem;
      color: #3b5f73;
      margin-left: auto;
      overflow-wrap: break-word;
    }
    @media (max-width: 640px) {
      .visor-ciudad__escenario {
        height: auto;
        aspect-ratio: 5 / 3;
        min-height: 200px;
      }
      .visor-ciudad__indicacion {
        width: 100%;
        margin-left: 0;
      }
      .boton-destino {
        font-size: 0.8rem;
        padding: 0.35rem 0.6rem;
      }
    }
  `,
})
export class VisorCiudad2d5 {
  readonly iniciarCuestionarioSolicitado = output<void>();
  readonly paquete = input<PaqueteVisual | null>(null);
  readonly mundo = MUNDO_PRUEBA;
  readonly adaptador = inject(AdaptadorMundoSimulador);
  private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
  private readonly zona = inject(NgZone);
  private readonly destruccion = inject(DestroyRef);
  private readonly crearMundo = inject(FABRICA_MUNDO);
  private readonly paqueteInyectado = inject(PAQUETE_VISUAL, { optional: true });
  private observador: ResizeObserver | null = null;
  private animacionFrameId: number | null = null;

  constructor() {
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => {
        const elemento = this.escenario().nativeElement;
        const paqueteActivo = this.paquete() ?? this.paqueteInyectado ?? null;
        void this.crearMundo(elemento, (evento) => {
          if (!this.destruccion.destroyed) this.zona.run(() => this.adaptador.procesarEvento(evento));
        }, paqueteActivo)
          .then((control) => {
            if (this.destruccion.destroyed) {
              control.destruir();
              return;
            }
            this.zona.run(() => this.adaptador.conectar(control, this.mundo));
            if (typeof ResizeObserver !== 'undefined') {
              let ultimoAncho = 0;
              let ultimoAlto = 0;
              this.observador = new ResizeObserver((entries) => {
                if (this.destruccion.destroyed) return;
                const entrada = entries[0];
                if (entrada) {
                  const cr = entrada.contentRect;
                  const anchoRedondeado = Math.round(cr.width);
                  const altoRedondeado = Math.round(cr.height);
                  if (anchoRedondeado === ultimoAncho && altoRedondeado === ultimoAlto) {
                    return;
                  }
                  ultimoAncho = anchoRedondeado;
                  ultimoAlto = altoRedondeado;
                }
                if (this.animacionFrameId !== null) {
                  cancelAnimationFrame(this.animacionFrameId);
                }
                this.animacionFrameId = requestAnimationFrame(() => {
                  this.animacionFrameId = null;
                  if (!this.destruccion.destroyed) {
                    control.actualizarTamano();
                  }
                });
              });
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
          if (this.animacionFrameId !== null) {
            cancelAnimationFrame(this.animacionFrameId);
            this.animacionFrameId = null;
          }
          this.observador?.disconnect();
          this.observador = null;
          this.adaptador.desconectar();
        });
      });
    });
  }
}
