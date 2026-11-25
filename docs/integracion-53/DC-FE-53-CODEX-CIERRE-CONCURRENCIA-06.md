# DC-FE-53 — Cierre de concurrencia 06

Fecha: 2026-11-21. Estado: revisión y publicación pendientes.

## Contrato y corrección

Se inspeccionó el código Backend del commit `773818caf62758d66019a71dac6508d13148abad` mediante Git, sin modificar el backend. `CasoContenidoConsultaController` y `CasoRubricaController` consultan `consultarContenido` y generan el ETag a partir de `result.fingerprint()`: es la versión del agregado del caso, no una versión independiente de la rúbrica. El PUT usa `If-Match` para actualizar el agregado; la prueba HTTP del backend en ese commit comprueba 412 con versión obsoleta y 428 sin cabecera. El PUT reemplaza las asociaciones.

El panel antes hacía las dos lecturas en paralelo y podía combinar contenido antiguo con rúbrica nueva y guardar con la versión nueva, omitiendo asociaciones. Ahora lee contenido antes de rúbrica, compara sus ETag cuando la rúbrica existe y bloquea el guardado si faltan o difieren. Si la rúbrica todavía no existe usa el ETag anterior del contenido: una creación concurrente posterior invalida ese ETag. No se modificó Backend ni se eliminó If-Match. Se añadió prueba de versiones distintas y se adaptaron los datos de prueba al contrato compartido.

## Pruebas

- Prueba de paneles: 21/21 aprobadas, salida 0. Incluye versiones distintas, 412, 428 y bloqueo de guardado.
- Prueba HTTP real previa, realizada por Claude y registrada en `INTEGRACION-53-EVIDENCIAS/prueba-real-karma.log`: PUT con ETag anterior devolvió 412 y la relectura conservó la versión posterior. Es evidencia anterior, no repetición de este cierre.
- Repetición actual: el servidor QA respondió, pero el login con la credencial local de docente devolvió 401. No se creó ni modificó dato alguno. Quedan pendientes la prueba concurrente real completa, el mensaje visible en Angular conectado a QA y la recarga real.
- Build producción y build QA: salida 0. TypeScript app y spec: salida 0. Prettier de código nuevo y archivos modificados: aprobado. `npm run check:urls`: aprobado. `git diff --check`: aprobado para archivos rastreados.
- Suite completa posterior a la corrección: el registro mostró 576/576 SUCCESS; Chrome Headless no cerró y Karma permaneció activo. Se interrumpió el proceso, por lo que no se dispone de salida 0 final. Debe repetirse y confirmar que la prueba añadida se incluye. Antes de la corrección hubo una ejecución 576/576 con salida 0.

## Seguridad y revisión pendiente

El interceptor se registra solo con `personalQaHabilitado`, exige contexto explícito y limita Bearer a métodos y rutas exactos bajo la base configurada. Los guards de QA preservan el bloqueo por mapeo de permisos pendiente; producción mantiene la demostración pública y no registra el interceptor. El backend decide permisos. No se alteraron guards, simulador ni políticas. La inspección de seguridad, DTO, documentos, matriz, datos personales, secretos y archivos temporales no se ha completado y no se afirma ausencia total de secretos. La búsqueda preliminar encontró solo un valor de prueba y referencias documentales; no sustituye una auditoría integral.

## Git y publicación

Worktree `PRISALY-Front-53`, rama `feature/fe-53-integracion-academica`, HEAD `d0bd0c916e3fe2f4173f7cc2e3a08c37257e0dd8`. El fetch anterior situó `origin/develop` en ese mismo SHA; se debe repetir antes de publicar. No se crearon commits ni se hizo push, PR o merge. URL de PR y SHA final de integración: inexistentes. `gh` no está instalado. No se han verificado protecciones o revisiones de GitHub.

Bloqueos: completar revisión integral y auditoría de secretos; obtener acceso QA válido y repetir concurrencia; repetir suite con terminación limpia; verificar remoto y protecciones. Persisten BLQ-53-01, D-05, OBS-53-01 y las limitaciones de contenido y listados documentadas en el avance.
