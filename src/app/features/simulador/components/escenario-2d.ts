import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EscenarioVista } from '../models/simulador.models';

/**
 * Escenario 2D en SVG. Las figuras son genéricas y neutras: representan
 * participantes y objetos del caso sin rasgos, rostros ni personajes
 * conversacionales.
 */
@Component({
  selector: 'app-escenario-2d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="escena tarjeta">
      <svg
        class="escena__lienzo"
        viewBox="0 0 100 60"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby="escena-titulo escena-desc"
      >
        <title id="escena-titulo">{{ escenario().titulo }}</title>
        <desc id="escena-desc">{{ descripcion() }}</desc>
        <rect class="escena__pared" x="0" y="0" width="100" height="42" />
        <rect class="escena__piso" x="0" y="42" width="100" height="18" />
        @for (elemento of escenario().elementos; track elemento.id) {
          <g
            class="escena__elemento"
            [attr.data-elemento]="elemento.id"
            [attr.transform]="'translate(' + elemento.x + ' ' + elemento.y * 0.6 + ')'"
          >
            @if (elemento.tipo === 'persona') {
              <circle class="escena__persona" cx="0" cy="-12" r="3" />
              <rect class="escena__persona" x="-3.5" y="-8.5" width="7" height="9" rx="2.5" />
            } @else {
              <rect class="escena__objeto" x="-6" y="-4" width="12" height="4" rx="0.6" />
            }
            <text class="escena__etiqueta" x="0" y="4" text-anchor="middle">
              {{ elemento.etiqueta }}
            </text>
          </g>
        }
      </svg>
      <figcaption class="escena__titulo">{{ escenario().titulo }}</figcaption>
    </figure>
  `,
  styles: `
    .escena {
      margin: 0;
      padding: var(--espacio-2);
    }
    .escena__lienzo {
      display: block;
      height: auto;
      width: 100%;
    }
    .escena__pared {
      fill: var(--color-escena-pared);
    }
    .escena__piso {
      fill: var(--color-escena-piso);
    }
    .escena__persona {
      fill: var(--color-primario);
    }
    .escena__objeto {
      fill: var(--color-texto-suave);
    }
    .escena__etiqueta {
      fill: var(--color-texto);
      font-size: 2.6px;
    }
    .escena__titulo {
      color: var(--color-texto-suave);
      font-size: 0.875rem;
      margin-top: var(--espacio-2);
    }
  `,
})
export class Escenario2d {
  readonly escenario = input.required<EscenarioVista>();

  protected readonly descripcion = computed(() => {
    const elementos = this.escenario().elementos.map((e) => e.etiqueta);
    return elementos.length
      ? `Escenario con ${elementos.length} elementos: ${elementos.join(', ')}.`
      : 'Escenario sin elementos visuales.';
  });
}
