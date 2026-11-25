# DC-SIM-NIC-I5-CIERRE-02 — Inventario Git acumulado

Fecha: 13 de noviembre de 2026. Inventario local solicitado tras la aceptación del incremento como PREPARADO.

## Estado de conservación

- Repositorio: `PRISALY-Front`.
- Rama: `feature/simulador-integracion-nicolas`.
- HEAD/base: `fd88daa6b81a61aaea693ce6a420855eed21c499`.
- Antes de crear este inventario: **24 archivos pendientes: 6 modificados y 18 nuevos sin seguimiento**.
- Índice vacío: ningún archivo preparado para commit.
- Este inventario añade un documento nuevo: total final previsto **25 archivos pendientes: 6 modificados y 19 nuevos sin seguimiento**.
- `M` significa archivo versionado modificado respecto a HEAD; `??` significa archivo local nuevo todavía sin seguimiento. No significa que se haya agregado a un commit.

Se conservó el contenido anterior sin descartarlo ni reescribirlo. Esta entrega solo añade el inventario; no modifica funcionalidades, contratos, motor, navegación ni Backend. No se ejecutaron commit, push, PR, merge ni nuevas pruebas.

## 1. Coordinador y tipado de participación

Las rutas de código de las tablas son relativas a `src/app/features/simulador/`.

| Estado | Archivo | Alcance acumulado |
| --- | --- | --- |
| `??` | `models/participacion.models.ts` | Modelos compartidos de intento, estado y respuesta confirmada existentes en N9. |
| `??` | `services/participacion.coordinador.ts` | Estado académico, carga, revisiones, guardado y reconciliación; ampliado en I5 con lectura/cancelación de contenido. |
| `??` | `services/participacion.coordinador.spec.ts` | Pruebas del coordinador con N9 y HTTP interceptado. |

## 2. Enlace narrativo

| Estado | Archivo | Alcance acumulado |
| --- | --- | --- |
| `??` | `services/enlace-narrativo.ts` | Validación de vínculos explícitos, confirmación antes de aplicar efectos, estado reactivo y bloqueo de cambios de respuestas confirmadas. |
| `??` | `services/enlace-narrativo.spec.ts` | Pruebas del enlace, motor y coordinador. |

## 3. Contenido académico I5

| Estado | Archivo | Alcance acumulado |
| --- | --- | --- |
| `??` | `models/contenido-intento.models.ts` | DTO estudiantil de contenido del PR Backend #88. |
| `??` | `services/leer-contenido-intento.ts` | Proyección permitida y validación de identificadores, nulos, relaciones y orden. |
| `??` | `services/contenido-http.gateway.spec.ts` | GET de contenido, credenciales, validación y clasificación de errores. |
| `??` | `components/contenido-academico.ts` | Composición de lectura sin vínculos narrativos inferidos ni controles de respuesta. |
| `??` | `pages/simulador-contenido.spec.ts` | Pruebas de composición, cancelación y lectura sin escrituras. |
| `??` | `testing/contenido-intento.fixture.ts` | Datos sintéticos exclusivos de pruebas. |

## 4. Gateway N9 compartido entre los incrementos

Estos archivos reúnen cambios de más de un incremento. No se atribuyen exclusivamente al contenido académico ni al coordinador.

| Estado | Archivo | Alcance acumulado |
| --- | --- | --- |
| `M` | `services/participacion.gateway.ts` | Tipado de GET/PUT, nueva consulta de contenido y operación pendiente por defecto. |
| `M` | `services/participacion-http.gateway.ts` | Extracción/reexportación de modelos, conservación de GET/PUT y preparación del GET de contenido. |
| `M` | `services/participacion.gateway.spec.ts` | Verificación de que la nueva consulta sigue bloqueada por defecto. |

## 5. Integración compartida con Cristian

La edición de panel y página fue coordinada previamente según confirmación del usuario en esta conversación. No se modificó `narrativa/motor-narrativo.ts` ni los guiones demo.

| Estado | Archivo | Alcance acumulado |
| --- | --- | --- |
| `M` | `components/panel-narrativo.ts` | Entrada opcional del enlace, controles coordinados, preservación de demostración y restricción de cambios confirmados. |
| `M` | `pages/simulador-page.ts` | Contexto académico opcional, coordinador, carga de contenido, ciclo de vida y errores. |
| `M` | `pages/simulador-page.html` | Composición de narrativa/lectura y estados de carga, guardado, conflicto y error. |
| `??` | `pages/simulador-participacion.spec.ts` | Pruebas de integración de página/panel/coordinador, cancelación y respuestas confirmadas. |

## 6. Documentos acumulados

Rutas relativas a la raíz del repositorio.

| Estado | Archivo | Contenido |
| --- | --- | --- |
| `??` | `docs/simulador-etapa-02-diagnostico.md` | Diagnóstico inicial conservado como registro histórico. |
| `??` | `docs/simulador-etapa-03-contrato-motor-gateway.md` | Propuesta inicial del contrato interno y dependencias. |
| `??` | `docs/simulador-tipado-coordinador.md` | Incremento de tipado y coordinación. |
| `??` | `docs/simulador-enlace-narrativo.md` | Incremento del enlace narrativo. |
| `??` | `docs/simulador-integracion-panel.md` | Integración de panel/página anterior a I5. |
| `??` | `docs/DC-SIM-NIC-I5-01-CIERRE.md` | Informe de cierre I5, 188 pruebas y restricciones finales de ese incremento. |
| `??` | `docs/DC-SIM-NIC-I5-CIERRE-02-INVENTARIO-GIT.md` | Este inventario, único archivo creado para CIERRE-02. |

## 7. Diferencia de los seis archivos versionados

Estadísticas observadas con `git diff --numstat`, respecto a HEAD. Incluyen formato y todos los incrementos acumulados; no representan únicamente líneas funcionales nuevas.

| Archivo relativo a `src/app/features/simulador/` | Líneas añadidas | Líneas eliminadas |
| --- | ---: | ---: |
| `components/panel-narrativo.ts` | 142 | 36 |
| `pages/simulador-page.html` | 175 | 83 |
| `pages/simulador-page.ts` | 110 | 2 |
| `services/participacion-http.gateway.ts` | 19 | 20 |
| `services/participacion.gateway.spec.ts` | 1 | 0 |
| `services/participacion.gateway.ts` | 19 | 9 |

Los archivos `??` no aparecen en esas estadísticas porque todavía no forman parte del índice; sí están enumerados íntegramente arriba.

## Conservación para integración

El incremento permanece **PREPARADO**, con las 188 pruebas previamente reportadas y aceptadas. No se repitieron, porque no hubo cambios de código en esta entrega.

`provideParticipacionHttp()` permanece desactivado por defecto. No se adaptó el contrato a cambios hipotéticos, ni se habilitaron DD-02, inicio/finalización o M6. No se modificó Backend ni navegación global.

**Bloqueos concretos para mantener el trabajo local: ninguno observado.** La revisión futura de compatibilidad queda a la espera de la versión definitiva del PR #88 confirmada por Dirección Central. No se inició otra auditoría ni funcionalidad.
