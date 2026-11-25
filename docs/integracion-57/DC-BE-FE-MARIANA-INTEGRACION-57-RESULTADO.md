# DC-BE-FE-MARIANA-INTEGRACION-57: resultado

- **Fecha:** 2026-11-22.
- **Responsable:** Mariana (Frontend).
- **Ejecutor:** Claude.
- **Solicitante:** Ingrid Backend.
- **Revisión posterior:** Codex.

## Clasificación

**INTEGRACIÓN PARCIAL — BLOQUEADA POR PERMISOS O CREDENCIALES**

**Lo que funciona:** los servicios y paneles Angular de M1 (administración), M3 y M4 operan contra el Backend QA real, con persistencia verificada por relectura en la API y en la base de datos.

**Lo que está bloqueado:**

- Ninguna pantalla administrativa ni académica es navegable: siguen bloqueadas por BLQ-53-01, y la de administración también por SOL-55-02.
- Las cuentas docentes nuevas no pueden autenticarse (D-05).

**Lo que se verificó navegando** (navegador): inicio de sesión, identidad, guards, aviso de acceso y cierre de sesión.

## 1. Worktree

`C:\Users\57316\OneDrive\Escritorio\PRISALY\PRISALY-Front-57`. Es nuevo. Los worktrees de FE-53 a FE-56 se conservan sin cambios. `node_modules` es una unión a `PRISALY-Front-54`.

## 2. Rama

`feature/fe-57-integracion-e2e`, sin upstream configurado.

## 3. SHA del Frontend

`0b341c029407ca871183e6346bc6e730e9778f34`. Coincide con `origin/develop` y con la referencia.

## 4. SHA del Backend

`773818caf62758d66019a71dac6508d13148abad`. Coincide con `origin/develop` de `PRISALY-Backen`, inspeccionado en `PRISALY-Backen-INT` sin modificar.

**Nota sobre el repositorio Backend:**

- La rama por defecto del remoto es `main` (`288f9aa`), que no contiene a `develop`.
- El clon `PRISALY-Backen` está en `backup/m3-antes-sync-20261105-1dfa986`, con archivos sin seguimiento ajenos. No se tocó.

## 5. Estado de Git

| Elemento                                          | Estado              |
| ------------------------------------------------- | ------------------- |
| `src/app/features/academico/panel-sesiones-m4.ts` | Modificado (+4)     |
| `src/app/features/academico/mensajes-m4.spec.ts`  | Nuevo               |
| `docs/integracion-57/`                            | Nuevo, 5 documentos |
| Commits, push, PR, merge                          | Ninguno             |

## 6. Matriz rutas–endpoints–permisos

Ver `DC-FE-57-MATRIZ-RUTAS-ENDPOINTS-PERMISOS.csv`: 26 filas, con 401, 403, la prueba disponible y el bloqueo de cada una.

| Categoría                          | Contenido                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CONFIRMADO EN BACKEND**          | Todos los endpoints consumidos, con su permiso o rol en el código de `773818c`                                                                                                                                     |
| **APROBADO POR DIRECCIÓN CENTRAL** | Ninguna asociación ruta–permiso. La única aprobación institucional registrada es la política de lectura M3 (`CONSULTAR_CASO`, comentario de `application.yml`), que se refiere al endpoint y no a una ruta Angular |
| **PROPUESTO**                      | `casos-academicos` y `rubricas` → `CONSULTAR_CASO`; `sesiones` y `convocatorias` → `GESTIONAR_SESION` (SOL-55-01)                                                                                                  |
| **PENDIENTE**                      | `usuarios-docentes` (rol ADMINISTRADOR, SOL-55-02), `configuracion`, archivar caso, edición y eliminación de contenido, M5 (DD-02)                                                                                 |

`MAPEO_RUTAS_PERSONAL_OFICIAL` conserva `aprobado: null` en todas las rutas.

## 7. Estado de M1

**Servicios reutilizados:** `AdministracionM1Api` y `PanelAdministracionM1` (FE-53). Los DTO coinciden con `AdministracionController`.

**Prueba real** (paneles y servicios contra HTTP real):

- Cuenta administrativa QA preexistente `admin.qa@prisaly.test`, rol `ADMINISTRADOR`, usada en FE-53. La credencial no se reproduce.
- Para comprobar la denegación se usó la cuenta docente de la semilla pública, nunca para privilegios administrativos.

| Operación                          | Endpoint                                        | Resultado real                                                                                | Relectura y persistencia                                                         |
| ---------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Sin sesión                         | `GET /v1/admin/roles`                           | 401 UNAUTHENTICATED                                                                           | —                                                                                |
| Cuenta docente                     | `GET /v1/admin/roles`                           | **403 ADMIN_REQUIRED**                                                                        | —                                                                                |
| Inicio de sesión admin             | `/autenticar`, `/me`                            | 200; rol ADMINISTRADOR, sin permisos individuales                                             | El guard de `usuarios-docentes` redirige a `permisos-pendientes`                 |
| Consultar roles y permisos (panel) | `GET /v1/admin/roles`, `GET /v1/admin/permisos` | 200: 4 roles y 6 permisos                                                                     | —                                                                                |
| Validación local                   | Alta vacía                                      | Sin solicitud HTTP                                                                            | —                                                                                |
| Alta de docente (panel)            | `POST /v1/admin/docentes`                       | 201, «Docente registrado (Activo)». El panel advierte que no hay credencial utilizable (D-05) | Base de datos: rol `DOCENTE`, `passwordHash` nulo                                |
| Alta duplicada (panel)             | Ídem                                            | **409 DUPLICATE_EMAIL**                                                                       | —                                                                                |
| Permisos del docente nuevo (panel) | `GET /v1/admin/usuarios/{id}/permisos`          | 200, 0 permisos                                                                               | —                                                                                |
| Asignar `CONSULTAR_CASO` (panel)   | `PUT …/permisos/{idPermiso}`                    | 200, habilitado                                                                               | Relectura con `CONSULTAR_CASO`; la tabla muestra «Habilitado»                    |
| Asignación repetida                | Ídem                                            | **409 DUPLICATE_ASSIGNMENT**                                                                  | —                                                                                |
| Revocar (panel)                    | `DELETE …/permisos/{idPermiso}`                 | 204                                                                                           | Relectura: 0 permisos. Base de datos: `CONSULTAR_CASO=false` (revocación lógica) |
| Usuario inexistente                | `GET …/usuarios/{uuid}/permisos`                | **404 USER_NOT_FOUND**                                                                        | —                                                                                |
| Propio usuario (panel)             | —                                               | `PUBLICAR_CASO`: «No permitido (separación de funciones)». No se escribió nada                | —                                                                                |
| Tras cerrar sesión                 | `GET /v1/admin/roles`                           | 401                                                                                           | —                                                                                |

**Docente de la ejecución definitiva:** `2e478227-17cc-4682-a339-314e2e185edc`, correo ficticio `qa.fe57.6c2897b3@prisaly.test`. La primera ejecución creó otro docente ficticio (`qa.fe57.ddfe3935@prisaly.test`) antes de fallar por un selector de la prueba.

**Lo que no se hizo:**

- Las cuentas creadas no pueden iniciar sesión (D-05); no se intentó y no se afirma lo contrario.
- No se probó OBS-53-01, porque exigiría modificar los permisos de la propia cuenta administrativa.

## 8. Estado de M3

**Servicios reutilizados:** `CasosM3Api`, `PanelCasosM3`, `PanelContenidoM3` y `PanelRubricaM3` (FE-53/54/55).

**Prueba real** (paneles contra HTTP real):

- crear caso, consultar, contenido (escenario, pregunta y 2 opciones), rúbrica, publicación (412 con versión anterior y luego 200), relectura de PUBLICADO y bloqueo de altas tras publicar;
- además, edición del caso: `PATCH` sin If-Match → **428**; con If-Match vigente → 204, relectura del título y ETag nuevo; con ETag anterior → **412 STALE_CASE**, sin sobrescribir.

Las protecciones FE-54 y FE-55 (relectura, versión única, bloqueo tras 412 o 428 y respuestas tardías) no cambiaron.

## 9. Estado de M4

**Servicios reutilizados:** `SesionesM4Api`, `PanelSesionesM4` y `PanelConvocatoriasM4`.

**Prueba real:**

| Caso                                    | Resultado                            |
| --------------------------------------- | ------------------------------------ |
| Sin sesión                              | 401                                  |
| Cuenta sin permisos                     | **403 M4-SIN-PERMISO**               |
| Caso en borrador                        | **409 M4-CASO-NO-PUBLICADO**         |
| Crear sesión                            | 201; aparece en el listado           |
| Fechas invertidas                       | **400 M4-FECHA-INVALIDA**            |
| Actualizar                              | 200, con relectura                   |
| Transición SinIniciar→Finalizado        | **409 M4-OPERACION-NO-PERMITIDA**    |
| SinIniciar→EnCurso                      | 200; inicio real marcado             |
| Convocar con la sesión EnCurso          | **409 M4-CONVOCATORIA-NO-PERMITIDA** |
| EnCurso→Finalizado                      | 200                                  |
| Sesión inexistente                      | **404 M4-SESION-NO-ENCONTRADA**      |
| Recorrido: convocar                     | 201; relectura de 1 convocado        |
| Recorrido: convocar al mismo estudiante | **409 M4-CONVOCATORIA-DUPLICADA**    |

La sincronización FE-55 entre la URL y las operaciones se conserva: la prueba del recorrido usa `?caso=` y `?sesion=` con los paneles reales.

## 10. Preparación de M5

Ver `DC-FE-57-PREPARACION-M5-M6.md`. En resumen:

- Las banderas de M1 (acceso estudiantil) y M5 (inicio, finalización y fases) están apagadas.
- Hay 13 funciones mapeadas, cada una con su endpoint, DTO, condición, autorización, servicio Angular existente, responsable y decisión pendiente.
- No se activó nada.

## 11. Preparación de M6

En el backend de referencia se identificó una implementación interna; posteriormente Ingrid comunicó endpoints HTTP candidatos no aprobados. El contrato documental no se localizó ni se verificó independientemente; ver `DC-FE-57-PREPARACION-M5-M6.md` sección 3. No se creó ninguna pantalla ni se consumieron los candidatos.

## 12. Pantallas existentes

| Pantalla                                                                               | Estado                         |
| -------------------------------------------------------------------------------------- | ------------------------------ |
| `/login`                                                                               | Navegable                      |
| `/dashboard`                                                                           | Navegable, con aviso de acceso |
| `/dashboard/usuarios-docentes` (`PanelAdministracionM1`)                               | Bloqueada                      |
| `/dashboard/casos-academicos` (`PanelCasosM3`, `PanelContenidoM3`, `RecorridoDocente`) | Bloqueada                      |
| `/dashboard/rubricas`                                                                  | Bloqueada                      |
| `/dashboard/sesiones`                                                                  | Bloqueada                      |
| `/dashboard/convocatorias`                                                             | Bloqueada                      |
| `/dashboard/configuracion`                                                             | Bloqueada                      |
| `/dashboard/estudiante`                                                                | Solo presentación              |
| Simulador                                                                              | Sin cambios                    |

No se creó ni se duplicó ninguna pantalla.

## 13. Servicios reutilizados

`SesionPersonalM1`, `personalM1Interceptor`, `personalAcademicoInterceptor` (lista cerrada de 23 rutas, sin cambios), `AdministracionM1Api`, `CasosM3Api`, `SesionesM4Api`, `CasosSesionStore` y `ParametroRecorrido`.

## 14. Pruebas reales

Hay tres tipos de evidencia, que no son intercambiables:

**A. Navegación real desde Angular** (navegador integrado, `ng serve --configuration qa`, Backend QA `localhost:18094`):

- Inicio de sesión docente: 200, y `/me`: 200.
- Las 6 rutas de personal redirigen a `/dashboard?aviso=permisos-pendientes`.
- Cierre de sesión: 204, y vuelta a `/login`.
- Sin `localStorage`, `sessionStorage` ni cookies.
- **No se pudo iniciar sesión como administrador en el navegador:** no se autorizó leer la credencial QA administrativa. Esa cuenta se ejercitó en B.

**B. Componentes Angular contra HTTP real, con las rutas bloqueadas** (Karma y ChromeHeadless):

| Prueba                      | Resultado   | Archivo                                                                                                   |
| --------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| Administración M1           | 1/1, exit 0 | `prueba-real-admin-2.log`; el primer intento falló por un selector de la prueba (`prueba-real-admin.log`) |
| Recorrido docente, 7 etapas | 1/1, exit 0 | `prueba-real-docente.log`                                                                                 |
| M3/M4 complementario        | 1/1, exit 0 | `prueba-real-m3-m4.log`                                                                                   |

**C. Pruebas automatizadas con HTTP simulado:** ver la sección 16.

## 15. Persistencia

| Dato                                          | Comprobación                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Docentes ficticios                            | Base de datos: rol `DOCENTE`, `Activo`, sin credencial. Permiso revocado con `habilitado=false` (`relectura-bd-admin.txt`) |
| Caso `ec24b3bc-575e-419d-b262-2cd41905bb3b`   | Publicado. Relecturas de contenido, rúbrica y estado por API                                                               |
| Sesión `65e5fd8f-edd4-44e3-8473-a05270ad7e47` | 1 convocado                                                                                                                |
| Sesión `f40d9198-14e8-43f8-93fe-2529c8c6e43a` | Editada y llevada a Finalizado, con relectura                                                                              |
| Caso de edición                               | Título editado, con relectura                                                                                              |

## 16. Resultado de la regresión

| Comando                                                                                    | Resultado                                     |
| ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Suite completa, bloque 1 (`app`, `core`, `academico`, `autenticacion`, `dashboard`)        | **356/356**, exit 0                           |
| Suite completa, bloque 2 (`simulador`)                                                     | **306/306**, exit 0                           |
| Total                                                                                      | **662/662** (las 660 de la base más 2 nuevas) |
| Dirigidas M1, guards e interceptores (`autenticacion`, `academico-http`, `academico-apis`) | 163/163, exit 0                               |
| Dirigidas M3 y concurrencia (`contenido-m3`, `paneles-academicos`)                         | 52/52, exit 0                                 |
| Dirigidas M4, FE-55 y FE-57 (`recorrido-docente`, `mensajes-m4`)                           | 44/44, exit 0                                 |
| `ng build` y `ng build --configuration qa`                                                 | exit 0 y exit 0                               |
| TypeScript de la aplicación y de las pruebas                                               | exit 0 y exit 0                               |
| Prettier, `check:urls`, `git diff --check`                                                 | exit 0                                        |
| Revisión de secretos                                                                       | Sin hallazgos                                 |

La suite se ejecutó en dos bloques porque en FE-56 la ejecución única se desconectó por falta de memoria.

## 17. Defectos encontrados

| ID        | Descripción                                                                                                                                                                                                                      | Tipo             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| DEF-57-01 | El código real `M4-OPERACION-NO-PERMITIDA` (409, `SesionOperacionNoPermitidaException`) no estaba en `MENSAJES_M4`: el panel mostraba el texto genérico de regla académica. Ocurre si la sesión cambió de estado en otra pestaña | Frontend (menor) |
| DOC-57-01 | Los cinco documentos Backend obligatorios no existen en ninguna rama remota (ver la sección 4 del documento M5/M6)                                                                                                               | Documentación    |
| ENT-57-01 | La memoria libre del equipo bajó a 50–500 MB durante la sesión. No impidió completar las pruebas definitivas                                                                                                                     | Infraestructura  |

## 18. Correcciones del Frontend

- **DEF-57-01:** se añadió `'M4-OPERACION-NO-PERMITIDA'` a `MENSAJES_M4` (4 líneas) y la prueba `mensajes-m4.spec.ts` (2 casos).
- Nada más: el resto de la integración ya funcionaba y no se introdujeron cambios artificiales.

## 19. Dependencias del Backend (Ingrid)

| Pendiente  | Descripción                                                                         |
| ---------- | ----------------------------------------------------------------------------------- |
| SOL-55-01  | Mapeo, junto con Dirección Central                                                  |
| D-05       | Entrega segura de credenciales (`altaDocente` crea la cuenta sin `passwordHash`)    |
| OBS-53-01  | Autoasignación de `CREAR_CASO`                                                      |
| Listados   | Casos, usuarios y estudiantes convocables                                           |
| Documentos | Publicar los cinco documentos de la orden o indicar dónde están                     |
| M5 y M6    | Confirmar que los endpoints estudiantiles sin bandera propia dependen solo de DD-02 |

## 20. Bloqueos institucionales

| Decisión                           | Responsable                | Situación                                                          | Evidencia                          | Impacto                                                   | Decisión requerida              | Estado    |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------ | ---------------------------------- | --------------------------------------------------------- | ------------------------------- | --------- |
| BLQ-53-01                          | Ingrid y Dirección Central | Todas las rutas con `aprobado: null`                               | Navegador: 6 rutas redirigen       | Ninguna pantalla académica ni administrativa es navegable | Aprobar el permiso de cada ruta | Pendiente |
| SOL-55-02                          | Dirección Central          | La ruta de administración depende del rol, que el mapeo no expresa | `ADMIN_REQUIRED` real              | No hay administración navegable                           | Rol o permiso explícito         | Pendiente |
| D-05                               | Ingrid                     | Docente creado sin credencial                                      | Base de datos: `passwordHash` nulo | Las cuentas nuevas no pueden autenticarse                 | Mecanismo de activación         | Pendiente |
| OBS-53-01                          | Ingrid                     | Sin cambios desde FE-53                                            | FE-53                              | Mensaje del panel                                         | Documentar o corregir           | Pendiente |
| Listados                           | Ingrid                     | No existen                                                         | Código y openapi                   | UUID a mano                                               | Publicar contratos              | Pendiente |
| Edición y eliminación de contenido | Dirección Central          | No existe contrato                                                 | openapi                            | Correcciones solo por altas                               | Decidir                         | Pendiente |
| DD-02/M5                           | Ingrid y Dirección Central | Banderas apagadas                                                  | `application.yml`                  | Sin recorrido estudiantil                                 | Activación expresa              | Pendiente |
| Aceptación de M6                   | Ingrid y Dirección Central | HTTP candidato comunicado, no aprobado                             | `M6-INC-08.md`                     | Sin evaluación en el Frontend                             | DD-03 y aceptación              | Pendiente |

## 21. Estado exacto del recorrido E2E

| Recorrido                                                             | A. Navegando                                           | B. Componentes con HTTP real                                 | C. HTTP simulado |
| --------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ | ---------------- |
| Administrador: inicio de sesión                                       | Pendiente (sin acceso a la credencial en el navegador) | Verificado                                                   | Verificado       |
| Administrador: gestión de personal                                    | **Bloqueado** (BLQ-53-01, SOL-55-02)                   | Verificado: alta, catálogo, asignación, revocación y errores | Verificado       |
| Docente nuevo: activación                                             | **Bloqueado** (D-05)                                   | No aplica                                                    | —                |
| Docente QA: inicio de sesión, identidad y cierre                      | Verificado                                             | Verificado                                                   | Verificado       |
| Docente: caso, contenido, rúbrica, publicación, sesión y convocatoria | **Bloqueado** (BLQ-53-01)                              | Verificado y persistido                                      | Verificado       |

## 22. Próximas acciones

1. Dirección Central e Ingrid aprueban SOL-55-01 y SOL-55-02. Después: rellenar `aprobado` en `m1-mapeo-rutas.ts` y repetir A navegando ambos recorridos.
2. Ingrid resuelve D-05. Después: probar el inicio de sesión de un docente creado por el administrador.
3. Una persona autorizada inicia sesión como administrador en el navegador para completar A del recorrido administrativo. Hoy esa ruta solo mostraría la redirección.
4. Publicar o ubicar los cinco documentos Backend de la orden.
