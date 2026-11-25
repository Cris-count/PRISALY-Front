# 07 — Flujos end-to-end

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Solo lectura.

> Los flujos se reconstruyeron por código. No se ejecutaron contra un backend real (servicios apagados). "Punto de corte" = primer paso sin conexión verificada.

| Flujo | Recorrido | Estado | Punto de corte |
|---|---|---|---|
| E2E-01 Autenticación | Login → `POST /v1/personal/autenticar` → Bearer → `GET /me` → dashboard por rol | IMPLEMENTADO_NO_PROBADO | En `environment.ts` y `environment.development.ts`, `personalQaHabilitado` es `false`: `app.config.ts` no registra el interceptor ni `provideM1PersonalLocal()`. El cliente solo se arma en builds QA (`environment.qa.ts`, puerto 18094) y `qa-navegacion`. Esta auditoría no llamó al backend. |
| E2E-02 Administración académica | Admin → crear caso (`POST /v1/casos`) → publicar → crear sesión (`m4/sesiones`) → convocar | IMPLEMENTADO_NO_PROBADO | Mismos clientes y el mismo corte: sin build QA el navegador no adjunta Bearer. El mapa oficial deja `habilitada: false`; solo `qa-navegacion` enciende esas rutas. |
| E2E-03 Inicio del simulador | Estudiante → sesión válida → caso autorizado → simulador → escenario | **FALTANTE** | acceso estudiantil DD-02 deshabilitado; simulador es demo-only |
| E2E-04 Desarrollo narrativo | Escenario → NPC → diálogo → decisión → consecuencia → transición | IMPLEMENTADO_NO_PROBADO | El motor vive en el frontend y no se ejecutó en esta auditoría. No hay persistencia académica de la decisión. |
| E2E-05 Registro académico | Decisión → gateway → M5 → persistencia → confirmación | **FALTANTE** | `app` registra `ParticipacionPendienteGateway`, que lanza `ContratoPendienteError` y no simula éxito. `ParticipacionHttpGateway` existe y no está en `app.config.ts`. En backend, `prisaly.m5.inicio-finalizacion.publicacion.enabled=false`. |
| E2E-06 Evaluación | Respuestas → M6 → rúbrica → resultado → consulta | **FALTANTE** | `EvaluacionDocenteController` existe, pero `prisaly.m6.evaluacion.enabled=false` (sin bean, 404). El frontend no tiene cliente de esa ruta. |
| E2E-07 Continuidad | Salir → reingresar → recuperar intento → continuar | **PARCIAL** | `GET /v1/estudiantes/intentos/{id}` opt-in no registrado; narrativa no persiste |
| E2E-08 Unreal | Angular → visualización Unreal → interacción → evento → retorno | IMPLEMENTADO_NO_PROBADO | Pixel Streaming presente; sin ejecución real |
| E2E-09 Notificaciones | Evento académico → M7 → destinatario → lectura | **FALTANTE (consumo)** | módulo M7 backend; sin consumidor frontend confirmado |
| E2E-10 Seguridad | URL directa → autenticación → autorización → permitido/rechazado | IMPLEMENTADO_NO_PROBADO | Guards y `anyRequest().authenticated()` están en código. No se probó una URL directa contra un servidor. En desarrollo el personal no tiene sesión HTTP. |

## Resumen de corte

El recorrido estudiantil se corta en **E2E-03**: `prisaly.m1.student-access.enabled=false` y las rutas del simulador exigen `demostracionesHabilitadas`. El registro académico se corta en **E2E-05** antes de cualquier HTTP. El recorrido de personal existe como código, pero el build por defecto no lo conecta: el primer corte de E2E-01 en `ng serve` es `personalQaHabilitado: false`.
