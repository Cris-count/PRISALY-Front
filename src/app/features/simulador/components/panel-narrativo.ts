import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { GUION_DEMOSTRACION } from '../demo/guion-demostracion';
import { MotorNarrativo } from '../narrativa/motor-narrativo';
import { EnlaceNarrativo } from '../services/enlace-narrativo';
import { Escenario2d } from './escenario-2d';
import { PanelContexto } from './panel-contexto';

@Component({
  selector: 'app-panel-narrativo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Escenario2d, PanelContexto],
  template: `
    <section
      [attr.aria-label]="enlace() ? 'Historia del caso' : 'Historia demostrativa'"
      class="narrativa"
    >
      <h2>
        {{ enlace() ? 'Historia del caso' : 'Historia demostrativa · sin evaluación académica' }}
      </h2>
      <app-escenario-2d [escenario]="escena().escenario" />
      <app-panel-contexto [escenario]="escena().escenario" />
      <p role="status">
        Escenas visitadas: {{ estado().visitadas.length }} de {{ motor().totalEscenas }}. El total
        incluye rutas alternativas; no es una calificación.
      </p>
      <ul aria-label="Estados de los personajes">
        @for (personaje of estado().personajes; track personaje.id) {
          <li>
            <strong>{{ personaje.nombre }}</strong
            >: {{ personaje.estado }} · expresión {{ personaje.expresion }}
            <span aria-hidden="true">{{
              personaje.expresion === 'alegre' ? '☺' : personaje.expresion === 'atenta' ? '◉' : '○'
            }}</span>
          </li>
        }
      </ul>
      <div class="tarjeta" aria-live="polite" aria-atomic="true">
        @if (dialogo(); as linea) {
          <p>
            <strong>{{ nombre(linea.personajeId) }}:</strong> {{ linea.texto }}
          </p>
        }
        @if (estado().transicion; as transicion) {
          <p>{{ transicion.texto }}</p>
        }
        @if (terminado()) {
          @if (enlace()) {
            <p>Historia terminada. Esto no finaliza el intento académico.</p>
          } @else {
            <p>
              Historia demostrativa terminada. Las preguntas de ejemplo conservan sus selecciones.
            </p>
          }
        }
      </div>
      <fieldset [disabled]="bloqueado()">
        <legend>Controles de la historia</legend>
        <div class="narrativa__acciones">
          @if (dialogo()) {
            <button type="button" class="boton" (click)="actuar('dialogo')">
              Siguiente diálogo
            </button>
          }
          @for (decision of decisiones(); track decision.id) {
            <button
              type="button"
              class="boton"
              [disabled]="enlace() ? !enlace()!.puedeElegir(decision.id) : false"
              (click)="elegir(decision.id)"
            >
              {{ decision.texto }}
            </button>
          }
          @if (estado().transicion) {
            <button type="button" class="boton" (click)="actuar('transicion')">
              Entrar a la escena
            </button>
          }
          <button
            type="button"
            class="boton"
            [disabled]="!puedeVolver()"
            (click)="actuar('volver')"
          >
            Atrás en la historia
          </button>
          @if (!enlace()) {
            <button type="button" class="boton" (click)="actuar('reiniciar')">
              Reiniciar historia
            </button>
          }
        </div>
      </fieldset>
    </section>
  `,
  styles: `
    .narrativa {
      display: grid;
      gap: var(--espacio-2);
    }
    .narrativa__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--espacio-2);
    }
    fieldset {
      border: 1px solid currentColor;
      border-radius: 0.5rem;
      min-width: 0;
    }
    h2 {
      font-size: 1.2rem;
    }
  `,
})
export class PanelNarrativo {
  readonly pausado = input(false);
  readonly enlace = input<EnlaceNarrativo | null>(null);
  private readonly motorDemo = new MotorNarrativo(GUION_DEMOSTRACION);
  private readonly estadoDemo = signal(this.motorDemo.estado);
  protected readonly motor = computed(() => this.enlace()?.motor ?? this.motorDemo);
  protected readonly estado = computed(() => this.enlace()?.estado() ?? this.estadoDemo());
  protected readonly bloqueado = computed(
    () => this.pausado() || (this.enlace() ? !this.enlace()!.puedeInteractuar() : false),
  );
  protected readonly escena = computed(() => {
    this.estado();
    return this.motor().escena;
  });
  protected readonly dialogo = computed(() => {
    this.estado();
    return this.motor().dialogoActual;
  });
  protected readonly decisiones = computed(() => {
    this.estado();
    return this.motor().decisionesDisponibles;
  });
  protected readonly terminado = computed(() => {
    this.estado();
    return this.motor().terminado;
  });
  protected readonly puedeVolver = computed(() => {
    this.estado();
    return this.motor().puedeVolver;
  });
  protected nombre(id: string): string {
    return this.estado().personajes.find((p) => p.id === id)!.nombre;
  }

  protected elegir(id: string): void {
    if (this.bloqueado()) return;
    const enlace = this.enlace();
    if (enlace) enlace.elegir(id);
    else {
      this.motorDemo.elegir(id);
      this.estadoDemo.set(this.motorDemo.estado);
    }
  }

  protected actuar(accion: 'dialogo' | 'transicion' | 'volver' | 'reiniciar'): void {
    if (this.bloqueado()) return;
    const enlace = this.enlace();
    if (enlace) {
      switch (accion) {
        case 'dialogo':
          enlace.avanzarDialogo();
          break;
        case 'transicion':
          enlace.completarTransicion();
          break;
        case 'volver':
          enlace.volver();
          break;
        case 'reiniciar':
          return;
      }
      return;
    }
    switch (accion) {
      case 'dialogo':
        this.motorDemo.avanzarDialogo();
        break;
      case 'transicion':
        this.motorDemo.completarTransicion();
        break;
      case 'volver':
        this.motorDemo.volver();
        break;
      case 'reiniciar':
        this.motorDemo.reiniciar();
        break;
    }
    this.estadoDemo.set(this.motorDemo.estado);
  }
}
