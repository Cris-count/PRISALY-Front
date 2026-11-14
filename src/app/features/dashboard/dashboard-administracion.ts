import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoPanel, TipoEstadoPanel } from './estado-panel';

@Component({
  selector: 'app-dashboard-administracion',
  imports: [RouterLink, EstadoPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-administracion.html',
  styleUrl: './dashboard-administracion.css',
})
export class DashboardAdministracion {
  // Ejemplos de presentación: no representan respuestas de servicios ni permisos efectivos.
  protected readonly ejemplos: readonly {
    estado: TipoEstadoPanel;
    titulo: string;
    mensaje: string;
  }[] = [
    {
      estado: 'cargando',
      titulo: 'Carga',
      mensaje: 'Ejemplo visual de carga. No hay una consulta en curso.',
    },
    {
      estado: 'sin-datos',
      titulo: 'Vacío',
      mensaje: 'Ejemplo visual de una consulta sin resultados. No se han consultado registros.',
    },
    {
      estado: 'error-servidor',
      titulo: 'Error',
      mensaje: 'Ejemplo visual de error. No se ha producido ningún fallo de servicio.',
    },
    {
      estado: 'no-autorizado',
      titulo: 'Acceso restringido',
      mensaje: 'Ejemplo visual de acceso restringido. No se ha evaluado ninguna autorización.',
    },
  ];
}
