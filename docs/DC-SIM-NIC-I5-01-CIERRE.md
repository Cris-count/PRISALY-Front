# PRISALY — DC-SIM-NIC-I5-01 | CIERRE

Fecha: 13 de noviembre de 2026, America/Bogota.

**Estado: PREPARADO.** Consumo tipado del contenido y composición de lectura implementados y verificados localmente. Participación real y E2E pendientes de las condiciones Backend/QA descritas abajo; no se activaron.

## 1. Rama y referencias

- Frontend: `feature/simulador-integracion-nicolas`.
- HEAD/base: `fd88daa6b81a61aaea693ce6a420855eed21c499`. Sin diferencias entre HEAD y la referencia local `origin/develop` consultada.
- Backend de referencia: `22162e3e57458b80b7dd4efaa8d66c7e7194262c`.
- Contrato inspeccionado con `git show`: `origin/feature/sim-lectura-estudiantil-intento`, SHA `7fb048f1e7f0341d0df87fc4a4e69e87debdcd8c`, [PR #88](https://github.com/Cris-count/PRISALY-Backen/pull/88).
- Se consultaron los records Java, el controlador y `m5/docs/CONTENIDO-INTENTO-ESTUDIANTE.md` de esa rama, sin cambiar el checkout del Backend ni copiar su código a Angular.
- La consulta del estado del PR mediante el conector GitHub falló por transporte. No se afirma CI aprobada ni merge; la referencia consultada es el commit inicial indicado en la orden. No se realizaron pruebas positivas contra ese Backend.

## 2. Conservación del trabajo anterior

Se conservaron los modelos M5, coordinador, enlace, página, panel y pruebas anteriores. El motor `MotorNarrativo`, los guiones demostrativos y las pantallas/navegación globales no se modificaron.

Los cambios anteriores siguen locales y sin commit, push ni PR; este incremento también. No se creó otra rama, ni se utilizó reset, clean, stash o descarte. El Backend conserva su rama y archivos locales pendientes.

La edición compartida de página/panel mantiene la coordinación con Cristian confirmada previamente por el usuario. El panel solo incorpora en este incremento la restricción de cambio de respuestas confirmadas ordenada en CONTINUIDAD-06; no se modificó el motor.

## 3. Archivos de este incremento

Rutas relativas a `src/app/features/simulador/`:

| Archivo | Cambio |
| --- | --- |
| `models/contenido-intento.models.ts` | Nuevo DTO estudiantil tipado. |
| `services/leer-contenido-intento.ts` | Validación y proyección por lista permitida. |
| `services/participacion.gateway.ts` | Nueva operación tipada y comportamiento pendiente por defecto. |
| `services/participacion-http.gateway.ts` | Nuevo GET preparado, reutilizando URL, credenciales y errores de N9. |
| `services/participacion.gateway.spec.ts` | Verifica bloqueo de la nueva operación por defecto. |
| `services/participacion.coordinador.ts` | Carga de contenido aislada, estados y cancelación dentro del coordinador existente. |
| `components/contenido-academico.ts` | Composición de lectura sin controles de respuesta ni narrativa inferida. |
| `pages/simulador-page.ts` y `.html` | Entrada opcional de lectura y composición; sin cambios de rutas/proveedores globales. |
| `services/enlace-narrativo.ts` | Bloquea decisiones que cambiarían una respuesta ya confirmada. |
| `components/panel-narrativo.ts` | Deshabilita esas decisiones en la presentación. |
| `services/contenido-http.gateway.spec.ts` | Contrato HTTP, validaciones y errores. |
| `pages/simulador-contenido.spec.ts` | Presentación, contexto, cancelación y bloqueo de escrituras. |
| `pages/simulador-participacion.spec.ts` | Prueba adicional de prohibición de cambio de respuesta confirmada. |
| `testing/contenido-intento.fixture.ts` | Datos sintéticos exclusivos de pruebas; nunca se registran en la aplicación. |

Este informe es el único documento nuevo del incremento. Los documentos de etapas anteriores se mantienen como registro histórico, no describen la totalidad del estado final actual.

## 4. DTO Angular

`ContenidoIntentoM5`: `idIntento`, `idSesion`, `caso`.

- `CasoContenidoM5`: `idCaso`, `titulo`, `historia`, `desarrolloSituacional`, `escenarios`.
- `EscenarioContenidoM5`: `idEscenario`, `titulo`, `contexto`, `instrucciones`, `orden`, `preguntas`.
- `PreguntaContenidoM5`: `idPregunta`, `enunciado`, `orden`, `opciones`.
- `OpcionContenidoM5`: `idOpcion`, `texto`, `orden`.

Todos los identificadores son cadenas UUID. Historia y desarrollo situacional admiten `null`; también título, contexto e instrucciones de escenario. Título del caso, enunciado y texto de opción son cadenas. Las colecciones son arreglos de solo lectura y `orden` es un entero del rango Java `int`.

Los textos vacíos y nulos se conservan sin inventar reemplazos. No hay propiedades de corrección, explicación, rúbrica, peso, nota, retroalimentación ni guion SIM-01.

## 5. Operación preparada

```ts
consultarContenidoIntento(intentoId: string): Observable<ContenidoIntentoM5>
```

La implementación N9 prepara GET `v1/estudiantes/intentos/{idIntento}/contenido` relativo a la URL base. Con `/api` configurado produce exactamente `/api/v1/estudiantes/intentos/{idIntento}/contenido`.

Envía `withCredentials: true`, sin identidad estudiantil suministrada por el cliente, sin leer cookies HttpOnly y sin añadir Bearer. Mantiene `FalloParticipacionError`, estados HTTP y códigos técnicos canónicos; no convierte errores en éxito ni expone mensajes internos.

El contrato Backend declara `Cache-Control: no-store`. No se implementó almacenamiento en localStorage, sessionStorage, IndexedDB ni caché persistente de aplicación. La carga mantiene el contenido solamente en memoria y lo elimina al salir/cambiar contexto.

El gateway pendiente sigue siendo la implementación por defecto. La nueva operación falla explícitamente en ella; `provideParticipacionHttp()` continúa sin registro global.

## 6. Estados y validaciones

- Entrada UUID inválida: rechazo antes de HTTP.
- Respuesta: UUID en todos los niveles, correspondencia con el intento solicitado, tipos y campos requeridos, nulos permitidos, enteros y arreglos.
- No admite IDs duplicados del mismo tipo, incluso preguntas u opciones repetidas entre padres distintos.
- Conserva el orden suministrado. Rechaza listas que incumplan orden ascendente por `orden` y desempate por UUID, en vez de inventar una secuencia local.
- Construye un objeto nuevo solo con campos permitidos; descarta campos adicionales reservados si aparecieran por error.
- Consulta de contenido: `inactivo`, `cargando`, `disponible`, `error`.
- Salir, destruir la página o cambiar contexto cancela suscripciones, invalida resultados anteriores y elimina contenido previo.

La nueva entrada opcional `idIntentoContenido` habilita únicamente composición de lectura para un integrador futuro. No está conectada a parámetros URL ni la suministra la ruta actual. Si se reciben simultáneamente esa entrada y un contexto narrativo, se rechaza la combinación sin solicitudes.

El componente muestra historia, desarrollo, escenarios, instrucciones, preguntas y opciones como texto seguro. Expresa: **“Contenido académico disponible. Experiencia narrativa no vinculada.”** No ofrece inputs, guardado, edición, inicio ni finalización. Cargar contenido no carga un intento editable: un llamado a `guardar` sin ese contexto válido no envía PUT.

El enlace narrativo preexistente tampoco permite ofrecer una opción distinta para una pregunta ya confirmada. Puede recorrer la misma elección confirmada sin otro PUT. El gateway PUT conserva su contrato técnico y CAS; no se implementó una política académica de edición.

## 7. Pruebas y verificación reales

Entorno: Node 24.22.1 incluido con la aplicación, Angular 22 y Chrome Headless 157. Sin cambiar el Node global, manifiestos ni lockfile.

| Comprobación | Resultado |
| --- | --- |
| Suite Angular completa, `ng test --watch=false --browsers=ChromeHeadless` con el Node compatible | **188 SUCCESS**, incluidas las 148 anteriores y 40 nuevas. |
| `ng build` de producción | Correcto; paquete inicial 248.50 kB, transferencia estimada 69.88 kB; sin exceder presupuestos. |
| `tsc -p tsconfig.app.json --noEmit` | Correcto. |
| `tsc -p tsconfig.spec.json --noEmit` | Correcto. |
| `scripts/verificar-urls-api.mjs` | Sin URLs Backend codificadas en `src/app`. |
| `git diff --check` | Sin errores; solo avisos normales LF/CRLF. |

Las 40 pruebas nuevas cubren: GET correcto, URL base única, credenciales, campos nulos/vacíos, orden y desempates, validación de IDs/campos/duplicados, ausencia de campos reservados en la proyección, 400/401/403/404/409/500/503, conservación del código `CONTENIDO_INTENTO_NO_DISPONIBLE`, bloqueo del proveedor por defecto, contenido de lectura, cancelación, ausencia de escrituras sin contexto editable, texto seguro y prohibición de cambio desde el panel.

Se usó `HttpTestingController`, sin Backend real. La prueba de storage verifica ausencia de llamadas a `Storage.setItem` en la carga y presentación de contenido; el código tampoco incorpora otros mecanismos persistentes. No se declara E2E real, persistencia verificada, autenticación de QA ni inspección visual manual.

## 8. Compatibilidad y restricciones

- SIM-01: regresión de ambos recorridos demostrativos correcta; demostración sin solicitudes académicas.
- N9: GET de intento y PUT mantienen rutas, cuerpos, credenciales, clasificación y control de revisión. Pruebas anteriores aprobadas.
- Coordinador: ampliado, no sustituido. Sin reenvíos automáticos de escrituras.
- No se activaron DD-02, proveedor HTTP, nuevas rutas Angular, inicio/finalización ni M6.
- No se interpretan escenarios persistidos como escenas narrativas, ni se vinculan decisiones por posición, texto o índice.

## 9. Dependencias y siguiente acción

La implementación se preparó sobre el DTO inicial del PR #88. Para integrar de verdad se requiere confirmar su corrección arquitectónica, CI completa, merge autorizado y SHA definitivo de `develop`; después contrastar ese DTO definitivo con los tipos y validaciones preparados aquí.

La prueba positiva de integración requiere además entorno QA expresamente autorizado, DD-02 con esquema/configuración adecuados, sesión estudiantil válida y un intento existente asociado a sesión y caso reales acordados con Backend. No se habilitó nada de ello.

La narrativa real sigue dependiendo de un contrato de guion y de correspondencias oficiales con preguntas/opciones. El GET de contenido no entrega esa relación. Las reglas pendientes de elegibilidad, ingreso tardío, duración, repetición, modificación de respuestas, cierre y evaluación no se resolvieron desde Angular.

**Siguiente acción concreta:** Dirección Central debe proporcionar el SHA definitivo integrado de #88 y autorizar el alcance/datos del ensayo QA. Entonces se cotejará el contrato final y se podrá verificar la lectura autenticada. La vinculación narrativa y cualquier commit/push/PR requieren su autorización correspondiente.

Se entrega este resultado y se espera la siguiente autorización; no se inició otro incremento.
