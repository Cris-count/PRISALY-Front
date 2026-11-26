# 03 — Matriz maestra de integraciones

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Solo lectura.

Etiquetas: `VERIFICADO` (código + prueba), `IMPLEMENTADO_NO_PROBADO`, `PARCIAL`, `MOCK`, `FALTANTE`, `DEFECTUOSO`, `NO_DETERMINADO`, `NO_APLICA`.

## Conexiones existentes

| ID | Origen | Componente origen | Destino | Componente destino | Contrato | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| C-01 | Frontend | `autenticacion` (login personal) | Backend M1 | `PersonalAuthController` | `POST /v1/personal/autenticar` | IMPLEMENTADO_NO_PROBADO | `m1-personal-http.ts`, endpoint M1 |
| C-02 | Frontend | `SesionPersonalM1` | Backend M1 | `PersonalSessionController` | `GET /v1/personal/me` | IMPLEMENTADO_NO_PROBADO | `m1-personal-sesion.ts` |
| C-03 | Frontend | `SesionPersonalM1` | Backend M1 | `PersonalSessionController` | `POST /v1/personal/cerrar-sesion` | IMPLEMENTADO_NO_PROBADO | `m1-personal-sesion.ts` |
| C-04 | Frontend | `AdministracionM1Api` | Backend M1 | `AdministracionController` | `v1/admin/roles·permisos·docentes·usuarios/{id}/permisos` | IMPLEMENTADO_NO_PROBADO | `administracion-m1.api.ts` + `panel-administracion-m1.ts` |
| C-05 | Frontend | `CasosM3Api` | Backend M3 | `CasoCreation/Gestion/Publicacion/Rubrica/Contenido` | `v1/casos/**` | IMPLEMENTADO_NO_PROBADO | `casos-m3.api.ts` + `panel-casos-m3.ts` / `panel-rubrica-m3.ts` / `panel-contenido-m3.ts` |
| C-06 | Frontend | `panel-sesiones-m4` / `recorrido-docente` | Backend M4 | `SesionController` / `ConvocatoriaController` | `m4/sesiones/**` | IMPLEMENTADO_NO_PROBADO | `academico-http.ts` whitelist + paneles |
| C-07 | Frontend | `academico-http` (interceptor Bearer) | Backend | `HttpApiConfig` (anyRequest().authenticated()) | Bearer + whitelist | IMPLEMENTADO_NO_PROBADO | `academico-http.ts`, `HttpApiConfig.java` |
| C-08 | Frontend | simulador (Phaser/Unreal/SIM-01) | — | — | demo-only (`requiereEntornoDemostracion`) | PARCIAL | `app.routes.ts`. No se abrió la ruta. |

## Conexiones parciales o pendientes

| ID | Origen | Componente origen | Destino | Contrato requerido | Estado | Evidencia / bloqueo |
|---|---|---|---|---|---|---|
| C-09 | Frontend | `ParticipacionGateway` (default) | Backend M5 | `iniciar/finalizar/progreso/sesiones` | **FALTANTE** | `ParticipacionPendienteGateway` lanza `ContratoPendienteError`. No simula una respuesta del servidor. |
| C-10 | Frontend | `ParticipacionHttpGateway` (opt-in) | Backend M5 | `GET /v1/estudiantes/intentos/{id}` · `GET .../contenido` · `PUT .../respuestas/{idPregunta}` | IMPLEMENTADO_NO_PROBADO | `participacion-http.gateway.ts`; no registrado en `app.config` |
| C-11 | Backend M5 | `FasesIntentoEstudianteControlador` | Frontend | adaptador de fases | FALTANTE | Clase presente. `prisaly.m5.exploracion.fases.http.enabled=false`: la ruta no se publica. |
| C-12 | Backend M6 | `EvaluacionDocenteController` | Frontend | pantalla de evaluación docente | FALTANTE | Clase presente. `prisaly.m6.evaluacion.enabled=false`: la ruta no se publica. Sin cliente en el front. |
| C-13 | Frontend | vista estudiante (`/v1/estudiantes/convocatorias`, sesiones, participaciones) | Backend M4/M5 | contrato estudiantil | PARCIAL | `mapa.models.ts` + `contenido-intento.models.ts` presentes; DD-02 deshabilitado (`prisaly.m1.student-access.enabled=false`) |
| C-14 | Backend M3 | `CasoNarrativaController` (PUT/POST narrativa) | Frontend | `adaptador-guion-m3` | PARCIAL | endpoint existe; `narrativa/adaptador-guion-m3.ts` existe; consumo real por el recorrido no confirmado |
| C-15 | Backend M7 | notificaciones | Frontend | vista de notificaciones | FALTANTE (consumo) | módulo M7 backend; sin consumidor frontend confirmado |

## Hallazgos clave

1. **M1, M3 y M4 tienen cliente y controlador.** El build de desarrollo y el de producción no registran el interceptor (`personalQaHabilitado: false`). El mapa oficial deja las rutas en `habilitada: false`. Solo `qa-navegacion` las enciende, y esta auditoría no llamó al servidor.
2. **M5 no sale del navegador.** El gateway por defecto rechaza la operación. `ParticipacionHttpGateway` no está en `app.config.ts`. Inicio, finalización y fases HTTP están en `false` en `application.yml`.
3. **El simulador es demo**: las rutas Phaser/Unreal/SIM-01 exigen `requiereEntornoDemostracion` (solo entorno `demo`).
4. **DD-02 (acceso estudiantil) está deshabilitado**: `prisaly.m1.student-access.enabled=false`.
5. **Divergencia de entorno**: QA usa `localhost:18094`, desarrollo usa `localhost:8080`.
