# DC-FE-MARIANA-55 · Avance 01: recorrido docente funcional

- **Fecha:** 2026-11-22.
- **Responsable:** Mariana (Frontend).
- **Ejecutor:** Claude.
- **Revisión posterior:** Codex.

**En resumen:**

- FE-55 conecta los paneles existentes de FE-53 y FE-54 para que el docente pase de un paso al siguiente sin copiar identificadores.
- El recorrido completo (autenticación → caso → contenido → rúbrica → publicación → sesión → convocatoria) quedó **persistido y verificado contra la API QA real**.
- La **navegación Angular sigue bloqueada** por BLQ-53-01. La aceptación técnica de FE-55 **no** equivale a la aceptación funcional del recorrido.

## 1. Worktree

`PRISALY-Front-55`. Es un worktree nuevo; no se modificaron los worktrees de otras personas. `node_modules` es una unión (junction) a `PRISALY-Front-54/node_modules`, con el mismo `package-lock.json`.

## 2. Rama

`feature/fe-55-recorrido-docente`. Se le quitó el upstream para evitar un push accidental.

## 3. SHA base

`9df44cc967880f95d200ceccb61d20f74c66051c`:

- Es `origin/develop` tras `git fetch` y coincide con el SHA aprobado.
- Incluye FE-54 fusionado (PR #17: `b848388` y `d186468`).

## 4. SHA del Backend

`773818caf62758d66019a71dac6508d13148abad`: `origin/develop`, sin cambios. Se inspeccionó en `PRISALY-Backen-INT` sin modificarlo.

## 5. Estado de Git

- **Commits:** ninguno. Tampoco push, PR ni merge.
- **Cambios:** 14 archivos modificados (+227/−26) y 3 archivos de código nuevos, más `docs/integracion-55/`.
- **Archivos temporales:** `src/qa-int/` se creó para la prueba real y se eliminó al terminar.

## 6. Archivos nuevos y modificados

| Archivo                                                                              | Tipo       | Cambio                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `academico/contexto-recorrido.ts`                                                    | Nuevo      | `ParametroRecorrido`: comparte el caso o la sesión activos mediante `?caso=` y `?sesion=`. Solo acepta UUID; sin enrutador no hace nada.                   |
| `academico/recorrido-docente.ts`                                                     | Nuevo      | `app-recorrido-docente`: navegación del recorrido entre las pantallas existentes. Solo se muestra con sesión válida.                                       |
| `academico/recorrido-docente.spec.ts`                                                | Nuevo      | 24 pruebas FE-55.                                                                                                                                          |
| `academico/panel-casos-m3.ts/.html`                                                  | Modificado | Sigue el caso de la URL y lo refleja tras leerlo del servidor. Muestra el siguiente paso según el estado.                                                  |
| `academico/panel-contenido-m3.ts/.html`                                              | Modificado | Sigue el caso de la URL. Bloquea las altas si otro panel leyó un estado distinto. Informa la regla de una opción correcta y los requisitos de publicación. |
| `academico/panel-rubrica-m3.ts`                                                      | Modificado | Carga el caso de la URL. Corrige un texto que tenía caracteres dañados («cambi?», «r?brica»).                                                              |
| `academico/panel-sesiones-m4.ts/.html`                                               | Modificado | El caso de la URL rellena el formulario. Separa los casos publicados de los no publicados. Refleja la sesión en la URL. Añade `MENSAJES_M4` por código.    |
| `academico/panel-convocatorias-m4.ts`                                                | Modificado | Vuelve a consultar la sesión de la URL y carga sus convocados. Usa los mensajes por código M4.                                                             |
| `dashboard/dashboard-docente.*`, `dashboard-sesiones.*`, `dashboard-convocatorias.*` | Modificado | Insertan `<app-recorrido-docente etapa=…>` encima de los paneles.                                                                                          |

## 7. Componentes reutilizados

- **Paneles:** `PanelCasosM3`, `PanelContenidoM3`, `PanelRubricaM3`, `PanelSesionesM4` y `PanelConvocatoriasM4`.
- **Servicios:** `CasosM3Api`, `SesionesM4Api`, `CasosSesionStore`, `SesionPersonalM1` y el interceptor académico, todos sin cambios.
- **Guards:** el guard `requiereMapeoPersonalQa` y `MAPEO_RUTAS_PERSONAL_OFICIAL` siguen sin cambios: todas las rutas siguen con `aprobado: null`.
- **Lo que no se añadió:** endpoints, servicios HTTP, estado global, almacenamiento en el navegador y rutas nuevas.

## 8. Mejoras implementadas

1. **Continuidad por URL.**
   - Al crear o consultar un caso, `?caso=<uuid>` queda en la URL. El panel de contenido, la rúbrica y la programación de sesiones lo recogen.
   - Al crear o seleccionar una sesión, `?sesion=<uuid>` queda en la URL y lo recoge el panel de convocatorias.
   - El parámetro solo transporta el identificador. Cada panel vuelve a consultar en el servidor; ningún dato se presenta sin leerlo antes.
   - Un panel no repite la consulta cuando él mismo originó el cambio de URL.
2. **Navegación del recorrido** (`app-recorrido-docente`).
   - Cinco pasos con enlaces a las rutas existentes, que solo conservan identificadores válidos: cualquier otro parámetro se descarta.
   - Muestra el caso activo y su estado solo si se leyó del servidor en la sesión; si no, «pendiente de consulta».
   - Los enlaces pasan por los guards.
3. **Coherencia entre paneles.** Si el panel de casos publica y relee el caso, el panel de contenido de la misma pantalla detecta el cambio de estado y bloquea las altas hasta recargar. Así no se envía contenido sobre una versión antigua.
4. **Orientación por estado.**
   - El detalle del caso indica el siguiente paso: borrador → contenido y rúbrica; publicado → sesión; archivado → sin cambios.
   - El panel de contenido muestra los requisitos de publicación del Backend (`CasoValidation.assertPublishable`).
   - El panel de contenido avisa de preguntas sin opción correcta o con varias. Es informativo; la validación la hace el servidor.
5. **Programación con caso publicado.** Los casos recordados se separan entre publicados y no publicados. El campo se rellena desde la URL sin consultar M3 y sin presuponer el estado.
6. **Errores M4 comprensibles.** `MENSAJES_M4` traduce los códigos de `M4ExceptionHandler`, por ejemplo `M4-CASO-NO-PUBLICADO`, `M4-CONVOCATORIA-DUPLICADA`, `M4-SESION-AJENA` y `M4-BLOQUEO-ACADEMICO-NO-CONFIRMADO`. Los códigos desconocidos conservan el mensaje genérico anterior.
7. **Defecto corregido:** el mensaje de conflicto de la rúbrica mostraba caracteres dañados.

## 9. Matriz del recorrido

Ver `DC-FE-55-MATRIZ-RECORRIDO-DOCENTE.csv`: 7 pasos, cada uno con ruta, componente, servicio, endpoint, DTO, permiso, validaciones, continuidad, estado y bloqueos.

## 10. Matriz de permisos

Ver `DC-FE-55-MATRIZ-RUTAS-PERMISOS.csv`. Clasificación:

- **Confirmadas y aprobadas:** ninguna.
- **Identificadas pero pendientes de aprobación:** `casos-academicos`, `rubricas`, `sesiones` y `convocatorias`.
- **No definidas:** `usuarios-docentes`, que depende de un rol en vez de un permiso, y `configuracion`.
- **No aplicables:** `/login`, `/dashboard`, `/dashboard/estudiante` y `/simulador*`.

No se integró ninguna asociación.

## 11. Pantallas conectadas

`/dashboard/casos-academicos` (casos y contenido), `/dashboard/rubricas`, `/dashboard/sesiones` y `/dashboard/convocatorias`. Con BLQ-53-01 abierto, todas redirigen a `/dashboard?aviso=permisos-pendientes`. La continuidad se comprobó en los paneles reales con un enrutador real; no navegando, porque el guard lo impide.

## 12. Operaciones M3

- Crear caso.
- Consultar caso.
- Consultar contenido.
- Añadir escenario, pregunta y opción.
- Consultar y guardar la rúbrica.
- Publicar.

Todas existían en FE-53 y FE-54.

No hay edición ni eliminación de contenido (no existe el contrato), ni narrativa. Archivar no tiene interfaz.

## 13. Operaciones M4

Crear, listar, consultar, editar y cambiar el estado de una sesión; convocar y consultar convocados. Todas existían en FE-53.

## 14. Funciones bloqueadas

| Función                                           | Motivo                         |
| ------------------------------------------------- | ------------------------------ |
| Navegación de las 6 rutas de personal             | BLQ-53-01                      |
| Administración por rol                            | Decisión pendiente (SOL-55-02) |
| Selección de casos y estudiantes sin UUID         | Faltan listados                |
| Edición y eliminación de contenido                | No hay contrato                |
| Docentes nuevos sin intervención en base de datos | D-05                           |

## 15. Validación de concurrencia

El mecanismo FE-53/FE-54 no cambió. En la prueba real:

- La publicación con el ETag anterior a las altas de contenido devolvió **412 STALE_CASE**. El panel bloqueó la operación y ofreció volver a consultar el caso.
- Tras releer el caso, la publicación con If-Match vigente se aceptó (200).
- La rúbrica se guardó con If-Match.
- Cada alta de contenido envió If-Match y se verificó releyendo.
- Tras publicar, el panel de contenido bloqueó las altas por el cambio de estado leído en otro panel. No hubo sobrescrituras silenciosas.

## 16. Pruebas automatizadas

| Suite                                                                  | Tipo                                          | Resultado                             |
| ---------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| Línea base `9df44cc` (sin cambios)                                     | Todas                                         | 618/618, exit 0                       |
| Dirigidas: académico, autenticación, dashboard (FE-53 + FE-54 + FE-55) | Unitarias y de componentes, con HTTP simulado | 298/298, exit 0                       |
| Suite completa tras los cambios                                        | Todas                                         | **642/642**, exit 0 (618 + 24 nuevas) |

Las 24 pruebas FE-55, todas con HTTP simulado:

- **Unitarias (3).** `ParametroRecorrido`: solo admite UUID, no actúa sin enrutador, fusiona parámetros y no navega si el valor ya está.
- **Componentes (15).**
  - Casos: la URL dispara la consulta; un parámetro inválido no genera HTTP; tras crear el caso queda en la URL sin repetir la consulta; el siguiente paso cambia según el estado.
  - Contenido: sigue la URL; se bloquea ante un estado distinto y vuelve a habilitarse tras recargar; avisa de opciones correctas (0 o más de 1).
  - Rúbrica: se carga por URL.
  - Sesiones: el campo se rellena sin HTTP; casos separados; consulta por URL; la creación deja la sesión en la URL; `M4-CASO-NO-PUBLICADO` no presenta una sesión.
  - Convocatorias: consulta por URL; duplicidad; `M4-SESION-AJENA` no se presenta.
- **Componente `RecorridoDocente` (4).** Oculto sin sesión; los enlaces conservan solo UUID válidos; `aria-current`; el estado solo aparece si se leyó del servidor.
- **No elevación de privilegios (2).**
  - Cada paso del recorrido apunta a una ruta con `requiereMapeoPersonalQa`.
  - Con una sesión docente simulada con `GESTIONAR_SESION`, navegar a `/dashboard/sesiones?caso&sesion` redirige a `permisos-pendientes`.

No se ejecutaron pruebas E2E de navegador completas sobre la aplicación servida.

## 17. Pruebas QA (reales)

**Entorno**

- API QA `http://localhost:18094/api`: jar de `PRISALY-Backen-INT` en `773818c`, lanzado con el script QA existente.
- PostgreSQL en el contenedor `prisaly-postgres-int50`, base `prisaly_int50`.
- Docker Desktop estaba detenido; se inició para esta prueba. El contenedor `prisaly-postgres-pruebas` no se tocó.

**Cuenta y datos**

- `docente.bruno@prisaly.local`, de la semilla pública local del Backend. Sus permisos efectivos reales: `CREAR_CASO`, `CONSULTAR_CASO`, `MODIFICAR_CASO`, `PUBLICAR_CASO` y `GESTIONAR_SESION`.
- No se modificaron usuarios, permisos ni contraseñas.
- El estudiante convocado es el único registro de la fixture QA en `Estudiante`. Se leyó una sola fila de la base QA, como dato de prueba; no es un listado.

**Ejecución:** prueba temporal en Karma/Chrome con los paneles reales y un enrutador real. Resultado: **1/1 SUCCESS, exit 0** (`prueba-real-karma-4.log`).

**Ejecuciones anteriores.** Antes de la definitiva hubo cuatro ejecuciones fallidas, todas por defectos de la propia prueba y no del producto:

1. El formulario de escenario se buscó antes de que terminara la carga (`prueba-real-karma.log`).
2. Una ejecución de depuración del mismo problema (`prueba-real-karma-depuracion.log`).
3. El selector apuntó a la `descripcion` de la rúbrica en vez de la del criterio (`-2.log`).
4. Se envió la convocatoria mientras el panel aún estaba ocupado (`-3.log`).

Esas ejecuciones dejaron datos QA ficticios en `prisaly_int50`: tres casos en borrador y uno publicado con una sesión sin convocatorias. No se borraron porque no hay operación de eliminación y no se alteran datos por fuera de la API.

## 18. Evidencias reales de persistencia

| Etapa           | Petición                                                                                               | Respuesta                                         | Verificación                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 Autenticación | `POST /v1/personal/autenticar`, `GET /me`                                                              | 200                                               | Sesión válida y permisos reales. Las 4 rutas del recorrido redirigen a `permisos-pendientes`. |
| 2 Caso          | `POST /v1/casos` → `GET /v1/casos/{id}`                                                                | 201 → 200                                         | Releído en BORRADOR. URL `?caso=7d1a6986-18e8-437c-b271-7464a46f086e`.                        |
| 3 Contenido     | `GET /contenido` (por URL); 1 escenario, 1 pregunta y 2 opciones con `POST` + If-Match                 | 201 ×4                                            | Relectura independiente: 2 opciones, 1 correcta. Sin observaciones.                           |
| 4 Rúbrica       | `GET /contenido` + `GET /rubrica` (por URL) → `PUT /rubrica` + If-Match                                | 404 `RUBRIC_NOT_FOUND` → 200                      | Relectura: 1 criterio, `completa=true`.                                                       |
| 5 Publicación   | `POST /publicar` con el ETag anterior → reconsulta → `POST /publicar`                                  | 412 `STALE_CASE` → 200                            | Releído: PUBLICADO. Contenido bloqueado hasta recargar.                                       |
| 6 Sesión        | `POST /m4/sesiones` (caso rellenado por URL) → `GET /m4/sesiones` → `GET /m4/sesiones/{id}`            | 201 → 200 → 200                                   | Releída `329604ec-f349-48a3-b3dd-ed4120ff1fd0`, SinIniciar, con el `casoId` del caso.         |
| 7 Convocatoria  | `GET /m4/sesiones/{id}` y `/convocatorias` (por URL) → `POST /convocatorias` → `GET` → `POST` repetido | 200 → 201 → 200 → 409 `M4-CONVOCATORIA-DUPLICADA` | Relectura: 1 convocado. El duplicado se rechazó.                                              |

**Relectura directa en la base QA** (`relectura-bd.txt`), para el caso `7d1a6986-…`:

- estado `Publicado`;
- 1 sesión y 1 convocatoria;
- `fechaBloqueoAcademico` marcada (F3-03 confirmado).

**Evidencias** (fuera del repositorio, en `PRISALY/INTEGRACION-55-EVIDENCIAS/`):

- `linea-base-test.log`, `fe55-dirigidas.log` y `suite-completa.log`.
- `prueba-real-karma*.log` (todos los intentos), `traza-real-fe55.txt` y `relectura-bd.txt`.
- `recorrido-real-fe55.spec.ts.txt`.
- `build-prod.log`, `build-qa.log`, `verificaciones.log` y `revision-seguridad.log`.

La traza no contiene tokens ni contraseñas.

**Dos resultados por separado:**

- La API y los paneles completan las 7 etapas.
- La navegación Angular de esas mismas pantallas está bloqueada por el guard.

## 19. Dependencias de Ingrid

Ver `DC-FE-55-SOLICITUDES-BACKEND.md`:

| Solicitud | Tema                                                    |
| --------- | ------------------------------------------------------- |
| SOL-55-01 | BLQ-53-01                                               |
| SOL-55-02 | Rol ADMINISTRADOR                                       |
| SOL-55-03 | D-05                                                    |
| SOL-55-04 | OBS-53-01                                               |
| SOL-55-05 | Listados                                                |
| SOL-55-06 | Edición y eliminación de contenido, solo si se autoriza |

## 20. Riesgos y limitaciones

- **BLQ-53-01 abierto:** ningún docente puede recorrer las pantallas navegando. FE-55 está aceptado técnicamente, pero el recorrido no está aceptado funcionalmente.
- **La URL guarda poco:** `?caso=` y `?sesion=` evitan copiar identificadores entre pantallas, pero no reemplazan un listado. En una sesión nueva sin enlace, el docente necesita el UUID.
- **El estado del caso activo viene de la última lectura:** el estado de `app-recorrido-docente` sale de la última lectura del servidor en la sesión (`CasosSesionStore`) y puede quedar desactualizado. Por eso se rotula así y nunca habilita operaciones.
- **Cuenta de la prueba real:** se usó una cuenta de semilla local. Un docente real depende de D-05.
- **Completitud de la rúbrica:** el Backend solo exige al menos un criterio. La regla académica DD-03 sigue pendiente y no se infirió.
- **Memoria del equipo:** el equipo trabajó con poca memoria libre (300–700 MB). Builds y Karma se ejecutaron uno tras otro. La API QA y Docker se iniciaron para la prueba; la API se detuvo al terminar.

## 21. Próxima fase propuesta (FE-56)

1. Cuando se apruebe SOL-55-01: rellenar `aprobado.permisos` y repetir la prueba real **navegando** con el enlace del recorrido.
2. Cuando se publique `GET /v1/casos`: un selector de casos en contenido, rúbrica y sesiones, manteniendo `?caso=`.
3. Cuando se publique la consulta de estudiantes convocables: un selector en convocatorias.
4. Si Dirección Central lo decide: la interfaz para archivar el caso (el endpoint ya existe).
