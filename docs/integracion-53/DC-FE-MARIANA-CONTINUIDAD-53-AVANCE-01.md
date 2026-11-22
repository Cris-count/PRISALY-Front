# DC-FE-MARIANA-CONTINUIDAD-53 — AVANCE 01

**Proyecto:** PRISALY · **Responsable funcional:** Mariana (Frontend Angular 22) · **Ejecutor técnico:** Claude
**Coordinación:** Ingrid (Backend) y Dirección Central 7.0 · **Fecha:** 2026-11-21

> **Resumen.**
> - Se implementaron y conectaron **FE-53-A a FE-53-E**: 3 servicios tipados, 5 paneles funcionales dentro de las pantallas existentes y un transporte Bearer acotado.
> - **Todas las operaciones autorizadas** se ejecutaron contra el Backend real (`develop` 773818c, QA aislado) **desde los servicios y componentes Angular en Chrome**, con persistencia verificada por relectura. Esto incluye el recorrido completo: docente → caso → rúbrica → publicación → sesión → convocatoria.
> - **La navegación real a esas pantallas sigue bloqueada** por el guard `requiereMapeoPersonalQa`, que se conserva sin cambios hasta que exista el mapeo oficial ruta→permiso.
> - No se hizo commit, push, PR ni merge.

Leyenda: **[V]** verificado por Claude en esta estación · **[MOCK]** prueba automatizada con doble HTTP · **[REAL]** prueba real Frontend–Backend · **[B]** bloqueado.

---

## 1. Rama utilizada
`feature/fe-53-integracion-academica` (worktree `PRISALY-Front-53`), creada desde `origin/develop`.

## 2. SHA inicial
`d0bd0c916e3fe2f4173f7cc2e3a08c37257e0dd8` (Frontend `develop`, incluye el PR #15). Backend usado: `773818caf62758d66019a71dac6508d13148abad` (`develop`, sin cambios).

## 3. SHA final local
Sin commits (prohibidos en este incremento): `HEAD` sigue en `d0bd0c9`. Los cambios están en el árbol de trabajo (sección 5).

## 4. Estado de `origin/develop`
Tras `git fetch` al cierre: Frontend `d0bd0c9` y Backend `773818c`. **No ha avanzado** desde el inicio, así que no hay conflictos previsibles con `develop`.

## 5. Archivos modificados

**Nuevos** (`src/app/features/academico/`):

| Archivo | Responsabilidad |
|---|---|
| `academico-http.ts` | `personalAcademicoInterceptor` (Bearer solo para una lista cerrada de método y ruta), `FalloAcademico`, mensajes de error |
| `administracion-m1.api.ts` | Servicio M1 `/v1/admin` |
| `casos-m3.api.ts` | Servicio M3: casos, contenido (lectura), publicación y rúbrica, con ETag/If-Match |
| `sesiones-m4.api.ts` | Servicio M4: sesiones, estados y convocatorias |
| `casos-sesion.store.ts` | Memoria por identidad de los casos creados o consultados (M3 no publica listado) |
| `panel-administracion-m1.ts/.html` | FE-53-A |
| `panel-casos-m3.ts/.html` | FE-53-B |
| `panel-rubrica-m3.ts/.html` | FE-53-C |
| `panel-sesiones-m4.ts/.html` | FE-53-D |
| `panel-convocatorias-m4.ts/.html` | FE-53-E |
| `panel-academico.css` | Estilos funcionales mínimos de los paneles; heredan los colores y la tipografía del dashboard |
| `academico-http.spec.ts`, `academico-apis.spec.ts`, `paneles-academicos.spec.ts` | 45 pruebas nuevas |

**Modificados** (30 inserciones y 5 eliminaciones en total):
- `src/app/app.config.ts`: registra `personalAcademicoInterceptor` solo cuando `personalQaHabilitado` está activo, igual que `personalM1Interceptor`.
- `dashboard-administracion.ts/.html`, `dashboard-docente.ts/.html`, `dashboard-sesiones.ts/.html` y `dashboard-convocatorias.ts/.html`: importan el panel correspondiente y lo insertan justo después de la cabecera. No se cambió nada más del diseño.

**Documentación:** `docs/integracion-53/` (este informe y la matriz CSV).

**No se tocó:** autenticación M1, guards, rutas, entornos, simulador (Phaser, Unreal, Pixel Streaming), gateway M5, Backend, migraciones ni estilos globales.

## 6. Servicios creados o adaptados

| Servicio | Tipo | Notas |
|---|---|---|
| `AdministracionM1Api` | Nuevo | Valida la forma de cada respuesta; el alta envía solo `{nombre, correo}` |
| `CasosM3Api` | Nuevo | Devuelve `Versionado<T>` con el ETag sin modificar; las escrituras exigen `If-Match` (no escribe sin versión) |
| `SesionesM4Api` | Nuevo | No envía `X-Docente-Id`: la identidad sale de la credencial |
| `personalAcademicoInterceptor` | Nuevo | Mismo criterio que `personalM1Interceptor`, que no se modifica: opt-in QA, contexto explícito y lista cerrada; limpia la credencial ante un 401 |
| `M1PersonalApi`, `SesionPersonalM1` | Sin cambios | Reutilizados |

## 7. DTO utilizados
Tomados del código del Backend `773818c`, no de los nombres de los botones:
- **M1:** `DocenteAltaRequest`, `UsuarioDocente`, `RolResumen`, `PermisoResumen`, `Listado<T>{items}` y `AsignacionPermisoUsuario`.
- **M3:**
  - `CrearCasoRequest`: `idCaso` lo genera el cliente; `docenteId` no se envía.
  - `CrearCasoResponse` y `CasoDocenteConsultaResponse`.
  - `CasoPatchRequest`: `titulo`, `historia`, `desarrolloSituacional`, `tiempoEstimadoSegundos`.
  - `CasoContenidoResponse`: solo lectura.
  - `CasoRubricaDto.comando`: `nombre`, `descripcion`, `puntajeTotal`, `criterios[]{id, descripcion, puntaje, ponderacion}`, `preguntas[]{idPregunta, valorPregunta, criterio}`.
  - `RubricaResponse`: añade `completa`.
- **M4:**
  - `CrearSesionRequest`, `ActualizarSesionRequest`, `CambiarEstadoRequest{nuevoEstado}` y `SesionResponse`.
  - `EstadoSesion` con los valores JSON `SinIniciar`, `EnCurso` y `Finalizado`.
  - `ConvocarEstudianteRequest{estudianteId}` y `ConvocatoriaResponse`.

## 8. Endpoints conectados
Las 20 operaciones de la orden, más `GET /v1/casos/{id}` (detalle), `GET /v1/casos/{id}/contenido` (preguntas para la rúbrica) y `POST /v1/casos/{id}/publicar`. El detalle está en `DC-FE-53-MATRIZ-INTEGRACION.csv`.

## 9. Componentes conectados

| Ruta | Componente existente | Panel insertado |
|---|---|---|
| `/dashboard/usuarios-docentes` | `DashboardAdministracion` | `PanelAdministracionM1` |
| `/dashboard/casos-academicos` | `DashboardDocente` | `PanelCasosM3` |
| `/dashboard/rubricas` | `DashboardDocente` | `PanelRubricaM3` |
| `/dashboard/sesiones` | `DashboardSesiones` | `PanelSesionesM4` |
| `/dashboard/convocatorias` | `DashboardConvocatorias` | `PanelConvocatoriasM4` |

Sin sesión de personal válida, cada panel solo muestra "Inicia sesión de personal…" y no hace ninguna llamada HTTP.

## 10. Funcionalidades implementadas
- **FE-53-A:**
  - Catálogo de roles y permisos.
  - Permisos efectivos de un usuario.
  - Asignación y revocación, siempre con relectura posterior.
  - Alta de docente, con aviso de D-05.
  - Bloqueo en la interfaz de la autoasignación de `PUBLICAR_CASO`/`ARCHIVAR_CASO`: reproduce `PoliticaPermisos.exigeSeparacionDeFunciones`.
- **FE-53-B:**
  - Creación en borrador y relectura del caso persistido.
  - Consulta por UUID o desde la memoria de sesión.
  - Edición de título y tiempo con If-Match. Tras un 412 o 428 la edición se bloquea hasta volver a consultar.
  - Solicitud de publicación; se muestra el resultado real (409 `CASE_INCOMPLETE`, 200 `PUBLICADO`, 409 `ALREADY_PUBLISHED`).
- **FE-53-C:**
  - Carga del contenido y la rúbrica (un 404 `RUBRIC_NOT_FOUND` se trata como "sin rúbrica").
  - Edición de criterios y asociaciones por pregunta.
  - Guardado con If-Match y nuevo ETag. Un 412 o 428 bloquea el guardado hasta recargar.
- **FE-53-D:**
  - Listado, detalle y programación de sesiones; las fechas locales se envían como instantes ISO UTC.
  - Edición, solo en `SinIniciar`.
  - Transición: solo se ofrece el siguiente estado (`SinIniciar → EnCurso → Finalizado`, reflejo de `SinIniciarState`/`EnCursoState`); un 409 se muestra como rechazo.
- **FE-53-E:**
  - Selección de sesión y listado de convocatorias.
  - Convocatoria con relectura, solo en `SinIniciar`.
  - Los 409 se muestran como rechazo.

## 11. Funcionalidades realmente probadas

| Incremento | [MOCK] | [REAL] servicio Angular | [REAL] componente Angular renderizado | Navegación real en la app |
|---|---|---|---|---|
| FE-53-A | ✅ | ✅ | ✅ catálogo y bloqueo de autoasignación | [B] guard |
| FE-53-B | ✅ | ✅ | ✅ creación desde el formulario y relectura | [B] guard |
| FE-53-C | ✅ | ✅ | ✅ rúbrica y preguntas reales visibles | [B] guard |
| FE-53-D | ✅ | ✅ | ✅ sesión real listada | [B] guard |
| FE-53-E | ✅ | ✅ | ✅ convocatoria real visible | [B] guard |
| Regresión M1 | ✅ | ✅ login, `/me` y cierre en cada actor | — | ✅ login del docente → dashboard [V] |

"[REAL] componente" significa que el panel Angular se renderizó en Chrome (Karma), con `HttpClient` real, la credencial M1 real y la API QA real. **No** se recorrió la ruta de la aplicación, porque el guard la bloquea.

## 12. Pruebas automatizadas

| Comando | Resultado |
|---|---|
| `ng test --watch=false --browsers=ChromeHeadless` (suite completa, antes del formateo final) | **576/576 SUCCESS** (531 previas + 45 nuevas) [V] |
| Ámbito `academico`, `dashboard` y `autenticacion` tras el formateo y la corrección de la prueba dependiente del orden | **232/232 SUCCESS** en dos ejecuciones consecutivas con orden aleatorio [V] |
| Suite completa final secuencial (tras formateo y correcciones) | **576/576 SUCCESS**, exit 0 (anexo A) [V] |
| `ng build` (producción) | exit 0. Solo los avisos preexistentes del simulador (presupuesto CSS de 66 B; módulos no ESM) [V] |
| `tsc -p tsconfig.app.json --noEmit` | exit 0 [V] |
| `npm run check:urls` | "Sin URLs de backend codificadas en src/app" [V] |
| Prettier (`--end-of-line auto`) sobre los archivos tocados | Sin incidencias; solo se formatearon los archivos propios [V] |

## 13. Pruebas HTTP reales
- **Entorno:**
  - API `develop` `773818c` en `http://localhost:18094/api`.
  - PostgreSQL 16.15 aislado (`prisaly-postgres-int50`).
  - Semillas oficiales del Backend: `docs/provision/pd01-inicializacion.sql`, `bruno/scripts/m1-bruno-seed-local.sql` y `qa/m3-m4-postman/fixture-estudiante-qa.sql`.
  - Administrador creado con la inicialización única de M1.
- **Ejecución:** prueba Karma temporal `integracion-real-fe53` en ChromeHeadless: **2/2 SUCCESS**.
- **Evidencia** en `INTEGRACION-53-EVIDENCIAS/` (fuera del repositorio): la traza HTTP completa y el código de la prueba, sin credenciales.

Traza real resumida, con códigos devueltos por el servidor:

| Paso | Resultado |
|---|---|
| Roles y permisos (admin) | 200; 4 roles; 6 permisos PD-01 |
| Asignar CONSULTAR, MODIFICAR, PUBLICAR y GESTIONAR_SESION al docente | 200 ×4 (con DELETE 204 previo por idempotencia) |
| Asignación duplicada | 409 `DUPLICATE_ASSIGNMENT` |
| Autoasignación de `PUBLICAR_CASO` | 403 `PERMISSION_SELF_ASSIGNMENT_NOT_ALLOWED` |
| Alta de docente / correo repetido | 201 `Activo` / 409 `DUPLICATE_EMAIL` |
| Crear caso → releer | 201 `BORRADOR` → 200 con ETag |
| PATCH con ETag vigente → releer | 204 → título persistido |
| PATCH con ETag obsoleto | **412 `STALE_CASE`** |
| PATCH con tiempo 0 | 400 `INVALID_CASE_REQUEST` |
| Caso inexistente | 404 `CASE_NOT_FOUND` |
| Publicar sin contenido | 409 `CASE_INCOMPLETE` |
| Rúbrica inicial | 404 `RUBRIC_NOT_FOUND` |
| Rúbrica inválida (puntaje 0) | 400 `INVALID_CASE_REQUEST` |
| Guardar rúbrica | 200, `completa: true`, ETag nuevo |
| Guardar con el ETag anterior | **412 `STALE_CASE`** (sin sobrescritura) |
| Releer rúbrica | 200, "Rúbrica INT53", 1 criterio |
| Publicar / publicar de nuevo | 200 `PUBLICADO` / 409 `ALREADY_PUBLISHED` |
| Sesión con caso en borrador | 409 `M4-CASO-NO-PUBLICADO` |
| Crear, listar, editar y releer sesión | 201 `SinIniciar` / 200 / 200 / 200 |
| Convocar estudiante QA | 201 `Autorizado` |
| Convocatoria duplicada / estudiante inexistente | 409 `M4-CONVOCATORIA-DUPLICADA` / 409 `M4-REFERENCIA-NO-VALIDA` |
| Iniciar sesión / convocar ya iniciada / reiniciar | 200 `EnCurso` / 409 `M4-CONVOCATORIA-NO-PERMITIDA` / 409 `M4-OPERACION-NO-PERMITIDA` |
| Finalizar | 200 `Finalizado` |
| Sin sesión: crear caso | 401 `UNAUTHENTICATED` |
| Docente sin permiso: crear caso / roles / sesiones | 403 `FORBIDDEN` / 403 `ADMIN_REQUIRED` / 403 `M4-SIN-PERMISO` |

## 14. Evidencias de persistencia
Cada escritura se comprobó con una lectura posterior al servidor, nunca con el estado del formulario:
- **Edición de caso:** `GET /v1/casos/{id}` devolvió el título nuevo.
- **Rúbrica:** `GET /rubrica` devolvió el nombre y los criterios guardados.
- **Sesión:** `GET /m4/sesiones/{id}` devolvió el título editado.
- **Convocatoria:** `GET /convocatorias` devolvió el estudiante convocado.
- **Permisos:** `GET /usuarios/{id}/permisos` reflejó la revocación y la nueva asignación.
- **Base de datos** (consulta de solo lectura): 1 caso `Publicado` y 3 en `Borrador`.

## 15. Errores detectados

| ID | Tipo | Descripción | Estado |
|---|---|---|---|
| ERR-53-01 | Propio (Frontend) | El panel bloqueaba **toda** autoasignación de permisos, más estricto que el Backend, que solo prohíbe `PUBLICAR_CASO`/`ARCHIVAR_CASO` | Corregido; la interfaz refleja la política real |
| ERR-53-02 | Propio (prueba) | Una prueba de `academico-http.spec` dependía del orden aleatorio de Jasmine | Corregido; 2 ejecuciones verdes |
| OBS-53-01 | Backend (a confirmar) | `PUT /v1/admin/usuarios/{admin}/permisos/{CREAR_CASO}` sobre el propio administrador devolvió **200**. En la base quedó la fila con `habilitado = false` e `idAdministradorAsignador` igual al propio usuario, y el listado de permisos no la muestra. La interfaz trata `habilitado:false` como "no confirmado", nunca como éxito. Fila residual solo en el QA aislado | Para Ingrid: ¿comportamiento esperado o debería responder 403/422? |
| OBS-53-02 | Contrato | M3 no publica un listado de casos ni M4 uno de estudiantes; M1 no publica un listado de usuarios | Mitigado con memoria de sesión y entrada de UUID; pedir los contratos si se necesitan |

## 16. Bloqueos

| ID | Bloqueo | Afecta a | Dependencia |
|---|---|---|---|
| BLQ-53-01 | **Mapeo oficial ruta→permiso pendiente.** `requiereMapeoPersonalQa` redirige a `/dashboard?aviso=permisos-pendientes` (verificado en la app real con el docente) | Navegación real a las 5 pantallas | Dirección Central / Ingrid: qué permiso o rol habilita cada ruta (`usuarios-docentes`, `casos-academicos`, `rubricas`, `sesiones`, `convocatorias`). Con el mapeo, basta con sustituir el guard por `requierePermisosPersonalM1(...)`, que ya existe |
| BLQ-53-02 | **D-05.** El docente creado por alta no tiene credencial utilizable | Recorrido "docente nuevo → crear caso" | Decisión institucional sobre la entrega segura de la credencial. En QA se usó el docente de la semilla pública Bruno |
| BLQ-53-03 | Contenido del caso (escenarios, preguntas y opciones) sin interfaz en FE-53 | La publicación desde la interfaz exige contenido | Incremento propio (endpoints M3 ya disponibles). En la prueba real el contenido se preparó por HTTP |
| BLQ-53-04 | 428 real no provocable desde Angular | Prueba real de 428 | Por diseño, el servicio nunca envía sin If-Match. El 428 está cubierto con doble HTTP |

## 17. Restricciones académicas respetadas
- Solo se programan casos publicados: lo aplica M4 (409 `M4-CASO-NO-PUBLICADO` verificado).
- La publicación depende de las reglas de M3 (409 `CASE_INCOMPLETE`, `ALREADY_PUBLISHED`). Angular no inventa transiciones.
- Las transiciones de sesión son las del patrón State de M4. Edición y convocatoria solo en `SinIniciar`.
- Separación de funciones de M1 (DM1-02) reflejada en la interfaz.
- No se activó DD-02, M5, `inicio-finalizacion` ni ninguna política pendiente. No se tocó Backend, migraciones ni simulador.

## 18. Próximas actividades
1. Obtener el **mapeo ruta→permiso** (BLQ-53-01) y aplicarlo en el guard con `requierePermisosPersonalM1`; después repetir las pruebas por navegación real.
2. Que Ingrid confirme OBS-53-01.
3. Incremento de **contenido de caso** (escenarios, preguntas, opciones) para completar la publicación desde la interfaz.
4. Decidir D-05 para habilitar el recorrido con un docente recién creado.
5. Revisión y publicación por Codex (`DC-FE-53-ENTREGA-PARA-CODEX.md`).

---

## Anexo A — Regresión final secuencial
Ejecutada al final, sin `ng serve` en paralelo y con `NODE_OPTIONS=--max-old-space-size=4096`. El intento anterior, lanzado con el servidor de desarrollo, Karma y el build a la vez, se quedó sin memoria en Node (`heap out of memory`): fue un fallo del entorno, no de las pruebas.

| Comando | Resultado |
|---|---|
| `ng test --watch=false --browsers=ChromeHeadless` | **576/576 SUCCESS**, exit 0 |
| `ng build` (producción) | exit 0 |
| `prettier --check --end-of-line auto` (archivos tocados) | "All matched files use Prettier code style!" |
| `tsc -p tsconfig.app.json --noEmit` | exit 0 |
| `tsc -p tsconfig.spec.json --noEmit` | exit 0 |
