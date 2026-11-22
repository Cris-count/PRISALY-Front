# DC-FE-53 — ENTREGA PARA CODEX

**Incremento:** DC-FE-MARIANA-CONTINUIDAD-FUNCIONAL-53 · **Ejecutor:** Claude · **Fecha:** 2026-11-21
**Restricción cumplida:** no se ejecutó ningún commit, push, PR ni merge.

---

## A. Identificación

| Campo | Valor |
|---|---|
| Repositorio | `https://github.com/Cris-count/PRISALY-Front` |
| Worktree | `C:\Users\57316\OneDrive\Escritorio\PRISALY\PRISALY-Front-53` |
| Rama | `feature/fe-53-integracion-academica` (local; no publicada) |
| SHA base | `d0bd0c916e3fe2f4173f7cc2e3a08c37257e0dd8` (`origin/develop`, incluye el PR #15) |
| SHA actual | `d0bd0c9` (sin commits; los cambios están en el árbol de trabajo) |
| Estado Git | 9 archivos modificados y 21 archivos nuevos (sección B) |
| Relación con `origin/develop` | 0 commits por delante y 0 por detrás (`git fetch` al cierre: `origin/develop` sigue en `d0bd0c9`) |
| Backend de referencia | `PRISALY-Backen` `develop` `773818caf62758d66019a71dac6508d13148abad`, **sin modificar** |

## B. Archivos

**Nuevos (21):**
```
src/app/features/academico/academico-http.ts
src/app/features/academico/administracion-m1.api.ts
src/app/features/academico/casos-m3.api.ts
src/app/features/academico/sesiones-m4.api.ts
src/app/features/academico/casos-sesion.store.ts
src/app/features/academico/panel-academico.css
src/app/features/academico/panel-administracion-m1.ts
src/app/features/academico/panel-administracion-m1.html
src/app/features/academico/panel-casos-m3.ts
src/app/features/academico/panel-casos-m3.html
src/app/features/academico/panel-rubrica-m3.ts
src/app/features/academico/panel-rubrica-m3.html
src/app/features/academico/panel-sesiones-m4.ts
src/app/features/academico/panel-sesiones-m4.html
src/app/features/academico/panel-convocatorias-m4.ts
src/app/features/academico/panel-convocatorias-m4.html
src/app/features/academico/academico-http.spec.ts
src/app/features/academico/academico-apis.spec.ts
src/app/features/academico/paneles-academicos.spec.ts
docs/integracion-53/DC-FE-MARIANA-CONTINUIDAD-53-AVANCE-01.md
docs/integracion-53/DC-FE-53-MATRIZ-INTEGRACION.csv
```
Este documento (`docs/integracion-53/DC-FE-53-ENTREGA-PARA-CODEX.md`) también es nuevo. Su inclusión en el repositorio queda a criterio de Codex.

**Modificados (9; +30/−5):**
```
src/app/app.config.ts                                     (+6/−1: registra personalAcademicoInterceptor bajo personalQaHabilitado)
src/app/features/dashboard/dashboard-administracion.ts   (+2/−1: import del panel)
src/app/features/dashboard/dashboard-administracion.html (+1: <app-panel-administracion-m1 />)
src/app/features/dashboard/dashboard-docente.ts          (+11/−1: imports de PanelCasosM3 y PanelRubricaM3)
src/app/features/dashboard/dashboard-docente.html        (+4: paneles de casos y rúbrica tras la cabecera)
src/app/features/dashboard/dashboard-sesiones.ts         (+2/−1)
src/app/features/dashboard/dashboard-sesiones.html       (+1)
src/app/features/dashboard/dashboard-convocatorias.ts    (+2/−1)
src/app/features/dashboard/dashboard-convocatorias.html  (+1)
```
Los `.html` y `.ts` del dashboard conservan CRLF: las líneas insertadas se normalizaron a CRLF y el diff es solo de contenido.

**Eliminados:** ninguno.

**Trabajo preexistente preservado:**
- **Worktrees sin tocar:**
  - `PRISALY-Front` (con su `M dashboard-seccion.html`);
  - `PRISALY-Front-QA-01` (con `M docs/configuracion-api.md` y `?? docs/integracion-qa-01/`);
  - `PRISALY-Front-INT`;
  - `PRISALY-Backen`;
  - `PRISALY-Backen-QA` (con `?? prisaly-qa-respaldo.dump`).
- **No se tocó:** simulador (`features/simulador/**`, Phaser, Unreal, Pixel Streaming), gateway M5, autenticación M1 (`m1-personal-*`), guards, rutas, entornos ni `package.json`.

**Fuera del repositorio (no publicar):**
- `C:\Users\57316\OneDrive\Escritorio\PRISALY\INTEGRACION-53-EVIDENCIAS\`: traza de la prueba real y código de la prueba temporal, sin credenciales.
- `C:\Users\57316\.prisaly-qa-int50\`: credenciales QA locales y script de arranque. **Nunca deben publicarse.**
- `.git/info/exclude` contiene `src/qa-int/` (carpeta temporal ya eliminada). Es una exclusión local, no versionada.

## C. Implementación

### FE-53-A — Administración M1
- **Funciona [REAL]:**
  - `GET roles` y `GET permisos`.
  - `GET` de permisos efectivos.
  - `PUT` de asignación (200 / 409 duplicada / 403 por separación de funciones).
  - `DELETE` de revocación (204).
  - `POST` de alta de docente (201 / 409 `DUPLICATE_EMAIL`).
  - El componente presenta el catálogo real y bloquea la autoasignación de `PUBLICAR_CASO`/`ARCHIVAR_CASO`.
- **Parcial:** no existe listado de usuarios en el Backend, así que el UUID se introduce o se toma del alta.
- **Bloqueado:**
  - navegación real (mapeo ruta→permiso);
  - D-05: el docente creado no puede iniciar sesión.

### FE-53-B — Casos M3
- **Funciona [REAL]:**
  - Creación en `BORRADOR` y relectura.
  - Detalle con ETag.
  - PATCH con If-Match (204, 412 `STALE_CASE`, 400).
  - 404 de caso inexistente.
  - Publicación (409 `CASE_INCOMPLETE`, 200 `PUBLICADO`, 409 `ALREADY_PUBLISHED`).
  - El componente crea desde el formulario y relee del servidor.
- **Parcial:**
  - Sin listado de casos en M3: se usa una memoria de sesión por identidad.
  - La interfaz edita título y tiempo; historia y desarrollo solo se envían en la creación.
- **Bloqueado:**
  - navegación real;
  - contenido del caso sin interfaz (incremento propio).

### FE-53-C — Rúbricas M3
- **Funciona [REAL]:**
  - Lectura (404 `RUBRIC_NOT_FOUND` interpretado como "sin rúbrica").
  - Contenido con sus preguntas.
  - PUT con If-Match (200 con ETag nuevo; 400 de validación; **412 sin sobrescritura**).
  - Relectura persistida.
  - El componente muestra la rúbrica y las preguntas reales.
- **Parcial:** el 428 solo está cubierto con doble HTTP; el servicio nunca envía sin If-Match.
- **Bloqueado:** navegación real.

### FE-53-D — Sesiones M4
- **Funciona [REAL]:**
  - Crear (201; 409 `M4-CASO-NO-PUBLICADO` con un caso en borrador).
  - Listar, consultar y editar con relectura.
  - Transiciones `SinIniciar → EnCurso → Finalizado` (200) e inválida (409 `M4-OPERACION-NO-PERMITIDA`).
  - El componente lista la sesión real.
- **Bloqueado:** navegación real.

### FE-53-E — Convocatorias M4
- **Funciona [REAL]:**
  - Convocar al estudiante QA (201 `Autorizado`).
  - Duplicada (409), estudiante inexistente (409) y sesión iniciada (409).
  - Listado con relectura.
  - El componente muestra la convocatoria real.
- **Parcial:** sin listado de estudiantes en M4; el UUID se introduce.
- **Bloqueado:** navegación real.

## D. Validación

| Comando | Resultado |
|---|---|
| `node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless` (final, secuencial) | **576/576 SUCCESS**, exit 0, **0 fallidas** |
| Ámbito `academico`, `dashboard` y `autenticacion` (2 ejecuciones, orden aleatorio) | 232/232 y 232/232 |
| `ng build` (producción) | exit 0. Avisos preexistentes del simulador: presupuesto CSS de 66 B, `phaser`/`sdp`/`ws` no ESM |
| `ng build --configuration qa` | exit 0 |
| `npx tsc -p tsconfig.app.json --noEmit` / `tsconfig.spec.json` | exit 0 / exit 0 |
| `npx prettier --check --end-of-line auto` (archivos tocados) | Sin incidencias |
| `npm run check:urls` | Sin URLs de backend codificadas |
| **Regresión M1** | Suite completa en verde. Login, `/me` y cierre reales con 3 actores; login del docente en la app real → dashboard |
| **Prueba real Frontend–Backend** (Karma temporal, API QA aislada) | 2/2 SUCCESS (recorrido completo y negativos). Traza HTTP en `INTEGRACION-53-EVIDENCIAS/prueba-real-karma.log` |
| Navegación real (app `ng serve --configuration qa`) | El docente inicia sesión; "Casos académicos" redirige a `/dashboard?aviso=permisos-pendientes` (guard sin cambios) |

Nota de entorno: una regresión lanzada a la vez que `ng serve` agotó el heap de Node. Se repitió en secuencia con 4 GB y pasó completa.

## E. Riesgos

- **Conflictos posibles:**
  - Bajo riesgo: `develop` no avanzó.
  - Los 4 componentes del dashboard y `app.config.ts` son archivos compartidos con cambios mínimos (import y una etiqueta tras la cabecera). Si Codex u otra rama modifica esas cabeceras, el conflicto sería trivial.
- **Contratos pendientes:**
  - `DC-BE-CONTRATOS-DISPONIBLES-FE.md` sigue sin estar en la estación; los DTO salen del código `773818c`.
  - No hay listados de casos, usuarios ni estudiantes.
- **Permisos pendientes:**
  - Mapeo ruta→permiso (BLQ-53-01).
  - OBS-53-01: autoasignación de `CREAR_CASO` → 200 con `habilitado=false`.
- **Dependencias Backend:**
  - D-05: credencial del docente.
  - Contenido de caso (endpoints existentes, sin interfaz FE-53).
  - Prueba real ejecutada con las semillas oficiales de QA del Backend.
- **Simulador:** no se tocó ningún archivo del PR #14. El build mantiene sus avisos preexistentes.
- **Transporte:** `personalAcademicoInterceptor` solo actúa con `personalQaHabilitado` (entorno `qa`). En producción (`environment.ts`) no se registra, igual que el interceptor M1, así que en producción los paneles mostrarán "Inicia sesión de personal". Es coherente con la línea base, pero conviene confirmarlo con Dirección Central antes de un despliegue.

## F. Recomendación de publicación

**Commit 1 (código y pruebas), incorporable:**
```
src/app/features/academico/*            (19 archivos)
src/app/app.config.ts
src/app/features/dashboard/dashboard-{administracion,docente,sesiones,convocatorias}.{ts,html}
```
Mensaje propuesto (no ejecutado):
```
feat(academico): integrar administración M1, casos/rúbricas M3 y sesiones/convocatorias M4

- Servicios tipados AdministracionM1Api, CasosM3Api (ETag/If-Match) y SesionesM4Api.
- Transporte Bearer acotado (personalAcademicoInterceptor) bajo opt-in QA.
- Paneles conectados en las pantallas existentes, sin cambiar guards ni autenticación.
- 45 pruebas nuevas; suite 576/576.
```

**Commit 2 (documentación), incorporable:**
```
docs/integracion-53/DC-FE-MARIANA-CONTINUIDAD-53-AVANCE-01.md
docs/integracion-53/DC-FE-53-MATRIZ-INTEGRACION.csv
```
Mensaje propuesto: `docs(integracion-53): avance FE-53 y matriz de integración M1/M3/M4`

**Deben permanecer fuera del repositorio:**
- `INTEGRACION-53-EVIDENCIAS/`
- `C:\Users\57316\.prisaly-qa-int50\`
- cualquier `src/qa-int/` (ya eliminado)
- `prisaly-qa-respaldo.dump`

**A criterio de Codex:** este documento de entrega.

## G. Estado final

**LISTO PARA REVISIÓN DE CODEX**

Justificación:
- El código compila (producción y QA) y la suite completa pasa (576/576, 0 fallidas).
- Prettier y TypeScript están limpios en los archivos tocados.
- No hay secretos ni respaldos en el árbol.
- No se modificaron Backend, simulador, autenticación ni guards.
- Todas las operaciones autorizadas se probaron contra el Backend real desde los servicios y componentes Angular, con persistencia verificada.

Lo que **no** se declara:
- Que la navegación real funcione: sigue bloqueada por el mapeo ruta→permiso pendiente (BLQ-53-01).
- Que la aceptación de Dirección Central esté cumplida: requiere el mapeo, la decisión sobre D-05 y la confirmación de OBS-53-01.
