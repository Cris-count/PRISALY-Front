# DC-FE-54 — Entrega para revisión de Codex

Fecha: 2026-11-21. Autoría técnica: Claude, para Mariana (Frontend Angular 22).

No se hizo commit, push, PR ni merge.

## A. Identificación

- **Worktree:** `PRISALY-Front-54`. Es nuevo y no comparte archivos de trabajo con otros worktrees.
- **Rama:** `feature/fe-54-navegacion-contenido-m3`.
- **SHA base:** `15cf6ae017232b36bad7f9659075bc0254f422bf`. HEAD sigue igual: no hay commits.
- **Estado Git:** 7 archivos modificados, 6 de código nuevos y 4 documentos nuevos. No hay archivos eliminados.
- **`origin/develop` Frontend:** `15cf6ae` según el `git fetch origin` del inicio. **Repetir el `fetch` antes de publicar.**
- **Backend:** `origin/develop` en `773818caf62758d66019a71dac6508d13148abad`, sin avances desde FE-53.

## B. Inventario

**Archivos nuevos de código:**

| Archivo | Propósito |
| --- | --- |
| `src/app/features/autenticacion/m1-mapeo-rutas.ts` | Mapeo oficial ruta–permiso (`aprobado: null` en todas las rutas), `decidirRuta`, token `MAPEO_RUTAS_PERSONAL` y textos de aviso |
| `src/app/features/autenticacion/aviso-acceso-personal.ts` | Aviso en `/dashboard` con el motivo de la redirección y los permisos efectivos de `/me` |
| `src/app/features/autenticacion/m1-mapeo-rutas.spec.ts` | Pruebas del mapeo, el guard y el aviso (mapeo aprobado **simulado**) |
| `src/app/features/academico/panel-contenido-m3.ts` y `.html` | Panel de contenido M3 |
| `src/app/features/academico/contenido-m3.spec.ts` | Pruebas de API, interceptor y panel de contenido (HTTP simulado) |

**Archivos modificados:**

| Archivo | Cambio |
| --- | --- |
| `academico/casos-m3.api.ts` | Interfaces de contenido ampliadas con campos opcionales, lectura de opciones, `agregarEscenario`, `agregarPregunta`, `agregarOpcion` y `postContenido` |
| `academico/academico-http.ts` | Tres rutas `POST` de contenido añadidas a la lista cerrada |
| `autenticacion/m1-personal-rutas-qa.ts` | `requiereMapeoPersonalQa` consulta el mapeo; el resultado no cambia mientras no haya aprobaciones |
| `dashboard/dashboard-docente.ts` y `.html` | `<app-panel-contenido-m3 />` bajo `<app-panel-casos-m3 />` |
| `dashboard/dashboard-inicio.ts` y `.html` | `<app-aviso-acceso-personal />` al inicio de `.pagina` |

**Documentación nueva** (`docs/integracion-54/`):
- `DC-FE-MARIANA-INCREMENTO-54-AVANCE-01.md`
- `DC-FE-54-MATRIZ-RUTAS-PERMISOS.csv`
- `DC-FE-54-DEPENDENCIAS-LISTADOS.md`
- `DC-FE-54-ENTREGA-PARA-CODEX.md`

**Archivos ajenos preservados:**
- **Worktrees** `PRISALY-Front`, `-53`, `-53-BASE`, `-INT` y `-QA-01`.
- **Backend** (todos sus worktrees).
- **Simulador, Phaser y Unreal/Pixel Streaming.**
- **Narrativa, M5 y DD-02.**
- **Un `ng serve`** de `PRISALY-Front` en ejecución, que no se detuvo.

**Temporal ya eliminado:** el worktree `PRISALY-Front-54-BASE-TMP` (comparación de la línea base). Se borró primero el enlace a `node_modules` y después el worktree.

## C. Desarrollo

**Navegación y permisos.**
- El guard deja de tener un bloqueo fijo y consulta `MAPEO_RUTAS_PERSONAL`.
- Con el mapeo oficial vigente (todo `null`), cualquier ruta de personal redirige a `/dashboard?aviso=permisos-pendientes`, igual que antes. La prueba previa `m1-personal-rutas-qa.spec.ts` sigue pasando sin cambios.
- Cuando haya aprobación, basta con completar `aprobado: { permisos: [...] }` en `MAPEO_RUTAS_PERSONAL_OFICIAL`.
- `decidirRuta` nunca autoriza:
  - por omisión;
  - por un requisito vacío;
  - por rol;
  - por `permisosBackend`, que es solo informativo.
- Sin el permiso aprobado, la redirección es a `aviso=permiso-insuficiente`.
- **Pendiente:** la administración M1 exige el rol `ADMINISTRADOR`, que el mapeo no expresa a propósito. Debe decidirlo Dirección Central.

**Contenido M3.**
- Se usa solo `GET /contenido`, que devuelve el agregado completo con un único ETag.
- Las tres altas usan cuerpos cerrados, idénticos a `CasoContenidoRequest`.
- El identificador UUID lo genera el cliente y se exige que el 201 devuelva el mismo.
- No hay edición, eliminación ni listado de contenido porque no existen en el Backend.
- **Escenarios:** `titulo`, `contexto` e `instrucciones` son opcionales y `orden` es un entero obligatorio.
- **Preguntas:** `enunciado` es obligatorio; `textoAyuda` es opcional y `orden` es obligatorio.
- **Opciones:** `texto`, `explicacion` y `esCorrecta` son obligatorios, igual que `orden`.

**Estados y errores.**
- El panel cubre carga, sin sesión, sin datos y éxito.
- Éxito solo se muestra si el elemento aparece al releer del servidor.
- Errores cubiertos: 400, 401, 403, 404, 409 (por código), 412, 428 y 5xx.

**Concurrencia.** Los datos mostrados y el ETag siempre vienen de la misma respuesta, y tras cada alta se relee el contenido.
- No se usa el ETag del 201 con datos anteriores.
- **412 o 428:** se bloquean las altas hasta recargar.
- **Alta aplicada pero relectura fallida:** también se bloquean las altas.
- **Rúbricas:** la corrección de `PanelRubricaM3` se conserva sin cambios.

**Listados.** Ver `DC-FE-54-DEPENDENCIAS-LISTADOS.md`. No hay consultas masivas, y el store de sesión se rotula como «no es un listado del servidor».

## D. Validación

**Comandos ejecutados** (secuenciales, `NODE_OPTIONS=--max-old-space-size=3072`):
- `git fetch origin` en los dos repositorios.
- `npx ng test --watch=false` (suite completa).
- `npx ng test --watch=false --include=<spec>` (pruebas dirigidas).
- `npx ng build` y `npx ng build --configuration qa`.
- `npx tsc -p tsconfig.app.json --noEmit` y `npx tsc -p tsconfig.spec.json --noEmit`.
- `npx prettier --check --end-of-line auto <archivos modificados y nuevos>`.
- `npm run check:urls` y `git diff --check`.

**Resultados:** ver el anexo A del avance y la sección G.

**Línea base `15cf6ae` sin cambios:** 574/576. Las dos fallas son timeouts del dashboard público.

**Pruebas dirigidas FE-54** (académico y autenticación): 215/215, salida 0, antes de la corrección ERR-54-01.

**Error encontrado y corregido (ERR-54-01).**
- **Síntoma:** la prueba «todas las vistas se adaptan a 1440px» fallaba siempre en FE-54. El banner de inicio medía 213,55 px y el máximo permitido es 200 px.
- **Comprobación:** en la base `15cf6ae` aislada, ese archivo pasaba 38/38.
- **Causa:** el elemento anfitrión vacío del aviso ocupaba una celda de la rejilla de `.pagina`.
- **Corrección:** `:host { display: contents; }`.
- **Después:** 38/38 en dos corridas aisladas.

**QA real:** prueba en Karma contra la API QA aislada, **1/1, salida 0**. La traza completa está en la sección 16 del avance.
- **Operaciones reales:** caso, escenario, pregunta y opción, con persistencia comprobada al releer.
- **Concurrencia:** 412 real sin sobrescritura, recarga y reintento.
- **Errores:** 428, 400, 409, 404 (dos casos), 403 y 401.
- **Guard real:** con sesión válida redirige a permisos pendientes.
- **Evidencias** en `INTEGRACION-54-EVIDENCIAS/`, fuera del repositorio.

**Bloqueos:**
- BLQ-53-01 (mapeo).
- Listados.
- Edición y eliminación de contenido.
- D-05 y OBS-53-01.

**Entorno:**
- El equipo trabajó con muy poca memoria (137 MB libres).
- PostgreSQL tuvo timeouts de autenticación y la API devolvió 500 por conexiones cerradas en Hikari. El primer intento real falló por eso, no por credenciales ni por Angular.
- La cuenta `docente.bruno` (semilla pública) autentica con 200.
- La credencial local `docente.pass` dio 500 en el mismo periodo de degradación, así que el resultado no es concluyente.

## E. Seguridad

- **Guards:**
  - No se desactivó ninguno.
  - Ninguna ruta tiene aprobación.
  - No hay elevación por rol: se prueba con el rol `ADMINISTRADOR` y todos los permisos.
- **Permisos:** no se inventó ninguno. `permisosBackend` es informativo y no se usa para decidir.
- **Interceptores:** `personalM1Interceptor` no se tocó. `personalAcademicoInterceptor` añade solo:
  - `POST v1/casos/{uuid}/escenarios`;
  - `POST v1/casos/{uuid}/escenarios/{uuid}/preguntas`;
  - `POST v1/casos/{uuid}/preguntas/{uuid}/opciones`.
- **Lo que sigue excluido del interceptor** (probado): las lecturas parciales, PUT, DELETE y la narrativa.
- **Registro del interceptor:** sigue siendo exclusivo de `personalQaHabilitado`.
- **Sesiones y tokens:** no hay cambios. El token permanece en memoria.
- **Aviso de acceso:** muestra solo los códigos de permiso de `/me` y nunca el token. Los valores desconocidos de `?aviso=` no se muestran.
- **Datos sensibles:**
  - En `src`, `docs` y evidencias no hay contraseñas, tokens reales, respaldos ni `.dump`.
  - Las pruebas usan `token-de-prueba-no-real` y correos `example.invalid`.
  - La prueba real usó la semilla pública del Backend desde un archivo temporal excluido, ya eliminado.
- **Archivos excluidos de la publicación:**
  - `INTEGRACION-54-EVIDENCIAS/`.
  - `[directorio local de credenciales QA]`, que contiene credenciales QA locales.
  - `src/qa-int/`, ya inexistente y excluido en `.git/info/exclude`.
  - `prisaly-qa-respaldo.dump` del Backend.

## F. Propuesta de publicación

**Commit 1, código y pruebas:**
- `src/app/features/academico/academico-http.ts`
- `src/app/features/academico/casos-m3.api.ts`
- `src/app/features/academico/panel-contenido-m3.ts`
- `src/app/features/academico/panel-contenido-m3.html`
- `src/app/features/academico/contenido-m3.spec.ts`
- `src/app/features/autenticacion/m1-mapeo-rutas.ts`
- `src/app/features/autenticacion/m1-mapeo-rutas.spec.ts`
- `src/app/features/autenticacion/aviso-acceso-personal.ts`
- `src/app/features/autenticacion/m1-personal-rutas-qa.ts`
- `src/app/features/dashboard/dashboard-docente.ts`
- `src/app/features/dashboard/dashboard-docente.html`
- `src/app/features/dashboard/dashboard-inicio.ts`
- `src/app/features/dashboard/dashboard-inicio.html`

Mensaje propuesto:

```text
feat(academico): integrar contenido M3 y preparar mapeo ruta-permiso

- Panel de contenido: escenarios, preguntas y opciones con If-Match y relectura
- CasosM3Api: altas de contenido con cuerpos cerrados y verificación de id
- Interceptor: tres rutas POST de contenido en la lista cerrada
- Guard de personal basado en MAPEO_RUTAS_PERSONAL (sin aprobaciones: BLQ-53-01)
- Aviso de acceso con permisos efectivos reales
```

**Commit 2, documentación:** todo `docs/integracion-54/`.

```text
docs(integracion-54): avance FE-54, matriz ruta-permiso y dependencias de listados
```

No se ejecutó ningún commit.

## G. Estado final

**LISTO PARA REVISIÓN DE CODEX**

Justificación:
- **Verificación local completa:** suite 618/618 con salida 0, builds de producción y QA, TypeScript, Prettier, URLs y `git diff --check` en verde.
- **Prueba real:** 1/1 contra el QA aislado, con persistencia y concurrencia comprobadas.
- **Regresión corregida:** ERR-54-01 se detectó y se corrigió antes de entregar.
- **Seguridad:** no se desactivó ningún guard, no se inventaron permisos ni endpoints y no se modificó el Backend.
- **Bloqueo externo:** la navegación real sigue bloqueada por BLQ-53-01, que no depende de este código. El mecanismo queda listo para recibir el mapeo oficial sin rehacer componentes.

Codex debe revisar en particular:
1. Que `decidirRuta` y el guard no autoricen en ningún caso sin aprobación.
2. Las tres rutas nuevas del interceptor.
3. Que el panel nunca combine el ETag del 201 con datos antiguos.
4. La regla `display: contents` del aviso y su efecto en el layout.
5. Repetir el `fetch` antes de publicar.
