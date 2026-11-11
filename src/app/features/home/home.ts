import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAction } from '../../core/api/api-action';
import { ApiClient } from '../../core/api/api-client.service';
import { Availability, EndpointId, ModuleId, allEndpoints, endpoints, pendingOperations } from '../../core/api/catalog';
import { HealthResponse } from '../../core/api/types';
import { StatusChip } from '../../shared/status-chip';

interface Area {
  readonly path: string;
  readonly title: string;
  readonly modules: readonly ModuleId[];
  readonly summary: string;
  readonly endpointIds: readonly EndpointId[];
  readonly countsPending: boolean;
}

interface AreaCount {
  readonly availability: Availability;
  readonly count: number;
}

const AREAS: readonly Area[] = [
  { path: '/personal', title: 'Autenticación del personal', modules: ['M1'], summary: 'Login, identidad, permisos y cierre de sesión.',
    endpointIds: ['personalAutenticar', 'personalMe', 'personalCrearCaso', 'personalCerrarSesion'], countsPending: false },
  { path: '/casos', title: 'Gestión académica de casos', modules: ['M3'], summary: 'Creación de casos en borrador.',
    endpointIds: ['casoCrear'], countsPending: true },
  { path: '/sesiones', title: 'Programación de sesiones', modules: ['M4'], summary: 'Sesiones, estados y convocatorias.',
    endpointIds: ['sesionListar', 'sesionConsultar', 'sesionCrear', 'sesionActualizar', 'sesionEstado', 'convocatoriaListar', 'convocatoriaCrear'],
    countsPending: true },
  { path: '/acceso-estudiantil', title: 'Acceso estudiantil', modules: ['M1'], summary: 'Estado real de DD-02.',
    endpointIds: ['estudianteValidar'], countsPending: false },
  { path: '/participacion', title: 'Participación y evaluación', modules: ['M5', 'M6'], summary: 'Intentos y evaluación.',
    endpointIds: ['intentoConsultar', 'intentoGuardarRespuesta'], countsPending: true },
  { path: '/diagnostico', title: 'Diagnóstico de integración', modules: ['APP'], summary: 'Registro y probador de rutas.',
    endpointIds: allEndpoints.map((endpoint) => endpoint.id as EndpointId), countsPending: false },
];

function countsFor(area: Area): readonly AreaCount[] {
  const routes = area.endpointIds.map((id) => endpoints[id]);
  const pending = area.countsPending
    ? pendingOperations.filter((operation) => area.modules.includes(operation.module)).length
    : 0;
  const counts: readonly AreaCount[] = [
    { availability: 'disponible', count: routes.filter((route) => route.availability === 'disponible').length },
    { availability: 'restringido', count: routes.filter((route) => route.availability === 'restringido').length },
    { availability: 'pendiente', count: pending },
  ];
  return counts.filter((item) => item.count > 0);
}

// Screen A: identity, backend connection status and navigation.
@Component({
  selector: 'app-home',
  imports: [RouterLink, StatusChip],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly api = inject(ApiClient);

  protected readonly healthUrl = `${environment.apiUrl}/health`;
  protected readonly health = new ApiAction<HealthResponse>();
  protected readonly areas = AREAS.map((area) => ({ ...area, counts: countsFor(area) }));
  protected readonly connection = computed(() => {
    const result = this.health.result();
    if (this.health.loading()) {
      return { label: 'Comprobando conexión…', dot: 'dot', error: null };
    }
    if (result === null) {
      return { label: 'Sin comprobar', dot: 'dot', error: null };
    }
    return result.ok
      ? { label: 'Conectado con la API', dot: 'dot dot--on', error: null }
      : { label: 'Sin conexión con la API', dot: 'dot dot--off', error: result.error.message };
  });

  ngOnInit(): void {
    void this.checkHealth();
  }

  protected checkHealth(): Promise<unknown> {
    return this.health.run(() => this.api.health());
  }
}
