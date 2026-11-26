# 11 — Resumen ejecutivo

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · 2026-11-24 · Solo lectura.

Checkout auditado: `PRISALY-Front` y `PRISALY-Backend` en `fix/integracion` (`00a2fa2` y `5d61972`). Ningún flujo se ejecutó contra un servidor. Por eso no hay conexión marcada `VERIFICADO`.

## Estado real

El código de personal (M1, M3, M4) y el código del simulador conviven en el mismo front, pero el build que abre `ng serve` no conecta el personal, y el simulador no escribe el estado académico.

1. **Personal desconectado en el build por defecto.** `environment.ts` y `environment.development.ts` tienen `personalQaHabilitado: false`. `app.config.ts` solo registra el interceptor Bearer y la sesión M1 cuando ese flag es verdadero. Desarrollo llama a `http://localhost:8080/api`; QA y `qa-navegacion` llaman a `http://localhost:18094/api`.
2. **Las pantallas de personal siguen apagadas salvo un build.** El mapa oficial tiene `habilitada: false`. `mapeoConHabilitacionQa` solo pone `habilitada: true` en `qa-navegacion`, con `production === false` y `personalQaHabilitado === true`, y solo para `usuarios-docentes`, `configuracion`, `casos-academicos`, `rubricas`, `sesiones` y `convocatorias`.
3. **Esos clientes sí apuntan a rutas que el backend declara.** `M1PersonalApi`, `AdministracionM1Api`, `CasosM3Api` y `SesionesM4Api` construyen `v1/personal/**`, `v1/admin/**`, `v1/casos/**` y `m4/sesiones/**`. Los controladores correspondientes existen. Eso es `IMPLEMENTADO_NO_PROBADO`: hay contrato en código y no hubo petición real.
4. **El estudiante no entra.** `prisaly.m1.student-access.enabled=false`. `/estudiante/acceso` solo existe si `M1_PERSONAL_LOCAL` está provisto; si no, la ruta cae en login. `/acceso-estudiante` y `/simulador*` exigen `demostracionesHabilitadas`, que es `true` solo en el entorno `demo`.
5. **El simulador no registra el intento.** El gateway inyectado es `ParticipacionPendienteGateway`: cada operación lanza `ContratoPendienteError`. No finge una respuesta. `ParticipacionHttpGateway` no está en `app.config.ts`. En backend, iniciar y finalizar intento (`prisaly.m5.inicio-finalizacion.publicacion.enabled`) y las fases (`exploracion.fases`) están en `false`.
6. **Evaluación y avisos no están publicados.** `prisaly.m6.evaluacion.enabled=false` (el controlador de `POST/GET /v1/evaluacion/intentos/{idIntento}` no se publica). `prisaly.m7.worker.enabled=false`. M7 no tiene controlador REST. M2 es un esqueleto (`package-info.java`).
7. **Narrativa de caso y listado docente también están apagados en backend.** `prisaly.m3.narrativa.publicacion.enabled=false` y `prisaly.m3.listado.enabled=false`.
8. **Unreal y Phaser están en el front como demostración.** Dependencias `phaser` y `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`. Las rutas `/simulador`, `/simulador-tecnico-2d5`, `/simulador-integrado` y `/simulador-unreal` llevan `requiereEntornoDemostracion`. No se abrió ninguna en el navegador.

## Primer corte de cada flujo

| Flujo | Primer corte |
|---|---|
| E2E-01 Login de personal | El build de desarrollo no registra el cliente HTTP de M1. |
| E2E-02 Caso, sesión, convocatoria | Mismo corte, y el mapa oficial no habilita la ruta. |
| E2E-03 Estudiante → simulador | Acceso estudiantil apagado; el simulador es solo demo. |
| E2E-04 Narrativa local | Código del motor en el front; esta pasada no lo ejecutó y no persiste. |
| E2E-05 Decisión → M5 | El gateway pendiente corta antes del HTTP. |
| E2E-06 Evaluación | M6 no publica la ruta y el front no la llama. |
| E2E-07 Reanudar | No hay intento persistido que recuperar. |
| E2E-08 Unreal | Ruta de demo; sin sesión ni evento devuelto a M5. |
| E2E-09 Aviso | M7 no expone consulta ni lectura. |
| E2E-10 URL directa | Guards presentes; no se probó una URL contra un servidor. |

## Orden seguro para completar la integración

1. Acordar el build que se va a probar (`qa-navegacion` contra el backend de 18094, o desarrollo contra 8080) y levantar Postgres sin borrar el volumen.
2. Ejecutar `check:urls`, typecheck, tests de front y `package` del módulo `app`. Recién ahí una fila puede pasar a `VERIFICADO`.
3. Dejar M5 como única autoridad del intento. Registrar `ParticipacionHttpGateway` solo cuando Dirección Central publique inicio, consulta, respuesta y finalización. No duplicar el intento en Phaser ni en SIM-01.
4. El acceso estudiantil (DD-02) sigue apagado. No usar el Bearer de personal como identidad de estudiante.
5. M6 y M7 se publican después de que exista un intento persistido. El enrutado de las demos 2.5D se coordina con Mariana; esta auditoría no cambia rutas.

Detalle en `01`–`10` de esta carpeta. `08` lista los comandos que quedaron pendientes y por qué.
