import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Posición actual y preguntas respondidas, con barra accesible. */
@Component({
  selector: 'app-indicador-progreso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="progreso">
      <p class="progreso__texto">
        Pregunta {{ actual() }} de {{ total() }} · {{ respondidas() }} respondidas
      </p>
      <div
        class="progreso__barra"
        role="progressbar"
        aria-label="Preguntas respondidas"
        aria-valuemin="0"
        [attr.aria-valuemax]="total()"
        [attr.aria-valuenow]="respondidas()"
        [attr.aria-valuetext]="respondidas() + ' de ' + total() + ' preguntas respondidas'"
      >
        <span class="progreso__relleno" [style.width.%]="porcentaje()"></span>
      </div>
    </div>
  `,
  styles: `
    .progreso__texto {
      color: var(--color-texto-suave);
      font-size: 0.875rem;
    }
    .progreso__barra {
      background: var(--color-borde);
      border-radius: 999px;
      height: 0.5rem;
      overflow: hidden;
    }
    .progreso__relleno {
      background: var(--color-primario);
      display: block;
      height: 100%;
      transition: width 0.2s ease;
    }
  `,
})
export class IndicadorProgreso {
  readonly actual = input.required<number>();
  readonly total = input.required<number>();
  readonly respondidas = input.required<number>();

  readonly porcentaje = computed(() =>
    this.total() > 0 ? Math.round((this.respondidas() / this.total()) * 100) : 0,
  );
}
