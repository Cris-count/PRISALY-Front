import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

/** Solicita confirmación antes de finalizar; recibe el foco al aparecer. */
@Component({
  selector: 'app-confirmacion-finalizacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="tarjeta confirmacion"
      role="alertdialog"
      aria-labelledby="confirmacion-titulo"
      aria-describedby="confirmacion-detalle"
    >
      <h2 id="confirmacion-titulo" tabindex="-1" #titulo>¿Finalizar?</h2>
      <p id="confirmacion-detalle">
        Respondiste {{ respondidas() }} de {{ total() }} preguntas. Después de finalizar no podrás
        modificar tus respuestas.
      </p>
      <div class="confirmacion__acciones">
        <button type="button" class="boton" (click)="cancelar.emit()">Seguir respondiendo</button>
        <button type="button" class="boton boton--primario" (click)="confirmar.emit()">
          Sí, finalizar
        </button>
      </div>
    </section>
  `,
  styles: `
    .confirmacion {
      border-color: var(--color-primario);
    }
    .confirmacion__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--espacio-2);
    }
  `,
})
export class ConfirmacionFinalizacion {
  readonly respondidas = input.required<number>();
  readonly total = input.required<number>();
  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  private readonly titulo = viewChild.required<ElementRef<HTMLElement>>('titulo');

  constructor() {
    afterNextRender(() => this.titulo().nativeElement.focus());
  }
}
