import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Tiempo restante INFORMATIVO. No bloquea acciones: decidir si una respuesta
 * todavía se acepta corresponde al backend.
 */
@Component({
  selector: 'app-temporizador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="temporizador" [class.temporizador--agotado]="agotado()">
      <span class="temporizador__etiqueta">Tiempo restante</span>
      @if (segundos() === null) {
        <span class="temporizador__valor">Sin límite informado</span>
      } @else {
        <span class="temporizador__valor" aria-hidden="true">{{ formato() }}</span>
        <span class="solo-lectores">{{ textoAccesible() }}</span>
      }
      @if (agotado()) {
        <p class="temporizador__nota" role="status">
          El tiempo informado se agotó. La validez de las respuestas la determina el servidor.
        </p>
      }
    </div>
  `,
  styles: `
    .temporizador {
      display: flex;
      flex-wrap: wrap;
      gap: var(--espacio-2);
      align-items: baseline;
    }
    .temporizador__etiqueta {
      color: var(--color-texto-suave);
      font-size: 0.875rem;
    }
    .temporizador__valor {
      font-size: 1.25rem;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }
    .temporizador--agotado .temporizador__valor {
      color: var(--color-aviso);
    }
    .temporizador__nota {
      color: var(--color-aviso);
      flex-basis: 100%;
      font-size: 0.875rem;
    }
  `,
})
export class Temporizador {
  readonly segundos = input<number | null>(null);

  readonly agotado = computed(() => this.segundos() === 0);

  readonly formato = computed(() => {
    const total = Math.max(this.segundos() ?? 0, 0);
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  });

  protected readonly textoAccesible = computed(() => {
    const total = Math.max(this.segundos() ?? 0, 0);
    return `${Math.floor(total / 60)} minutos y ${total % 60} segundos restantes`;
  });
}
