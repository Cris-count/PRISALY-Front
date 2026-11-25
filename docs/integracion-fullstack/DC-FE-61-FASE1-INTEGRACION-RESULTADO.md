# DC-FE-61 — Fase 1: integración HTTP, P-78 y D-05 (resultado)

Ejecutor: Claude. Fecha: 2026-11-25 (hora local Colombia). Sin commits, push, PR ni merge: Codex administra GitHub. No se modificó el Backend, `develop`, otros repositorios ni otros worktrees. No se aplicaron migraciones (V019–V023, V020) ni se activó ningún interruptor.

## 1. Repositorios y SHA

| Repositorio | Referencia | SHA |
|---|---|---|
| Frontend | Rama de trabajo `integration/fe-61-backend-dc99` (upstream `origin/develop`) | HEAD `00a2fa25ff11a4972d42f4f5738687ddfc2d1772`, con cambios sin confirmar |
| Backend | `origin/develop` (PR #98 `integration/backend-dc99`) | `32922bb8773aae796822185c63a421755f793e4b`; versión anterior usada en FE-60: `5d61972` |

El Backend `32922bb` no estaba descargado en ningún repositorio local. Para leerlo se clonó en la carpeta temporal de la sesión, solo para consulta. Fuentes contrastadas: `AdministracionEstudiantesController` y su `ExceptionHandler`, `AltaEstudianteService`, `ActivacionDocenteController` y su `ExceptionHandler`, `ActivacionDocenteService` (formato del token), `PoliticaContrasena` (DM1-08), `CorreoActivacionDocenteAdapter` (enlace `#token=`), `HttpApiConfig` (rutas públicas y CORS), `application.yml` y `docs/api/openapi-candidatos-dc92.yaml`.

**No hay Backend DC-99 QA en ejecución.** Todas las pruebas usan **dobles HTTP** (`HttpTestingController`), identificados así en cada archivo `.spec`. **No se declara integración E2E.**

## 2. Fase 1 — Integración HTTP y seguridad

- **Lista cerrada del interceptor académico** (`academico-http.ts`): se contrastó con los controladores de `32922bb` y se añadieron, con su método exacto, las rutas de personal (Bearer) de DC-99:
  - P-78: `POST`/`GET v1/admin/estudiantes`.
  - D-05 (administrador): `POST`/`DELETE v1/admin/docentes/{uuid}/activacion`.
  - DD-09 y RF-16: `GET v1/docente/sesiones/{uuid}/participaciones` y `.../reporte-participacion`.
  - DD-13 y RF-21: `POST`/`GET v1/docente/convocatorias/{uuid}/ausencia` y `.../retiro`.
  - DD-04: `POST`/`GET v1/docente/participaciones/{uuid}/repeticion` y `POST .../intento-valido`.
  - DD-12: `POST`/`PUT`/`GET v1/docente/participaciones/{uuid}/retroalimentacion`.
  - M6 y N2: `POST`/`GET v1/evaluacion/intentos/{uuid}` y `POST .../liberacion`.

  Figurar en la lista solo permite transportar el token; no activa nada en el Backend.
- **Rutas sin Bearer** (`RUTAS_SIN_BEARER`, nueva defensa explícita que se comprueba antes de la lista): `v1/personal/autenticar`, `v1/personal/activar`, `v1/acceso-estudiante/**` y `v1/estudiantes/**` (cookie DD-02 B, incluida la calificación N2). Ni una solicitud marcada como académica por error recibe Bearer en estas rutas.
- **Se conservan sin cambios:** `/me` (exclusivo del interceptor M1), los guards, la revalidación por 403 (H-58-02), la limpieza de la credencial ante 401, el registro de interceptores solo en entornos QA (`personalQaHabilitado`) y la separación de entornos. No se modificó ningún archivo `environment*.ts`.
- **Comentarios corregidos:** la cabecera de la lista (antes decía «`develop` 773818c») y la de `acceso-estudiante-real.ts` (contrato DD-02 sin cambios en DC-99).

## 3. Servicios y DTO incorporados (solo según el contrato real)

| Elemento | Contrato Backend |
|---|---|
| `EstudianteAltaRequest {nombre, correo}` | `@NotBlank @Size(max=150)` nombre; `@NotBlank @Email @Size(max=255)` correo; sin contraseña |
| `EstudianteRegistrado {idUsuario, idEstudiante, nombre, correo, estado}` | Respuesta 201 y elementos de `{items}` |
| `AdministracionM1Api.altaEstudiante` | `POST /v1/admin/estudiantes` → 201; 400 `VALIDATION_ERROR`, 401, 403 `ADMIN_REQUIRED`, 409 `DUPLICATE_EMAIL`, 503 `STUDENT_ROLE_NOT_CONFIGURED`/`ROLE_NOT_FOUND` |
| `AdministracionM1Api.buscarEstudiantePorCorreo` | `GET /v1/admin/estudiantes?correo=` → 200 `{items}`, coincidencia exacta (sin distinguir mayúsculas). Sin listado general, paginación ni filtros |
| `AdministracionM1Api.emitirActivacionDocente` / `revocarActivacionDocente` | `POST` → 202 sin cuerpo / `DELETE` → 204; 404 `USER_NOT_FOUND`, 409 `ACTIVATION_NOT_ALLOWED`/`ACTIVATION_CONFLICT`, 503 `ACTIVATION_DELIVERY_FAILED` |
| `ActivacionDocenteApi.activar` y `ResultadoActivacion` | `POST /v1/personal/activar {token, password}` → 204; 400 `ACTIVATION_INVALID`/`VALIDATION_ERROR`, 409 `ACTIVATION_CONFLICT`, 422 `PASSWORD_*` (DM1-08), 429 `ACTIVATION_RATE_LIMITED` + `Retry-After`; 401/404 con el interruptor apagado |
| `CAPACIDADES_DC99` (`capacidades-dc99.ts`) | Capacidad de compilación `environment.capacidadesBackend.{altaEstudiantes, activacionDocente}`; **no se declara en ningún entorno → `false`** |

Un 404 sin código de dominio se presenta como «el servidor no tiene habilitada la funcionalidad», porque sin interruptor el controlador no existe. Se distingue de un 404 `USER_NOT_FOUND`.

## 4. Pantallas

- **Administración de estudiantes (P-78)**, componente `PanelEstudiantesM1` dentro de la página de administración (`/dashboard/usuarios-docentes`), debajo del panel M1:
  - Contiene el alta y la búsqueda por correo exacto, y muestra el `idEstudiante` (el que se usa para convocar en M4).
  - Indica de forma expresa que el alta **no crea credencial ni activa DD-02**.
  - Con la capacidad deshabilitada (estado actual) solo muestra el aviso y no hace ninguna solicitud.
- **Invitación de activación (D-05)** en el panel M1 del administrador:
  - Permite emitir y revocar la invitación.
  - Un 202 se presenta como «emisión aceptada; la entrega del correo no se verifica desde esta interfaz».
  - El texto del alta de docente se actualizó: ya no afirma que la entrega esté pendiente y tampoco que se envíe un correo.
- **Pantalla pública `/activacion-docente`** (`ActivacionDocente`, sin guard de sesión):
  - Lee el token de `#token=` (formato del enlace M7), lo retira de inmediato de la barra de direcciones y del historial (`Location.replaceState`) y lo conserva solo en memoria del formulario. No se escribe en consola ni en almacenamiento del navegador; hay una prueba que lo verifica.
  - Tiene estados de formulario, carga (botón deshabilitado, «Activando…»), confirmación y error.
  - Valida localmente el formato del token (43 caracteres Base64url), el mínimo de 12 caracteres, el máximo de 72 bytes y la confirmación de la contraseña.
  - Ante un 422 conserva el token y borra las contraseñas; ante un 400 `ACTIVATION_INVALID` descarta el token.
  - Deshabilitada (estado actual): no muestra el formulario ni envía nada, aunque llegue un enlace.

## 5. Pruebas ejecutadas

Todas las respuestas del servidor en estas pruebas son **dobles HTTP**; ninguna proviene de un Backend real.

| Verificación | Comando | Resultado |
|---|---|---|
| Línea base previa (sin cambios FE-61) | `ng test --watch=false --browsers=ChromeHeadless` | 776/776 |
| Suite completa con FE-61 | ídem | **820/820** (776 previas + 44 nuevas) |
| Solo FE-61 (interceptor, servicios HTTP, pantallas) | `ng test … --include=**/fe61-*.spec.ts --include=…/activacion-docente.spec.ts` | **44/44** |
| Regresión FE-58, FE-60 y navegación por roles (`fe58-*`, `m1-*` incl. guards/mapeo por rol/revalidación, `dashboard/**` incl. `navegacion-rol` y `dashboard-personal-qa`, `acceso-estudiante-real`, `login-*`, `habilitacion-qa-navegacion`, `app.routes`, `academico-*`, `paneles-academicos`, `recorrido-docente`) | `ng test … --include=…` | **391/391** |
| TypeScript | `tsc -p tsconfig.app.json --noEmit` y `tsc -p tsconfig.spec.json --noEmit` | sin errores |
| Builds | `ng build --configuration production / qa / qa-navegacion / demo / development` | 5/5 correctos. Production mantiene 4 avisos previos ajenos a FE-61 (presupuesto CSS del simulador; `phaser`, `sdp`, `ws` no ESM) |
| URLs codificadas | `npm run check:urls` | «Sin URLs de backend codificadas en src/app» |
| Formato | `prettier --check` sobre los archivos tocados | conforme |

Pruebas nuevas:

- `fe61-transporte-bearer.spec.ts` (11): con los dos interceptores de QA registrados verifica:
  - qué rutas DC-99 llevan Bearer;
  - que `v1/personal/activar`, `v1/acceso-estudiante/**` y `v1/estudiantes/**` no lo llevan, ni siquiera cuando la solicitud llega marcada por error;
  - que `/me` sigue siendo exclusivo del interceptor M1;
  - que `validar` de DD-02 usa cookie.
- `fe61-administracion-estudiantes.spec.ts` (15): cubre:
  - las capacidades deshabilitadas por defecto;
  - el DTO exacto, `?correo=` como único parámetro, el envoltorio `{items}` y la validación de la respuesta;
  - los códigos 409 y 503, y la distinción del 404 sin código;
  - el panel: deshabilitado, sin sesión, sin listado general, alta, búsqueda y fallo.
- `fe61-activacion-admin.spec.ts` (5): exige 202/204, rechaza un 200, no hace HTTP con un UUID inválido, el texto del 202 no afirma entrega del correo y se distinguen los dos tipos de 404.
- `activacion-docente.spec.ts` (13): cubre:
  - la clasificación 400/409/422/429 (`Retry-After`)/401/404 y el formato del token;
  - la política DM1-08;
  - el token del fragmento retirado de la URL, sin consola ni almacenamiento;
  - la pantalla deshabilitada sin envío, las validaciones locales y los estados de carga, confirmación y error.

Durante las pruebas se detectó y corrigió un defecto propio: el primer borrador usaba `responseType: 'text'` y por eso perdía el código `{code}` de los errores. Ahora se usa JSON, que acepta el 202/204 sin cuerpo.

No se verificó en navegador contra un servidor: no hay `.claude/launch.json` en el repositorio y no se añadieron archivos de configuración local. Los componentes se renderizaron en Chrome headless durante las pruebas unitarias.

## 6. Funcionalidades preparadas pero deshabilitadas

| Funcionalidad | Front | Backend necesario |
|---|---|---|
| Alta y búsqueda de estudiantes (P-78) | `capacidadesBackend.altaEstudiantes` ausente → deshabilitada | `PRISALY_M1_ALTA_ESTUDIANTES_ENABLED=true` + rol ESTUDIANTE (PD-01) |
| Activación docente pública y emisión/revocación (D-05) | `capacidadesBackend.activacionDocente` ausente → deshabilitada | `PRISALY_M1_ACTIVACION_DOCENTE_ENABLED=true` + V020 (D-ESQ-1) + `vigencia`/`remitente`/`enlace` + SMTP real (M7) |
| Rutas docentes DD-09, DD-11, DD-13, RF-21, DD-04, DD-12, M6/N2 | Solo en la lista del interceptor; **sin servicios ni pantallas en esta fase** | Interruptores y V019/V021–V023 (ver la matriz V27 del Backend) |

Para activar en el Front basta con declarar `capacidadesBackend: { altaEstudiantes: true }` (o `activacionDocente: true`) en el entorno QA autorizado. Hace falta la autorización de Dirección Central y el interruptor correspondiente en el Backend.

## 7. Dependencias Backend y pendientes

- **E2E:** sin un Backend `32922bb` en QA con los interruptores activados no puede verificarse el flujo real. No se verificaron respuestas reales del servidor, CORS ni correos.
- **D-05:** el valor de `PRISALY_M1_ACTIVACION_DOCENTE_ENLACE` debe apuntar a `<origen del Front>/activacion-docente`, porque el Backend añade `#token=`. La entrega de correos requiere una prueba real de M7/SMTP. Con el interruptor apagado, `POST /v1/personal/activar` responde 401 (ruta no pública), y la pantalla lo presenta como «no habilitada».
- **CORS:** `POST /v1/personal/activar` no usa credenciales, así que la configuración CORS general es suficiente. El encabezado `Retry-After` está expuesto.
- **D-80-1** (activo sin interruptor): una cuenta de estudiante tiene permisos vacíos en `/me`. El Front ya trata la autorización como decisión del Backend; no hizo falta ningún cambio.
- **Siguiente incremento sugerido:** servicios y pantallas de la consulta de participaciones (DD-09), que entrega `idParticipacion` e `idIntentoConsiderado`, los identificadores que necesitan repetición, retroalimentación, evaluación y liberación.

## 8. Archivos

Modificados:

- `src/app/app.routes.ts`: ruta pública `activacion-docente`.
- `src/app/features/academico/academico-http.ts`: lista DC-99, `RUTAS_SIN_BEARER` y comentarios.
- `src/app/features/academico/administracion-m1.api.ts`: DTO y métodos P-78 y D-05.
- `src/app/features/academico/panel-administracion-m1.ts` y `.html`: invitación D-05 y texto del alta de docente.
- `src/app/features/autenticacion/acceso-estudiante-real.ts`: comentario de versión.
- `src/app/features/dashboard/dashboard-administracion.ts` y `.html`: inserción de `PanelEstudiantesM1`.

Nuevos:

- `src/app/features/academico/capacidades-dc99.ts`
- `src/app/features/academico/panel-estudiantes-m1.ts` y `.html`
- `src/app/features/autenticacion/activacion-docente.ts`
- `src/app/features/academico/fe61-transporte-bearer.spec.ts`
- `src/app/features/academico/fe61-administracion-estudiantes.spec.ts`
- `src/app/features/academico/fe61-activacion-admin.spec.ts`
- `src/app/features/autenticacion/activacion-docente.spec.ts`
- `docs/integracion-fullstack/DC-FE-61-FASE1-INTEGRACION-RESULTADO.md` (este documento)

No se tocaron el simulador, los archivos `environment*.ts`, `app.config.ts`, el Backend ni otros worktrees.

## 9. Estado Git

- Rama: `integration/fe-61-backend-dc99`; HEAD `00a2fa25ff11a4972d42f4f5738687ddfc2d1772` (sin commits nuevos).
- 8 archivos modificados (+289/−10) y 9 sin seguimiento (los nuevos de la sección 8; corregido el 2026-11-25: decía 10 por error de conteo). Nada preparado para commit, ni commits, push, PR o merge.
- `develop` no se modificó.
