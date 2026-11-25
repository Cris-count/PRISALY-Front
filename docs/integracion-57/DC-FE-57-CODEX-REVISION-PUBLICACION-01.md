# FE-57: revisión independiente y publicación

## Contexto e inventario

- Frontend: worktree `PRISALY-Front-57`, rama `feature/fe-57-integracion-e2e`, base `0b341c029407ca871183e6346bc6e730e9778f34`, coincidente con `origin/develop` al preparar el PR.
- Backend de referencia inspeccionado sin cambios: `773818caf62758d66019a71dac6508d13148abad`.
- Código: una entrada en `panel-sesiones-m4.ts` y dos pruebas en `mensajes-m4.spec.ts`. Documentación: resultado, entrega, matriz de rutas, preparación M5–M6 y este informe. No se incluyeron evidencias QA ni credenciales.

## Contrato M4 y seguridad

En el backend de referencia, `M4ExceptionHandler` devuelve HTTP 409 y el código `M4-OPERACION-NO-PERMITIDA` para `SesionOperacionNoPermitidaException`. El mensaje agregado indica que la operación no se admite en el estado actual y pide volver a consultar. Las pruebas comprueban su traducción y la conservación del texto genérico para un código desconocido. No cambian estados, transiciones, guards ni interceptor. La matriz mantiene las asociaciones de rutas como propuestas o pendientes, no aprobadas.

La búsqueda de patrones comunes de secretos en los archivos preparados no encontró credenciales. No se incorporaron registros o especificaciones temporales de QA. Esta búsqueda no constituye una garantía absoluta de ausencia de secretos.

## Evidencias históricas de Claude

Se contrastaron las trazas y registros locales: la prueba administrativa registra alta, roles, permisos, asignación, revocación y 401/403/404/409; las pruebas docentes registran creación y edición M3, contenido, rúbrica, publicación, ETag/If-Match y 412/428, además de sesiones M4, actualización, transiciones, convocatorias y errores académicos. Los registros de Karma muestran 1/1 para cada una de las tres pruebas HTTP reales y la relectura administrativa documenta la revocación persistida. Son pruebas de Claude contra QA, no repetidas por Codex.

Los componentes se probaron contra HTTP real con rutas bloqueadas; eso no demuestra navegación E2E por dichas rutas. BLQ-53-01 sigue abierto. También permanecen SOL-55-02, D-05 y las demás decisiones identificadas en la entrega.

## Validación independiente de Codex

Todas las ejecuciones definitivas indicadas terminaron con salida 0:

| Verificación                                   | Resultado         |
| ---------------------------------------------- | ----------------- |
| M4 y recorrido                                 | 44/44             |
| M1, guards y regresiones incluidas             | 188/188           |
| M3 y concurrencia                              | 52/52             |
| Regresión académica                            | 120/120           |
| Suite completa: aplicación, core y funciones   | 356/356           |
| Suite completa: simulador                      | 306/306           |
| Builds producción y QA                         | salida 0 cada uno |
| TypeScript de aplicación y pruebas             | salida 0 cada uno |
| Prettier, control de URLs y `git diff --check` | salida 0 cada uno |

La suite se dividió por recursos. El primer intento del segundo bloque terminó con salida 1 antes de ejecutar pruebas porque el servicio de esbuild se detuvo; se desconoce la causa exacta. La repetición con dos trabajadores terminó 306/306 y salida 0. El primer intento dirigido dentro del entorno restringido también falló antes de las pruebas por acceso denegado a la unión de dependencias; la repetición con acceso adecuado pasó. Una primera comprobación de Prettier señaló formato documental, corregido antes de la comprobación final.

## Discrepancias y M6

DOC-57-01: los cinco documentos solicitados a Backend no aparecieron entre los objetos alcanzables de las referencias locales inspeccionadas. Se requiere confirmar con Ingrid dónde se encuentran; no se reconstruyeron.

`CONTRATOS-HTTP-M6-55.md` tampoco se localizó en los repositorios locales inspeccionados ni en los objetos alcanzables de las referencias locales Backend. La preparación M6 registra exclusivamente la comunicación recibida: POST y GET de evaluación por intento como candidatos no aprobados, creación con `idRubrica`, docente propietario activo autenticado, bandera desactivada, QA independiente pendiente y N2 y consulta estudiantil bloqueadas hasta B2. No se verificó el documento ni se consumieron o implementaron esos endpoints.

## Publicación

- Commit de código y pruebas: `5024b4140a2d85b87fc8b3ce9b07f2a2d23b7389`.
- Commit de documentación: `docs(integracion-57): resultados de integración M1-M4 y preparación M5-M6`; su SHA figura en el historial del PR.
- PR hacia `develop`: https://github.com/Cris-count/PRISALY-Front/pull/19.
- Pendiente de revisión; el merge requiere autorización expresa.
