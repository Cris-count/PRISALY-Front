import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoPanel } from '../dashboard/estado-panel';
import { EstadoAccesoPersonal } from './m1-personal.models';

/** Presentación independiente del login. No verifica sesiones, consulta HTTP ni autoriza rutas. */
@Component({
  selector: 'app-estado-acceso-personal',
  imports: [EstadoPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estado().tipo === 'verificado-local' || estado().tipo === 'sesion-consultada-local') {
      <app-estado-panel
        [titulo]="
          estado().tipo === 'verificado-local'
            ? 'Identidad de personal verificada localmente'
            : 'Identidad de personal consultada localmente'
        "
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
    if (estado.tipo === 'sesion-consultada-local')
      return `La consulta local devolvió la identidad de personal: ${estado.identidad.nombre}. No renueva el token ni habilita participación estudiantil.`;
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
      case 'consultando-sesion':
        return {
          estado: 'cargando' as const,
          mensaje: 'Consultando la identidad de personal. La sesión aún no está confirmada.',
        };
      case 'sesion-no-verificada':
        return {
          estado: 'no-autorizado' as const,
          mensaje:
            'No se pudo verificar una sesión de personal vigente. No se deduce si venció, fue revocada o no existe.',
        };
      case 'cerrando-sesion':
        return {
          estado: 'cargando' as const,
          mensaje: 'Esperando confirmación del cierre de sesión por el servidor.',
        };
      case 'cierre-no-confirmado':
        return {
          estado: 'pendiente' as const,
          mensaje:
            'Cierre de sesión no confirmado. No se acredita la revocación del token en el servidor.',
        };
      case 'no-autenticada':
        return {
          estado: 'pendiente' as const,
          mensaje: 'Sin sesión de personal autenticada. El formulario permanece demostrativo.',
        };
      case 'cierre-confirmado':
        return {
          estado: 'pendiente' as const,
          mensaje: 'El servidor confirmó el cierre de la sesión de personal.',
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
