import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Aviso, TipoAviso } from '../../shared/ui/aviso';

export type TipoEstadoPanel =
  'cargando' | 'sin-datos' | 'no-autorizado' | 'no-disponible' | 'error-servidor' | 'pendiente';

interface PresentacionEstado {
  titulo: string;
  mensaje: string;
  tipo: TipoAviso;
}

/** Solo presentación: estos estados no consultan servicios ni interpretan respuestas HTTP. */
export const ESTADOS_PANEL: Readonly<Record<TipoEstadoPanel, PresentacionEstado>> = {
  cargando: { titulo: 'Cargando', mensaje: 'Cargando información académica.', tipo: 'info' },
  'sin-datos': {
    titulo: 'Sin datos disponibles',
    mensaje: 'No hay información disponible para mostrar.',
    tipo: 'info',
  },
  'no-autorizado': {
    titulo: 'Acceso no autorizado',
    mensaje: 'No tienes autorización para consultar este contenido.',
    tipo: 'advertencia',
  },
  'no-disponible': {
    titulo: 'Contenido no disponible',
    mensaje: 'El contenido solicitado no está disponible.',
    tipo: 'advertencia',
  },
  'error-servidor': {
    titulo: 'Error de servidor',
    mensaje: 'No fue posible obtener la información. Inténtalo más tarde.',
    tipo: 'error',
  },
  pendiente: {
    titulo: 'Integración pendiente',
    mensaje: 'Las funcionalidades académicas están pendientes de habilitación institucional.',
    tipo: 'info',
  },
};

@Component({
  selector: 'app-estado-panel',
  imports: [Aviso],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.aria-busy]="estado() === 'cargando' ? 'true' : null">
      <app-aviso [tipo]="presentacion().tipo" [titulo]="presentacion().titulo">
        <p>{{ mensaje() ?? presentacion().mensaje }}</p>
      </app-aviso>
    </div>
  `,
  styles: `
    :host {
      display: block;
      --color-superficie: #edf4ff;
      --color-primario: #0755b8;
      --color-aviso-fondo: #fff3db;
      --color-aviso: #87500a;
      --color-error-fondo: #fff0ed;
      --color-error: #a12b1e;
      font-size: var(--t-base, 0.9375rem);
      line-height: 1.6;
    }
    p {
      margin: 0.35rem 0 0;
    }
  `,
})
export class EstadoPanel {
  readonly estado = input<TipoEstadoPanel>('pendiente');
  readonly mensaje = input<string>();
  protected readonly presentacion = computed(() => ESTADOS_PANEL[this.estado()]);
}
