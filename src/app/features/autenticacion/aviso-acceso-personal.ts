import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AVISOS_ACCESO } from './m1-mapeo-rutas';
import { SesionPersonalM1 } from './m1-personal-sesion';

/**
 * Muestra el motivo de una redirección del guard de personal y los permisos efectivos reales
 * devueltos por `/v1/personal/me`. Solo presenta información: no concede ni solicita accesos.
 */
@Component({
  selector: 'app-aviso-acceso-personal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (texto(); as mensaje) {
      <section class="aviso-acceso" role="status" aria-live="polite">
        <p>{{ mensaje }}</p>
        @if (permisos(); as lista) {
          <p class="permisos">
            Permisos efectivos de la sesión:
            @for (p of lista; track p; let ultimo = $last) {
              <code>{{ p }}</code
              >{{ ultimo ? '' : ', ' }}
            } @empty {
              ninguno
            }
          </p>
        }
      </section>
    }
  `,
  styles: `
    /* Sin aviso no genera caja: no altera la rejilla de la página de inicio. */
    :host {
      display: contents;
    }
    .aviso-acceso {
      margin: 1rem auto;
      max-width: 60rem;
      padding: 0.75rem 1rem;
      border-left: 4px solid #87500a;
      background: #fff3db;
      color: #4a2c05;
      border-radius: 0.5rem;
    }
    .aviso-acceso p {
      margin: 0.25rem 0;
    }
  `,
})
export class AvisoAccesoPersonal {
  private readonly sesion = inject(SesionPersonalM1);
  private readonly aviso = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get('aviso'))),
    { initialValue: null },
  );

  protected readonly texto = computed(() => {
    const clave = this.aviso();
    return clave && Object.hasOwn(AVISOS_ACCESO, clave) ? AVISOS_ACCESO[clave] : null;
  });

  protected readonly permisos = computed(() => {
    const estado = this.sesion.estado();
    return estado.tipo === 'valida' ? estado.identidad.permisos : null;
  });
}
