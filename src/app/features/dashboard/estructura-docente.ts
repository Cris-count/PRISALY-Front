import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface BloqueDocente {
  titulo: string;
  descripcion: string;
}

/** Esquema reutilizable de presentación; no es un editor ni contiene datos académicos. */
@Component({
  selector: 'app-estructura-docente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul>
      @for (bloque of bloques(); track bloque.titulo) {
        <li>
          <h3>{{ bloque.titulo }}</h3>
          <p>{{ bloque.descripcion }}</p>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.8rem;
    }
    li {
      padding: 1rem;
      border: 1px solid var(--p-borde);
      border-left: 3px solid var(--p-azul);
      border-radius: 0.5rem;
      background: var(--p-fondo);
    }
    h3 {
      margin: 0;
      font-size: var(--t-card, 1.125rem);
      font-weight: 700;
    }
    p {
      margin: 0.4rem 0 0;
      color: var(--p-sec);
      font-size: var(--t-base, 0.9375rem);
      line-height: 1.55;
    }
  `,
})
export class EstructuraDocente {
  readonly bloques = input.required<readonly BloqueDocente[]>();
}
