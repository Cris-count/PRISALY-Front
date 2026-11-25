# DC-FE-54 — Revisión de publicación 01

Fecha: 2026-11-22. Estado al preparar los commits: revisión técnica completada para PR; aceptación funcional integral pendiente.

## Git y alcance

Worktree `PRISALY-Front-54`, rama `feature/fe-54-navegacion-contenido-m3`, HEAD inicial y `origin/develop` tras fetch: `15cf6ae017232b36bad7f9659075bc0254f422bf`. Se revisaron los siete archivos modificados, seis archivos nuevos de código/pruebas y los cuatro documentos de entrega, matriz y dependencias. Sin cambios en Backend, migraciones, simulador ni M5. Se sustituyeron rutas absolutas de la estación en dos documentos por nombres genéricos para no publicarlas. No se modificó código de Claude.

## Seguridad, permisos y concurrencia

Las rutas de personal mantienen `aprobado: null`; el guard QA requiere sesión y no autoriza por rol ni por permisos informativos. Fuera de QA se conserva el comportamiento público de demostración anterior, no acceso académico autenticado. La autorización efectiva corresponde al Backend. El aviso muestra permisos de `/me` y no el token; los valores de aviso desconocidos se ignoran. El interceptor añade Bearer solo con opt-in QA y contexto explícito para una lista cerrada de métodos y rutas bajo la base configurada; FE-54 añade únicamente tres POST con UUID para contenido.

El panel conserva contenido y ETag de la misma respuesta, envía If-Match, relee tras cada alta y bloquea tras 412/428 o fallo de relectura posterior a un alta confirmada. La corrección de rúbricas FE-53 se conserva. No se identificó autorización indebida ni un defecto crítico en el alcance revisado. La inspección de los archivos y patrones de claves/tokens/contraseñas mostró únicamente valores ficticios en pruebas; no se incluirán credenciales, respaldos, temporales ni evidencias privadas. La búsqueda de patrones no garantiza detectar todos los secretos posibles.

## Validaciones independientes de Codex

- Build producción y QA, TypeScript app/spec, Prettier, control de URLs y `git diff --check`: salida 0.
- Suite completa: una primera ejecución informó 617/618 con detalle de la falla truncado; Karma se interrumpió. La repetición completó 618/618 y salida 0, con aviso de cierre lento de Chrome. No se estableció la causa de la primera falla.
- Pruebas dirigidas de contenido M3, rúbricas y guard: un intento anterior se desconectó por ping timeout y otro completó 63/63 aserciones pero se interrumpió al cerrar. La nueva repetición controlada terminó **63/63, salida 0**.
- La memoria libre cayó a unos 39 MB durante la revisión anterior; la presión de recursos es una observación y no una causa demostrada de la primera falla.

## Evidencia QA y documentación

Los registros externos aportados por Claude muestran pruebas dirigidas 215/215 y prueba HTTP real 1/1 con salida 0, incluida la persistencia y los casos 412, 428 y 403 descritos en el avance. Son evidencia de Claude; no son pruebas HTTP repetidas por Codex, ni constituyen aceptación E2E independiente. Al cierre de esta revisión el puerto QA 18094 no respondía y el motor Docker no estaba disponible, de modo que no se modificaron datos ni se repitió QA.

La matriz distingue permisos de Backend de aprobación de rutas. El documento de listados identifica como dependencias los listados de casos, usuarios y estudiantes y no propone consultas masivas como sustituto. Siguen pendientes BLQ-53-01, D-05, OBS-53-01, contratos de listados y operaciones de edición/eliminación de contenido. No se declara navegación real aceptada ni se activan permisos supuestos.

## Publicación

Se preparan los commits de código y documentación y el PR hacia `develop`; los identificadores definitivos de ambos commits y del PR se informan en el propio PR y en la entrega de Codex. Se excluyen `INTEGRACION-54-EVIDENCIAS/`, credenciales QA locales, `src/qa-int/`, volcados y otros temporales. La orden autoriza abrir el PR; **no autoriza fusionarlo**. La revisión del equipo, la aprobación institucional y los checks del PR permanecen sujetos a GitHub.

Commit de código: `b848388`. El SHA del commit de documentación y la URL del PR se verifican en GitHub después de crearlos; esta línea describe el estado previo a su creación.
