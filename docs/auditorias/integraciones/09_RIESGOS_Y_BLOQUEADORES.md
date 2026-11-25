# 09 — Riesgos y bloqueadores

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Solo lectura.

| # | Riesgo | Impacto | Evidencia |
|---|---|---|---|
| R-01 | **DD-02 (acceso estudiantil) deshabilitado** | bloquea todo flujo de estudiante (E2E-03…E2E-07) | `prisaly.m1.student-access.enabled=false` |
| R-02 | **Gateway M5 pendiente** (`ParticipacionPendienteGateway`) | el simulador no persiste intentos/respuestas | `participacion.gateway.ts` |
| R-03 | **Divergencia de entornos** (QA `18094` vs desarrollo `8080`) | riesgo de probar contra backend equivocado | `environment.qa.ts` vs `environment.development.ts` |
| R-04 | **Dos ramas FE-59** (`organizacion-roles` y `habilitacion-funcional`) | posible trabajo duplicado/divergente | `git branch` |
| R-05 | **Sin consumidor frontend de M6 (evaluación) y M7 (notificaciones)** | evaluación/notificación sin pantalla funcional | endpoints existen, sin consumidor |
| R-06 | **`GET /v1/casos` (listado) no existe en backend** | el listado docente es en memoria (`CasosSesionStore`), se pierde al recargar | `casos-sesion.store.ts` |
| R-07 | **Endpoints M1 potencialmente huérfanos** (`PUT /contrasena`, `GET /autorizacion/crear-caso`) | funcionalidad expuesta sin UI | sin consumidor confirmado |
| R-08 | **Unreal Pixel Streaming sin evidencia de ejecución real** | integración 3D no verificada | `reproductor-unreal.ts` |
| R-09 | **Recursos visuales del ZIP sin licencia verificada** | riesgo legal antes de publicar | informe VISUAL-26/30 |
| R-10 | **Base URL de producción `/api` requiere proxy inverso** (pendiente de aprobación) | despliegue real sin proxy rompe la API | `environment.ts` |

## Clasificación por criticidad

- **Críticos**: R-01, R-02 (impiden el flujo académico de estudiante).
- **Altos**: R-03, R-05, R-06.
- **Medios**: R-04, R-07, R-08.
- **Legales/operativos**: R-09, R-10.
