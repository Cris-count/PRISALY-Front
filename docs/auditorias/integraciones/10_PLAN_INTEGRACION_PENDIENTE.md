# 10 — Plan de integración pendiente

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Solo lectura.

Orden propuesto por dependencias (seguridad → contratos → persistencia → servicios → UI).

| ID | Tarea | Dónde | Dependencias | Prioridad | Criterio de aceptación |
|---|---|---|---|---|---|
| P-01 | Activar/confirmar DD-02 (acceso estudiantil) | Backend M1 + decisión DC | decisión institucional | **Crítica** | `student-access.enabled=true` y contrato de identidad estudiantil |
| P-02 | Registrar `ParticipacionHttpGateway` (opt-in) y completar operaciones M5 (iniciar/finalizar/progreso/fase) | Frontend `simulador` + Backend M5 | P-01 | **Crítica** | el simulador llama endpoints M5 reales |
| P-03 | Conectar narrativa M3 → SIM-01 (`adaptador-guion-m3` en el recorrido real) | Frontend `simulador/narrativa` | P-01, P-02 | Alta | un caso M3 autorizado se reproduce como guion |
| P-04 | Consumir M6 (evaluación) y M7 (notificaciones) | Frontend + Backend | P-02 | Alta | pantalla de resultados y notificaciones reales |
| P-05 | Reconciliar entornos QA (18094 vs 8080) | Configuración | — | Alta | un único backend QA verificado |
| P-06 | Publicar listado de casos (`GET /v1/casos`) o aceptar listado en memoria | Backend M3 | — | Media | listado docente real persistente |
| P-07 | Confirmar rama FE-59 vigente y unificar trabajo | Git | — | Media | una sola rama FE-59 |
| P-08 | Verificar licencias de recursos visuales del ZIP | — | — | Media | autorización de uso documentada |
| P-09 | Decidir proxy inverso para `/api` en producción | Infraestructura | — | Media | despliegue real funcional |

## Paralelismo

- P-01/P-02/P-03 son secuenciales (estudiante → intento → narrativa).
- P-04, P-06, P-08 pueden avanzar en paralelo.
- P-05 y P-07 son transversales y deben resolverse antes de cualquier verificación E2E.

## Nota de responsabilidad

Este plan no asigna tareas a personas específicas; las responsabilidades (Cristian/SIM-01, Nicolás/Phaser+gateway, Mariana/rutas, Ingrid/backend) son referencias a verificar en la documentación vigente.
