import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Acciones de navegación y finalización del recorrido. */
@Component({
  selector: 'app-barra-acciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="acciones" aria-label="Acciones del intento">
      <button type="button" class="boton" [disabled]="esPrimera()" (click)="anterior.emit()">
        Anterior
      </button>
      <button
        type="button"
        class="boton boton--primario"
        [disabled]="esUltima()"
        (click)="continuar.emit()"
      >
        Continuar
      </button>
      <button type="button" class="boton acciones__finalizar" (click)="finalizar.emit()">
        Finalizar
      </button>
    </nav>
  `,
  styles: `
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--espacio-2);
    }
    .acciones__finalizar {
      margin-left: auto;
    }
  `,
})
export class BarraAcciones {
  readonly esPrimera = input(true);
  readonly esUltima = input(false);
  readonly anterior = output<void>();
  readonly continuar = output<void>();
  readonly finalizar = output<void>();
}
