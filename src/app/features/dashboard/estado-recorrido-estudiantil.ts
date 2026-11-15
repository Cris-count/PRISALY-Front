import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoPanel, TipoEstadoPanel } from './estado-panel';

export type TipoRecorridoEstudiantil =
  | 'cargando-sesiones'
  | 'sesiones-disponibles'
  | 'participaciones-pendientes'
  | 'sin-convocatorias'
  | 'acceso-denegado'
  | 'error-conexion'
  | 'participacion-no-habilitada';

/** Estado de interfaz, no DTO REST, lista académica ni prueba de autorización.
 * Un adaptador futuro debe proyectar exclusivamente respuestas estudiantiles autorizadas.
 * La demostración es explícita; nunca se transforma en datos de servicio.
 */
export type EstadoRecorridoEstudiantil =
  | { readonly tipo: 'pendiente'; readonly origen: 'preparacion' }
  | {
      readonly tipo: TipoRecorridoEstudiantil;
      readonly origen: 'servicio-autorizado' | 'demostracion';
    };

interface PresentacionRecorrido {
  readonly titulo?: string;
  readonly estado: TipoEstadoPanel;
  readonly mensaje: string;
}

const PRESENTACIONES: Readonly<Record<TipoRecorridoEstudiantil, PresentacionRecorrido>> = {
  'cargando-sesiones': {
    estado: 'cargando',
    mensaje: 'Consultando las sesiones estudiantiles autorizadas.',
  },
  'sesiones-disponibles': {
    estado: 'pendiente',
    titulo: 'Sesiones disponibles',
    mensaje:
      'La consulta autorizada informa sesiones disponibles. Esto no habilita una participación ni inicia intentos.',
  },
  'participaciones-pendientes': {
    estado: 'pendiente',
    titulo: 'Participaciones pendientes',
    mensaje:
      'La consulta autorizada informa participaciones pendientes. La entrada requiere verificar cada intento.',
  },
  'sin-convocatorias': {
    estado: 'sin-datos',
    mensaje: 'La consulta autorizada no devolvió convocatorias.',
  },
  'acceso-denegado': {
    estado: 'no-autorizado',
    mensaje: 'El servicio denegó el acceso estudiantil. No se muestran datos académicos.',
  },
  'error-conexion': {
    estado: 'error-servidor',
    mensaje: 'No fue posible conectar con el servicio. No se confirmó información académica.',
  },
  'participacion-no-habilitada': {
    estado: 'no-disponible',
    mensaje: 'La participación académica no está habilitada. No se iniciará un intento.',
  },
};

@Component({
  selector: 'app-estado-recorrido-estudiantil',
  imports: [EstadoPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.data-origen]="estado().origen">
      @if (estado().origen === 'demostracion') {
        <p role="note">Ejemplo visual; no representa consultas, errores ni resultados reales.</p>
      }
      <app-estado-panel
        [estado]="presentacion().estado"
        [titulo]="presentacion().titulo"
        [mensaje]="presentacion().mensaje"
      />
    </div>
  `,
})
export class EstadoRecorridoEstudiantilPanel {
  readonly estado = input<EstadoRecorridoEstudiantil>({ tipo: 'pendiente', origen: 'preparacion' });
  protected readonly presentacion = computed<PresentacionRecorrido>(() => {
    const estado = this.estado();
    if (estado.tipo === 'pendiente')
      return {
        estado: 'pendiente',
        mensaje:
          'Acceso estudiantil pendiente de activación DD-02 y del contrato de consulta de sesiones y convocatorias. No se han realizado consultas.',
      };
    return PRESENTACIONES[estado.tipo];
  });
}
