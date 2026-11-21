# DC-FE-INTEGRACION-FUNCIONAL-ENTREGA

**Proyecto:** PRISALY · **Responsable:** Mariana (Frontend Angular 22) · **Asistente:** Claude
**Fecha:** 2026-11-20/21 · **Orden:** Instrucción de continuidad funcional (entrega 23-nov-2026)

> **Resumen:** el flujo de **acceso de personal (M1)** funciona de extremo a extremo desde Angular contra el Backend real de `develop`: login, identidad y perfil, rechazo de credenciales, cierre de sesión e invalidación del token. El resto de pantallas (usuarios, casos, rúbricas, sesiones, convocatorias, espacio estudiantil) **siguen siendo interfaces de demostración**: no tienen servicios HTTP y el guard de Angular las bloquea a propósito hasta que exista el mapeo oficial ruta→permiso. La participación estudiantil (M5) sigue **bloqueada** por DD-02.
>
> No se modificó código Frontend ni Backend en esta entrega: el código existente funcionó sin correcciones. Lo que se publica es esta documentación.

Leyenda: **[V]** verificado directamente en esta estación · **[I]** reportado por Ingrid · **[C]** reportado por Codex · **[B]** bloqueado.

---

## 1. SHA inicial de `develop`

| Repositorio | `origin/develop` al iniciar | Línea base auditada anterior |
|---|---|---|
| PRISALY-Front | `eb32d578da5d30b2be8288e78173012c90f31bdb` (PR #14, Simulador02 de Nicolás) | `778dad77…` (+3 commits) |
| PRISALY-Backen | `773818caf62758d66019a71dac6508d13148abad` (PR #93, DC-45 cierre M5 de Ingrid) | `d8171e0f…` (+2 commits) |

Novedades de `develop` relevantes para la integración [V]:
- **Front:**
  - Simulador 2.0: Unreal, Pixel Streaming, Phaser 2.5D y narrativa.
  - `/simulador` redirige ahora a `/simulador-unreal`.
  - Nuevas dependencias: `phaser`, `animejs` y `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`.
  - **Sin cambios** en M1, en el gateway M5 ni en los entornos.
- **Backend:**
  - M5 implementa las políticas DC-45 (E1, L1, RF-22, V1-c, DD-14-a) y el cierre temporal idempotente.
  - `inicio-finalizacion.publicacion.enabled` sigue en **false**: publicar el inicio y la finalización de intentos sigue requiriendo activación expresa de Dirección Central.
  - **Sin cambios** en M1 ni en los contratos de las seis operaciones Angular.

## 2. SHA final publicado

Véase la sección 4. Esta entrega solo añade documentación sobre `eb32d57` (Front). En Backend no hay commits.

## 3. Ramas utilizadas

| Repo | Rama | Base | Worktree local |
|---|---|---|---|
| Front | `integracion/funcional-20261121` | `origin/develop` `eb32d57` | `PRISALY-Front-INT` |
| Backend | `integracion/funcional-be-20261121` (solo para ejecutar; sin commits) | `origin/develop` `773818c` | `PRISALY-Backen-INT` |

Los worktrees anteriores (`PRISALY-Front-QA-01`, `PRISALY-Backen-QA`, `PRISALY-Front`, `PRISALY-Backen`) **no se tocaron**; sus cambios locales siguen intactos.

## 4. Commits realizados

| Repo | Commit | Contenido |
|---|---|---|
| Front | (rama `integracion/funcional-20261121`) | `docs`: este documento. |
| Backend | — | Ninguno: no hubo defecto Backend reproducible que corregir. |

## 5. Cambios Frontend

Ninguno en código. `environment.qa.ts` (`http://localhost:18094/api`, `personalQaHabilitado: true`) funcionó tal cual.

## 6. Cambios Backend

Ninguno en código.
- El entorno se aprovisionó con el script oficial `docs/provision/pd01-inicializacion.sql` (catálogo de roles y permisos, idempotente, sin usuarios ni asignaciones).
- El administrador ficticio se creó con la inicialización única prevista por M1 (`PRISALY_INICIALIZACION_ADMIN*`).

## 7. Funcionalidades conectadas

| Funcionalidad | Componente | Servicio | Endpoint | DTO | Autenticación | Estado |
|---|---|---|---|---|---|---|
| Iniciar sesión de personal | `login-page.ts` → `SesionPersonalM1` | `M1PersonalApi.autenticar` | `POST /api/v1/personal/autenticar` | `{correo, password}` → `PersonalAutenticarResponse` | Pública | **Implementada y probada** [V] |
| Identidad y perfil | `SesionPersonalM1`, `dashboard-layout` | `M1PersonalApi.consultarIdentidad` | `GET /api/v1/personal/me` | → `PersonalAutenticarResponse` (`accessToken: null`) | Bearer (interceptor) | **Implementada y probada** [V] |
| Cerrar sesión de personal | `dashboard-layout.ts` | `M1PersonalApi.cerrarSesion` | `POST /api/v1/personal/cerrar-sesion` | sin cuerpo → 204 | Bearer | **Implementada y probada** [V] |
| Consultar intento | `participacion.coordinador.ts` | `ParticipacionHttpGateway.consultarIntento` | `GET /api/v1/estudiantes/intentos/{id}` | → `Intento` | Cookie de estudiante | **Implementada, pero bloqueada** [B] |
| Contenido del intento | ídem | `consultarContenidoIntento` | `GET …/intentos/{id}/contenido` | → `ContenidoIntento` | Cookie de estudiante | **Implementada, pero bloqueada** [B] |
| Guardar respuesta | ídem | `registrarRespuesta` | `PUT …/intentos/{id}/respuestas/{idPregunta}` | `{idOpcionSeleccionada, revisionEsperada}` → `RespuestaGuardada` | Cookie de estudiante + origen de confianza | **Implementada, pero bloqueada** [B] |

## 8. Funcionalidades probadas (resultado real)

Entorno: Angular `ng serve --configuration qa` en `http://localhost:4300` → API `develop` `773818c` en `http://localhost:18094/api` → PostgreSQL 16.15 aislado. Navegador: panel de navegador integrado de Claude (Chromium). Cuenta: `admin.qa@prisaly.test` (ficticia, rol `ADMINISTRADOR`, sin permisos).

| # | Prueba desde la interfaz | Petición observada | Resultado HTTP | Estado de interfaz | Resultado |
|---|---|---|---|---|---|
| 1 | Login con contraseña incorrecta | `OPTIONS` 200 + `POST /autenticar` | **401** | Mensaje "No fue posible verificar las credenciales."; permanece en `/login` | ✅ [V] |
| 2 | Login correcto | `POST /autenticar` → `GET /me` | **200**, **200** | Navega a `/dashboard`; muestra "Administrador QA"; `/me` devuelve `rol: ADMINISTRADOR`, `permisos: []`, `accessToken: null` | ✅ [V] |
| 3 | Recargar la página con sesión iniciada | — | — | El guard redirige a `/login` (el token vive solo en memoria, por diseño) | ✅ comportamiento esperado [V] |
| 4 | Navegar a "Usuarios y docentes" | — | — | Redirige a `/dashboard?aviso=permisos-pendientes` (bloqueo deliberado del Frontend) | ✅ comportamiento esperado [V] |
| 5 | Cerrar sesión | `OPTIONS` 200 + `POST /cerrar-sesion` | **204** | "Esperando confirmación…" → regresa a `/login` | ✅ [V] |

Comprobaciones complementarias de servidor (curl, no sustituyen la prueba de interfaz):

| Escenario | Resultado |
|---|---|
| `/me` con token válido → logout → `/me` con el mismo token | 200 → 204 → **401** (token invalidado: persistencia del cierre verificada) [V] |
| `/me` sin token | 401 [V] |
| `/autenticar` con correo mal formado | 400 [V] |
| 6 intentos fallidos sobre la misma cuenta | 401 ×5 → **429** con `Retry-After: 895` [V] |
| Preflight CORS desde `http://localhost:4300` | 200, `Access-Control-Allow-Origin: http://localhost:4300` [V] |

## 9. Funcionalidades pendientes

| Flujo de la orden | Estado | Causa |
|---|---|---|
| 1. Acceso al sistema (personal) | ✅ Funciona | — |
| 1b. Acceso estudiantil (DD-02) | [B] | `prisaly.m1.student-access.enabled=false`; requiere claves K-COD/K-SES QA, entrega del código por M7 (worker apagado) y **no existe cliente Angular** de `/v1/acceso-estudiante`. La activación de DD-02 es decisión de Dirección Central e Ingrid. |
| 2. Identificación y perfil | ✅ Funciona | — |
| 3. Navegación por rol | [B] parcial | El menú se muestra, pero las rutas administrativas y docentes están bloqueadas por `m1-personal-rutas-qa` hasta que exista el **mapeo oficial ruta→permiso** (decisión pendiente). No se inventó ningún mapeo. |
| 4. Gestión académica (usuarios, casos, rúbricas) | Solo demostración | El Backend expone `/v1/admin/*` y `/v1/casos/*`, pero **el Frontend no tiene servicios** para ellos. Hace falta desarrollo nuevo y el mapeo de permisos. Además, el administrador inicial **no tiene permisos** (PD-01 no asigna nada; las asignaciones pasan por el servicio auditado). |
| 5. Programación y convocatorias | Solo demostración | El Backend expone `/m4/sesiones*` y `/m4/sesiones/{id}/convocatorias`; el Frontend no tiene servicios. Requiere el permiso `GESTIONAR_SESION`. |
| 6. Participación estudiantil | [B] | Depende del punto 1b, de `provideParticipacionHttp()` (no registrado) y de datos sembrados. Crear intentos sigue sin publicarse. |
| 7. Persistencia y recuperación | Parcial | Verificada para el cierre de sesión (token invalidado). No hay más flujos persistentes conectados. |
| 8. Manejo de errores | ✅ en M1 | 400, 401 y 429 clasificados; mensaje 401 visible en la interfaz. |
| 9. Simulador | No probado aquí | Simulador 2.0 (Unreal/Pixel Streaming) es responsabilidad de Cristian y Nicolás; requiere infraestructura de señalización no disponible en esta estación. |

## 10. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `ng build` (producción) sobre `develop` `eb32d57` | ✅ exit 0. Avisos: presupuesto CSS de `simulador-integrado-page.css` superado en 66 B; módulos no ESM (`phaser`, `sdp`, `ws`). No bloquean. [V] |
| `ng test --watch=false --browsers=ChromeHeadless` | ✅ **531/531 SUCCESS** (véase el anexo A) [V] |
| Pruebas de interfaz M1 (sección 8) | 5/5 ✅ [V] |
| Pruebas de servidor M1 (sección 8) | 5/5 ✅ [V] |
| Backend: `mvnw package -DskipTests` | ✅ (sin cambios de código; la suite Backend la validó Ingrid en PR #93 [I]) |

## 11. Resultados

M1 queda **integrado y probado** desde Angular contra `develop`. M5 queda **implementado, pero bloqueado**. Las pantallas académicas siguen siendo **demostraciones honestas**: indican "Interfaz de demostración · Sin datos reales" y no simulan respuestas.

## 12. Problemas conocidos

1. **La sesión se pierde al recargar** (token en memoria). Es deliberado por seguridad (TD-M1-AUTH-PROVISIONAL), pero conviene comunicarlo en la demostración.
2. **El administrador inicial no tiene permisos académicos.** Según `PoliticaPermisos` [V, código], el rol `ADMINISTRADOR` puede asignar permisos a otros, pero no a sí mismo (`PERMISSION_SELF_ASSIGNMENT_NOT_ALLOWED`). Una demostración de casos o sesiones requeriría:
   - crear un docente ficticio con `POST /v1/admin/docentes`;
   - asignarle permisos con `PUT /v1/admin/usuarios/{id}/permisos/{idPermiso}`.

   Ninguna de las dos operaciones tiene todavía interfaz en Angular.
3. **El puerto 4200 suele estar ocupado** por otro `ng serve`. Este documento usa 4300 y la API admite ambos orígenes en `CORS_ORIGINS`.
4. **Puerto QA:** Angular `qa` usa **18094**; el entorno de Ingrid usó 18097. En local basta con arrancar la API en 18094.
5. `prisaly-qa-respaldo.dump` (worktree `PRISALY-Backen-QA`) **no está en `.gitignore`**: no ejecutar `git add .` allí.

## 13. Instrucciones para el siguiente integrante

Requisitos: Git, Node 24 + npm 11, Java 21, Docker Desktop.

```bash
# 1. Descargar
git -C PRISALY-Front fetch origin && git -C PRISALY-Front switch develop && git -C PRISALY-Front pull --ff-only
git -C PRISALY-Backen fetch origin && git -C PRISALY-Backen switch develop && git -C PRISALY-Backen pull --ff-only

# 2. PostgreSQL QA aislado (la contraseña es local y ficticia; NUNCA se commitea)
docker volume create prisaly-postgres-int50-data
docker run -d --name prisaly-postgres-int50 -e POSTGRES_DB=prisaly_int50 -e POSTGRES_USER=prisaly \
  -e POSTGRES_PASSWORD=<clave-local-ficticia> -p 127.0.0.1:5434:5432 \
  -v prisaly-postgres-int50-data:/var/lib/postgresql/data postgres:16.15

# 3. Backend (primer arranque: Flyway crea el esquema)
cd PRISALY-Backen && ./mvnw -DskipTests package
export DATABASE_URL="jdbc:postgresql://127.0.0.1:5434/prisaly_int50?sslmode=disable"
export DATABASE_USER=prisaly DATABASE_PASSWORD=<clave-local-ficticia>
export APP_PORT=18094 CORS_ORIGINS="http://localhost:4200,http://localhost:4300"
java -jar app/target/app-0.0.1-SNAPSHOT.jar          # esperar "Started PrisalyApplication"; detener

# 4. Catálogo PD-01 (idempotente) y administrador ficticio (una sola vez)
docker exec -i prisaly-postgres-int50 psql -U prisaly -d prisaly_int50 < docs/provision/pd01-inicializacion.sql
# archivo de una línea con una contraseña ficticia, FUERA de los repositorios:
export PRISALY_INICIALIZACION_ADMIN=true PRISALY_INICIALIZACION_ADMIN_CORREO=admin.qa@prisaly.test \
  PRISALY_INICIALIZACION_ADMIN_NOMBRE="Administrador QA" PRISALY_INICIALIZACION_ADMIN_ARCHIVO=/ruta/fuera/admin.pass
java -jar app/target/app-0.0.1-SNAPSHOT.jar          # log: INICIALIZACION resultado=EXITOSO
# reiniciar después SIN las variables PRISALY_INICIALIZACION_ADMIN*

# 5. Frontend
cd PRISALY-Front && npm ci
npx ng serve --configuration qa --host localhost --port 4300
# abrir http://localhost:4300/login
```

Importante: Angular y la API deben usar el mismo nombre de host (`localhost`), no mezclar `localhost` con `127.0.0.1`.

---

## Anexo A — Suite Angular

Comando: `node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless` (Chrome Headless 157), sobre `develop` `eb32d57`.

| Ejecución | Resultado |
|---|---|
| Completa n.º 1 | Desconexión en 300/531 ("no message in 30000 ms"); el equipo estaba bajo carga (API, `ng serve` y la compilación ejecutándose a la vez) |
| Solo specs fuera de `features/simulador` | **225/225 SUCCESS**, exit 0 |
| Solo specs de `features/simulador` | **306/306 SUCCESS**, exit 0 |
| Completa n.º 2 | **531/531 SUCCESS** |

Conclusión: no hay pruebas fallidas. La desconexión de la primera ejecución fue intermitente (tiempo de espera de Karma bajo carga) y no se reprodujo. Respecto a la línea base anterior (397), las 134 pruebas nuevas corresponden a Simulador02.
