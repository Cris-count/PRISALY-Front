# 04 — Auditoría frontend ↔ backend (correspondencia HTTP)

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Solo lectura.

## Regla de seguridad (verificada)

`HttpApiConfig.securityFilterChain`:
- `GET /health` → `permitAll`.
- `POST /v1/personal/autenticar` → `permitAll`.
- `POST /v1/acceso-estudiante/solicitar|validar|cerrar-sesion` → `permitAll`.
- `OPTIONS /**` → `permitAll` (CORS).
- `/v1/estudiantes/**` → acceso por cookie de estudiante.
- `anyRequest()` → `authenticated()` (Bearer de personal).

## Interceptores frontend (verificados)

- `personalM1Interceptor`: añade `Authorization: Bearer` solo a `GET /v1/personal/me` y `POST /v1/personal/cerrar-sesion`, con opt-in `M1_PERSONAL_LOCAL`.
- `personalAcademicoInterceptor` (`academico-http.ts`): whitelist explícita de rutas académicas (método + regex UUID). No envía Bearer a rutas fuera de la whitelist (M5, login, estáticos, otros orígenes).

## Correspondencia de llamadas (endpoint backend → consumidor frontend)

| Endpoint backend | Consumidor frontend | Estado |
|---|---|---|
| `POST /v1/personal/autenticar` | `SesionPersonalM1.autenticar` | IMPLEMENTADO_NO_PROBADO |
| `GET /v1/personal/me` | `SesionPersonalM1` | IMPLEMENTADO_NO_PROBADO |
| `POST /v1/personal/cerrar-sesion` | `SesionPersonalM1` | IMPLEMENTADO_NO_PROBADO |
| `PUT /v1/personal/contrasena` | `PersonalContrasenaController` (sin consumidor confirmado) | FALTANTE |
| `GET /v1/personal/autorizacion/crear-caso` | (sin consumidor confirmado) | FALTANTE |
| `POST /v1/admin/docentes` · `GET /v1/admin/roles` · `GET /v1/admin/permisos` · `GET/PUT/DELETE /v1/admin/usuarios/{id}/permisos/{idPermiso}` | `AdministracionM1Api` | IMPLEMENTADO_NO_PROBADO |
| `POST /v1/casos` · `GET/PATCH /v1/casos/{id}` · `POST .../publicar|archivar` · `PUT .../rubrica` · `POST .../escenarios|preguntas|opciones` · `GET .../contenido|escenarios|preguntas|opciones` | `CasosM3Api` | IMPLEMENTADO_NO_PROBADO |
| `PUT /v1/casos/{id}/narrativa` · `POST .../narrativa/publicar` | `adaptador-guion-m3.ts` (consumo real sin confirmar) | PARCIAL |
| `GET/PUT/PATCH /m4/sesiones/**` · `.../convocatorias` | paneles `academico` + `academico-http` | IMPLEMENTADO_NO_PROBADO |
| `GET /v1/estudiantes/convocatorias` | (vista estudiante, DD-02 gated) | PARCIAL |
| `POST /v1/estudiantes/sesiones/{id}/intentos` · `POST .../finalizar` | **sin consumidor frontend** (gateway pendiente) | FALTANTE |
| `GET /v1/estudiantes/intentos/{id}` · `PUT .../respuestas/{idPregunta}` · `GET .../contenido` | `ParticipacionHttpGateway` (opt-in, no registrado) | IMPLEMENTADO_NO_PROBADO |
| `GET /v1/estudiantes/intentos/{id}/narrativa|fase|completitud` · `POST .../cuestionario` | sin consumidor frontend | FALTANTE |
| `POST /v1/evaluacion/intentos/{id}` | sin consumidor frontend | FALTANTE |
| `GET /health` | (diagnóstico) | NO_APLICA (frontend no lo consume) |

## Observaciones

- **M3 no publica listado**: `casos-sesion.store.ts` documenta que M3 solo expone `GET /v1/casos/{id}`; el listado docente se mantiene en memoria (`CasosSesionStore`), no hay `GET /v1/casos` en el backend.
- **CORS**: `cors.allowed-origins=${CORS_ORIGINS:http://localhost:4200}` (verificado en `application.yml`).
- **Base URL**: producción usa `/api` (proxy inverso pendiente de aprobación); desarrollo usa `http://localhost:8080/api`; QA usa `http://localhost:18094/api`.
