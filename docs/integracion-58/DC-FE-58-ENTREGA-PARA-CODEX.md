# DC-FE-58 · Entrega para la revisión independiente de Codex

| Dato                      | Valor                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Fecha                     | 2026-11-22 (FE-58-05), actualizada 2026-11-23 (resolución final 08)                                              |
| Worktree                  | `C:\Users\57316\OneDrive\Escritorio\PRISALY\PRISALY-Front-58`                                                    |
| Rama                      | `feature/fe-58-preparacion-navegacion`                                                                           |
| Base                      | `32ba32a` (`origin/develop` sin avances tras `git fetch`)                                                        |
| Backend                   | `773818c`, sin modificar                                                                                         |
| Fases                     | FE-58 inicial + FE-58-05 + auditoría Codex 06 + resolución final 08 + H-58-01-12 (simulador) + sincronización 15 |
| Commits, push, PR y merge | Ninguno                                                                                                          |

## Sincronización integral con `develop` (orden 15, 2026-11-23)

**Resultado: SINCRONIZADO Y LISTO PARA AUDITORÍA FINAL.** Detalle en `sincronizacion-develop/DC-FE-58-SINCRONIZACION-INTEGRAL-15-RESULTADO.md`.

### Base verificada

| Repositorio | `origin/develop`                           | Estado                                                         |
| ----------- | ------------------------------------------ | -------------------------------------------------------------- |
| Frontend    | `32ba32ab0189344e71e380a7f7a59cedbb8e7705` | Sin commits nuevos tras `git fetch origin --prune` (17:32 UTC) |
| Backend     | `773818caf62758d66019a71dac6508d13148abad` | Sin commits nuevos                                             |

### Worktree conciliado

`PRISALY-Front-58`, sin cambios de código durante la sincronización.

- No hizo falta conciliar: el HEAD de FE-58 es `develop` y no hay conflictos.
- **Respaldo:** `RESPALDO-FE58-20261123-123140`, con 47 hashes SHA-256 verificados.
- **Referencia limpia:** el nuevo worktree desacoplado `PRISALY-Front-DEVELOP-15`.

### Diferencias respecto al resultado anterior

En el código, ninguna. Se añaden solo documentos en `docs/integracion-58/sincronizacion-develop/`.

### Pruebas, sin mezclar contextos

| Contexto            | Pruebas                                                                            | Builds                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A, `develop` limpio | **662/662** (356 + 306)                                                            | Producción y QA con exit 0                                                                                         |
| B, FE-58            | **746/746** (440 + 306): autenticación 223/223, académico 120/120, dashboard 59/59 | Producción, QA y demo con exit 0; `tsc`, Prettier (código cambiado), URLs, `diff --check` y secretos sin problemas |

### Contratos Backend

| Clase                                                            | Contenido                                                                                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Disponibles** (en `develop`)                                   | Todo lo que ya consume Angular: M1 (personal, administración), M3 (casos, contenido, rúbricas, publicación) y M4 (sesiones, estados, convocatorias)                 |
| **Candidatos** (PR en Draft, no fusionados, banderas en `false`) | #96 `GET /v1/casos`; #95 `POST` y `GET /v1/evaluacion/intentos/{id}`; #94 sin cambio HTTP; #97 orquestación local (build Angular de producción). Ninguno se consume |

Matriz completa en `sincronizacion-develop/DC-FE-58-MATRIZ-COMPATIBILIDAD-FRONT-BACK-15.csv`.

### Hallazgos pendientes

1. **PR #97:** con FE-58, el Frontend empaquetado en producción solo muestra `/login`. Hay que decidir la configuración de la orquestación local.
2. **PR #96:** cuando se fusione y active, hará falta una orden para añadir `GET v1/casos` a la lista cerrada del interceptor.
3. **`feature/simulador-integracion-nicolas`:** no está integrada; difiere en 3 archivos del simulador y no se incorpora.
4. **Siguen pendientes:** D-05, DD-02/M5, M6/N2, M7, reportes, OBS-53-01 y la verificación en despliegue de H-58-01.

### Puntos críticos de auditoría de la sincronización

1. Confirmar que el respaldo coincide con el worktree (`sha256sum -c`).
2. Confirmar que `develop` no avanzó en ninguno de los dos repositorios.
3. Revisar la clasificación de los PR: estar en Draft o tener el CI en verde no equivale a integración.
4. Que la cifra B (746) se deba exactamente a 662 más las pruebas propias de FE-58.

## H-58-01-12: simulador protegido por entorno

**Recomendación: LISTO PARA AUDITORÍA FINAL.** Sin declarar cerrada H-58-01 hasta la revisión de Codex y la verificación en despliegue. Detalle en `DC-FE-58-H58-01-RESULTADO.md`.

### Inventario de la fase 12

| Archivo                                                       | Cambio                                                                                                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/app.routes.ts`                                       | `canActivate: [requiereEntornoDemostracion]` en `/simulador-tecnico-2d5`, `/simulador-integrado` y `/simulador-unreal`. `/simulador` conserva la redirección. Diff mínimo, sin reformatear |
| `src/app/app.ts`, `app.html` y `app.css`                      | Distintivo visible solo en demo                                                                                                                                                            |
| `src/app/features/autenticacion/fe58-simulador.spec.ts`       | Nuevo, 13 pruebas                                                                                                                                                                          |
| `src/app/features/autenticacion/fe58-revalidacion.spec.ts`    | La caracterización pasa a exigir el guard                                                                                                                                                  |
| `src/app/app.spec.ts`                                         | Entorno demo explícito                                                                                                                                                                     |
| `src/app/features/simulador/pages/simulador-temporal.spec.ts` | 1 línea de proveedor demo; la implementación del simulador no cambia                                                                                                                       |
| `docs/integracion-58/DC-FE-58-H58-01-RESULTADO.md`            | Nuevo                                                                                                                                                                                      |

### Pruebas de la fase 12

| Prueba                                                                         | Resultado               |
| ------------------------------------------------------------------------------ | ----------------------- |
| Dirigidas                                                                      | 49/49                   |
| H-58-02 (`fe58-revalidacion.spec.ts`)                                          | 17/17                   |
| Autenticación                                                                  | 223/223                 |
| Académico                                                                      | 120/120                 |
| Dashboard                                                                      | 59/59                   |
| Suite completa                                                                 | **746/746** (440 + 306) |
| Builds de producción, QA y demo                                                | exit 0                  |
| `tsc`, Prettier (código cambiado), `check:urls`, `git diff --check` y secretos | Sin problemas           |

**Pendiente de despliegue:** verificación en navegador por entorno y sesión estudiantil real (DD-02 desactivado).

### Puntos críticos de la fase 12

1. Que el guard esté en los tres destinos y que `/simulador` nunca monte Unreal fuera de demo.
2. Que la desactivación académica de `/simulador-integrado` siga sin `withComponentInputBinding` y con `ParticipacionPendienteGateway` por defecto. Si alguien añade el enlace de entradas, la modalidad académica podría activarse desde la URL.
3. Que la implementación del simulador no se haya modificado; revisar la línea añadida a su spec.
4. Que el distintivo solo se muestre en demo y no altere la maquetación (posición fija).
5. Que la regresión de H-58-02 se mantenga y las seis rutas sigan con `habilitada: false`.
6. Que, con `canActivate`, el chunk diferido no se ejecute al denegar. `canMatch` es una alternativa si se quiere evitar también la descarga.

## Resolución final 08: cambios para la auditoría final (anterior)

**Clasificación de la fase 08:** PENDIENTE DE DECISIÓN DE SIMULADOR. Queda **superada** por la fase 12 para el simulador.

- **H-58-02:** implementada.
- **H-58-01:** abierta, porque las cuatro rutas del simulador siguen públicas y su clasificación está pendiente de Cristian y Nicolás.
- **Seis rutas oficiales:** con `habilitada: false`.

### Inventario de la fase 08

| Archivo                                                               | Cambio                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/features/autenticacion/vigilancia-acceso-personal.ts`        | Añade `INTERVALO_REVALIDACION_ACCESO_MS` (`InjectionToken`, 60 000 ms) y `FALLOS_TEMPORALES_TOLERADOS = 1`. Un único temporizador, solo con ruta vigilada, sesión válida y documento visible. Revalidación al volver `visibilitychange` o `focus`. `verificacionNoDisponible`. Detención al salir, al cerrar sesión o al destruirse. Se conserva el cierre por confirmación pendiente tras un 403 (Codex 06) |
| `src/app/features/autenticacion/estado-verificacion-acceso.ts`        | Nuevo. Aviso de fallo temporal (`display: contents`)                                                                                                                                                                                                                                                                                                                                                         |
| `src/app/features/dashboard/dashboard-layout.ts` y `.html`            | Incluyen el aviso sobre el `router-outlet`                                                                                                                                                                                                                                                                                                                                                                   |
| `src/app/features/autenticacion/fe58-revalidacion.spec.ts`            | Nuevo, 17 pruebas con `jasmine.clock()`, incluidas la medición de `/me` y la caracterización de las rutas del simulador                                                                                                                                                                                                                                                                                      |
| `docs/integracion-58/DC-FE-58-INVENTARIO-RUTAS-SIMULADOR.csv`         | Nuevo, 16 rutas y 14 columnas, con las clasificaciones A, B o C                                                                                                                                                                                                                                                                                                                                              |
| `docs/integracion-58/DC-FE-58-RESOLUCION-IMPLEMENTACION-RESULTADO.md` | Parte 1 nueva (20 secciones) y Parte 2 histórica                                                                                                                                                                                                                                                                                                                                                             |

No se modificaron el simulador, las rutas del simulador, Backend, la narrativa, DD-02 ni M6.

### Pruebas de la fase 08

Ejecutadas de una en una. Los registros están en `PRISALY/INTEGRACION-58-EVIDENCIAS/r08-*`.

| Prueba                                                                                                | Resultado                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fe58-revalidacion.spec.ts`                                                                           | 17/17, exit 0                                                                                                                                          |
| `src/app/features/autenticacion` (autenticación, guards, vigilancia y entornos)                       | 210/210, exit 0                                                                                                                                        |
| `src/app/features/academico`                                                                          | 120/120, exit 0                                                                                                                                        |
| `src/app/features/dashboard`                                                                          | 59/59, exit 0                                                                                                                                          |
| Suite, bloque 1                                                                                       | 426/427 en la primera ejecución: timeout aislado de maquetación bajo carga, en la primera prueba de la ejecución. **427/427 en la repetición**, exit 0 |
| Suite, bloque 2 (simulador, sin modificar)                                                            | 306/306, exit 0                                                                                                                                        |
| **Total**                                                                                             | **733/733** (716 de referencia más 17)                                                                                                                 |
| Builds de producción, QA y demo                                                                       | exit 0 en los tres                                                                                                                                     |
| `tsc` de la aplicación y de las pruebas, Prettier (código cambiado), `check:urls`, `git diff --check` | exit 0. Excepción preexistente: `app.routes.spec.ts`                                                                                                   |
| Revisión de secretos                                                                                  | Sin hallazgos                                                                                                                                          |

**Medición simulada de `/me`** (`r08-medicion-me.txt`): **6 consultas** en unos 23 minutos simulados. Corresponden a: inicio de sesión, entrada, 3 revalidaciones de 60 s y 1 al recuperar el foco. Hubo 0 en segundo plano, en la navegación interna, en la navegación a otra ruta protegida, en las páginas públicas y tras el cierre de sesión.

**QA real:** no se ejecutó, por falta de confirmación de Ingrid; además, la API QA no respondía según la auditoría 06.

**Defecto propio corregido durante la validación:** los ganchos `beforeEach` y `afterEach` de la nueva spec estaban en el nivel superior e instalaban el reloj simulado en todo el paquete Karma, lo que provocó 6 timeouts en `fe58-resolucion.spec.ts`. Ahora están dentro de su `describe`.

### Decisiones registradas

| Decisión                  | Detalle                                                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intervalo                 | 60 s, configurable por el token                                                                                                                                                                 |
| Ventana de vigencia       | Sigue en 15 s                                                                                                                                                                                   |
| Fallo temporal            | Un fallo solo avisa; dos consecutivos retiran la vista y conservan la sesión                                                                                                                    |
| Al volver al primer plano | Revalidación inmediata y compartida                                                                                                                                                             |
| Rutas del simulador       | Sin cambios, a la espera de la clasificación. Modificación propuesta (no aplicada): `canActivate: [requiereEntornoDemostracion]` en las rutas que se clasifiquen A o C, solo en `app.routes.ts` |

### Puntos críticos nuevos para la auditoría final

1. **Temporizador:**
   - que no exista sin ruta vigilada o con el documento oculto;
   - que la limpieza del efecto (`clearInterval`) actúe al cambiar `vigilada`, `sesionValida` o `visible`;
   - que no se recree en cada actualización de identidad (depende de `sesionValida`, no de `estado`).
2. **Visibilidad y foco:**
   - que no generen consultas duplicadas (ventana de 15 s y consulta compartida);
   - que no consulten sin ruta vigilada;
   - que los listeners se eliminen al destruirse.
3. **Interacción con Codex 06:**
   - que una confirmación pendiente tras un 403 siga retirando la vista;
   - que la revalidación periódica no reutilice una consulta anterior al 403 (`generacionIdentidad`).
4. **Fallos temporales:** que el contador se reinicie con un `vigente` y al cambiar de ruta, y que retire la vista tras dos fallos sin bucles.
5. **Cambio de usuario:** la vista se retira con `acceso-retirado` (el nuevo usuario no tiene el permiso) y la respuesta antigua se descarta.
6. **Aviso visual:** que `EstadoVerificacionAcceso` en el layout no altere la maquetación (`display: contents`). La suite del dashboard pasa.
7. **Inventario:** que ninguna clasificación del simulador figure como aprobada; todas están «pendiente de validación».

## Historial: FE-58-05 y FE-58 inicial

## Inventario de cambios

### FE-58-05 (nuevo en esta entrega)

| Archivo                                                                                                                                                        | Cambio                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/features/autenticacion/m1-mapeo-rutas.ts`                                                                                                             | Modalidad `sesion: true` explícita. `modalidadRequisito()` restrictiva (conserva el `Array.from` de Codex). `habilitada`, `resolucion` y `verificacionQa`. Decisión `preparada`. `avisoDeDecision()`. 4 avisos nuevos. Matriz aprobada con `habilitada: false` |
| `src/app/features/autenticacion/m1-personal-sesion.ts`                                                                                                         | `actualizarIdentidad(forzar)`: `/me` compartido, ventana de 15 s, descarte de respuestas tardías, 401, 403 y red                                                                                                                                               |
| `src/app/features/autenticacion/m1-personal-rutas-qa.ts`                                                                                                       | Demostraciones solo en `demo`. Sin consulta si la ruta está pendiente o preparada. `/me` confirmado antes de entrar en una ruta habilitada. Registra la vigilancia                                                                                             |
| `src/app/features/autenticacion/vigilancia-acceso-personal.ts`                                                                                                 | Nuevo. Cierra la pantalla si el acceso deja de ser vigente; ante un 403 pide una única actualización de `/me`                                                                                                                                                  |
| `src/app/features/autenticacion/entorno-demostracion.ts`                                                                                                       | Nuevo. `DEMOSTRACIONES_HABILITADAS` (se fija al compilar) y `requiereEntornoDemostracion`                                                                                                                                                                      |
| `src/app/features/academico/academico-http.ts`                                                                                                                 | Ante un 403 académico notifica a la vigilancia (dentro de `try/catch`, sin alterar el error)                                                                                                                                                                   |
| `src/app/features/dashboard/dashboard.routes.ts`                                                                                                               | `/dashboard/estudiante` exige el entorno `demo`                                                                                                                                                                                                                |
| `src/environments/environment{,.development,.qa}.ts`                                                                                                           | `demostracionesHabilitadas: false`                                                                                                                                                                                                                             |
| `src/environments/environment.demo.ts`                                                                                                                         | Nuevo entorno `demo`                                                                                                                                                                                                                                           |
| `angular.json`                                                                                                                                                 | Configuraciones `demo` de build y serve                                                                                                                                                                                                                        |
| `src/app/features/autenticacion/fe58-resolucion.spec.ts`                                                                                                       | Nuevo, 30 pruebas                                                                                                                                                                                                                                              |
| `m1-mapeo-rutas.spec.ts`, `m1-mapeo-rutas-rol.spec.ts`, `m1-personal-rutas-qa.spec.ts`, `recorrido-docente.spec.ts`, `dashboard.spec.ts`, `app.routes.spec.ts` | Actualizados al comportamiento nuevo (habilitación separada y demostraciones por entorno), con pruebas de bloqueo añadidas                                                                                                                                     |
| `docs/integracion-58/DC-FE-58-RESOLUCION-IMPLEMENTACION-RESULTADO.md`                                                                                          | Resultado en 20 secciones                                                                                                                                                                                                                                      |

### FE-58 inicial (conservado)

| Archivo                                                              | Cambio                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/app/features/autenticacion/m1-personal-sesion.ts`               | `tieneRol(rol)` con comparación exacta                                  |
| `src/app/features/autenticacion/aviso-acceso-personal.ts`            | Muestra el rol real de la sesión ante `rol-insuficiente`                |
| `src/app/features/autenticacion/m1-mapeo-rutas-rol.spec.ts`          | 19 pruebas de rol, incluida la regresión de Codex para listas dispersas |
| `docs/integracion-58/DC-FE-58-MATRIZ-AUTORIZACION-M1-M4.csv`         | 23 filas                                                                |
| `docs/integracion-58/DC-FE-58-PREPARACION-AUTORIZACION-RESULTADO.md` | Resultado en 19 secciones                                               |

Totales: 15 archivos modificados (+419/−59) y 5 archivos nuevos de código y pruebas, más los documentos.

`src/environments/senalizacion-unreal.ts` (simulador) se reformateó por error con Prettier y se restauró a la base: no forma parte del diff.

## Comportamiento efectivo

- **Rutas de personal:** ninguna se puede navegar. Con sesión válida, las seis redirigen a `/dashboard?aviso=habilitacion-pendiente`, sin consultar `/me`.
- **Fuera de QA, en producción y en desarrollo:** el dashboard demostrativo y `/dashboard/estudiante` redirigen a `/login`. Solo el build `demo` las muestra.
- **Habilitación futura de una ruta** (`habilitada: true`, en revisión): el guard confirma `/me` y decide con la identidad vigente; la vigilancia cierra la pantalla si el acceso se pierde.

## Contratos

No se consumen endpoints nuevos. `/v1/personal/me` ya estaba en la lista cerrada del interceptor M1. La lista cerrada académica no cambia.

## Pruebas ejecutadas (FE-58-05)

Ejecutadas de una en una. Los registros están en `PRISALY/INTEGRACION-58-EVIDENCIAS/r05-*`.

| Comando                                                                                   | Salida                                                                        |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Diagnóstico tras implementar                                                              | 41 fallos esperados; pruebas actualizadas                                     |
| `ng test --include src/app/features/autenticacion`                                        | 190/190, exit 0                                                               |
| `ng test --include src/app/features/academico`                                            | 120/120, exit 0                                                               |
| `ng test --include 'src/app/*.spec.ts'`                                                   | 13/13, exit 0                                                                 |
| Suite: bloque 1 (todo salvo el simulador) y bloque 2 (simulador)                          | 407/407 y 306/306, exit 0. **Total 713/713**                                  |
| `ng build`, `ng build --configuration qa` y `ng build --configuration demo`               | exit 0 en los tres                                                            |
| `tsc` de la aplicación y de las pruebas                                                   | exit 0 y exit 0                                                               |
| `prettier --check --end-of-line auto` (código cambiado), `check:urls`, `git diff --check` | exit 0. `app.routes.spec.ts` ya no era conforme en la base y no se reformateó |
| Revisión de secretos (`r05-revision-secretos.log`)                                        | Sin hallazgos                                                                 |

**Evidencias de QA:** no hubo pruebas reales en esta fase.

## Auditoría de seguridad

- **Nada habilitado ni ficticio:** ninguna ruta habilitada, ningún permiso o rol nuevo, ninguna credencial y ningún almacenamiento persistente. El token sigue solo en memoria.
- **Demostraciones:** se controlan con una constante de compilación, no con URL ni almacenamiento.
- **Operaciones denegadas:** nunca se reintentan. Un 403 de una operación no cierra la sesión.
- **Habilitaciones en pruebas:** todas son simulaciones con `MAPEO_RUTAS_PERSONAL` en `TestBed`.

## Archivos excluidos

- `node_modules`, `dist/` y `.angular/`.
- `PRISALY/INTEGRACION-58-EVIDENCIAS/`.
- `C:\Users\57316\.prisaly-qa-int50\`.
- `PRISALY/.claude/launch.json`.

## Diferencias con la línea base

| Aspecto                 | Base `32ba32a`        | FE-58 actual                                                 |
| ----------------------- | --------------------- | ------------------------------------------------------------ |
| Pruebas                 | 662                   | 713                                                          |
| Rutas de personal en QA | `permisos-pendientes` | `habilitacion-pendiente` (requisito aprobado, no habilitado) |
| Dashboard fuera de QA   | Demostración pública  | Solo en el build `demo`; producción y desarrollo → `/login`  |
| `/dashboard/estudiante` | Público               | Solo en `demo`                                               |

## Riesgos

- **Rutas del simulador:** siguen públicas. La restricción queda pendiente de decisión, porque está prohibido modificar el simulador.
- **Ventana de 15 s** antes de volver a consultar `/me`. Mitigación: el Backend deniega igualmente cada operación, y el primer 403 provoca la confirmación.
- **Quien usaba el dashboard demostrativo en desarrollo** debe usar `--configuration demo`.

## Propuesta de commits (no ejecutados)

1. `feat(autenticacion): modalidades rol, permiso y sesion con habilitacion separada en el mapeo`: mapeo, guard, sesión (`tieneRol` y `actualizarIdentidad`), vigilancia, aviso, interceptor académico y sus specs.
2. `feat(entornos): demostraciones solo en el entorno demo (H-58-01)`: `environment*`, `angular.json`, `entorno-demostracion.ts`, `dashboard.routes.ts` y los ajustes de specs demo.
3. `docs(integracion-58): matriz de autorizacion, resultado de la resolucion y entrega`.

## Puntos críticos de revisión

### Nuevos en FE-58-05

1. **`modalidadRequisito` y `decidirRuta`:**
   - que «solo sesión» sea solo `sesion === true` sin rol ni permisos;
   - que cualquier otra forma quede pendiente;
   - que `habilitada !== true` dé siempre `preparada`.
2. **Mapeo oficial:** que las seis rutas tengan `habilitada: false` y que la matriz coincida con la resolución.
3. **`actualizarIdentidad`:**
   - descarte de respuestas tardías (revisión, `userId`, `ocupada`);
   - `share` y `finalize` con varios solicitantes y cancelación;
   - que el estado no pase a «pendiente» durante la consulta;
   - que la red dé `no-disponible` sin conceder acceso.
4. **Guard:** que no consulte en rutas pendientes o preparadas y que la decisión con una ruta habilitada use la identidad recién confirmada.
5. **Vigilancia:**
   - que la navegación de cierre retire la pantalla;
   - que se conserve con cambios de `?caso`/`?sesion` dentro de la misma sección y se suelte al salir;
   - que el 403 no provoque reintentos.
6. **Interceptor académico:** que el `try/catch` no oculte el error original y que solo actúe sobre rutas de la lista cerrada.
7. **Demostraciones:**
   - el valor de compilación por entorno (el bundle de producción contiene `demostracionesHabilitadas:!1`);
   - el acceso directo bloqueado;
   - el entorno `demo` sin backend real.
8. **Simulador:** confirmar que no se modificó, incluido `senalizacion-unreal.ts`, que se restauró.

### Heredados del FE-58 inicial

9. **`tieneRol`:** comparación exacta, igual que `exigirAdministrador`.
10. **Matriz CSV:** que separe navegación de operación.
11. **OBS-53-01:** la conclusión y la exposición documentada en la sección 14 del resultado.
12. **Antes de publicar:** repetir `git fetch`.

## Conclusión vigente (H-58-01-12)

**LISTO PARA AUDITORÍA FINAL**

- **H-58-02:** implementada y verificada. La regresión pasa: 17/17.
- **H-58-01:** la matriz ratificada del simulador está aplicada en el Router.
  - Producción, desarrollo y QA lo deniegan; demo lo permite.
  - La modalidad académica de `/simulador-integrado` sigue deshabilitada.
- **Pruebas y builds:** suite 746/746; builds de producción, QA y demo con exit 0.
- **Estado de H-58-01:** **no se declara cerrada** hasta la revisión de Codex y la verificación en despliegue de cada entorno.
- **Navegación productiva:** no está habilitada. Las seis rutas siguen con `habilitada: false`.

Sustituye a la conclusión de la fase 08 («PENDIENTE DE DECISIÓN DE SIMULADOR») y a la de FE-58-05.
