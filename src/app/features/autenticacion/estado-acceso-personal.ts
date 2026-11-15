import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoPanel } from '../dashboard/estado-panel';
import { EstadoAccesoPersonal } from './m1-personal.models';

/** Presentación independiente del login. No verifica sesiones, consulta HTTP ni autoriza rutas. */
@Component({
  selector: 'app-estado-acceso-personal',
  imports: [EstadoPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estado().tipo === 'verificado-local') {
      <app-estado-panel
        titulo="Identidad de personal verificada localmente"
        [mensaje]="mensajeIdentidad()"
      />
    } @else {
      <app-estado-panel [estado]="presentacion().estado" [mensaje]="presentacion().mensaje" />
    }
  `,
})
export class EstadoAccesoPersonalPanel {
  readonly estado = input<EstadoAccesoPersonal>({ tipo: 'pendiente' });
  protected readonly mensajeIdentidad = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'verificado-local'
      ? `Identidad de personal verificada en integración local: ${estado.identidad.nombre}. No habilita participación estudiantil ni acredita una sesión vigente.`
      : '';
  });
  protected readonly presentacion = computed(() => {
    switch (this.estado().tipo) {
      case 'cargando':
        return { estado: 'cargando' as const, mensaje: 'Verificando acceso de personal.' };
      case 'denegado':
        return {
          estado: 'no-autorizado' as const,
          mensaje: 'No fue posible verificar el acceso de personal.',
        };
      case 'error':
        return {
          estado: 'error-servidor' as const,
          mensaje:
            'No fue posible completar la consulta de acceso. No se ha confirmado una sesión.',
        };
      default:
        return {
          estado: 'pendiente' as const,
          mensaje:
            'Acceso de personal pendiente de habilitación del entorno local y conciliación de sesión. El login permanece demostrativo.',
        };
    }
  });
}
