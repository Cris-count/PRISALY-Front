# DC-FE-58 · Preparación de la autorización de navegación M1–M4: resultado

- **Fecha:** 2026-11-22.
- **Responsable:** Mariana (Frontend).
- **Ejecutor:** Claude.
- **Origen:** DC-BE-FE-RESPUESTA-DESBLOQUEO-59.
- **Estado:** preparación técnica completada. **BLQ-53-01 sigue vigente**, todas las rutas conservan `aprobado: null` y ninguna asociación se aprobó.

## 1. Línea base

| Dato                  | Valor                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Frontend              | `origin/develop` `32ba32ab0189344e71e380a7f7a59cedbb8e7705` (FE-57 fusionado, PR #19), igual al SHA aprobado     |
| Backend               | `origin/develop` `773818caf62758d66019a71dac6508d13148abad`, inspeccionado en `PRISALY-Backen-INT` sin modificar |
| Worktree              | `C:\Users\57316\OneDrive\Escritorio\PRISALY\PRISALY-Front-58`                                                    |
| Rama                  | `feature/fe-58-preparacion-navegacion`, sin upstream configurado                                                 |
| Línea base de pruebas | **662/662** (356 + 306 en dos bloques, exit 0): `linea-base-bloque-1.log` y `linea-base-bloque-2.log`            |

## 2. Estado de Git

Hay 4 archivos modificados (+59/−6) y 1 archivo de pruebas nuevo, más `docs/integracion-58/`. No hay commits, push, PR ni merge. Los worktrees de FE-53 a FE-57 se conservan sin cambios.

## 3. Contratos inspeccionados (auditoría dirigida)

| Capa                                                                 | Hallazgo y evidencia en el código                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spring Security (`app/config/HttpApiConfig`)                         | `anyRequest().authenticated()` y sin seguridad por método: no hay `@PreAuthorize`, `@Secured` ni `@RolesAllowed` en todo el Backend. Un 401 devuelve `{"code":"UNAUTHENTICATED"}` y el 403 del filtro, `{"code":"FORBIDDEN"}`. **El rol y los permisos se validan en los servicios**                                                                                                                   |
| Filtro Bearer (`m1/.../ProvisionalBearerAuthenticationFilter`)       | Resuelve el token en memoria y crea las autoridades `ROLE_<rol>` y `PERM_<código>`. Si la cuenta no es válida, revoca el token. Ningún servicio M1–M4 consulta esas autoridades: se vuelve a leer la identidad                                                                                                                                                                                         |
| Identidad (`IdentityAccessService`)                                  | `requireUser` exige una cuenta activa. `permissionCodes` es `codigosHabilitados`, es decir, filas con `habilitado = true` (`UsuarioPermisoRepository`)                                                                                                                                                                                                                                                 |
| `/v1/personal/me`                                                    | `PersonalAutenticarResponse(accessToken=null, tokenType, userId, correo, nombre, rol=roleName, permisos=permissionCodes, authPrototype)`                                                                                                                                                                                                                                                               |
| M1 administración                                                    | `AdministracionIdentidadService.exigirAdministrador`: cuenta `Activo`, `roleName` igual a `"ADMINISTRADOR"` (con `equals`, sensible a mayúsculas) y que no sea cuenta de estudiante. Si no se cumple: 403 `ADMIN_REQUIRED`                                                                                                                                                                             |
| M1 permisos (`GestionPermisosService`, `PoliticaPermisos`)           | Para asignar se exige un administrador activo. La autoasignación está prohibida **solo** para `PUBLICAR_CASO` y `ARCHIVAR_CASO` (separación de funciones). Los permisos controlados (`CONSULTAR`, `MODIFICAR`, `PUBLICAR` y `ARCHIVAR_CASO`) no se asignan a estudiantes. Si la asignación ya está habilitada: 409. Una fila revocada se reactiva. Revocar no borra la fila: deja `habilitado = false` |
| M3 escritura (`app/config/M3CaseAuthorizationAdapter`)               | Crear: `CREAR_CASO`, con `docenteId` igual al usuario autenticado. Modificar, contenido y guardar rúbrica: `MODIFICAR_CASO` **y** `CONSULTAR_CASO`. Publicar: `PUBLICAR_CASO`. Archivar: `ARCHIVAR_CASO`. Siempre se exige cuenta `Activo`. La titularidad y el estado los aplica el caso de uso M3. **No se exige ningún rol**                                                                        |
| M3 lectura (`M3CaseReadAuthorizationAdapter`, `PoliticaLecturaCaso`) | Exige `CONSULTAR_CASO` (`prisaly.m3.lectura.permiso`) y ser propietario. Los estados visibles son BORRADOR, PUBLICADO y ARCHIVADO, y `requiere-activo` es `false`. Un fallo técnico devuelve `NO_DISPONIBLE`, nunca autoriza                                                                                                                                                                           |
| M4 (`SesionAcademicaService`)                                        | `verificarPermiso` exige `GESTIONAR_SESION` (403 `M4-SIN-PERMISO`) y `verificarPropiedad` que la sesión pertenezca al usuario (403 `M4-SESION-AJENA`). El listado devuelve solo las sesiones propias. **No se exige ningún rol**                                                                                                                                                                       |

## 4. Matriz de autorización

Ver `DC-FE-58-MATRIZ-AUTORIZACION-M1-M4.csv`: 23 filas y 19 columnas. **Separa la autorización de navegación (abrir la pantalla) de la autorización de cada operación.**

| Categoría                          | Contenido                                                                                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CONFIRMADO EN CÓDIGO BACKEND**   | Las 21 operaciones M1–M4 y la sesión de personal                                                                                                                                                      |
| **PROPUESTA DE NAVEGACIÓN**        | `usuarios-docentes` y `configuracion` → rol `ADMINISTRADOR` (según la clasificación de Ingrid). `casos-academicos` y `rubricas` → `CONSULTAR_CASO`. `sesiones` y `convocatorias` → `GESTIONAR_SESION` |
| **PENDIENTE DE DIRECCIÓN CENTRAL** | La autorización de navegación de las 6 rutas                                                                                                                                                          |
| **APROBADO POR DIRECCIÓN CENTRAL** | **Ninguna** asociación ruta–permiso o ruta–rol. No hay evidencia oficial                                                                                                                              |

La propuesta de exigir `CONSULTAR_CASO` para abrir casos impediría entrar a una persona que tenga únicamente `CREAR_CASO`, aunque el Backend permita crearle un caso propio. Dirección Central debe decidir ese supuesto antes de aprobar la navegación. Acceder a una pantalla no concede sus operaciones: modificar contenido y rúbrica exige tanto `MODIFICAR_CASO` como `CONSULTAR_CASO`, además de las condiciones de titularidad y estado del Backend.

## 5. Guards actuales

**Alcance de esta tabla:** corresponde al entorno QA con `personalQaHabilitado=true`. Fuera de ese opt-in, incluido el build de producción actual, `requiereMapeoPersonalQa` devuelve `true` para conservar la demostración pública preexistente. Por tanto, `aprobado: null` bloquea la navegación integrada en QA, pero no bloquea globalmente la apertura de las pantallas demostrativas. Los paneles reales requieren la integración habilitada y el Backend aplica sus autorizaciones. La política para las demostraciones y su separación de rutas protegidas requiere decisión explícita.

| Ruta                | Guard                      | Motivo del bloqueo                       | Información de sesión usada                | Comportamiento actual                                                    | Comportamiento tras la aprobación                                                                                                     |
| ------------------- | -------------------------- | ---------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `usuarios-docentes` | `requiereMapeoPersonalQa`  | `aprobado: null` (BLQ-53-01 y SOL-55-02) | Sesión válida, `rol` y `permisos` de `/me` | Con sesión: `/dashboard?aviso=permisos-pendientes`. Sin sesión: `/login` | Con `aprobado: { rol: 'ADMINISTRADOR', permisos: [] }`: entra solo un administrador; el resto va a `aviso=rol-insuficiente`           |
| `configuracion`     | Ídem                       | `aprobado: null`                         | Ídem                                       | Ídem                                                                     | Según la decisión: rol `ADMINISTRADOR` o solo sesión. Hoy el mapeo no admite «solo sesión»: queda pendiente si no hay rol ni permisos |
| `casos-academicos`  | Ídem                       | `aprobado: null`                         | Ídem                                       | Ídem                                                                     | `aprobado: { permisos: ['CONSULTAR_CASO'] }`, si se aprueba. Las acciones siguen dependiendo de cada permiso en el Backend            |
| `rubricas`          | Ídem                       | Ídem                                     | Ídem                                       | Ídem                                                                     | Ídem                                                                                                                                  |
| `sesiones`          | Ídem                       | Ídem                                     | Ídem                                       | Ídem                                                                     | `aprobado: { permisos: ['GESTIONAR_SESION'] }`, si se aprueba                                                                         |
| `convocatorias`     | Ídem                       | Ídem                                     | Ídem                                       | Ídem                                                                     | Ídem                                                                                                                                  |
| `/dashboard`        | `requiereSesionPersonalQa` | —                                        | Sesión válida                              | Navegable con sesión                                                     | Sin cambios                                                                                                                           |

**Pruebas actuales:** FE-54 (mapeo, guard y aviso), FE-55 (los enlaces del recorrido no eluden el guard), FE-57 (navegador real) y, nuevas en FE-58, 18 pruebas de rol (sección 13). **Faltan:** la prueba navegando con el mapeo aprobado, en cuanto exista la aprobación.

**Vigencia de permisos:** el guard consulta la identidad ya cargada en `SesionPersonalM1`; no invoca `/me` al navegar. Una revocación posterior a la última consulta no se refleja automáticamente en esa copia. La prueba que sustituye el estado simula la actualización, no demuestra revocación inmediata. El Backend verifica los permisos efectivos para cada operación. Antes de habilitar rutas debe decidirse y verificarse cómo renovar o invalidar la identidad para que la navegación refleje la revocación.

## 6. Comportamiento ante 401 y 403

| Situación                          | Backend                                                                  | Frontend                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Sin token o token revocado         | 401 `UNAUTHENTICATED`, del filtro o de M1/M3. M4 usa `M4-NO-AUTENTICADO` | Los interceptores limpian la credencial en memoria (misma revisión) y el guard redirige a `/login` |
| Rol insuficiente en `/v1/admin/**` | 403 `ADMIN_REQUIRED`                                                     | El panel muestra el error; la navegación queda bloqueada por el guard                              |
| Permiso insuficiente en M3         | 403 `FORBIDDEN`                                                          | Mensaje en el panel                                                                                |
| Permiso insuficiente en M4         | 403 `M4-SIN-PERMISO`                                                     | Mensaje en el panel                                                                                |
| No propietario                     | M3: 403 `FORBIDDEN` o 404. M4: 403 `M4-SESION-AJENA`                     | Mensaje y nunca se muestran los datos                                                              |

## 7. Roles

- **En el Backend:** `Usuario.idRol` → `Rol.nombre`. En QA existen ADMINISTRADOR, DOCENTE, DocenteBruno y ESTUDIANTE_QA.
- **Dónde se exige rol:** solo `/v1/admin/**`, con `ADMINISTRADOR` exacto.
- **Dónde no:** M3 y M4 no exigen rol, solo permisos. Una cuenta de rol `DocenteBruno` opera con permisos.
- **En Angular:** recibe el rol en `IdentidadPersonal.rol` (de `/me`).
- **Antes de FE-58** no había un control de rol reutilizable. El tipo `RequisitoRutaAprobado` solo admitía permisos y `rolBackend` era informativo.

## 8. Permisos

- Solo cuentan los habilitados (`habilitado = true`).
- **Los permisos docentes no son universales:** cada operación exige el suyo. Editar y contenido exigen dos permisos (`MODIFICAR` y `CONSULTAR_CASO`).
- Abrir una pantalla con un permiso **no** autoriza sus acciones.

## 9. Titularidad

| Módulo       | Regla                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| M3 lectura   | Propietario y estado visible                                                      |
| M3 escritura | Propietario (caso de uso). Crear exige que `docenteId` sea el usuario autenticado |
| M4           | Propietario de la sesión (`verificarPropiedad`). El listado se filtra por docente |
| M1           | No aplica, porque la administración es por rol                                    |

## 10. D-05: credenciales de docentes nuevos

**Lo que permite hoy el Backend:**

| Contrato                                                       | Comportamiento                                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /v1/admin/docentes`                                      | `registrarSinCredencial`: la cuenta queda `Activo` con `passwordHash` nulo (comprobado en QA en FE-57). La auditoría registra `credencial=PENDIENTE_ENTREGA` |
| `POST /v1/personal/autenticar`                                 | Exige una contraseña. Una cuenta sin hash no puede autenticarse                                                                                              |
| `PUT /v1/personal/contrasena` (`PersonalContrasenaController`) | Exige estar autenticado y conocer la contraseña actual. **No sirve** para una cuenta sin credencial                                                          |
| `InicializacionAdministradorRunner`                            | Solo para el administrador inicial: lee un archivo de credencial al arrancar si `prisaly.m1.inicializacion-admin.habilitada=true`. No tiene endpoint         |

**Contratos que faltan** (los decide Ingrid; el Frontend no los inventa). Hace falta uno de estos:

- invitación con token de un solo uso y fijación de contraseña;
- contraseña inicial que fija el administrador, con cambio obligatorio;
- restablecimiento por canal seguro.

Además, el estado de la cuenta debería indicar «pendiente de activación». Hoy aparece `Activo` aunque no pueda autenticarse.

## 11. OBS-53-01: autoasignación de `CREAR_CASO`

- **El código** (`GestionPermisosService.ejecutarAsignacion`):
  - `CREAR_CASO` no está en `OPERATIVOS` (separación de funciones), así que un administrador **puede** asignárselo a sí mismo.
  - `registrar` guarda la fila con `habilitado = true` y la respuesta refleja la entidad guardada: devuelve `habilitado = true`.
- **La base QA** (`obs-53-01-bd.txt`): la fila del administrador QA tiene `CREAR_CASO` con `habilitado = f` y asignador igual al propio usuario.
- **La prueba FE-53** (`integracion-real-fe53.spec.ts.txt`): contiene una revocación condicional de `CREAR_CASO` como limpieza y una nota sobre una aceptación en una ejecución anterior. La traza definitiva inspeccionada no registra esa revocación.

**Conclusión:**

- El código actual permite la autoasignación de `CREAR_CASO` y la revocación lógica. La fila observada es compatible con una asignación y posterior revocación, pero por sí sola no demuestra su secuencia temporal.
- El registro definitivo FE-53 consultado muestra `A.permisosPropiosAntesLimpieza: []`; el archivo de prueba contiene una revocación condicional y una nota sobre una ejecución anterior, pero los registros inspeccionados no prueban independientemente la respuesta de esa primera autoasignación ni que esa limpieza haya producido la fila observada. Se necesita la traza anterior o auditoría correlacionada para atribuirla con certeza.
- Queda una **cuestión de política** para Ingrid y Dirección Central: si un administrador debe poder autoasignarse `CREAR_CASO`, que hoy está permitido.
- No se cambió ningún mensaje del Frontend. El panel ya trata `habilitado = false` como «no confirmado».

## 12. Listados

Rutas reales comprobadas en los controladores de `773818c`:

| Listado                 | Situación                                                                                                      | Necesidad funcional                 | Endpoint candidato (no aprobado)                | Datos                                                                       | Paginación               | Permisos                                 | Impacto en Angular                                                        | Dependencia                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- | ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------- | -------------------------- |
| Casos del docente       | **Ausente.** `CasoGestionController` solo tiene `GET /v1/casos/{id}`, sin `GET /v1/casos`                      | Elegir un caso sin UUID             | `GET /v1/casos?estado=&page=&size=`             | `idCaso`, `titulo`, `estado`, `tiempoEstimadoSegundos`                      | `page` y `size` o cursor | `CONSULTAR_CASO` y propietario           | Un selector en casos, contenido, rúbrica y sesiones (`CasosM3Api.listar`) | Ingrid                     |
| Usuarios y docentes     | **Ausente.** `AdministracionController` no tiene `GET /usuarios` ni `GET /docentes`                            | Elegir un usuario para los permisos | `GET /v1/admin/usuarios?rol=&estado=&page=`     | `idUsuario`, `nombre`, `correo` (decide Dirección Central), `rol`, `estado` | Sí                       | Rol ADMINISTRADOR                        | Un selector en `PanelAdministracionM1`                                    | Ingrid y Dirección Central |
| Estudiantes convocables | **Ausente.** Solo existe `GET /m4/sesiones/{id}/acceso/{estudianteId}`, retirado (`M4-ACCESO-LEGADO-RETIRADO`) | Convocar sin UUID                   | `GET /m4/sesiones/{id}/estudiantes-convocables` | `estudianteId` y un identificador visible aprobado                          | Sí                       | `GESTIONAR_SESION` y regla de privacidad | Un selector en `PanelConvocatoriasM4`                                     | Ingrid y Dirección Central |
| Sesiones                | **Presente:** `GET /m4/sesiones` (propias)                                                                     | —                                   | —                                               | —                                                                           | No                       | `GESTIONAR_SESION`                       | Ya en uso                                                                 | —                          |

No se añadió ninguna consulta masiva.

## 13. Pruebas

| Prueba                                                      | Tipo                                       | Resultado                                                                          |
| ----------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Línea base (sin cambios)                                    | Unitarias y de componentes                 | 662/662, exit 0                                                                    |
| Dirigidas de guards y M1 (`src/app/features/autenticacion`) | Unitarias y de componentes (HTTP simulado) | **157/157**, exit 0                                                                |
| Dirigidas académicas (`src/app/features/academico`)         | Componentes (HTTP simulado)                | **120/120**, exit 0                                                                |
| Suite completa, bloque 1                                    | Todas salvo el simulador                   | **374/374**, exit 0                                                                |
| Suite completa, bloque 2 (simulador)                        | —                                          | **306/306**, exit 0                                                                |
| Total                                                       | —                                          | **680/680** (662 más 18 nuevas)                                                    |
| `ng build` y `ng build --configuration qa`                  | Build                                      | exit 0 y exit 0; solo las advertencias previas del simulador                       |
| TypeScript de la aplicación y de las pruebas                | —                                          | exit 0 y exit 0                                                                    |
| Prettier, `check:urls`, `git diff --check`                  | —                                          | exit 0                                                                             |
| Revisión de secretos                                        | —                                          | Sin hallazgos. La única coincidencia es el texto «Bearer provisional» de la matriz |

**Pruebas nuevas** (`m1-mapeo-rutas-rol.spec.ts`, 18). Las aprobaciones que contienen están **marcadas como simulación** y no tocan el mapeo oficial:

| Bloque                      | Pruebas | Qué cubren                                                                                                                                                                                                                                                                |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decidirRuta`               | 7       | El mapeo oficial sigue pendiente. Un permiso no sustituye al rol. Con rol y permisos se exigen ambos. Rol solo. Sin comprobador de rol se deniega. Requisitos vacíos o mal formados quedan pendientes. Sin sesión, `/login`                                               |
| `SesionPersonalM1.tieneRol` | 3       | Comparación exacta (`administrador` ≠ `ADMINISTRADOR`). No se deduce el rol de los permisos. Tras cerrar sesión no se conserva                                                                                                                                            |
| Guard                       | 6       | Un ADMINISTRADOR real con el mapeo oficial queda pendiente. Un docente con todos los permisos recibe `rol-insuficiente`. El rol exacto autoriza (simulado). El rol ADMINISTRADOR no abre una ruta docente aprobada por permiso. Revocación. Ruta desconocida o sin sesión |
| Aviso                       | 2       | Mensaje de rol insuficiente con el rol real. No se muestra en otros avisos                                                                                                                                                                                                |

No se ejecutaron pruebas reales contra QA: la orden no lo exige y la evidencia real de FE-57 sobre el mismo Backend sigue vigente.

## 14. Plan E2E (a ejecutar tras la aprobación)

### Recorrido administrativo

Cuenta: administrador QA preexistente (`admin.qa@prisaly.test`, rol ADMINISTRADOR). La credencial se maneja fuera del repositorio y la introduce una persona autorizada en el navegador.

| #   | Ruta                           | Endpoint                                | Método    | Entrada                                     | Respuesta esperada                          | Consulta posterior           | Persistencia       | Aceptación            | Bloqueo actual             |
| --- | ------------------------------ | --------------------------------------- | --------- | ------------------------------------------- | ------------------------------------------- | ---------------------------- | ------------------ | --------------------- | -------------------------- |
| A1  | `/login`                       | `/v1/personal/autenticar`, `/me`        | POST, GET | Credencial QA                               | 200, 200, `rol=ADMINISTRADOR`               | `/me`                        | Token en memoria   | Entra en `/dashboard` | —                          |
| A2  | `/dashboard/usuarios-docentes` | —                                       | —         | Navegar desde el menú                       | Pantalla visible                            | —                            | —                  | Sin redirección       | BLQ-53-01, SOL-55-02       |
| A3  | Ídem                           | `/v1/admin/roles`, `/v1/admin/permisos` | GET       | —                                           | 200                                         | —                            | —                  | Catálogo visible      | Ídem                       |
| A4  | Ídem                           | `/v1/admin/docentes`                    | POST      | Nombre y correo ficticios                   | 201 `Activo`                                | Base de datos: rol `DOCENTE` | Fila creada        | Aviso D-05 visible    | Ídem y D-05 para activarlo |
| A5  | Ídem                           | `/v1/admin/usuarios/{id}/permisos`      | GET       | id del alta                                 | 200 `[]`                                    | —                            | —                  | 0 permisos            | Ídem                       |
| A6  | Ídem                           | `…/permisos/{idPermiso}`                | PUT       | `CONSULTAR_CASO`                            | 200 `habilitado=true`                       | GET de permisos              | `habilitado=true`  | «Habilitado»          | Ídem                       |
| A7  | Ídem                           | Ídem                                    | DELETE    | Ídem                                        | 204                                         | GET de permisos              | `habilitado=false` | «No asignado»         | Ídem                       |
| A8  | Ídem                           | Ídem                                    | PUT       | El propio administrador con `PUBLICAR_CASO` | La interfaz no lo ofrece; por API daría 403 | —                            | Sin cambios        | «No permitido»        | Ídem                       |

### Recorrido docente

Cuenta: `docente.bruno@prisaly.local`, de la semilla pública local, con `CREAR`, `CONSULTAR`, `MODIFICAR` y `PUBLICAR_CASO` y `GESTIONAR_SESION`.

| #   | Ruta                                | Endpoint                                  | Método                 | Entrada                              | Respuesta esperada                          | Consulta posterior | Aceptación           | Bloqueo actual |
| --- | ----------------------------------- | ----------------------------------------- | ---------------------- | ------------------------------------ | ------------------------------------------- | ------------------ | -------------------- | -------------- |
| D1  | `/login`                            | `autenticar`, `me`                        | POST, GET              | Credencial de la semilla             | 200 y permisos efectivos                    | —                  | Entra                | —              |
| D2  | `/dashboard/casos-academicos`       | `/v1/casos`                               | POST                   | Título y minutos                     | 201, luego GET 200 BORRADOR                 | GET caso           | `?caso=` en la URL   | BLQ-53-01      |
| D3  | Ídem (contenido)                    | `…/escenarios`, `/preguntas`, `/opciones` | POST con If-Match      | Datos ficticios                      | 201 ×N                                      | GET contenido      | Verificado al releer | Ídem           |
| D4  | `/dashboard/rubricas?caso=`         | `…/rubrica`                               | GET y PUT con If-Match | 1 criterio y asociación              | 200, completa                               | GET rúbrica        | Guardada             | Ídem           |
| D5  | `/dashboard/casos-academicos?caso=` | `…/publicar`                              | POST con If-Match      | —                                    | 200 PUBLICADO; 412 si la versión es antigua | GET caso           | PUBLICADO            | Ídem           |
| D6  | `/dashboard/sesiones?caso=`         | `/m4/sesiones`                            | POST                   | Fechas futuras                       | 201 SinIniciar                              | GET sesión         | `?sesion=` en la URL | Ídem           |
| D7  | `/dashboard/convocatorias?sesion=`  | `…/convocatorias`                         | POST y GET             | UUID del estudiante de la fixture QA | 201; 409 si está duplicado                  | GET convocatorias  | 1 convocado          | Ídem y listado |

No se usan credenciales reales de estudiantes, solo la fixture QA ficticia. La evidencia equivalente sin navegar ya existe (FE-55, FE-56 y FE-57).

## 15. Decisiones para Ingrid

1. Confirmar la matriz de operaciones (todas CONFIRMADO EN CÓDIGO) y que M3 y M4 no exigen rol.
2. D-05: elegir y publicar el contrato de activación de credenciales.
3. OBS-53-01: confirmar si la autoasignación de `CREAR_CASO` por un administrador es la política deseada.
4. Listados: publicar `GET /v1/casos`, el listado de usuarios y el de estudiantes convocables, o confirmar que se aplazan.
5. Indicar dónde están los documentos citados en FE-57 (DOC-57-01) y el contrato M6 (`/api/v1/evaluacion/intentos/{idIntento}`). Su ausencia en las referencias remotas consultadas no demuestra que no exista una implementación local candidata; no es un contrato aprobado ni autorizado para consumo.

## 16. Decisiones para Dirección Central

1. **Navegación de cada ruta**, con aprobación expresa de cada fila:
   - `usuarios-docentes` → ¿rol ADMINISTRADOR?
   - `configuracion` → ¿rol ADMINISTRADOR o solo sesión?
   - `casos-academicos` y `rubricas` → ¿`CONSULTAR_CASO`?
   - `sesiones` y `convocatorias` → ¿`GESTIONAR_SESION`?
2. Si `configuracion` exige solo sesión, autorizar que el mapeo admita ese tipo de requisito (hoy, restrictivo, queda pendiente).
3. Qué datos personales muestran los listados de usuarios y de estudiantes.

## 17. Cambios independientes implementados

Es una mejora estructural sin habilitar ninguna ruta:

| Archivo                      | Cambio                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `m1-mapeo-rutas.ts`          | `RequisitoRutaAprobado.rol?` (rol exacto, opcional). `DecisionRuta` añade `rol-insuficiente`. `decidirRuta` recibe `tieneRol`; por defecto deniega. Con rol y permisos exige ambos. Si el requisito está vacío o mal formado (códigos con espacios o vacíos, o `permisos` que no es una lista), queda pendiente. Nuevo aviso `rol-insuficiente` |
| `m1-personal-sesion.ts`      | `tieneRol(rol)`: compara exactamente con `/me.rol`. No deduce el rol de los permisos                                                                                                                                                                                                                                                            |
| `m1-personal-rutas-qa.ts`    | El guard pasa `tieneRol` y redirige a `aviso=rol-insuficiente`                                                                                                                                                                                                                                                                                  |
| `aviso-acceso-personal.ts`   | Ante `rol-insuficiente` muestra el rol real de la sesión                                                                                                                                                                                                                                                                                        |
| `m1-mapeo-rutas-rol.spec.ts` | 18 pruebas                                                                                                                                                                                                                                                                                                                                      |

**No cambia:** `MAPEO_RUTAS_PERSONAL_OFICIAL`, en el que las 6 rutas siguen con `aprobado: null`. El comportamiento efectivo es idéntico al de FE-57.

## 18. Riesgos

| Riesgo                                                                                        | Mitigación o estado                                                                                            |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Que se apruebe la navegación con un permiso y se interprete como autorización de las acciones | La matriz lo separa; el Backend sigue validando cada operación                                                 |
| Rol con mayúsculas distintas                                                                  | La comparación es exacta, como en el Backend                                                                   |
| `configuracion` no tiene contrato ni operaciones                                              | Su aprobación es solo de presentación                                                                          |
| Docentes «Activo» sin credencial (D-05)                                                       | Pueden confundir a un administrador; el panel ya lo advierte                                                   |
| Documentos y contrato M6 no localizados en las referencias inspeccionadas                     | La implementación local candidata comunicada no queda descartada; falta contrastar el contrato y su aprobación |

## 19. Siguiente fase (FE-58-B, tras la aprobación)

1. Rellenar `aprobado` en las rutas aprobadas, con `rol` o `permisos` según la decisión.
2. Actualizar la prueba «ninguna ruta aprobada» para reflejar la decisión oficial.
3. Ejecutar el plan E2E navegando (sección 14), con evidencia del navegador y persistencia.
4. Seguir sin activar M5 ni M6. Los contratos M6 citados se registran como referencias pendientes no localizadas.
