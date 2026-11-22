# DC-FE-53 — Cierre y publicación 07

Fecha: 2026-11-21. Rama `feature/fe-53-integracion-academica`; base `d0bd0c916e3fe2f4173f7cc2e3a08c37257e0dd8`.

## Concurrencia

Los ETag de contenido y rúbrica representan el agregado del caso en Backend `773818caf62758d66019a71dac6508d13148abad`. El panel lee contenido antes de rúbrica, exige ETag coincidentes para una rúbrica existente y bloquea la edición ante diferencias o ausencia de una versión. Si no hay rúbrica, usa el ETag previo del contenido; `If-Match` impide aceptar un cambio posterior. Un 412 o 428 bloquea el guardado hasta recargar. El detalle y la evidencia anterior están en `DC-FE-53-CODEX-CIERRE-CONCURRENCIA-06.md`. La prueba dirigida reproduce el desacuerdo entre versiones; 21/21 pasaron.

## Validación

Suite completa secuencial: Chrome Headless 157, 576/576 SUCCESS, cero fallos, salida 0. Chrome emitió un aviso de cierre a los dos segundos; Karma terminó normalmente. No se identificó la causa exacta del aviso. Al comienzo había poca memoria libre y un `ng serve` de otro worktree que se preservó. No se alteraron pruebas, simulador ni timeouts. Builds de producción y QA, TypeScript app/spec, Prettier y control de URLs pasaron en el cierre 06 posterior a la corrección. `git diff --check` aprobado.

## Seguridad y archivos

El interceptor solo añade Bearer con opt-in QA, contexto explícito y método/ruta permitidos bajo la base configurada; 401 limpia la credencial de la misma revisión de sesión. Las respuestas 401 y 403 se clasifican sin presentar mensajes internos. Producción no registra el interceptor académico. El guard QA mantiene el bloqueo por mapeo pendiente; la autorización final corresponde al backend. Los servicios M1/M3/M4 validan identificadores y respuestas, usan DTO acotados y M3 conserva ETag/If-Match. La matriz y los informes conservan la distinción entre pruebas reales anteriores, dobles HTTP y navegación bloqueada. Una revisión de los archivos nuevos y modificados, nombres de archivo y patrones de claves, credenciales y tokens identificó únicamente un token ficticio de pruebas; no se encontraron respaldos ni credenciales en el conjunto revisado. Esta búsqueda no garantiza detectar todos los secretos posibles. Evidencias privadas y credenciales locales quedan fuera del commit.

## QA HTTP

La API local escuchaba en 18094 y PostgreSQL INT50 estaba activo. Un intento autorizado previo con la cuenta docente QA devolvió 401; no se repitieron intentos ni se modificaron cuentas. Estado, perfil efectivo, vigencia y posible bloqueo de la cuenta no fueron confirmados. La prueba real de concurrencia de Claude, anterior a esta revisión, registra 412 y persistencia de la versión posterior; Codex no la reprodujo. Para repetirla, Ingrid debe confirmar la identidad y estado de la cuenta QA, el perfil y la conexión de la API y proporcionar un mecanismo seguro para una credencial ficticia vigente, sin compartirla en el repositorio.

## Publicación y pendientes

El último fetch antes de publicar situó `origin/develop` en la base indicada. Continúan BLQ-53-01 (mapeo ruta-permiso), D-05, OBS-53-01, ausencia de interfaz de contenido y listados Backend, y la repetición HTTP real. Este documento registra el estado previo a los commits; los identificadores de commit, PR, revisiones, merge y SHA final deben verificarse en GitHub y en la entrega de Codex, no se anticipan aquí.
