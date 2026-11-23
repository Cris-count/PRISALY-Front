# FE-58: auditoría independiente de implementación 06

## Dictamen

**BLOQUEADO — REQUIERE DECISIÓN.** Se corrigieron dos defectos reproducibles y las regresiones indicadas abajo terminaron correctamente. No se puede dar por cerrada H-58-01 para toda PRISALY: las rutas del simulador permanecen públicas y al menos la ruta técnica muestra una demostración. Además, la política de detección de revocación mientras una pantalla permanece abierta debe decidirse antes de habilitar rutas. Esta orden no autoriza publicación: no se crearon commits, no se hizo push, PR ni merge.

## Estado e inventario

Worktree `PRISALY-Front-58`, rama `feature/fe-58-preparacion-navegacion`, HEAD y `origin/develop` al inicio `32ba32ab0189344e71e380a7f7a59cedbb8e7705`; Backend de referencia `773818caf62758d66019a71dac6508d13148abad`. Hay cambios locales en `angular.json`, rutas y pruebas raíz, autenticación, interceptor académico y su regresión, dashboard, configuraciones de entorno y documentos FE-58. Los archivos nuevos incluyen el guard de demostración, la vigilancia, la prueba de resolución, la prueba de roles, el entorno demo y la documentación. `senalizacion-unreal.ts` no aparece en el diff; no se modificaron archivos del simulador ni Backend.

## Matriz y autorización

La matriz oficial reproduce las seis condiciones recibidas: `usuarios-docentes` por rol exacto `ADMINISTRADOR`, `configuracion` por sesión explícita, `casos-academicos` y `rubricas` por `CONSULTAR_CASO`, y `sesiones` y `convocatorias` por `GESTIONAR_SESION`. Cada entrada tiene `habilitada: false`. El guard no consulta `/me` para abrir una ruta preparada pero deshabilitada. La autorización de pantalla no concede operaciones Backend, y los requisitos de rol y permiso no se sustituyen entre sí. La validación de listas dispersas de la auditoría anterior se conserva.

Se detectó que una modalidad válida aceptaba además claves desconocidas, pese a describirse como restrictiva. Se agregó una lista cerrada de claves y casos de prueba. Un requisito vacío no equivale a sesión. Las habilitaciones de las pruebas son simuladas y no modifican la matriz oficial.

## `/me`, revocación y vigilancia

Las consultas concurrentes ordinarias comparten una petición; una nueva credencial, usuario distinto o invalidación impide aceptar respuestas de una sesión anterior. Las pruebas cubren 401, 403 de `/me`, errores de red, cierre e identidad tardía. El interceptor conserva la lista cerrada por método y URL, transmite la credencial solo para el contexto autorizado, devuelve el error original y no reintenta la operación mutante. Un 403 académico no cierra automáticamente la sesión.

**Defecto reproducido y corregido:** una consulta `/me` anterior a un 403 se reutilizaba para confirmar el rechazo y podía conservar permisos desactualizados. La prueba inicial terminó 30/31, salida 1. Ahora la denegación invalida esa generación y exige una comprobación iniciada después; mientras no se confirme, rol y permisos no se consideran vigentes. Si la comprobación falla por red, la sesión se conserva, pero la pantalla vigilada se retira y no se restauran los permisos. Las denegaciones concurrentes comparten la nueva comprobación. La vigilancia libera su suscripción al destruirse.

**Límite no resuelto:** la ventana de 15 segundos permite reutilizar identidad confirmada aunque el permiso se haya revocado en ese intervalo. Una ruta que permanece abierta sin una nueva respuesta del servidor no recibe una detección automática al agotarse la ventana; los datos ya visibles pueden permanecer indefinidamente. Cambiar solo parámetros de URL tampoco garantiza que el guard vuelva a ejecutarse. Un 403 detectado provoca la comprobación y retirada según el estado; una revocación silenciosa no. No se cambió la duración ni se introdujo sondeo sin decisión. La validación de operaciones Backend no retira por sí sola datos ya visibles.

## Demostraciones y simulador

Producción, desarrollo y QA configuran las demostraciones del dashboard como deshabilitadas; el entorno `demo` las habilita con integración de personal desactivada. El valor se fija en compilación y no mediante parámetros o almacenamiento. Las pruebas cubren URL directa y `?demo=true`; el bundle de producción generado contiene `demostracionesHabilitadas:!1`.

En `demo` se reutilizan los mismos caminos del dashboard y el guard retorna acceso para presentación sin sesión; no hay separación física entre URLs demostrativas y oficiales. La integración de personal queda desactivada y no se presenta como autorización Backend. Las rutas `/simulador` (redirección a Unreal), `/simulador-unreal`, `/simulador-tecnico-2d5` y `/simulador-integrado` no declaran guard en `app.routes.ts`. La ruta técnica usa `MUNDO_PRUEBA` e incluye un interior provisional de demostración; por tanto existe acceso real a una demostración fuera de la restricción del dashboard. Las otras rutas públicas requieren evaluación específica de Dirección Central y Nicolás. No se modificaron rutas ni archivos del simulador.

## Pruebas independientes

Todas las ejecuciones definitivas siguientes terminaron con salida 0 y HTTP simulado cuando aplica:

| Verificación                              | Resultado         |
| ----------------------------------------- | ----------------- |
| Resolución, concurrencia y demostraciones | 33/33             |
| Autenticación y guards                    | 193/193           |
| Regresión académica y recorrido           | 120/120           |
| Rutas raíz                                | 13/13             |
| Suite completa, bloque de aplicación      | 410/410           |
| Suite completa, bloque de simulador       | 306/306           |
| Builds producción, QA y demo              | salida 0 cada uno |
| TypeScript aplicación y pruebas           | salida 0 cada uno |
| Control de URLs y `git diff --check`      | salida 0 cada uno |

La suite se ejecutó en dos bloques: 716 pruebas. La API QA local no respondió en el puerto 18094; no se efectuaron pruebas HTTP reales nuevas, no se habilitaron rutas y no se alteraron credenciales ni permisos. No se declara E2E productivo.

## Formato, secretos y decisiones

Prettier pasó con salida 0 en los archivos nuevos y modificados revisados, salvo `app.routes.spec.ts`, que falló con salida 1 tanto en la versión actual como en el archivo de la base comprobado con la misma configuración. El diff de FE-58 en ese archivo introduce el proveedor de demostración; no se reformateó masivamente. No se ejecutó ni se afirma un Prettier global de todo el repositorio.

La búsqueda de patrones comunes en 26 archivos nuevos o modificados solo detectó valores ficticios `solo-prueba` en cinco líneas de pruebas. El índice está vacío y no se incluyeron evidencias ni credenciales QA. Esta búsqueda no garantiza la ausencia absoluta de secretos.

Antes de habilitar rutas se requiere una decisión sobre detección y retirada de datos tras revocaciones silenciosas, incluida la ventana de 15 segundos y los cambios de parámetros. Dirección Central y Nicolás deben decidir cómo se restringen o clasifican las rutas del simulador. La política de autoasignación OBS-53-01, D-05 y la verificación QA ruta por ruta continúan pendientes. El incremento está preparado para revisión de esas decisiones, no para declarar la resolución íntegramente cumplida.
