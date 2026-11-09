import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TipoAviso = 'info' | 'advertencia' | 'error' | 'exito';

/** Mensaje destacado y accesible. Los errores se anuncian de inmediato. */
@Component({
  selector: 'app-aviso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="'aviso aviso--' + tipo()" [attr.role]="rol()">
      @if (titulo()) {
        <strong class="aviso__titulo">{{ titulo() }}</strong>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .aviso {
      border-left: 4px solid currentColor;
      border-radius: var(--radio);
      padding: var(--espacio-2) var(--espacio-3);
    }
    .aviso__titulo {
      display: block;
    }
    .aviso--info {
      background: var(--color-superficie);
      color: var(--color-primario);
    }
    .aviso--advertencia {
      background: var(--color-aviso-fondo);
      color: var(--color-aviso);
    }
    .aviso--error {
      background: var(--color-error-fondo);
      color: var(--color-error);
    }
    .aviso--exito {
      background: var(--color-exito-fondo);
      color: var(--color-exito);
    }
  `,
})
export class Aviso {
  readonly tipo = input<TipoAviso>('info');
  readonly titulo = input<string>('');
  protected readonly rol = computed(() => (this.tipo() === 'error' ? 'alert' : 'status'));
}
