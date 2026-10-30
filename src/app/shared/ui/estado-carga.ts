import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Indicador de carga anunciado a lectores de pantalla. */
@Component({
  selector: 'app-estado-carga',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="carga" role="status" aria-live="polite">
      <span class="carga__indicador" aria-hidden="true"></span>
      <span>{{ mensaje() }}</span>
    </div>
  `,
  styles: `
    .carga {
      align-items: center;
      display: flex;
      gap: var(--espacio-3);
      padding: var(--espacio-4);
    }
    .carga__indicador {
      animation: girar 1s linear infinite;
      border: 3px solid var(--color-borde);
      border-top-color: var(--color-primario);
      border-radius: 50%;
      height: 1.5rem;
      width: 1.5rem;
    }
    @keyframes girar {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class EstadoCarga {
  readonly mensaje = input('Cargando…');
}
