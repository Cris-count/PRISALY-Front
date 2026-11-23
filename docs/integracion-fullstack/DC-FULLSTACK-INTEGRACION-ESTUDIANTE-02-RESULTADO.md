# DC-FULLSTACK-INTEGRACION-ESTUDIANTE-02: resultado

- **Fecha:** 2026-11-23.
- **Ejecutor:** Claude.
- **Responsables:** Mariana (Frontend) e Ingrid (Backend).
- **Auditor:** Codex.

## Resumen ejecutivo

**El perfil estudiantil no puede usarse hoy con datos reales. No se presenta ninguna demostración como funcionalidad.**

| Fase del recorrido                                               | Estado                                                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Administrador → docente → caso → rúbrica → sesión → convocatoria | Funciona por HTTP real con persistencia en PostgreSQL (ver DOCENTE-01). Navegarlo exige autorización           |
| Convocatoria → estudiante                                        | **Bloqueada**: DD-02 está desactivado, ningún estudiante tiene credencial y no hay migraciones DD-02 aplicadas |
| Participación (M5)                                               | **Bloqueada**: las banderas de publicación están desactivadas y depende de DD-02                               |
| Evaluación (M6)                                                  | **No integrada**: solo existe en el PR #95, en Draft                                                           |
| Resultados (N2)                                                  | **Pendiente**: no hay contrato                                                                                 |

**No se modificó código.** Ningún ajuste Frontend independiente permitiría avanzar sin activar DD-02 o M5, y eso no está autorizado.

## 1. Estado de la autenticación estudiantil

| Aspecto                                  | Estado                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Activación                               | M1 no autentica estudiantes: `prisaly.m1.student-access.enabled=false`                                                  |
| Contratos de acceso                      | `POST /v1/acceso-estudiante/solicitar` y `validar` responden **501 `ESTUDIANTE_ACCESS_PENDING_CONTRACT`** (prueba real) |
| Registro, aprovisionamiento o activación | No existe ningún mecanismo autorizado                                                                                   |
| `/v1/personal/me`                        | Es exclusivo del personal. No hay un `/me` estudiantil operativo                                                        |
| Rol                                      | Existe `ESTUDIANTE_QA` en la base QA, con 1 cuenta **sin credencial**                                                   |

## 2. Estado de DD-02

**Bloqueado:**

- el código está integrado y desactivado;
- las migraciones V014 a V016 (`db/dd02b-propuesta`) **no están aplicadas**, porque Flyway está en la versión 013;
- no se activó nada.

## 3. Estado del panel estudiantil

- `/dashboard/estudiante` (`DashboardEstudiante`) es **solo una demostración**: presentación estática sin datos.
- Desde FE-58 solo existe en el build `demo`. En QA redirige a `demostracion-no-autorizada`, comprobado en el navegador real.
- **No hay rutas Angular estudiantiles conectadas a datos reales.**

## 4. Estado de M4 para estudiantes

`GET /v1/estudiantes/convocatorias` (`ConvocatoriasEstudianteController`) existe y está filtrado por el estudiante autenticado (diseño del Backend):

| Situación                | Respuesta real                       |
| ------------------------ | ------------------------------------ |
| Sin sesión               | 401                                  |
| Con un token de personal | **503 `M4-PROVEEDOR-NO-DISPONIBLE`** |

El 503 indica que, además de la identidad, el proveedor de convocatorias estudiantiles no está disponible en la configuración QA. **Ingrid debe confirmarlo.**

## 5. Estado de M5

| Operación                                                      | Respuesta real con token de personal | Situación                                                                 |
| -------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| Iniciar intento `POST /v1/estudiantes/sesiones/{id}/intentos`  | 404                                  | Controlador no registrado (bandera de publicación en `false`)             |
| Finalizar intento                                              | 404                                  | Ídem                                                                      |
| Consultar intento y su contenido                               | 403 `STUDENT_IDENTITY_UNAVAILABLE`   | Necesita identidad estudiantil                                            |
| Guardar respuesta                                              | **400 `VALIDATION_ERROR`**           | Validación del cuerpo antes de comprobar la identidad (ver la sección 17) |
| Fases (`/fase`, `/narrativa`, `/cuestionario`, `/completitud`) | 404                                  | Banderas `fases` y `fases.http` en `false`                                |
| Sin sesión, cualquiera                                         | 401                                  | —                                                                         |

## 6. Estado de M6 y de los resultados

| Elemento                                  | Estado                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/evaluacion/intentos/{id}`        | 404 en `develop` (401 sin sesión): **solo existe en el PR #95**, en Draft, con `prisaly.m6.evaluacion.enabled=false` |
| Publicación y consulta de resultados (N2) | Sin contrato                                                                                                         |
| Calificaciones                            | No se expuso ninguna                                                                                                 |

## 7. Contratos disponibles

Hoy un estudiante no puede usar ninguno.

- **Integrados pero inaccesibles:** convocatorias propias, consulta de intento y contenido, y respuestas.
- **Integrados y desactivados:** acceso DD-02, inicio y finalización de intentos, y fases.

## 8. Contratos faltantes

| Contrato                                       | Situación                      |
| ---------------------------------------------- | ------------------------------ |
| DD-02 activado, con su esquema                 | Pendiente                      |
| Credencial y activación estudiantil            | Pendiente                      |
| Proveedor de convocatorias estudiantiles en QA | Pendiente                      |
| M6                                             | Fusión y aceptación pendientes |
| N2 (resultados)                                | Pendiente                      |
| Consulta de resultados del estudiante          | Pendiente                      |

## 9. Rutas Angular existentes

| Ruta                                           | Situación                                                                                                                        |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard/estudiante`                        | Solo demo                                                                                                                        |
| `/simulador-integrado`                         | A/B, solo demo; la modalidad académica está deshabilitada (sin enlace de entradas por URL y con `ParticipacionPendienteGateway`) |
| `/simulador-unreal` y `/simulador-tecnico-2d5` | Solo demo                                                                                                                        |

`ParticipacionHttpGateway` ya implementa la consulta de intento, el contenido y las respuestas con `withCredentials`, pero **no se usa** mientras DD-02 siga inactivo.

## 10. Pruebas de Backend (nivel 2)

`estudiante-real-fs02` (Karma con HTTP real): **1/1, exit 0**.

- Registra 10 contratos sin sesión y 8 con un token de personal; ninguno devuelve 2xx.
- Detalle en `INTEGRACION-FULLSTACK-EVIDENCIAS/traza-estudiante-real-fs02.txt`.

## 11. Pruebas de PostgreSQL

| Dato                                   | Resultado                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Estudiante`                           | 1 fila (la fixture QA)                                                                      |
| Tablas de credencial estudiantil DD-02 | No existen (V014 no aplicada)                                                               |
| Convocatoria del escenario docente     | `f5f3f1fe-…`, para ese estudiante, existe en `Convocatoria`. Es el lado docente, verificado |

No hay intentos, respuestas ni calificaciones creadas, porque no se pueden crear.

## 12. Pruebas en navegador (nivel 3)

| Prueba                       | Resultado                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio de sesión estudiantil | **Imposible**: no existe                                                                                                                     |
| Con sesión docente           | `/dashboard/estudiante`, `/simulador-integrado` y `/simulador-unreal` → `demostracion-no-autorizada`. Comprobado en el QA real (puerto 4300) |

**Aislamiento entre estudiantes:** no se puede probar sin dos sesiones estudiantiles reales. Queda **pendiente**; no se da por aprobado. El Backend aplica la titularidad (`TitularidadIntentosDesdeM4` y la identidad M1).

## 13. Compatibilidad con el simulador

- No se modificaron Unreal, Pixel Streaming, Phaser, SIM-01 ni los adaptadores.
- `/simulador-integrado` no inicia intentos académicos: la URL no puede pasarle contexto y el gateway por defecto es el pendiente.
- La conexión académica futura necesita DD-02 y M5, y una ruta B propia diseñada por Nicolás y Cristian con Ingrid.

## 14. Procedimiento de creación de cuentas

| Perfil        | Procedimiento                                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Administrador | Cuenta QA autorizada existente; credencial en el almacén local QA, entregada por canal privado. Para un entorno nuevo, `InicializacionAdministradorRunner` con un archivo de credencial                                        |
| Docente       | El administrador hace el alta (`POST /v1/admin/docentes`), pero **la cuenta no puede iniciar sesión hasta D-05**. Para probar hoy: la cuenta de la semilla pública local del Backend (`bruno/scripts/m1-bruno-seed-local.sql`) |
| Estudiante    | **No existe procedimiento**: depende de DD-02. No se crearon accesos temporales ni permisos ficticios                                                                                                                          |

## 15. Funcionalidades operativas

- **Por HTTP real con persistencia:** la autenticación y la administración del personal, y el recorrido docente completo hasta la convocatoria.
- **En el navegador:** el inicio de sesión del personal y los guards.

## 16. Funcionalidades bloqueadas

- Todo el perfil estudiantil: acceso, panel real, convocatorias propias, participación, evaluación y resultados.
- La navegación de las secciones docentes, que espera la habilitación en QA.
- La activación de docentes nuevos (D-05).

## 17. Decisiones necesarias de Dirección Central

1. **Habilitación QA de las rutas docentes:** necesaria para el recorrido navegable (ver DOCENTE-01, sección 15).
2. **DD-02:** si se activa en un QA aislado, aplicando V014 a V016 solo allí, y qué mecanismo de entrega del código se usa.
3. **M5:** publicar el inicio y la finalización de intentos en QA tras DD-02.
4. **M6 y N2:** aceptación de la evaluación (PR #95) y de la política de publicación de resultados.
5. **Para Ingrid:**
   - aclarar el 503 `M4-PROVEEDOR-NO-DISPONIBLE` de las convocatorias estudiantiles;
   - revisar si `PUT …/respuestas` debe validar la identidad antes que el cuerpo (hoy da 400 antes de 403).

## 18. Próximos cambios concretos

1. **Frontend, con autorización:** configuración `qa-navegacion` para las rutas docentes, y el recorrido navegable con evidencia en PostgreSQL.
2. **Backend (Ingrid), con autorización:** DD-02 en QA; credencial estudiantil de prueba por canal privado; proveedor de convocatorias.
3. **Frontend, después de DD-02:**
   - un servicio estudiantil autenticado (cookie, sin Bearer);
   - una ruta B estudiantil con su guard propio;
   - una pantalla de convocatorias propias.
     Todo reutilizando `ParticipacionHttpGateway`.
4. **Con M5 publicado:** la conexión de la participación (Nicolás, Cristian y Mariana).
5. **Con M6 y N2:** la evaluación docente y la consulta del resultado propio.

**Sin commits, push, PR ni merge.**
