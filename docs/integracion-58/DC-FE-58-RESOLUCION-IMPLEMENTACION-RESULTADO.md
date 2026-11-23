# DC-FE-58 · Implementación controlada de la resolución: resultado

> **Actualización 2026-11-23 (H-58-01-12):** Dirección Central ratificó la matriz del simulador y se aplicó en el Router. Ver la Parte 0 y `DC-FE-58-H58-01-RESULTADO.md`. Lo que la Parte 1 dice sobre el simulador («rutas públicas», «PENDIENTE DE DECISIÓN DE SIMULADOR») queda **superado**.

# Parte 0 · H-58-01-12: simulador protegido por entorno

**Recomendación: LISTO PARA AUDITORÍA FINAL DE CODEX.** H-58-01 no se declara cerrada hasta la revisión de Codex y la verificación en despliegue.

**Matriz aplicada:**

| Ruta                     | Categoría | Comportamiento                                          |
| ------------------------ | --------- | ------------------------------------------------------- |
| `/simulador-tecnico-2d5` | A         | `canActivate: [requiereEntornoDemostracion]`            |
| `/simulador-unreal`      | A         | `canActivate: [requiereEntornoDemostracion]`            |
| `/simulador`             | A         | Redirección conservada hacia el destino protegido       |
| `/simulador-integrado`   | A/B       | Mismo guard; la modalidad académica sigue deshabilitada |

**Por qué la modalidad académica sigue deshabilitada:** no hay `withComponentInputBinding`, así que los parámetros de URL no pueden rellenar las entradas académicas, y `ParticipacionPendienteGateway` es el gateway por defecto.

**Resultado por entorno:**

| Entorno                 | Rutas del simulador                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| Producción y desarrollo | Redirigen a `/login`, sin montar el simulador                                                    |
| QA                      | `/login` sin sesión, o el aviso `demostracion-no-autorizada` con sesión docente o administrativa |
| Demo                    | Permitidas, con el distintivo visible de demostración                                            |

**Implementación del simulador:** sin cambios. Solo se añadió una línea de proveedor a su spec de ruta.

**Pruebas:** 13 nuevas en `fe58-simulador.spec.ts`. Total **746/746**: bloque 1 con 440/440 y bloque 2 con 306/306.

| Verificación                                                            | Resultado     |
| ----------------------------------------------------------------------- | ------------- |
| Regresión H-58-02                                                       | 17/17         |
| Autenticación                                                           | 223/223       |
| Académico                                                               | 120/120       |
| Dashboard                                                               | 59/59         |
| Builds de producción, QA y demo                                         | exit 0        |
| TypeScript, Prettier (código cambiado), URLs, `diff --check` y secretos | Sin problemas |

**Pendiente de despliegue:** verificación en navegador por entorno y sesión estudiantil real. No se dan por aprobadas.

**Sin cambios:** las seis rutas oficiales siguen con `habilitada: false`.

---

> **Actualización 2026-11-23: DC-FE-58-EJECUCION-RESOLUCION-FINAL-08.** El cierre técnico de H-58-01 y H-58-02 está en la primera parte, con las 20 secciones que pide la orden. La segunda parte («Antecedentes FE-58-05») conserva el resultado anterior sin cambios de fondo.

# Parte 1 · Resolución final 08 (H-58-01 y H-58-02)

**Clasificación: PENDIENTE DE DECISIÓN DE SIMULADOR.**

- **H-58-02 está implementada y probada:** la vigilancia revalida `/me` cada 60 s mientras hay una vista protegida activa y visible, y al recuperar el foco.
- **H-58-01 no puede cerrarse:** las cuatro rutas del simulador siguen públicas sin restricción por entorno, y su clasificación está pendiente de validación por Cristian y Nicolás. No se modificaron sin esa confirmación.
- Las seis rutas oficiales siguen con `habilitada: false`.

## 1. SHA inicial

| Repositorio           | SHA                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Frontend              | `32ba32ab0189344e71e380a7f7a59cedbb8e7705`, HEAD del worktree. Tras `git fetch origin`, `origin/develop` no avanzó |
| Backend de referencia | `773818caf62758d66019a71dac6508d13148abad`, sin modificar                                                          |

## 2. Estado de Git

Worktree `PRISALY-Front-58`, rama `feature/fe-58-preparacion-navegacion`.

| Elemento                 | Estado                                            |
| ------------------------ | ------------------------------------------------- |
| Archivos modificados     | 17 (+459/−61)                                     |
| Archivos nuevos          | 7 de código y pruebas, más `docs/integracion-58/` |
| Commits, push, PR, merge | Ninguno                                           |

Se conservan los cambios de Claude y Codex:

- la corrección de Codex que descarta un `/me` anterior a un 403 (`confirmarTrasDenegacion`, `generacionIdentidad`, `identidadRequiereConfirmacion`);
- la lista cerrada de claves del requisito;
- la corrección de listas dispersas.

No hay modificaciones ajenas en el simulador: `git status` en `src/app/features/simulador` y `senalizacion-unreal.ts` no muestra cambios.

## 3. Archivos modificados en esta fase

| Archivo                                                               | Cambio                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autenticacion/vigilancia-acceso-personal.ts`                         | Revalidación periódica con `INTERVALO_REVALIDACION_ACCESO_MS` (60 000 ms); pausa en segundo plano y revalidación al recuperar visibilidad o foco; fallos temporales tolerados (`FALLOS_TEMPORALES_TOLERADOS = 1`); `verificacionNoDisponible`; detención al salir de la vista, al cerrar sesión o al destruirse. Se conserva el cierre por confirmación pendiente (Codex) |
| `autenticacion/estado-verificacion-acceso.ts` (nuevo)                 | Aviso de fallo temporal, distinto de la pérdida confirmada. `display: contents`                                                                                                                                                                                                                                                                                           |
| `dashboard/dashboard-layout.ts` y `.html`                             | Incluyen `<app-estado-verificacion-acceso />` sobre el `router-outlet`                                                                                                                                                                                                                                                                                                    |
| `autenticacion/fe58-revalidacion.spec.ts` (nuevo)                     | 17 pruebas deterministas con tiempo simulado, incluida la medición                                                                                                                                                                                                                                                                                                        |
| `docs/integracion-58/DC-FE-58-INVENTARIO-RUTAS-SIMULADOR.csv` (nuevo) | Inventario de 16 rutas                                                                                                                                                                                                                                                                                                                                                    |

## 4. Resultado de H-58-01

| Rutas                                                                                   | Estado                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard demostrativo (`/dashboard` y secciones fuera de QA) y `/dashboard/estudiante` | **Restringidas al entorno `demo`** (aplicado en FE-58-05). Producción, desarrollo y QA las bloquean, también por acceso directo                                                                                                                                   |
| `/simulador`, `/simulador-unreal`, `/simulador-integrado` y `/simulador-tecnico-2d5`    | **Sin cambios.** Siguen públicas en todos los entornos. Clasificación propuesta en el inventario, **pendiente de validación** por Cristian y Nicolás. Una prueba de caracterización fija que hoy no tienen guard, para que cualquier cambio futuro sea deliberado |

**Resultado: H-58-01 queda abierta.**

## 5. Resultado de H-58-02

Implementada sobre el mecanismo existente, sin un segundo sistema de autorización:

- Se reutilizan `actualizarIdentidad` (consulta compartida, ventana de vigencia y descarte de respuestas obsoletas) y `confirmarTrasDenegacion` (Codex).
- La única estrategia periódica vive en `VigilanciaAccesoPersonal`. Ningún componente académico crea temporizadores.

## 6. Inventario de rutas

Ver `DC-FE-58-INVENTARIO-RUTAS-SIMULADOR.csv`: 16 filas y 14 columnas.

| Clasificación propuesta | Rutas                                                                         | Estado                                                      |
| ----------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A, demostración técnica | Dashboard demostrativo y presentación estudiantil                             | Aplicadas                                                   |
| A, demostración técnica | `/simulador` y `/simulador-unreal`                                            | Pendientes de validación                                    |
| B, recorrido académico  | `/login` y las seis rutas de personal en QA                                   | Seis rutas con requisito aprobado y no habilitadas          |
| Mixta (A + B)           | `/simulador-integrado` (demostración Phaser y participación M5 tras DD-02)    | Pendiente; se propone separar la demostración del recorrido |
| C, componente interno   | `/simulador-tecnico-2d5` (mapa técnico anterior con interior de demostración) | Pendiente                                                   |

## 7. Matriz por entorno

| Ruta                    | Producción               | Desarrollo               | QA (`personalQaHabilitado`)                    | `demo`                   |
| ----------------------- | ------------------------ | ------------------------ | ---------------------------------------------- | ------------------------ |
| `/login`                | Formulario deshabilitado | Formulario deshabilitado | Inicio de sesión de personal                   | Formulario deshabilitado |
| `/dashboard`            | → `/login`               | → `/login`               | Con sesión                                     | Demostración             |
| Seis rutas de personal  | → `/login`               | → `/login`               | `habilitacion-pendiente` (`habilitada: false`) | Demostración             |
| `/dashboard/estudiante` | → `/login`               | → `/login`               | `demostracion-no-autorizada`                   | Demostración             |
| Rutas del simulador (4) | **Públicas**             | **Públicas**             | **Públicas**                                   | Públicas                 |

## 8. Estrategia de `/me`

| Momento                                  | Tipo de consulta                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Al entrar en una ruta habilitada         | El guard confirma `/me`. Tras iniciar sesión siempre consulta, porque Codex reinicia la vigencia |
| Con una vista protegida activa y visible | Revalidación cada 60 s                                                                           |
| Al recuperar visibilidad o foco          | Una revalidación compartida (`visibilitychange` y `focus` dan una sola consulta)                 |
| Tras un 403 de una operación             | Confirmación iniciada después del rechazo; la vista se retira mientras está pendiente            |

**Descarte de respuestas:** se descartan las que pertenecen a otra credencial, a otro usuario, a una generación anterior (403) o a una consulta cancelada (invalidación o cierre de sesión).

**Errores:**

| Error                | Comportamiento                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401                  | Lleva a `/login`                                                                                                                                                                            |
| 403 de `/me`         | La identidad queda inutilizable                                                                                                                                                             |
| 403 de una operación | No cierra la sesión ni se reintenta                                                                                                                                                         |
| Red o servicio       | El primer fallo muestra un aviso y conserva la vista. El segundo consecutivo la retira (`verificacion-no-disponible`). No se reintenta antes del siguiente intervalo, así que no hay bucles |

**Detención:**

- al salir de la sección vigilada, aunque los cambios de `?caso`/`?sesion` dentro de ella la conservan;
- al cerrar sesión o expirar la sesión;
- al retirar la vista;
- al cambiar de usuario;
- al destruir el servicio.

En segundo plano no hay temporizador.

## 9. Intervalo de 60 segundos

- **Configuración:** `INTERVALO_REVALIDACION_ACCESO_MS` es un `InjectionToken` con un valor inicial de 60 000 ms, configurable por proveedor.
- **Un solo temporizador:** existe solo mientras haya ruta vigilada, sesión válida y documento visible, y se recrea al volver al primer plano. Varios guards no lo duplican, porque `vigilar` es idempotente y el efecto depende solo de esas tres señales.
- **Por qué no hay consultas redundantes:**
  - la ventana de vigencia de 15 s absorbe las navegaciones y recuperaciones de foco cercanas;
  - las solicitudes concurrentes comparten una sola petición;
  - sin vista vigilada no se consulta nunca.

## 10. Pruebas de revocación

`fe58-revalidacion.spec.ts` contiene 17 pruebas, con `jasmine.clock()` y sin esperas reales. Cubren los escenarios obligatorios de la orden:

| Escenario                                                                  | Resultado                                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1 y 11. Revocación con la pantalla abierta y datos visibles                | La vista y sus datos se retiran sin interacción                        |
| 2. Revocación seguida de un cambio de ruta                                 | `permiso-insuficiente`                                                 |
| 3. Revocación con pérdida de foco                                          | Sin consultas mientras está oculta; al volver, una consulta y retirada |
| 4 y 5. Revocación con `/me` pendiente y respuesta tardía anterior a un 403 | No restaura permisos; no hay reintento                                 |
| 6. Cambio de usuario durante la consulta                                   | No hereda permisos; la vista se retira                                 |
| 7. Dos guards simultáneos                                                  | Una sola consulta y un solo temporizador                               |
| 8. Error de red                                                            | El primer fallo avisa; el segundo retira la vista                      |
| 8b. Recuperación tras un fallo                                             | El aviso desaparece                                                    |
| 9. 401                                                                     | `/login`                                                               |
| 10. 403 de `/me`                                                           | `acceso-denegado`                                                      |
| 12. Ciclos de revalidación                                                 | No los hay                                                             |
| 13. Páginas públicas                                                       | Sin consultas periódicas                                               |
| 14. Cierre de sesión                                                       | Detiene la vigilancia                                                  |
| 15. Salida de la ruta                                                      | Detiene la vigilancia; los parámetros no                               |
| 18. Rutas oficiales                                                        | Las seis siguen sin habilitar                                          |
| 16 y 17. Rutas del simulador                                               | Caracterización: sin guard                                             |

Los escenarios 16 y 17 sobre el dashboard demo ya los cubre `fe58-resolucion.spec.ts`: acceso directo, `?demo=true` y valores por entorno.

## 11. Medición de consultas

Es una **medición simulada**: HTTP simulado y tiempo simulado. No es una observación real contra la API. Archivo: `r08-medicion-me.txt`.

| Hito del recorrido                                            | Llamadas acumuladas a `/me` |
| ------------------------------------------------------------- | --------------------------- |
| Inicio de sesión (consulta del propio login)                  | 1                           |
| Entrada a una ruta protegida (confirmación del guard)         | 2                           |
| Permanencia de 3 minutos (3 revalidaciones de 60 s)           | 5                           |
| 4 minutos en segundo plano                                    | 5 (ninguna)                 |
| Recuperación del foco (`visibilitychange` y `focus`)          | 6 (una compartida)          |
| Navegación dentro de la sección (`?sesion=`)                  | 6                           |
| Navegación a otra ruta protegida (identidad de menos de 15 s) | 6                           |
| Salida a una página pública durante 5 minutos                 | 6                           |
| Cierre de sesión y 5 minutos más                              | 6                           |

**Total: 6 consultas en unos 23 minutos simulados.** Sin la pausa en segundo plano, la deduplicación y la ventana de 15 s habría habido al menos 4 consultas más en segundo plano, 1 por el foco duplicado y 1 por la navegación.

## 12. Pruebas de navegación

Ejecutadas de una en una. Los registros están en `PRISALY/INTEGRACION-58-EVIDENCIAS/r08-*`.

| Prueba                                                                                   | Resultado                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Revalidación (`r08-revalidacion.log`)                                                    | **17/17**, exit 0                                                                                                                                                                    |
| Autenticación, guards, vigilancia y entornos (`r08-autenticacion.log`)                   | **210/210**, exit 0                                                                                                                                                                  |
| Regresión académica (`r08-academico.log`)                                                | **120/120**, exit 0                                                                                                                                                                  |
| Regresión del dashboard (`r08-dashboard.log`)                                            | **59/59**, exit 0                                                                                                                                                                    |
| Suite, bloque 1, primera ejecución (`r08-suite-bloque-1.log`)                            | 426/427: un timeout de 5 s en la primera prueba de la ejecución (maquetación del dashboard a 768 px y 200 %), del mismo tipo que los observados en la línea base de FE-54 bajo carga |
| Suite, bloque 1, repetición (`r08-suite-bloque-1-repeticion.log`)                        | **427/427**, exit 0                                                                                                                                                                  |
| Suite, bloque 2: simulador, regresión sin modificar su código (`r08-suite-bloque-2.log`) | **306/306**, exit 0                                                                                                                                                                  |
| Total final                                                                              | **733/733** (716 de referencia más 17 nuevas)                                                                                                                                        |

**Defecto propio detectado y corregido durante la validación:** la primera versión de la nueva spec declaraba `beforeEach` y `afterEach` en el nivel superior, y Karma los aplicaba a todo el paquete. El reloj simulado se instalaba en otras suites y provocó 6 timeouts en `fe58-resolucion.spec.ts`. Ahora los ganchos están dentro de su `describe` y las repeticiones pasan.

## 13. Resultados de builds

| Comando                                               | Resultado                                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `ng build`                                            | exit 0; solo las advertencias previas del simulador                                            |
| `ng build --configuration qa`                         | exit 0                                                                                         |
| `ng build --configuration demo`                       | exit 0                                                                                         |
| `tsc` de la aplicación y de las pruebas               | exit 0 y exit 0                                                                                |
| Prettier (código cambiado)                            | exit 0. Excepción preexistente: `app.routes.spec.ts`, no conforme en la base y no reformateado |
| `check:urls`, `git diff --check`                      | exit 0                                                                                         |
| Revisión de secretos (`r08-verificaciones-final.log`) | Sin hallazgos                                                                                  |

## 14. Estado de las seis rutas

| Ruta                | Requisito           | `habilitada` | `verificacionQa` |
| ------------------- | ------------------- | ------------ | ---------------- |
| `usuarios-docentes` | Rol `ADMINISTRADOR` | `false`      | pendiente        |
| `configuracion`     | Sesión autenticada  | `false`      | pendiente        |
| `casos-academicos`  | `CONSULTAR_CASO`    | `false`      | pendiente        |
| `rubricas`          | `CONSULTAR_CASO`    | `false`      | pendiente        |
| `sesiones`          | `GESTIONAR_SESION`  | `false`      | pendiente        |
| `convocatorias`     | `GESTIONAR_SESION`  | `false`      | pendiente        |

Ninguna se puede navegar. La revalidación periódica solo actuará cuando una ruta se habilite.

## 15. Riesgos

| Riesgo                                                                                                        | Mitigación o estado                                              |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Rutas del simulador públicas                                                                                  | H-58-01 abierta                                                  |
| Una revocación silenciosa se detecta a los 60 s como máximo con la vista visible, o al volver al primer plano | Antes no se detectaba. El Backend sigue denegando cada operación |
| Un fallo temporal prolongado retira la vista tras dos intervalos (unos 2 min)                                 | Comportamiento conservador; la sesión se conserva                |
| Timeout intermitente de maquetación bajo carga del equipo                                                     | No es un defecto de FE-58; la repetición pasa                    |

## 16. Dependencias de Cristian y Nicolás

1. Validar la clasificación de las cuatro rutas del simulador.
2. Decidir si `/simulador` y `/simulador-unreal` quedan solo en `demo`.
3. Decidir si se separa la demostración Phaser del recorrido estudiantil en `/simulador-integrado`.
4. Decidir si `/simulador-tecnico-2d5` deja de ser un destino público.

**Modificación propuesta, no aplicada:** añadir `canActivate: [requiereEntornoDemostracion]` a las rutas clasificadas A o C en `app.routes.ts`, sin tocar los componentes del simulador.

## 17. Dependencias de Ingrid

1. Confirmar la disponibilidad y la autorización de QA para la verificación ruta por ruta.
2. El contrato D-05.
3. Las respuestas sobre OBS-53-01.
4. Confirmar que `/me` soporta la revalidación cada 60 s por usuario activo sin límite de frecuencia, ya que `/me` no está sujeto al límite de intentos de inicio de sesión.

## 18. Requisitos de habilitación QA

1. Ingrid confirma QA disponible.
2. Por cada ruta, el plan E2E (sección 14 de `DC-FE-58-PREPARACION-AUTORIZACION-RESULTADO.md`), navegando, con un mapeo habilitado solo en la sesión de prueba.
3. Verificar en real la revocación con la pantalla abierta (como mucho 60 s).
4. Registrar la evidencia y marcar `verificacionQa: 'verificada'`.
5. Autorización de Dirección Central.
6. Cambiar `habilitada` a `true` en revisión.

## 19. Recomendación de publicación

Sometido a la auditoría final de Codex, el incremento es publicable sin habilitar rutas: no amplía el acceso y restringe demostraciones. Pero **H-58-01 no puede declararse cerrada** hasta que se decida sobre las rutas del simulador.

## 20. Evidencias

- **QA real:** no se ejecutó. Ingrid no confirmó la disponibilidad de QA para esta orden y la auditoría 06 de Codex registró que la API QA no respondía en el puerto 18094.
  - Quedan sin ejecutar en real: revalidación periódica, revocación con la pantalla abierta, foco y 401/403 de `/me`.
- **Registros en `PRISALY/INTEGRACION-58-EVIDENCIAS/`:**
  - `r08-revalidacion.log`, `r08-medicion-me.txt` y `r08-autenticacion.log`;
  - `r08-academico.log` y `r08-dashboard.log`;
  - `r08-suite-bloque-1.log`, `r08-suite-bloque-1-repeticion.log` y `r08-suite-bloque-2.log`;
  - `r08-build-{prod,qa,demo}.log`, `r08-verificaciones.log` y `r08-verificaciones-final.log`.

## Conclusión de la resolución final 08

**PENDIENTE DE DECISIÓN DE SIMULADOR**

**H-58-02 queda implementada y verificada:**

- revalidación cada 60 s con vistas protegidas activas;
- revalidación al recuperar el foco;
- consultas compartidas y descarte de respuestas obsoletas;
- retirada de datos ante una revocación;
- ningún sondeo en páginas públicas.

La suite pasa 733/733 y los builds de producción, QA y demo terminan en exit 0.

**H-58-01 no puede cerrarse:**

- las rutas del simulador siguen públicas;
- su clasificación necesita la validación de Cristian y Nicolás y la decisión de Dirección Central.

**Sin cambios:** las seis rutas oficiales siguen deshabilitadas.

---

# Parte 2 · Antecedentes FE-58-05

- **Fecha:** 2026-11-22.
- **Orden:** DC-FE-58-IMPLEMENTACION-CONTROLADA-05, sobre DC-FE-58-RESOLUCION-04.
- **Responsable:** Mariana (Frontend).
- **Ejecutor:** Claude.
- **Revisión posterior:** Codex.

**En resumen:**

- La matriz aprobada está incorporada al mapeo, con tres modalidades de requisito: rol, permiso y sesión explícita.
- **Ninguna ruta está habilitada:** la habilitación efectiva (`habilitada`) es independiente de la aprobación y vale `false` en las seis rutas.
- Las demostraciones del dashboard quedan restringidas al entorno `demo` (H-58-01).
- La navegación se decide con `/me` confirmado (H-58-02).
- No se modificó el Backend, el simulador ni la narrativa. No hay commits.

## 1. SHA inicial

| Repositorio           | SHA                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Frontend              | `32ba32ab0189344e71e380a7f7a59cedbb8e7705`. Tras `git fetch origin`, `origin/develop` no avanzó |
| Backend de referencia | `773818caf62758d66019a71dac6508d13148abad`, sin modificar                                       |

## 2. Worktree y rama

`C:\Users\57316\OneDrive\Escritorio\PRISALY\PRISALY-Front-58`, rama `feature/fe-58-preparacion-navegacion`. Es el worktree existente; no se creó un segundo FE-58.

Se conservan los cambios previos de FE-58:

- el requisito de rol tipado;
- la corrección de Codex para listas dispersas (`Array.from`, ahora dentro de `modalidadRequisito`);
- su prueba de regresión `rechaza una lista dispersa…`;
- la matriz y la documentación.

## 3. Archivos modificados

**Código**

| Archivo                                               | Cambio                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autenticacion/m1-mapeo-rutas.ts`                     | Modalidad `sesion: true` explícita. `modalidadRequisito()` valida con denegación por defecto. `MapeoRutaPersonal` añade `habilitada`, `resolucion` y `verificacionQa`. Nueva decisión `preparada`. `avisoDeDecision()`. Avisos nuevos: `habilitacion-pendiente`, `verificacion-no-disponible`, `acceso-retirado` y `demostracion-no-autorizada`. La matriz aprobada se incorpora con `habilitada: false` |
| `autenticacion/m1-personal-sesion.ts`                 | `actualizarIdentidad(forzar)`: sincronización controlada de `/me`                                                                                                                                                                                                                                                                                                                                        |
| `autenticacion/m1-personal-rutas-qa.ts`               | Bloqueo de las demostraciones fuera del entorno `demo`. El guard no consulta si la ruta está pendiente o preparada; si está habilitada, confirma `/me` antes de decidir; registra la vigilancia                                                                                                                                                                                                          |
| `autenticacion/vigilancia-acceso-personal.ts` (nuevo) | Cierra la pantalla vigilada si el acceso deja de ser vigente. Ante un 403, pide una única actualización de `/me`                                                                                                                                                                                                                                                                                         |
| `autenticacion/entorno-demostracion.ts` (nuevo)       | `DEMOSTRACIONES_HABILITADAS` (se fija al compilar), `requiereEntornoDemostracion` y el proveedor para pruebas                                                                                                                                                                                                                                                                                            |
| `autenticacion/aviso-acceso-personal.ts`              | Muestra el rol ante `rol-insuficiente` (FE-58 inicial)                                                                                                                                                                                                                                                                                                                                                   |
| `academico/academico-http.ts`                         | Ante un 403 de una ruta académica en lista cerrada, notifica a la vigilancia. No reintenta y no cierra la sesión                                                                                                                                                                                                                                                                                         |
| `dashboard/dashboard.routes.ts`                       | `/dashboard/estudiante` exige el entorno de demostración                                                                                                                                                                                                                                                                                                                                                 |
| `environments/environment{,.development,.qa}.ts`      | `demostracionesHabilitadas: false`                                                                                                                                                                                                                                                                                                                                                                       |
| `environments/environment.demo.ts` (nuevo)            | Entorno `demo` explícito                                                                                                                                                                                                                                                                                                                                                                                 |
| `angular.json`                                        | Configuraciones `demo` de build y serve                                                                                                                                                                                                                                                                                                                                                                  |

**Pruebas**

| Archivo                                                   | Cambio                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `autenticacion/fe58-resolucion.spec.ts`                   | Nuevo, 30 pruebas                                                     |
| `m1-mapeo-rutas-rol.spec.ts`                              | Adaptado a la habilitación separada                                   |
| `m1-mapeo-rutas.spec.ts` y `m1-personal-rutas-qa.spec.ts` | Actualizados al nuevo comportamiento, con pruebas de bloqueo añadidas |
| `recorrido-docente.spec.ts`                               | Aviso esperado: `habilitacion-pendiente`                              |
| `dashboard.spec.ts` y `app.routes.spec.ts`                | Proveen expresamente el entorno de demostración                       |

`src/environments/senalizacion-unreal.ts` (simulador) quedó reformateado por error con Prettier y **se restauró** a la base: no tiene cambios.

## 4. Matriz aplicada

| Ruta                | Requisito aprobado  | Modalidad        | `habilitada` | `verificacionQa` |
| ------------------- | ------------------- | ---------------- | ------------ | ---------------- |
| `usuarios-docentes` | Rol `ADMINISTRADOR` | rol              | `false`      | pendiente        |
| `configuracion`     | Sesión autenticada  | sesión explícita | `false`      | pendiente        |
| `casos-academicos`  | `CONSULTAR_CASO`    | permiso          | `false`      | pendiente        |
| `rubricas`          | `CONSULTAR_CASO`    | permiso          | `false`      | pendiente        |
| `sesiones`          | `GESTIONAR_SESION`  | permiso          | `false`      | pendiente        |
| `convocatorias`     | `GESTIONAR_SESION`  | permiso          | `false`      | pendiente        |

Los cinco estados que pide la resolución se representan así:

| Estado                 | Representación                                              |
| ---------------------- | ----------------------------------------------------------- |
| Requisito aprobado     | `aprobado` y `resolucion`                                   |
| Implementación técnica | `decidirRuta` y el guard                                    |
| Habilitación efectiva  | `habilitada`                                                |
| Verificación QA        | `verificacionQa`                                            |
| Aceptación final       | No se representa en código: corresponde a Dirección Central |

## 5. Estado efectivo de la activación

**Ninguna ruta de personal se puede navegar.**

| Situación                     | Resultado                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Con sesión válida             | Las seis rutas redirigen a `/dashboard?aviso=habilitacion-pendiente`, sin consultar `/me` |
| Sin sesión                    | `/login`                                                                                  |
| Fuera de QA y fuera de `demo` | `/login`                                                                                  |

Para activar una ruta hay que cambiar `habilitada` a `true` en el código y pasar revisión. No hay ninguna bandera de entorno, URL ni almacenamiento que la active.

## 6. Inventario de rutas demostrativas

| Ruta                                                                                                 | Componente                                                            | Naturaleza                                            | Datos                                                               | HTTP                                                                               | Entorno permitido (FE-58-05)                       | Guard                                 | Acceso directo por URL                                             | Acceso desde otros componentes   |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ | -------------------------------- |
| `/dashboard` (inicio)                                                                                | `DashboardInicio`                                                     | Fuera de QA: demostración pública. En QA: autenticada | Estáticos                                                           | Ninguno (suite demo: `http.expectNone`)                                            | Fuera de QA: solo `demo`. En QA: con sesión        | `requiereSesionPersonalQa`            | Bloqueado en producción y desarrollo (`/login`)                    | Enlace «Explorar» del login      |
| `/dashboard/{usuarios-docentes, casos-academicos, rubricas, sesiones, convocatorias, configuracion}` | `DashboardDocente`, `DashboardAdministracion`, `DashboardSeccionPage` | Fuera de QA: demostración. En QA: según el mapeo      | Estáticos rotulados «demostración». Los paneles reales piden sesión | En demo, ninguno                                                                   | Fuera de QA: solo `demo`. En QA: mapeo (preparada) | `requiereMapeoPersonalQa`             | Bloqueado (`/login` o aviso)                                       | Menú y tarjetas del dashboard    |
| `/dashboard/estudiante`                                                                              | `DashboardEstudiante`                                                 | Demostración pública (también en QA)                  | Estáticos                                                           | Ninguno                                                                            | Solo `demo`                                        | `requiereEntornoDemostracion` (nuevo) | Bloqueado: `/login`, o el aviso `demostracion-no-autorizada` en QA | Menú «Mi espacio de aprendizaje» |
| `/simulador`, `/simulador-unreal`                                                                    | `SimuladorUnrealPage`                                                 | Demostración del Hospital (Unreal pendiente)          | Guiones demostrativos locales                                       | Señalización WS solo si se configura                                               | **Sin restricción nueva**                          | Ninguno                               | Público                                                            | Enlaces del simulador            |
| `/simulador-integrado`                                                                               | `SimuladorIntegradoPage`                                              | Mixta: demostración Phaser y participación M5         | Demo local o el gateway estudiantil                                 | `ParticipacionHttpGateway` (`/v1/estudiantes/**` con cookie, inoperante sin DD-02) | **Sin restricción nueva**                          | Ninguno                               | Público                                                            | Enlace desde Unreal              |
| `/simulador-tecnico-2d5`                                                                             | `SimuladorTemporal`                                                   | Demostración técnica                                  | Locales                                                             | Ninguno                                                                            | **Sin restricción nueva**                          | Ninguno                               | Público                                                            | —                                |

## 7. Restricción por entorno

**Cómo se fija:**

- `DEMOSTRACIONES_HABILITADAS` toma su valor de `environment.demostracionesHabilitadas === true` al compilar.
- Ninguna URL, parámetro ni almacenamiento puede activarla. La prueba `?demo=true&demostracionesHabilitadas=true` sigue redirigiendo a `/login`.

**Valor por entorno:**

| Entorno                                        | Demostraciones                                                                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Producción                                     | Bloqueadas (bundle: `demostracionesHabilitadas:!1`)                                                                                                  |
| Desarrollo                                     | Bloqueadas                                                                                                                                           |
| QA                                             | Bloqueadas: QA no equivale a demostración                                                                                                            |
| `demo` (`ng build/serve --configuration demo`) | Habilitadas. Sin sesión de personal, sin interceptores académicos y sin URL de backend real (`/api`). El bundle `demo` no contiene `localhost:18094` |

**Dependencia pendiente: rutas del simulador.**

- Las tres rutas del simulador no se restringieron. Restringirlas exigiría tocar el enrutado del simulador de Nicolás, y la orden prohíbe modificar el simulador.
- Además, `/simulador-integrado` mezcla demostración con el flujo estudiantil M5.
- Hace falta una decisión de Dirección Central y Nicolás.

## 8. Política de sincronización de `/me` (H-58-02)

**Cuándo se consulta:**

- **Al entrar en una ruta habilitada:** el guard llama a `actualizarIdentidad()` y decide con la identidad resultante.
- **No se consulta:** en rutas pendientes, preparadas o sin sesión.
- **Tras un 403 de una operación académica o administrativa:** `actualizarIdentidad(true)` una sola vez.

**Cómo se consulta:**

- **Una sola consulta compartida** (`share`) para solicitantes concurrentes.
- **Ventana de vigencia** de 15 s (`VIGENCIA_IDENTIDAD_MS`): una navegación rápida reutiliza la identidad recién confirmada.
- **Sin intervalos** ni consultas automáticas periódicas.

**Qué protege:**

- **No pasa a «pendiente» durante la consulta:** la identidad se conserva y no hay bucles entre el guard y `/login`.
- **Respuestas tardías:** se descartan si cambió la credencial (revisión de memoria), si la identidad ya no es la misma o si hay un inicio o cierre de sesión en curso. `comprobarRevision` del API también lo impide.
- **`invalidarSesion`** cancela la consulta en curso (`takeUntil`).
- **Respuesta con otro `userId`:** la sesión expira.
- **Vigilancia** (`VigilanciaAccesoPersonal`): mientras una pantalla autorizada está abierta, si la identidad deja de cumplir el requisito, navega a `/dashboard?aviso=acceso-retirado` (o a `/login`). Esto destruye el componente y **retira los datos mostrados**.
- **Credenciales:** no crea, renueva ni persiste nada. El token sigue solo en memoria.

## 9. Tratamiento de 401 y 403

| Respuesta                             | Tratamiento                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 401 en `/me`                          | El interceptor o el API limpia la credencial; la sesión queda `expirada`; el guard o la vigilancia lleva a `/login`                                                                                          |
| 403 en `/me` (cuenta inactiva)        | La identidad queda `acceso-denegado` y la credencial se limpia. Es la única 403 que deja la sesión inutilizable                                                                                              |
| 403 de una operación (M1, M3, M4)     | No cierra la sesión. El panel muestra el error, se confirma `/me` una vez y **no se reintenta** ningún POST, PUT, PATCH o DELETE. Si `/me` confirma la pérdida del permiso, la vigilancia cierra la pantalla |
| Red, 5xx o error desconocido en `/me` | `no-disponible`: la entrada se deniega (`verificacion-no-disponible`), la sesión se conserva y la siguiente decisión vuelve a consultar                                                                      |

## 10. Pruebas nuevas

`fe58-resolucion.spec.ts` contiene **30 pruebas**. Las habilitaciones que usa son simulaciones identificadas; el mapeo oficial no cambia.

| Bloque               | Pruebas | Qué cubren                                                                                                                                                                                                                                                                                  |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tres modalidades     | 6       | Sesión explícita y no anónima. Requisitos «solo sesión» implícitos, combinados, de tipo no booleano o con claves desconocidas quedan pendientes. El rol no sustituye al permiso ni el permiso al rol. Una ruta preparada no se autoriza (incluso con `habilitada` no booleana). Avisos      |
| Matriz oficial       | 1       | Igual a la resolución; ninguna ruta habilitada                                                                                                                                                                                                                                              |
| Sincronización `/me` | 11      | Permisos concedidos y revocados, cambio de rol, concurrencia (3 solicitantes, 1 consulta), reutilización sin consulta, 401, 403, red, otro `userId`, respuesta tardía tras un nuevo inicio de sesión, cancelación por invalidación, sin sesión                                              |
| Guard y vigilancia   | 7       | Ruta preparada sin `/me`. Revocación detectada antes de entrar. Entrada sin depender de parámetros de URL. Verificación no disponible. Solo sesión. **Pérdida de acceso con la pantalla abierta** (403 → `/me` → `acceso-retirado`, sin reintento). Dos 403 seguidos comparten una consulta |
| Demostraciones       | 5       | Valores por entorno. Valor efectivo bloqueado en la compilación de pruebas (producción). Guard con y sin QA y en `demo`. Acceso directo por URL bloqueado, también con parámetros. La ruta estudiantil declara el guard                                                                     |

**Pruebas existentes actualizadas** (cambio intencional y documentado):

- FE-54: la prueba «ninguna ruta aprobada» pasa a ser «ninguna habilitada» y los avisos esperados cambian a `habilitacion-pendiente`. Se añadió el bloqueo de demostración.
- FE-58 inicial (rol): las simulaciones pasan a `habilitada: true` y los avisos se actualizan.
- Guards QA: la demostración solo en `demo`, más una prueba nueva de bloqueo.
- FE-55: aviso actualizado.
- Las suites demo del dashboard y de rutas públicas reciben explícitamente el entorno de demostración.

## 11. Pruebas ejecutadas

Ejecutadas de una en una. Los registros están en `PRISALY/INTEGRACION-58-EVIDENCIAS/r05-*`.

| Prueba                                                              | Resultado                                                                                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Diagnóstico tras la implementación (`r05-diagnostico-1.log`)        | 41 fallos esperados por el cambio de comportamiento (demostraciones y avisos); se corrigieron actualizando las pruebas afectadas |
| Autenticación y guards (`r05-autenticacion.log`)                    | **190/190**, exit 0                                                                                                              |
| Dirigidas académicas (`r05-dirigidas-academicas.log`)               | **120/120**, exit 0                                                                                                              |
| Especificaciones de `app` (`r05-app-specs.log`)                     | 13/13, exit 0                                                                                                                    |
| Suite, bloque 1: todo salvo el simulador (`r05-suite-bloque-1.log`) | **407/407**, exit 0                                                                                                              |
| Suite, bloque 2: simulador, regresión (`r05-suite-bloque-2.log`)    | **306/306**, exit 0                                                                                                              |
| Total                                                               | **713/713** (la referencia anterior era 681)                                                                                     |

Las regresiones de FE-53, FE-54, FE-55, FE-57 y del FE-58 inicial están incluidas en el bloque 1.

## 12. Resultados de compilación

| Comando                                            | Resultado                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `ng build` (producción)                            | exit 0; solo las advertencias previas del simulador                                           |
| `ng build --configuration qa`                      | exit 0                                                                                        |
| `ng build --configuration demo`                    | exit 0                                                                                        |
| `tsc` de la aplicación y de las pruebas            | exit 0 y exit 0                                                                               |
| Prettier (código cambiado)                         | exit 0. Excepción: `app.routes.spec.ts`, que ya no era conforme en la base y no se reformateó |
| `check:urls`                                       | exit 0                                                                                        |
| `git diff --check`                                 | exit 0                                                                                        |
| Revisión de secretos (`r05-revision-secretos.log`) | Sin hallazgos: ni tokens, ni contraseñas, ni `localStorage`, `sessionStorage` o cookies       |

## 13. Riesgos

**Actualización de la auditoría independiente 06:** se reprodujo una carrera: un 403 podía reutilizar una consulta `/me` iniciada antes del rechazo y aceptar su respuesta anterior. La corrección descarta esa generación, deja los permisos y el rol pendientes de confirmación, solicita una comprobación posterior al 403 y comparte esa nueva consulta entre denegaciones concurrentes. Una pantalla vigilada se retira mientras no pueda confirmarse el acceso; no se cierra la sesión por el 403 ni se reintenta la operación. Una lista válida con claves desconocidas también se rechaza como requisito malformado. Ver `DC-FE-58-CODEX-AUDITORIA-IMPLEMENTACION-06.md` para los resultados independientes.

La ventana de 15 segundos no garantiza detección inmediata: un cambio de URL que solo modifica parámetros no necesariamente vuelve a ejecutar el guard, y una pantalla que permanece abierta sin nueva respuesta del servidor puede seguir mostrando datos ya cargados incluso después de transcurrida la ventana. La denegación de operaciones en Backend no borra datos visibles. Se requiere decisión explícita sobre detección y actualización antes de habilitar rutas.

| Riesgo                                                                                                                                                           | Mitigación o estado                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Antes, en producción y desarrollo, el dashboard demostrativo era público. Ahora redirige a `/login`. Quien lo use para presentaciones necesita el entorno `demo` | Cambio exigido por H-58-01                                                                                             |
| Las rutas del simulador siguen públicas                                                                                                                          | Dependencia pendiente (sección 7)                                                                                      |
| Ventana de vigencia de 15 s: un permiso revocado puede seguir abriendo una pantalla durante ese tiempo                                                           | El Backend deniega igualmente cada operación, y el primer 403 provoca la confirmación y el cierre                      |
| La vigilancia solo actúa tras un cambio detectado en `/me`; no hay consulta periódica                                                                            | Por diseño: no hay intervalos agresivos                                                                                |
| El interceptor académico ahora inyecta la vigilancia                                                                                                             | La señal está protegida con `try/catch` para no ocultar nunca el error original                                        |
| `configuracion` con «solo sesión»                                                                                                                                | No tiene operaciones administrativas; la única operación administrativa vive en `usuarios-docentes`, protegida por rol |

## 14. OBS-53-01

**Exposición actual:**

- `PanelAdministracionM1` muestra «Asignar» para cualquier permiso no asignado, incluido `CREAR_CASO` sobre el propio usuario administrador. Solo bloquea `PUBLICAR_CASO` y `ARCHIVAR_CASO` por separación de funciones.
- El Backend (`GestionPermisosService`) lo admite. Hoy el panel solo es accesible por API en QA, porque la ruta no está habilitada.

**Controles del servidor:**

- Exige un administrador activo.
- La separación de funciones se aplica solo a `PUBLICAR` y `ARCHIVAR`.
- Registra auditoría (`registrarExitoAlConfirmar`) tanto al asignar como al revocar.
- Revocar es lógico y puede revertirse.

No se modificó ni se eliminó nada, a la espera de la decisión aplazada de Dirección Central.

**Preguntas para Ingrid:**

1. Contrato esperado.
2. Actores autorizados.
3. Restricciones adicionales.
4. Contenido de la auditoría.
5. Política de revocación.
6. Riesgo de escalamiento: un administrador puede autoasignarse `CREAR_CASO` y luego crear casos, aunque no publicarlos.

## 15. D-05: análisis de la activación con token de un solo uso

Solo es un análisis: no se crearon endpoints ni pantallas.

| Requisito        | Propuesta                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Vigencia         | Corta, por ejemplo 24 a 72 h, configurable                                                                                             |
| Consumo único    | El token se invalida al fijar la contraseña, también ante un fallo posterior                                                           |
| Almacenamiento   | Solo un hash (por ejemplo SHA-256 con sal), nunca el token en claro. Asociado a `idUsuario`, con un propósito explícito (`ACTIVACION`) |
| Expiración       | Comprobada en el servidor. Un token expirado responde igual que uno inexistente, sin revelar si la cuenta existe                       |
| Reutilización    | Rechazada, con auditoría del intento                                                                                                   |
| Reenvío          | Lo solicita un administrador; invalida los tokens anteriores; con límite de frecuencia                                                 |
| Invalidación     | Al activar, al desactivar la cuenta, al reenviar o por decisión administrativa                                                         |
| Auditoría        | Emisión, reenvío, consumo, intentos fallidos y expiración, sin registrar el token                                                      |
| Estado de cuenta | «Pendiente de activación» hasta consumir el token. Hoy aparece `Activo` sin credencial                                                 |
| Entrega          | Canal fuera de banda aprobado (correo institucional u otro), a decidir                                                                 |

## 16. Decisiones pendientes

1. **Dirección Central:** autorizar la habilitación ruta por ruta tras la verificación QA.
2. **Dirección Central y Nicolás:** si las rutas del simulador quedan restringidas al entorno `demo` (H-58-01).
3. **Dirección Central:** OBS-53-01, la autoasignación de `CREAR_CASO`.
4. **Ingrid:** el contrato D-05.
5. **Ingrid:** las respuestas sobre OBS-53-01 (sección 14).

## 17. Estado de Git

| Elemento                 | Estado                                            |
| ------------------------ | ------------------------------------------------- |
| Archivos modificados     | 15 (+419/−59)                                     |
| Archivos nuevos          | 5 de código y pruebas, más `docs/integracion-58/` |
| Commits, push, PR, merge | Ninguno                                           |

## 18. Recomendación de publicación

Publicar este incremento tras la revisión independiente de Codex. Aunque se publique, **no habilita ninguna ruta**.

## 19. Recomendación de habilitación

No habilitar todavía. Pasos para habilitar:

1. Ejecutar en QA real, navegando, el plan E2E de `DC-FE-58-PREPARACION-AUTORIZACION-RESULTADO.md` (sección 14), con un `MAPEO_RUTAS_PERSONAL` habilitado solo en la sesión de prueba.
2. Registrar la evidencia y cambiar `verificacionQa`.
3. Obtener la autorización de Dirección Central.
4. Cambiar `habilitada` ruta por ruta.

## 20. Evidencias QA

No se ejecutaron pruebas contra QA real en esta fase. La resolución mantiene las rutas sin habilitar y no hubo confirmación de Ingrid sobre la disponibilidad del entorno para esta orden. Todas las pruebas de esta entrega usan HTTP simulado.

La evidencia real vigente sobre el mismo Backend `773818c` es la de FE-57: administración M1, recorrido M3 y M4 con persistencia, y navegador con los guards.

## Conclusión de FE-58-05 (histórica; sustituida por la Parte 1)

**LISTO PARA REVISIÓN INDEPENDIENTE** (en su momento)

Están implementados y verificados:

- las tres modalidades;
- la matriz aprobada sin habilitar;
- la restricción de demostraciones del dashboard por entorno;
- la sincronización controlada de `/me`, con vigilancia y tratamiento de 401 y 403.

La suite pasa 713/713 y los builds de producción, QA y demo terminan en exit 0.

Quedan fuera:

- **Rutas del simulador:** su restricción por entorno queda pendiente de decisión (sección 7). La orden prohíbe modificar el simulador.
- **Navegación productiva:** **no está habilitada**.
