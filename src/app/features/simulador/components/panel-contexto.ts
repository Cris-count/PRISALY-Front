import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EscenarioVista } from '../models/simulador.models';

/** Información contextual del caso que acompaña al escenario. */
@Component({
  selector: 'app-panel-contexto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tarjeta" aria-labelledby="contexto-titulo">
      <h2 id="contexto-titulo">Contexto</h2>
      <p>{{ escenario().contexto }}</p>
      @if (escenario().elementos.length) {
        <h3 class="contexto__subtitulo">Elementos del escenario</h3>
        <ul class="contexto__lista">
          @for (elemento of escenario().elementos; track elemento.id) {
            <li>{{ elemento.etiqueta }}</li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .contexto__subtitulo {
      font-size: 1rem;
    }
    .contexto__lista {
      margin: 0;
      padding-left: var(--espacio-4);
    }
  `,
})
export class PanelContexto {
  readonly escenario = input.required<EscenarioVista>();
}
