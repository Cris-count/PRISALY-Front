# DC-FULLSTACK-INTEGRACION-DOCENTE-01: resultado

- **Fecha:** 2026-11-23.
- **Ejecutor:** Claude.
- **Auditor y responsable de GitHub:** Codex.
- **Coordinación:** Ingrid (Backend) y Mariana (Frontend).

## Resumen ejecutivo

**El recorrido docente funciona de verdad contra Backend y PostgreSQL**, pero **todavía no se puede navegar en el navegador**.

**Probado con datos reales:**

- Los paneles Angular reales, conectados al Backend QA (`773818c`) y a PostgreSQL, crean y consultan el caso, el contenido, la rúbrica asociada, la publicación, la sesión y la convocatoria.
- La persistencia está comprobada directamente en PostgreSQL.

**Lo que impide hoy usarlo como plataforma docente desde el navegador:**

1. **Navegación:** las rutas académicas tienen `habilitada: false`, por decisión de Dirección Central (FE-58). El navegador inicia sesión, pero cada sección redirige a «habilitación pendiente».
2. **D-05:** un docente creado por el administrador no tiene credencial y no puede iniciar sesión, porque no existe un contrato de activación.

**No se modificó código.** Todo lo que estaba al alcance ya funcionaba. La única acción que destrabaría el criterio de éxito (crear un caso y una rúbrica **desde el navegador**) es habilitar rutas en QA, y eso exige **autorización expresa** (sección 15).

## 1. Estado del Frontend

| Dato             | Valor                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `origin/develop` | `b0f6236eacb78dac10b0b3963c27618175714056`. FE-58 fusionado (PR #20: `703126f` y `df1939f`)                                                                                                                                          |
| Worktree aislado | `PRISALY-Front-FULLSTACK-01`, rama local `feature/fullstack-integracion-01`, sin upstream configurado. 0 cambios de código; solo `docs/integracion-fullstack/`                                                                       |
| `node_modules`   | La copia compartida de `PRISALY-Front-54` estaba vacía (0 entradas), lo que afecta a los worktrees enlazados a ella (`-55`, `-56`, `-57` y `-DEVELOP-15`). Se usó la de `PRISALY-Front-58` (298 entradas, mismo `package-lock.json`) |
| Mapeo            | Las seis rutas oficiales con `habilitada: false`                                                                                                                                                                                     |
| Puerto 4200      | Ocupado por otro proceso de otra persona (`ng serve --configuration demo` desde `PRISALY-Front-58`), que no se tocó. La prueba usó el puerto 4300                                                                                    |

## 2. Estado del Backend

| Dato             | Valor                                                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `origin/develop` | `773818caf62758d66019a71dac6508d13148abad`, sin cambios                                                                                                                                                               |
| PR abiertos      | #94 a #97, todos en Draft y no fusionados (ver la sincronización 15)                                                                                                                                                  |
| Ejecución        | El jar de `PRISALY-Backen-INT` en `773818c` (compilado después del commit), lanzado con el script QA local existente, en `http://localhost:18094/api`. `GET /health` responde `{"status":"ok"}`; arranca en unos 42 s |
| CORS             | `http://localhost:4200`, `4300` y `9876`. Cabeceras `Authorization` e `If-Match`; `ETag` expuesta                                                                                                                     |

## 3. Estado de PostgreSQL

| Dato       | Valor                                                                                                                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contenedor | `prisaly-postgres-int50` (puerto 5434, base `prisaly_int50`), en marcha                                                                                                                                                                                              |
| Flyway     | Versión **013** con V001 a V009 y V013, todas `success`. **No se aplicó ninguna migración candidata**: V014 a V019 solo existen en `db/*-propuesta`                                                                                                                  |
| Tablas     | `Usuario`, `Rol`, `Permiso`, `UsuarioPermiso`, `Caso`, `Escenario`, `Pregunta`, `OpcionRespuesta`, `Rubrica`, `RubricaPregunta`, `Sesion`, `Convocatoria`, `Estudiante`, `Intento`, `Participacion`, `Respuesta`, `Calificacion`, `RetroalimentacionGeneral` y otras |

## 4. Mecanismo de creación de usuarios

| Mecanismo                                   | Estado                                                                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrador inicial                       | `InicializacionAdministradorRunner` (V013): lee un archivo de credencial al arrancar si `prisaly.m1.inicializacion-admin.habilitada=true`. No tiene endpoint                            |
| Cuenta administrativa QA                    | Existe y está autorizada (usada desde FE-53): rol ADMINISTRADOR, activa y con credencial. Su credencial está en el almacén local QA, fuera del repositorio, y no se publica             |
| Alta de docente (`POST /v1/admin/docentes`) | **Funciona** (201): la cuenta queda con rol `DOCENTE`, `Activo` y **sin credencial**                                                                                                    |
| D-05                                        | **No existe** ningún mecanismo de activación. `PUT /v1/personal/contrasena` exige estar autenticado y conocer la contraseña actual                                                      |
| Cuentas docentes en QA                      | 4 cuentas `DOCENTE`, **todas sin credencial**, creadas por altas de prueba; ninguna puede iniciar sesión. Las cuentas de la semilla pública local (`DocenteBruno`) sí tienen credencial |
| Estudiantes                                 | 1 cuenta `ESTUDIANTE_QA` sin credencial; el acceso estudiantil está desactivado (DD-02)                                                                                                 |

**Implementación mínima segura propuesta para D-05** (decide Ingrid; no se implementó):

- un token de activación de un solo uso, con un tiempo de vigencia;
- el token se guarda solo como hash;
- fija la primera contraseña a través de un endpoint público limitado;
- se registra en la auditoría;
- la cuenta queda en estado «pendiente de activación» hasta consumir el token.

El análisis completo está en FE-58-05, sección 15.

## 5. Autenticación real

**Probada en el navegador y por HTTP real:**

- `POST /v1/personal/autenticar` → 200, con preflight CORS 200.
- `GET /v1/personal/me` → 200. Devuelve el rol real (`DocenteBruno` o `ADMINISTRADOR`) y los permisos habilitados.
- `POST /v1/personal/cerrar-sesion` → 204.

El token queda solo en memoria: no hay `localStorage`, `sessionStorage` ni cookies.

## 6. Casos (M3)

| Paso                                                | Resultado real                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1. Docente autenticado                              | Cuenta de la semilla con `CREAR_CASO`, `CONSULTAR_CASO`, `MODIFICAR_CASO`, `PUBLICAR_CASO` y `GESTIONAR_SESION`    |
| 2. Acceso al módulo                                 | **Bloqueado navegando** (`habilitacion-pendiente`). Se probó el panel real `PanelCasosM3` montado contra HTTP real |
| 3 y 4. Formulario y validaciones                    | Validación local y del servidor                                                                                    |
| 5 a 8. Creación, respuesta, persistencia y consulta | `POST /v1/casos` 201 → `GET` 200 BORRADOR. En PostgreSQL: `Caso 0e07356b-…`, propietario el docente                |
| 9. Edición                                          | `PATCH` con If-Match vigente 204; sin If-Match 428; con ETag anterior 412 (`m3-m4-real-fs01`)                      |
| 10. Publicación                                     | 412 con versión anterior, luego 200. En PostgreSQL: `estado = Publicado`, `fechaBloqueoAcademico` marcada          |

## 7. Rúbricas (M3)

- `GET /rubrica` → 404 `RUBRIC_NOT_FOUND`.
- `PUT /v1/casos/{id}/rubrica`, con If-Match y desde el panel real `PanelRubricaM3`: 1 criterio (`c1`, puntaje 5) asociado a la pregunta del caso. Responde 200 «completa».

**En PostgreSQL:**

- `Rubrica 1d55d22b-…` con `idCaso = 0e07356b-…` (asociación con el caso);
- `RubricaPregunta`: 1 asociación, `c1 = 5.00`.

**Permisos y autoría:** exige `MODIFICAR_CASO`, `CONSULTAR_CASO`, ser propietario y que el caso esté en borrador (código del Backend). Con una versión desactualizada, 412.

## 8. Sesiones (M4)

| Prueba                                                       | Resultado                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Crear sesión desde el panel con el caso publicado (`?caso=`) | 201. En PostgreSQL: `Sesion 65a5abfa-…`, `SinIniciar`, programada por el docente |
| Caso en borrador                                             | 409 `M4-CASO-NO-PUBLICADO`                                                       |
| Fechas invertidas                                            | 400 `M4-FECHA-INVALIDA`                                                          |
| Transiciones SinIniciar→EnCurso→Finalizado                   | Correctas                                                                        |
| Transición inválida                                          | 409 `M4-OPERACION-NO-PERMITIDA`                                                  |
| Sin permisos                                                 | 403 `M4-SIN-PERMISO`                                                             |
| Sin sesión                                                   | 401                                                                              |
| Sesión inexistente                                           | 404                                                                              |

## 9. Convocatorias (M4)

| Prueba                                                                    | Resultado                                                                        |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /m4/sesiones/{id}/convocatorias` con el estudiante de la fixture QA | 201. En PostgreSQL: `Convocatoria f5f3f1fe-…`, `estadoAutorizacion = Autorizado` |
| Convocatoria duplicada                                                    | 409 `M4-CONVOCATORIA-DUPLICADA`                                                  |
| Sesión `EnCurso`                                                          | 409 `M4-CONVOCATORIA-NO-PERMITIDA`                                               |

## 10. Contratos incompatibles

**Ninguno** entre el Angular de `develop` y el Backend de `develop`. Lo único que cambió fue lo esperado tras FE-58: el aviso del guard pasó de `permisos-pendientes` a `habilitacion-pendiente`, y se ajustó en las pruebas temporales.

## 11. Funciones faltantes

| Función                            | Estado                                                  |
| ---------------------------------- | ------------------------------------------------------- |
| D-05 (activación docente)          | Faltante                                                |
| Listado de casos (`GET /v1/casos`) | Solo en el PR #96, en Draft y con su bandera en `false` |
| Listado de estudiantes convocables | Faltante                                                |
| Edición y eliminación de contenido | Faltante                                                |
| Reportes docentes                  | Faltante                                                |
| M6 (evaluación)                    | Solo en el PR #95, en Draft                             |

## 12. Pruebas Postman

- **No se ejecutaron colecciones Postman ni Newman en esta orden.**
- Existen `postman/PRISALY-Integrante-1.postman_collection.json` y `bruno/exports/PRISALY_M3_Postman_*` en el Backend.
- Las mismas operaciones HTTP se ejecutaron con los servicios Angular reales (sección 13).

## 13. Pruebas realizadas

| Nivel                                                           | Prueba                                                                                                                                                                                | Resultado       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| API y BD (HTTP real con los paneles y servicios Angular; Karma) | `administracion-real-fs01`: el administrador consulta el catálogo, da de alta un docente (201), detecta el duplicado (409), asigna (200) y revoca (204) con relectura; 401, 403 y 404 | **1/1**, exit 0 |
| API y BD                                                        | `recorrido-real-fs01`: el docente pasa por caso, contenido, rúbrica, publicación, sesión y convocatoria, con relecturas                                                               | **1/1**, exit 0 |
| API y BD                                                        | `m3-m4-real-fs01`: edición con 204, 412 y 428; 400, 401, 403, 404 y 409 de M4; transiciones                                                                                           | **1/1**, exit 0 |
| Navegador (manual asistida, puerto 4300 contra el QA real)      | Inicio de sesión docente (200, 200), las 6 rutas → `habilitacion-pendiente`, `estudiante` y el simulador → `demostracion-no-autorizada`, cierre de sesión 204, sin almacenamiento     | Verificado      |

Las pruebas temporales se eliminaron del repositorio y quedaron archivadas.

**Administrador en el navegador:** no se inició sesión como administrador en el navegador, porque la herramienta no autorizó leer su credencial. Se ejercitó por HTTP real.

## 14. Evidencias de persistencia

`INTEGRACION-FULLSTACK-EVIDENCIAS/evidencia-postgresql.txt`:

| Dato                                | Valor en PostgreSQL                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Caso                                | `0e07356b-…`, «QA FS-01 caso ficticio de recorrido», `Publicado`, `activo`, bloqueo académico marcado, propietario `docente.bruno@prisaly.local` |
| Contenido                           | 1 escenario, 1 pregunta y 2 opciones, con 1 correcta                                                                                             |
| Rúbrica                             | `1d55d22b-…` asociada al caso; 1 `RubricaPregunta` (`c1 = 5.00`)                                                                                 |
| Sesión                              | `65a5abfa-…`, `SinIniciar`, programada por el docente                                                                                            |
| Convocatoria                        | `f5f3f1fe-…`, estudiante de la fixture QA, `Autorizado`                                                                                          |
| Docente creado por el administrador | Correo ficticio `qa.fe57.e6fedef7@prisaly.test`, rol `DOCENTE`, `Activo`, **sin credencial**; su permiso revocado queda con `habilitado = false` |

Las trazas HTTP están en `traza-*.txt`.

## 15. Rutas que requieren habilitación QA

| Ruta                | Funcionalidad     | Contrato Backend | Pantalla Angular                    | Permiso necesario                                         | Prueba de seguridad                                   | Integración real           | Dependencias                                          | Criterio de habilitación                     | Recomendación                                         |
| ------------------- | ----------------- | ---------------- | ----------------------------------- | --------------------------------------------------------- | ----------------------------------------------------- | -------------------------- | ----------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- |
| `casos-academicos`  | Casos y contenido | Disponible (M3)  | `PanelCasosM3` y `PanelContenidoM3` | `CONSULTAR_CASO` para abrir; cada acción según el Backend | Guard, revalidación de `/me` y 401/403 (733+ pruebas) | **Verificada en API y BD** | Ninguna                                               | Navegar crea y relee el caso en PostgreSQL   | **Habilitar en QA** (pedir autorización)              |
| `rubricas`          | Rúbrica del caso  | Disponible       | `PanelRubricaM3`                    | `CONSULTAR_CASO`                                          | Ídem                                                  | **Verificada**             | Caso con preguntas                                    | Navegar guarda la rúbrica y la relee         | **Habilitar en QA**                                   |
| `sesiones`          | Programación      | Disponible (M4)  | `PanelSesionesM4`                   | `GESTIONAR_SESION`                                        | Ídem                                                  | **Verificada**             | Caso publicado                                        | Navegar crea la sesión en PostgreSQL         | **Habilitar en QA**                                   |
| `convocatorias`     | Convocatorias     | Disponible       | `PanelConvocatoriasM4`              | `GESTIONAR_SESION`                                        | Ídem                                                  | **Verificada**             | Estudiante existente (UUID manual, sin listado)       | Navegar convoca y relee                      | **Habilitar en QA**                                   |
| `usuarios-docentes` | Administración M1 | Disponible       | `PanelAdministracionM1`             | Rol ADMINISTRADOR                                         | Ídem, más la separación de funciones                  | **Verificada**             | D-05, para que el docente creado pueda iniciar sesión | El administrador navega, da de alta y asigna | Habilitar en QA, con D-05 documentado como limitación |
| `configuracion`     | Preferencias      | Sin contrato     | `DashboardSeccionPage`              | Sesión                                                    | Ídem                                                  | Sin operaciones            | —                                                     | Abre con sesión                              | Opcional                                              |

**Mecanismo mínimo propuesto** (no implementado; requiere autorización):

- Una configuración `qa-navegacion` exclusiva de QA, con `fileReplacements` como `demo`, que habilite solo las rutas autorizadas en el mapeo.
- Producción, desarrollo, demo y el QA actual conservan `habilitada: false`.
- Los guards, la revalidación de `/me` y la autorización del Backend no cambian.

## 16. Bloqueos

| Bloqueo                                                                                             | Responsable                                   |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Habilitación de rutas en QA                                                                         | Autorización de Dirección Central             |
| D-05                                                                                                | Ingrid                                        |
| Listados de casos y de estudiantes                                                                  | Ingrid (PR #96 en Draft)                      |
| OBS-53-01                                                                                           | Dirección Central                             |
| PR #97: la orquestación local empaqueta el build de producción, que con FE-58 solo muestra `/login` | Ingrid y Dirección Central                    |
| `node_modules` compartido vaciado en `PRISALY-Front-54`                                             | Se debe reinstalar en los worktrees afectados |

## 17. Plan concreto de implementación

1. **Con la autorización de Dirección Central:**
   - crear la configuración `qa-navegacion` y habilitar en ella `casos-academicos`, `rubricas`, `sesiones` y `convocatorias` (y `usuarios-docentes` si se autoriza);
   - añadir pruebas que demuestren que producción, desarrollo, demo y QA siguen bloqueados;
   - ejecutar la regresión y los builds.
2. **Prueba navegando:** el docente QA crea en el navegador un caso con contenido y rúbrica, lo publica, programa la sesión y convoca. Después se verifica en PostgreSQL (consultas de la sección 14).
3. **Con D-05 de Ingrid:** el administrador crea un docente, este lo activa e inicia sesión en el navegador.
4. **Con el PR #96 fusionado y activado:** añadir el selector de casos, en lugar del UUID manual.

## 18. URL para probar

| Servicio    | URL o estado                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend QA | `http://localhost:4300` (`ng serve --configuration qa --port 4300`, desde `PRISALY-Front-FULLSTACK-01`). El puerto 4200 estaba ocupado por el servidor demo de otra persona |
| Backend QA  | `http://localhost:18094/api`                                                                                                                                                |
| PostgreSQL  | Contenedor `prisaly-postgres-int50`, en marcha                                                                                                                              |

**Al terminar se detuvieron el Frontend en 4300 y la API**; el contenedor sigue en marcha.

**Para reiniciar:**

1. Iniciar la API: `bash ~/.prisaly-qa-int50/iniciar-api.sh` (script local, fuera del repositorio).
2. En `PRISALY-Front-FULLSTACK-01`, ejecutar `npx ng serve --configuration qa --port 4300`.

**Cuenta docente de prueba:** la semilla pública local del Backend (`bruno/scripts/m1-bruno-seed-local.sql`), que documenta su correo y su contraseña de prueba. No es una credencial nueva y no se reproduce aquí.

**Rutas disponibles navegando hoy:** `/login` y `/dashboard`. Las secciones académicas muestran «habilitación pendiente».

## 19. Resultado de las acciones autorizadas

| Acción                     | Resultado                                            |
| -------------------------- | ---------------------------------------------------- |
| Verificación inicial y SHA | Hecho                                                |
| Servicios levantados       | Backend, PostgreSQL y Angular QA                     |
| Pruebas reales             | Administración, recorrido docente y M3/M4: todas 1/1 |
| Persistencia               | Comprobada en PostgreSQL                             |
| Navegador                  | Inicio de sesión, guards y cierre de sesión          |
| Código                     | **Sin cambios de código**                            |
| Pendiente de autorización  | La habilitación de rutas en QA (sección 15)          |
| Git                        | Sin commits, push, PR ni merge                       |
