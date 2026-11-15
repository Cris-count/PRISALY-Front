import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-confirmacion-entrada',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialogo
      aria-labelledby="entrada-titulo"
      aria-describedby="entrada-detalle"
      (cancel)="cancelarConEscape($event)"
    >
      <h2 id="entrada-titulo">¿Comenzar las preguntas?</h2>
      <p id="entrada-detalle">
        Durante las preguntas no podrás volver a los espacios hasta terminar esta demostración.
      </p>
      <p>Son preguntas de ejemplo. No se crea un intento ni se guardan respuestas académicas.</p>
      <div class="acciones">
        <button type="button" class="boton" autofocus (click)="cancelar.emit()">
          Seguir explorando
        </button>
        <button type="button" class="boton boton--primario" (click)="confirmar.emit()">
          Comenzar preguntas
        </button>
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(540px, calc(100vw - 2rem));
      max-height: 90vh;
      overflow: auto;
      border: 1px solid var(--color-borde);
      border-radius: 1rem;
      padding: 1.5rem;
      color: var(--color-texto);
    }
    dialog::backdrop {
      background: #102b42aa;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
    }
  `,
})
export class ConfirmacionEntrada {
  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  constructor() {
    afterNextRender(() => this.dialogo().nativeElement.showModal());
  }
  protected cancelarConEscape(evento: Event): void {
    evento.preventDefault();
    this.cancelar.emit();
  }
}
