import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { PreguntaVista } from '../models/simulador.models';

/**
 * Pregunta actual y sus opciones como grupo de radio accesible.
 * Solo comunica la selección; no conoce respuestas correctas.
 */
@Component({
  selector: 'app-panel-preguntas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tarjeta">
      <fieldset class="pregunta" [disabled]="deshabilitado()">
        <legend class="pregunta__enunciado">
          <span class="pregunta__numero">Pregunta {{ numero() }}</span>
          {{ pregunta().enunciado }}
        </legend>
        @for (opcion of pregunta().opciones; track opcion.id) {
          <label class="opcion" [class.opcion--seleccionada]="opcion.id === seleccion()">
            <input
              type="radio"
              [name]="'pregunta-' + pregunta().id"
              [value]="opcion.id"
              [checked]="opcion.id === seleccion()"
              (change)="seleccionar.emit(opcion.id)"
            />
            <span>{{ opcion.texto }}</span>
          </label>
        }
      </fieldset>
    </section>
  `,
  styles: `
    .pregunta {
      border: 0;
      margin: 0;
      padding: 0;
    }
    .pregunta__enunciado {
      font-weight: 600;
      margin-bottom: var(--espacio-3);
    }
    .pregunta__numero {
      color: var(--color-texto-suave);
      display: block;
      font-size: 0.875rem;
      font-weight: 400;
    }
    .opcion {
      align-items: center;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio);
      cursor: pointer;
      display: flex;
      gap: var(--espacio-2);
      margin-bottom: var(--espacio-2);
      min-height: 2.75rem;
      padding: var(--espacio-2) var(--espacio-3);
    }
    .opcion--seleccionada {
      border-color: var(--color-primario);
      box-shadow: inset 0 0 0 1px var(--color-primario);
    }
  `,
})
export class PanelPreguntas {
  readonly pregunta = input.required<PreguntaVista>();
  readonly numero = input.required<number>();
  readonly seleccion = input<string | null>(null);
  readonly deshabilitado = input(false);
  readonly seleccionar = output<string>();
}
