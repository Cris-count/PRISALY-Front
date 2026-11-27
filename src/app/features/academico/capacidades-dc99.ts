import { InjectionToken, Provider } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * FE-61 (Backend DC-99, `develop` 32922bb). Habilitación en el Frontend de funcionalidades candidatas
 * que el Backend mantiene APAGADAS por defecto (sin su interruptor la ruta responde 404):
 *
 * - `altaEstudiantes` ↔ `PRISALY_M1_ALTA_ESTUDIANTES_ENABLED` (P-78, `POST/GET /v1/admin/estudiantes`).
 * - `activacionDocente` ↔ `PRISALY_M1_ACTIVACION_DOCENTE_ENABLED` + V020 (D-05,
 *   `POST /v1/personal/activar` y `POST/DELETE /v1/admin/docentes/{id}/activacion`).
 * - `consultaParticipaciones` ↔ `PRISALY_M4_CONSULTA_PARTICIPACIONES_ENABLED` + esquema DC-92
 *   (V019, V021–V023) (DD-09, `GET /v1/docente/sesiones/{id}/participaciones`). FE-61 Fase 2.
 * - `reporteParticipacion` ↔ `prisaly.m7.reportes.participacion.enabled` (nombre real en
 *   `ReporteParticipacionController.PROPIEDAD`; el OpenAPI candidato dice `prisaly.reportes…`) y la
 *   misma vista DC-92 (RF-16/DD-11, `GET /v1/docente/sesiones/{id}/reporte-participacion`, CSV).
 * - `participacionHttp` ↔ opt-in del `ParticipacionHttpGateway` (GET/PUT de intento ya escritos).
 *   No enciende DD-02 ni los POST de inicio y fin. Sigue en false: el simulador conserva
 *   `ParticipacionPendienteGateway` y no presenta un intento como guardado.
 *
 * El valor se fija al compilar desde `environment.capacidadesBackend`. Ningún archivo de entorno lo
 * declara hoy, así que todas quedan deshabilitadas: activarlas exige la autorización de Dirección
 * Central y el interruptor correspondiente en el Backend. Habilitarlas aquí no concede nada: el
 * Backend sigue decidiendo (404 si su interruptor está apagado; 401/403 según la sesión).
 */
export interface CapacidadesBackendDc99 {
  readonly altaEstudiantes: boolean;
  readonly activacionDocente: boolean;
  readonly consultaParticipaciones: boolean;
  readonly reporteParticipacion: boolean;
  /** GET/PUT de intento. No publica el inicio ni el fin, y no sustituye a DD-02. */
  readonly participacionHttp: boolean;
  /** `GET /v1/casos` (M3 `CasoListadoController`, `prisaly.m3.listado.enabled`): casos propios del docente. */
  readonly listadoCasos: boolean;
}

export function leerCapacidadesDc99(valor: unknown): CapacidadesBackendDc99 {
  const c = (valor ?? {}) as Partial<Record<keyof CapacidadesBackendDc99, unknown>>;
  return {
    altaEstudiantes: c.altaEstudiantes === true,
    activacionDocente: c.activacionDocente === true,
    consultaParticipaciones: c.consultaParticipaciones === true,
    reporteParticipacion: c.reporteParticipacion === true,
    participacionHttp: c.participacionHttp === true,
    listadoCasos: c.listadoCasos === true,
  };
}

export const CAPACIDADES_DC99 = new InjectionToken<CapacidadesBackendDc99>('CAPACIDADES_DC99', {
  providedIn: 'root',
  factory: () =>
    leerCapacidadesDc99((environment as { capacidadesBackend?: unknown }).capacidadesBackend),
});

/** Solo para pruebas unitarias. No se registra en `app.config`. */
export function provideCapacidadesDc99(c: Partial<CapacidadesBackendDc99>): Provider {
  return { provide: CAPACIDADES_DC99, useValue: leerCapacidadesDc99(c) };
}
