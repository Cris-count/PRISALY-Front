# DC-FE-55 · Entrega para revisión independiente de Codex

- **Fecha:** 2026-11-22.
- **Incremento:** FE-55, recorrido docente.
- **Publicación:** nada publicado. No hay commits, push, PR ni merge.

## Worktree, rama y base

| Dato          | Valor                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Worktree      | `PRISALY-Front-55`                                                          |
| Rama          | `feature/fe-55-recorrido-docente`, sin upstream configurado                                                            |
| Base          | `9df44cc967880f95d200ceccb61d20f74c66051c`, igual a `origin/develop` y al SHA aprobado                                 |
| Backend       | `773818caf62758d66019a71dac6508d13148abad`, sin modificaciones                                                         |
| Estado de Git | HEAD en la base. 14 archivos modificados, 3 archivos de código sin seguimiento y `docs/integracion-55/` (5 documentos) |

## Inventario de cambios

**Archivos nuevos**

- `src/app/features/academico/contexto-recorrido.ts` (55 líneas): `ParametroRecorrido`, `PARAM_CASO`, `PARAM_SESION` y `uuidDeParametro`.
- `src/app/features/academico/recorrido-docente.ts` (161 líneas): componente `app-recorrido-docente` y `PASOS_RECORRIDO`.
- `src/app/features/academico/recorrido-docente.spec.ts`: 24 pruebas.

**Archivos modificados**

| Archivo                                                                                        | Líneas (+/−)          |
| ---------------------------------------------------------------------------------------------- | --------------------- |
| `panel-casos-m3.ts`                                                                            | +24                   |
| `panel-casos-m3.html`                                                                          | +3                    |
| `panel-contenido-m3.ts`                                                                        | +40/−3                |
| `panel-contenido-m3.html`                                                                      | +10                   |
| `panel-rubrica-m3.ts`                                                                          | +14/−1                |
| `panel-sesiones-m4.ts`                                                                         | +76/−6                |
| `panel-sesiones-m4.html`                                                                       | +12/−3                |
| `panel-convocatorias-m4.ts`                                                                    | +38/−11               |
| `dashboard-docente.ts`, `dashboard-sesiones.ts`, `dashboard-convocatorias.ts` y sus plantillas | 1 o 2 líneas cada uno |

**Documentos**

- `DC-FE-MARIANA-55-AVANCE-01.md`
- `DC-FE-55-MATRIZ-RECORRIDO-DOCENTE.csv`
- `DC-FE-55-MATRIZ-RUTAS-PERMISOS.csv`
- `DC-FE-55-SOLICITUDES-BACKEND.md`
- Este documento.

## Contratos utilizados

Todos existían en `773818c` y en FE-53/FE-54. No se añadió ninguno.

| Módulo | Contratos                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1     | `POST /v1/personal/autenticar`, `GET /v1/personal/me`                                                                                                                                                                                                                          |
| M3     | `POST /v1/casos`, `GET /v1/casos/{id}`, `POST /v1/casos/{id}/publicar` (If-Match), `GET /v1/casos/{id}/contenido`, `POST .../escenarios`, `POST .../escenarios/{id}/preguntas`, `POST .../preguntas/{id}/opciones` (If-Match), `GET` y `PUT /v1/casos/{id}/rubrica` (If-Match) |
| M4     | `POST` y `GET /m4/sesiones`, `GET /m4/sesiones/{id}`, `GET` y `POST /m4/sesiones/{id}/convocatorias`                                                                                                                                                                           |

La lista cerrada del interceptor académico no cambió.

## Cambios funcionales

1. **Continuidad `?caso=` / `?sesion=`.**
   - Cada panel refleja en la URL el identificador que acaba de leer del servidor y consulta el que llega por URL.
   - El panel de sesiones no consulta M3: solo rellena el campo si el usuario no lo ha editado.
2. **`app-recorrido-docente`.**
   - Enlaces a las 5 etapas, que conservan solo UUID válidos.
   - Se muestra solo con sesión válida y tiene `display: contents`, para no alterar la rejilla de las pantallas de presentación.
3. **Contenido.** Bloquea las altas (`estadoDesactualizado`) cuando `CasosSesionStore` registra, desde otro panel, un estado distinto del mostrado. Además, observaciones de opción correcta única y requisitos de publicación.
4. **Casos.** Indica el siguiente paso según el estado.
5. **Sesiones.** Separa los casos publicados de los no publicados. Incorpora `MENSAJES_M4` y `mensajeM4`, también usados en convocatorias.
6. **Rúbrica.** Corrige un texto con caracteres dañados en el mensaje de conflicto.

## Pruebas: comandos y salidas

Ejecutadas de una en una, nunca en paralelo. Los registros están en `PRISALY/INTEGRACION-55-EVIDENCIAS/`.

| Comando                                                                                              | Salida                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npx ng test --watch=false --browsers=ChromeHeadless` (línea base, sin cambios)                      | 618/618 SUCCESS, exit 0                                                                                      |
| `npx ng test … --include src/app/features/academico --include …/autenticacion --include …/dashboard` | 298/298 SUCCESS, exit 0 (regresión FE-53 y FE-54 más FE-55)                                                  |
| `npx ng test --watch=false --browsers=ChromeHeadless` (suite completa)                               | **642/642 SUCCESS, exit 0**                                                                                  |
| `npx ng build`                                                                                       | exit 0; solo las advertencias previas del simulador (phaser, sdp y ws no ESM; presupuesto CSS del simulador) |
| `npx ng build --configuration qa`                                                                    | exit 0                                                                                                       |
| `npx tsc -p tsconfig.app.json --noEmit`                                                              | exit 0                                                                                                       |
| `npx tsc -p tsconfig.spec.json --noEmit`                                                             | exit 0                                                                                                       |
| `npm run check:urls`                                                                                 | exit 0                                                                                                       |
| `git diff --check`                                                                                   | exit 0                                                                                                       |
| `npx prettier --check --end-of-line auto` (código y documentos)                                      | exit 0 tras formatear los documentos                                                                         |
| Prueba real `src/qa-int/recorrido-real-fe55.spec.ts` (temporal, ya eliminada)                        | 1/1 SUCCESS, exit 0, tras 4 ejecuciones fallidas por defectos de la propia prueba (documentadas)             |

## Seguridad

- **Guards y permisos:**
  - No se tocaron los guards ni `MAPEO_RUTAS_PERSONAL_OFICIAL`: todas las rutas siguen con `aprobado: null`.
  - No se añadieron permisos ni roles.
  - Hay una prueba de que cada destino del recorrido sigue protegido, y otra de redirección con sesión docente simulada.
- **Parámetros de URL:**
  - Solo se aceptan UUID; cualquier otro valor se ignora, y una prueba confirma que no genera HTTP.
  - Los enlaces descartan cualquier otro parámetro, por ejemplo `token`.
- **Datos:**
  - Sin `localStorage`, `sessionStorage`, IndexedDB ni cookies.
  - Sin datos de demostración presentados como reales: el estado del caso se rotula «última lectura del servidor».
- **Revisión de secretos** (`revision-seguridad.log`): la única coincidencia es la contraseña simulada `solo-prueba` de una prueba unitaria, el mismo patrón que las pruebas existentes.
- **Archivos temporales:** la clave de la semilla pública y el identificador del estudiante QA solo estuvieron en `src/qa-int/credenciales.local.ts`, que ya está eliminado.

## Evidencias de QA

- **Recorrido real completo,** etapas 1 a 7, con persistencia verificada por relectura en la API y en la base QA.
  - Caso `7d1a6986-18e8-437c-b271-7464a46f086e`: Publicado, con `fechaBloqueoAcademico` marcada.
  - Sesión `329604ec-f349-48a3-b3dd-ed4120ff1fd0`.
  - Una convocatoria y un rechazo 409 `M4-CONVOCATORIA-DUPLICADA` al repetirla.
- **412 `STALE_CASE` real** al publicar con una versión anterior, sin sobrescritura, seguido de una publicación correcta tras releer.
- **Guard:** las 4 rutas del recorrido redirigen a `permisos-pendientes` con la sesión docente real.
- **Archivos:** `traza-real-fe55.txt`, `relectura-bd.txt` y `prueba-real-karma-4.log`.

## Bloqueos

| Bloqueo                            | Situación            |
| ---------------------------------- | -------------------- |
| BLQ-53-01                          | Navegación bloqueada |
| SOL-55-02                          | Rol ADMINISTRADOR    |
| D-05                               | Cuentas docentes     |
| OBS-53-01                          | Pendiente            |
| Listados                           | Inexistentes         |
| Edición y eliminación de contenido | No hay contrato      |

El detalle está en `DC-FE-55-SOLICITUDES-BACKEND.md`.

## Archivos que deben excluirse

- `node_modules`: es una unión hacia `PRISALY-Front-54` y ya está ignorada.
- `PRISALY/INTEGRACION-55-EVIDENCIAS/`: está fuera del repositorio.
- `[directorio local de credenciales QA]`, que contiene credenciales QA y registros de la API.
- Cualquier `src/qa-int/` o `credenciales.local.ts`, si reapareciera.
- `prisaly-qa-respaldo.dump`.

## Propuesta de commits (no ejecutados)

1. `feat(academico): continuidad del recorrido docente entre casos, contenido, rubrica, sesiones y convocatorias`, con el código y la spec.
2. `docs(integracion-55): matriz del recorrido, permisos, solicitudes Backend y entrega FE-55`, con `docs/integracion-55/`.

## Puntos críticos para la auditoría

1. **`ParametroRecorrido.fijar`:**
   - Usa `navigate([], { relativeTo, queryParamsHandling: 'merge', replaceUrl: true })`.
   - Comprobar que no rompe los parámetros `aviso` ni el historial.
   - Comprobar que solo se llama después de una lectura correcta del servidor.
2. **Bucles de consulta:** las suscripciones de los constructores comparan con el identificador mostrado. Comprobar que no hay bucles entre `PanelCasosM3` y `PanelContenidoM3`, que comparten pantalla.
3. **Peticiones perdidas en `PanelCasosM3`:** si el panel está ocupado, una llegada por URL se descarta en lugar de encolarse. Decidir si es aceptable.
4. **`estadoDesactualizado`:** depende de `CasosSesionStore`, que está filtrado por usuario. Comprobar que no habilita nada: solo puede deshabilitar.
5. **`app-recorrido-docente`:** los enlaces no eluden `requiereMapeoPersonalQa`. Hay una prueba de configuración y otra de redirección.
6. **`MENSAJES_M4`:** comparar con `M4ExceptionHandler.mapearCodigo` de `773818c`. Los códigos desconocidos conservan el mensaje genérico.
7. **Antes de publicar:**
   - Repetir `git fetch`, porque `develop` puede avanzar.
   - Revisar los finales de línea: Prettier se aplicó con `--end-of-line crlf` en los archivos CRLF y Git normaliza a LF en el índice.

## Conclusión

**LISTO PARA REVISIÓN DE CODEX**

**Justificación:**

- Reutiliza FE-53 y FE-54 sin nuevos contratos, permisos ni excepciones de acceso.
- Conserva los guards y la concurrencia.
- Mejora la continuidad entre las 5 pantallas del recorrido.
- Pasa la suite completa (642/642), los builds y las verificaciones estáticas.
- Deja documentada la persistencia real de las 7 etapas en QA.

Esta conclusión es técnica. El recorrido docente **no** está aceptado funcionalmente mientras BLQ-53-01 siga abierto.
