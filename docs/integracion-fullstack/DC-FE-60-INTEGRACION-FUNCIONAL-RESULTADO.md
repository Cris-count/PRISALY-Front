# DC-FE-60 — Integración funcional: resultado

Ejecutor: Claude. Fecha: 2026-11-23/24 (hora local Colombia). Sin commits, push ni PR: la publicación corresponde a Codex cuando Dirección Central la autorice.

## 1. Repositorios y SHA

| Repositorio | Referencia | SHA |
|---|---|---|
| Frontend | `origin/develop` tras `git fetch` | `c87045a92500adafe5b78742f35d8ffbb7c80dec` (incluye la fusión `f69e1b6` y la auditoría Codex PR #21) |
| Frontend | Rama de trabajo | `integration/fe-60-plataforma-funcional`, creada sobre `c87045a`, **sin upstream** y con cambios sin confirmar |
| Backend | `origin/develop` tras `git fetch` | `5d61972d2f5e54758ab67e1dad4e6a2e74d1c2a6` (posterior a `773818c`; incluye PR #94–#97: M4, M6, M3, ops) |
| Backend QA en ejecución | worktree `PRISALY-Backen-QA`, rama `local/qa-integracion-backend` | `d8171e0f1c2ba8ae534fc33ca078217d1ac9bdf9`. **No se modificó** |

Worktree Frontend: `PRISALY-Front-FULLSTACK-01` (dependencias enlazadas desde `PRISALY-Front-58`). Los demás worktrees no se tocaron.

## 2. Criterio de éxito: recorrido docente real (navegador → API → PostgreSQL)

Ejecutado en `http://localhost:4300` (build `qa-navegacion`) con la cuenta `[cuenta docente QA]`, **todo desde la interfaz Angular**. No se reutilizaron registros creados por HTTP directo.

| Paso | Pantalla | Respuesta en la interfaz | Registro en PostgreSQL |
|---|---|---|---|
| Login + `/me` | `/login` | POST `/v1/personal/autenticar` 200; GET `/v1/personal/me` 200 | — |
| Crear caso | Casos académicos | «Caso creado en estado BORRADOR y verificado en el servidor» | `Caso a955daa0-ed3c-499d-ba7e-22234103a6a4` |
| Escenario | Contenido del caso | «Escenario guardado en el servidor (verificado por relectura)» | `Escenario 7ceee4e0-…` |
| Pregunta | Contenido del caso | «Pregunta guardada…» | `Pregunta 5b4ab978-…` |
| Opciones (2, una correcta) | Contenido del caso | «Opción guardada…» | `OpcionRespuesta 36e89836-…` (correcta), `f9d06c8d-…` |
| Rúbrica + criterio + asociación | Rúbricas | «Rúbrica guardada por el servidor (completa)» | `Rubrica f32298ad-…` total 5.00; `RubricaPregunta c1410b9c-…` criterio c1, valor 5.00 |
| Publicación | Casos académicos | «Publicación aceptada por el servidor: estado PUBLICADO» | `Caso.estado = Publicado` |
| Sesión | Sesiones | «Sesión programada en estado Sin iniciar» | `Sesion b1ff62ea-413f-4ca5-b7da-c67d9b134a0e`, SinIniciar, 2026-12-01 |
| Convocatoria | Convocatorias | «Estudiante convocado y verificado en el servidor» | `Convocatoria 87e86288-…`, Autorizado |

Evidencia: `INTEGRACION-FULLSTACK-EVIDENCIAS/fe60-postgresql.txt` (consulta conjunta de las 9 filas).

## 3. Pruebas negativas contra el Backend real

`INTEGRACION-FULLSTACK-EVIDENCIAS/fe60-negativas.txt`:

| Caso | HTTP |
|---|---|
| POST `/v1/casos` sin token | 401 |
| GET `/v1/personal/me` con token inválido | 401 |
| Login usuario inactivo / clave incorrecta | 401 / 401 |
| Usuario sin `CREAR_CASO` crea caso (DTO válido) | 403 |
| Administrador crea caso (sin `CREAR_CASO`) | 403 |
| Docente consulta `/v1/admin/roles` (sin rol ADMINISTRADOR) | 403 |
| Casos «NEG FE60» persistidos | 0 |
| Navegador: docente entra por URL a `/dashboard/usuarios-docentes` | Guard redirige a `/dashboard?aviso=rol-insuficiente`, mensaje claro sin códigos |

## 4. Paneles

### Administrador (`[cuenta administradora QA]`, rol `ADMINISTRADOR`)

Menú: Inicio · **Gestión de docentes** · Configuración · **Mi perfil**. En Gestión de docentes solo se muestra el panel M1 real (catálogo de roles y permisos verificado en navegador con datos del servidor, permisos efectivos por usuario, alta de docente). La activación D-05 no genera contraseña utilizable (decisión Backend vigente); no se crearon contraseñas predeterminadas. Configuración sigue siendo presentación: el Backend no tiene endpoints.

**No implementado, sin contrato Backend:** Gestión de estudiantes (no existe endpoint M1 de listado/alta de estudiantes) y Vista general (no existe endpoint de métricas). No se añadieron pantallas ficticias.

### Docente (`[cuenta docente QA]`, rol de semilla `DocenteBruno`)

Menú: Inicio · Casos académicos · Rúbricas · Sesiones · Convocatorias · **Mi perfil**. Sin «Mi espacio de aprendizaje», sin avisos técnicos de QA. «Mi perfil» distingue capacidades de **lectura** (`CONSULTAR_CASO`), **creación** (`CREAR_CASO`), **edición** (`MODIFICAR_CASO`), **publicación** (`PUBLICAR_CASO`) y gestión de sesiones (`GESTIONAR_SESION`) con textos legibles, sin códigos.

### Estudiante

- **Real (DD-02 B):** pantalla `/estudiante/acceso` (solo builds QA) conectada al contrato existente `POST /v1/acceso-estudiante/solicitar` y `/validar`. En navegador contra el Backend QA: **501 `ESTUDIANTE_ACCESS_PENDING_CONTRACT`** y la interfaz informa «DD-02 pendiente», sin crear sesión. Estados preparados: código enviado, código incorrecto/caducado/usado (401/403), intentos agotados (429), formato (400), reenvío.
- **Demostración (entorno `demo`, orden 04):** `/acceso-estudiante` con verificación local (hash SHA-256 en `environment.demo.ts`, ninguna llamada HTTP), etiquetado «Demostración · Datos ficticios · Sin cuenta estudiantil real». Menú estudiantil: Mi espacio de aprendizaje · Mis sesiones · Mis convocatorias · Mis actividades · Notificaciones · Recorrido estudiantil · Mi perfil · Simulador. No se presenta como cuenta real.

## 5. Estado DD-02 y bloqueo exacto (para Ingrid)

1. **El contrato difiere de la orden:** DD-02 alternativa B es acceso por **código temporal de 8 dígitos, un solo uso, 5 minutos, máx. 5 intentos**, sin contraseña. La orden pide «registro con correo y contraseña». Requiere decisión de Dirección Central.
2. **Flag desactivado:** `prisaly.m1.student-access.enabled=false` → 501.
3. **Esquema no aplicado:** `db/dd02b-propuesta/V014–V016` (credencial y sesión estudiantil, integridad del vínculo, entrega M7 del código) están fuera de `db/migration`; no se aplicaron (D-ESQ-1, D-11, D-12 pendientes).
4. **CORS con credenciales:** el Backend QA no envía `Access-Control-Allow-Credentials`; `validar` entrega la sesión por cookie, por lo que necesitará CORS con credenciales o un proxy del mismo origen. Detectado en navegador.
5. **Alta de estudiantes:** no hay endpoint para crear el vínculo cuenta–estudiante; la cuenta `[identidad estudiantil QA sin credencial]` existe sin credencial.

No existe cuenta estudiantil real. No se aplicaron migraciones ni se modificó el Backend.

## 6. Archivos modificados (Frontend)

Nuevos: `dashboard/dashboard-perfil.ts` (+spec), `autenticacion/acceso-estudiante-real.ts` (+spec), `autenticacion/acceso-estudiante-demo.ts` (+spec).
Modificados: `app.routes.ts` (rutas `estudiante/acceso` y `acceso-estudiante`), `dashboard.routes.ts` (`perfil`), `navegacion-rol.ts` (+spec), `dashboard-layout.ts|html`, `dashboard-administracion.ts|html`, `habilitacion-qa-navegacion.ts` (+spec), `environment.qa-navegacion.ts`, `environment.demo.ts`, `login-page.ts|html|css`, `dashboard.spec.ts`.

## 7. Pruebas automatizadas (ejecutadas en esta entrega)

Ver sección 11.

## 8. Seguridad

- Guards FE-58, revalidación `/me`, 401/403 y revocación sin cambios. «Mi perfil» usa el mismo guard que Inicio; no se crearon permisos.
- Producción, desarrollo, QA ordinario y demo: mapeo oficial, seis rutas deshabilitadas. `qa-navegacion` habilita las seis por autorización expresa (docentes + administrativas).
- `/estudiante/acceso` solo en builds QA; `/acceso-estudiante` solo en `demo`.
- Sin contraseñas, tokens ni códigos en código o documentos; la clave demo solo como hash.
- Simulador, Phaser, Unreal, Pixel Streaming, SIM-01 y M5: sin cambios.

## 9. Usuarios QA (sin credenciales)

| Perfil | Correo | Estado | Aprovisionamiento |
|---|---|---|---|
| Administrador | `[cuenta administradora QA]` | Login y `/me` verificados | Inicialización QA; clave en `[canal privado]` (canal privado) |
| Docente | `[cuenta docente QA]` | Login, `/me` y recorrido completo verificados | `bruno/scripts/m1-bruno-seed-local.sql` (solo QA local) |
| Docente sin permiso / inactivo | `sinperm.bruno@…`, `inactive.bruno@…` | 403 / 401 verificados | Misma semilla |
| Estudiante | — | **No existe cuenta real** | Pendiente DD-02 |

Cuentas adicionales de docente: alta desde Gestión de docentes (M1) con el administrador; la credencial se entrega por el canal D-05 cuando esté definido. No modificar tablas directamente.

## 10. Entrega navegable

| Servicio | Estado / URL |
|---|---|
| PostgreSQL | Docker `prisaly-postgres-int50`, puerto 5434, base `prisaly_int50`, Flyway V013 |
| Backend QA | `http://localhost:18094/api` — `bash [script local de inicio no publicado]` |
| Frontend QA (docente/admin) | `http://localhost:4300` — `npx ng serve --configuration qa-navegacion --port 4300` |
| Frontend demo (estudiante) | `http://localhost:4400` — `npx ng serve --configuration demo --port 4400` |

El token de personal vive en memoria: recargar la página cierra la sesión.

## 11. Resultados finales (ejecutados en esta entrega)

| Verificación | Resultado |
|---|---|
| Suite Angular completa (`ng test --watch=false`) | **775/776**. 1 fallo: «todas las vistas se adaptan a 2560px…» por **timeout de 5 s** con la máquina cargada (API + dos `ng serve`); el archivo `dashboard.spec.ts` aislado pasa **38/38**. En una ejecución previa la misma prueba falló a 1440 px por igual motivo. No se considera regresión funcional, pero queda como prueba sensible a carga |
| Suites afectadas (`dashboard`, `autenticacion`, `academico`) | **432/432** |
| `tsc` aplicación y pruebas | sin errores |
| Builds `production`, `qa`, `demo`, `qa-navegacion` | salida 0 en los cuatro |
| Bundle producción | sin `localhost:18094`; sin configuración estudiantil demo |
| Bundle QA ordinario | sin configuración estudiantil demo |
| `git diff --check` | limpio |
| Búsqueda de secretos en el diff | sin contraseñas, tokens ni claves; la clave demo solo como hash |

Errores corregidos durante la entrega:

1. Enlace de acceso estudiantil en el login QA reutilizaba la clase `.explorar-demo` (la prueba FE-58 prohíbe atajos de demostración en QA): clase propia.
2. `solicitar` usaba `withCredentials` y el navegador lo bloqueaba (CORS sin credenciales): la solicitud ya no envía cookie; `validar` la mantiene (dependencia de Ingrid).
3. Prueba de ruta estudiantil dependía de la carga perezosa del login: ruta de login de prueba.
4. Clave demo en claro en una prueba: sustituida por un valor propio de la prueba.

## 12. Dependencias

**Ingrid (Backend):** decisión entre registro con contraseña (orden) y acceso por código (contrato DD-02 B); activación de `prisaly.m1.student-access.enabled`; aprobación y aplicación de V014–V016; CORS con credenciales o proxy para la cookie estudiantil; endpoint de alta/vínculo de estudiantes; normalizar el rol de semilla `DocenteBruno` a `DOCENTE`; endpoints para Gestión de estudiantes y Vista general si se requieren. El Backend `origin/develop` (`5d61972`) retiró la lectura de convocatorias sin autorización en M4 (PR #94); el QA en ejecución (`d8171e0`) es anterior y debe actualizarse para validar ese cambio.

**Simulador (Nicolás, Cristian):** sin cambios. El enlace «Simulador» del menú estudiantil demo abre la demostración existente; no se generan intentos ni se activa M5.

## 13. Estado Git

Rama `integration/fe-60-plataforma-funcional` sobre `c87045a`, sin upstream, **sin commits**. Cambios sin confirmar: los de la sección 6 y este documento. Publicación, PR y CI corresponden a Codex con autorización de Dirección Central (la fusión anterior no tuvo CI por no pasar por PR; se recomienda PR para este incremento).

## 14. Próxima acción

1. Codex: auditoría independiente, commits lógicos y PR Draft contra `develop` (con CI).
2. Dirección Central + Ingrid: resolver el modelo de acceso estudiantil y autorizar DD-02 (flag + V014–V016 + CORS).
3. Con DD-02 activo: probar `/estudiante/acceso` de extremo a extremo con Mailpit y conectar «Mis convocatorias» a `GET /v1/estudiantes/convocatorias`.
