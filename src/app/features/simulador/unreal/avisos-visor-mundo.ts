import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AvisoConexion, AvisoInteraccion } from './aviso-interaccion';

/**
 * G4-V11 / FE-UX-09: capa de avisos sobre el vídeo de MUNDO-24.
 *
 * Va encima del visor, no dentro: el reproductor de Pixel Streaming sustituye los hijos del visor al conectar.
 * No recibe puntero ni foco (`pointer-events: none`, sin elementos enfocables), así que el ratón, W A S D, E y el
 * foco siguen llegando al visor y al DataChannel igual que antes.
 */
@Component({
  selector: 'app-avisos-visor-mundo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (conexion(); as c) {
      <div class="conexion" [class.problema]="c.tipo === 'problema'" aria-hidden="true" data-prueba="aviso-conexion">
        @if (c.tipo === 'progreso') {
          <span class="giro"></span>
        }
        <p>{{ c.texto }}</p>
      </div>
    }
    <div class="zona-aviso" role="status" aria-live="polite">
      @if (aviso(); as a) {
        <p class="aviso" [class.restriccion]="a.tipo === 'restriccion'" data-prueba="aviso-interaccion">
          @if (a.tipo === 'accion') {
            <kbd>{{ a.tecla }}</kbd>
            <span class="visualmente-oculto">Pulsa {{ a.tecla }} para:</span>
          } @else if (a.tipo === 'restriccion') {
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          }
          <span>{{ a.texto }}</span>
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      /* Valores de DESIGN.md (azul profundo, naranja de acción y su texto). */
      --aviso-fondo: rgb(5 38 80 / 0.9);
      --aviso-texto: #fff;
      --aviso-tecla: #ff861b;
      --aviso-tecla-texto: #201000;
      --aviso-restriccion: #ffd9b0;
      --aviso-radio: 0.75rem;
      --aviso-sombra: 0 0.375rem 1.125rem rgb(5 38 80 / 0.35);
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: grid;
      font-family: inherit;
    }
    .conexion {
      grid-area: 1 / 1;
      place-self: center;
      display: grid;
      justify-items: center;
      gap: 0.75rem;
      max-width: min(30rem, 86%);
      color: var(--aviso-texto);
      text-align: center;
    }
    .conexion p {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.4;
      text-wrap: balance;
    }
    .conexion.problema p {
      color: var(--aviso-restriccion);
    }
    .giro {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;
      border: 0.1875rem solid rgb(255 255 255 / 0.25);
      border-top-color: var(--aviso-tecla);
      animation: giro 0.9s linear infinite;
    }
    .zona-aviso {
      grid-area: 1 / 1;
      place-self: end center;
      margin-bottom: clamp(0.75rem, 4%, 1.5rem);
      max-width: min(34rem, 92%);
    }
    .aviso {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      padding: 0.625rem 1rem 0.625rem 0.625rem;
      border-radius: var(--aviso-radio);
      background: var(--aviso-fondo);
      box-shadow: var(--aviso-sombra);
      color: var(--aviso-texto);
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.35;
      animation: entrada 160ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .aviso:not(:has(kbd, svg)) {
      padding-left: 1rem;
    }
    .aviso.restriccion {
      color: var(--aviso-restriccion);
    }
    kbd {
      display: inline-grid;
      place-items: center;
      min-width: 2rem;
      height: 2rem;
      border-radius: 0.5rem;
      background: var(--aviso-tecla);
      color: var(--aviso-tecla-texto);
      font: inherit;
      font-size: 1.125rem;
      font-weight: 800;
      box-shadow: inset 0 -0.125rem 0 rgb(32 16 0 / 0.25);
    }
    svg {
      width: 1.375rem;
      height: 1.375rem;
      flex: none;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .visualmente-oculto {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    @keyframes entrada {
      from {
        opacity: 0;
        transform: translateY(0.375rem);
      }
    }
    @keyframes giro {
      to {
        transform: rotate(1turn);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .aviso {
        animation: none;
      }
      .giro {
        animation-duration: 2.4s;
      }
    }
    @media (max-width: 40rem) {
      .aviso {
        font-size: 0.9375rem;
        gap: 0.5rem;
      }
    }
  `,
})
export class AvisosVisorMundo {
  readonly aviso = input<AvisoInteraccion | null>(null);
  readonly conexion = input<AvisoConexion | null>(null);
}
