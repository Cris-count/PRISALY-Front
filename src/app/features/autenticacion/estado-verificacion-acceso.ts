import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { VigilanciaAccesoPersonal } from './vigilancia-acceso-personal';

/**
 * H-58-02. Aviso visual de fallo temporal al revalidar `/me` con una vista protegida abierta. Se
 * distingue de la pérdida confirmada de permisos, que cierra la vista con `aviso=acceso-retirado`.
 * Sin fallo no genera caja (`display: contents`) y no altera la rejilla del dashboard.
 */
@Component({
  selector: 'app-estado-verificacion-acceso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vigilancia.verificacionNoDisponible()) {
      <p
        class="aviso-verificacion"
        role="status"
        aria-live="polite"
        data-prueba="verificacion-temporal"
      >
        No se pudo confirmar con el servidor que tus permisos siguen vigentes. Se volverá a
        comprobar en el próximo intervalo; si vuelve a fallar, esta vista se cerrará por seguridad.
      </p>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .aviso-verificacion {
      margin: 0 0 1rem;
      padding: 0.75rem 1rem;
      border-left: 4px solid #87500a;
      background: #fff3db;
      color: #4a2c05;
      border-radius: 0.5rem;
    }
  `,
})
export class EstadoVerificacionAcceso {
  protected readonly vigilancia = inject(VigilanciaAccesoPersonal);
}
