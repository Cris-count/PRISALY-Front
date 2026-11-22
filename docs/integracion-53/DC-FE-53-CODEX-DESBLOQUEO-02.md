# DC-FE-53 — Diagnóstico de desbloqueo

Fecha: 2026-11-21. Decisión: **revisión pendiente; no publicar**. La causa de las fallas originales no se ha determinado.

## Estado y referencia

Rama `feature/fe-53-integracion-academica`, HEAD `d0bd0c916e3fe2f4173f7cc2e3a08c37257e0dd8`. Fetch confirmó `origin/develop` en el mismo SHA. Se conservan los nueve archivos modificados y los 22 archivos nuevos originales; se añadió el informe anterior y este informe. El worktree limpio `PRISALY-Front-53-BASE` usa ese SHA y un enlace a las mismas dependencias. No se modificó el simulador ni se crearon commits, push o PR.

## Fallas originales

Suite completa en Chrome Headless 157.0.0.0, Windows, Node 24.22.3: 574/576 aprobadas. Tiempo de pruebas 1 min 25,883 s. No se registraron métricas fiables de procesos o memoria en aquel momento.

1. `Ciclo de vida de Phaser destruye la escena antes de crear otra en el mismo contenedor`, `src/app/features/simulador/mundo-tecnico/phaser-mundo.spec.ts:62`: `Expected 1 to be 0` en línea 84:60 y `Expected 2 to be 1` en línea 88:60; stack: `<Jasmine>`, líneas indicadas, `Generator.next (<anonymous>)`, `fulfilled (chunk-3OM2B56S.js:118:24)`.
2. `Dashboard público de demostración todas las vistas se adaptan a 1440px con texto al 100% sin desbordar y conservan la navegación`, `src/app/features/dashboard/dashboard.spec.ts:754`: `Error: Timeout - Async function did not complete within 5000ms (set by jasmine.DEFAULT_TIMEOUT_INTERVAL)`, stack `<Jasmine>`.

## Comparación

Ejecuciones secuenciales con Chrome Headless 157, mismo Node y dependencias compartidas; se ejecutaron archivos spec completos, no solo cada caso individual.

| Ejecución | FE-53 | Base develop |
| --- | --- | --- |
| Phaser por separado | 3/3; 9,062 s | 3/3; 9,020 s |
| Dashboard por separado | 38/38; 10,857 s | 38/38; 11,856 s |
| Ambos archivos juntos | 41/41; 19,733 s | 41/41; 17,813 s |

ChromeHeadless informó dificultades al cerrarse en varias ejecuciones. Los resultados demuestran que las fallas originales no se reprodujeron en estas condiciones, pero no prueban su causa ni descartan interacción con el resto de la suite. Clasificación de ambas: causa no determinada. Faltan repeticiones controladas de la suite completa y mediciones de recursos. No se alteraron timeouts ni pruebas.

## Comprobaciones adicionales

Prettier de código académico y archivos modificados: aprobado. `npm run check:urls`: aprobado. `git diff --check`: sin errores. Las compilaciones de producción y QA y TypeScript pasaron en la revisión anterior; la suite completa falló como se describe arriba. No se repitieron pruebas HTTP reales; no se confirmó disponibilidad QA. La inspección parcial muestra registro del interceptor académico solo bajo `personalQaHabilitado` y el guard de mapeo sigue referenciado; la revisión integral de seguridad, secretos, permisos, documentación, matriz y archivos nuevos sigue pendiente. No se afirma que no existan secretos ni defectos de seguridad.

No hubo correcciones de código. Antes de publicar deben completarse el diagnóstico diferencial y repetición controlada de la suite completa, la revisión integral pendiente y las pruebas HTTP cuando QA esté disponible. Persisten BLQ-53-01, D-05 y OBS-53-01. No hay commits ni PR.
