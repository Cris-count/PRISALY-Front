# FE-58 — auditoría independiente final 16

## Dictamen

**APTO PARA SOLICITAR PUBLICACIÓN TÉCNICA**, dentro del alcance local verificado y sujeto a la decisión de Dirección Central. No se declara cerrado H-58-01 en despliegues ni realizado un E2E productivo. Las seis rutas oficiales siguen deshabilitadas. Esta orden no autoriza publicación: no se hicieron commits, push, PR ni merge.

## Estado Git, respaldo y alcance

- Worktree `PRISALY-Front-58`, rama `feature/fe-58-preparacion-navegacion`, HEAD `32ba32ab0189344e71e380a7f7a59cedbb8e7705`. `origin/develop` Frontend coincide después de `fetch`; la referencia remota `develop` Backend consultada mediante `ls-remote` es `773818caf62758d66019a71dac6508d13148abad`.
- Se leyó `sincronizacion-develop/DC-FE-58-SINCRONIZACION-INTEGRAL-15-RESULTADO.md`. El respaldo `RESPALDO-FE58-20261123-123140` pasó las 47 comprobaciones SHA-256; están presentes sus 39 archivos copiados. Tras las correcciones de esta auditoría difieren la vigilancia y su prueba; la entrega FE-58 ya difería del respaldo y se conservó. La documentación de sincronización se añadió con posterioridad al respaldo.
- El diff abarca configuración Angular, raíz de aplicación y rutas, autenticación, interceptor académico, dashboard, entornos, pruebas y documentos FE-58. En el directorio del simulador solo figura modificada una prueba preexistente que recibe el proveedor de entorno demo; no se modificaron Phaser, Unreal, Pixel Streaming, SIM-01 ni Backend.

## Matriz y H-58-02

La matriz conserva `habilitada: false` en las seis rutas. Requisitos: `usuarios-docentes` por rol exacto `ADMINISTRADOR`; `configuracion` por sesión; casos y rúbricas por `CONSULTAR_CASO`; sesiones y convocatorias por `GESTIONAR_SESION`. La autorización de pantalla no concede permisos de operación.

La vigilancia configura por defecto un intervalo de 60 segundos, configurable, y un único temporizador mientras hay ruta protegida vigilada, sesión válida y documento visible. Al recuperar visibilidad o foco solicita revalidación; las consultas ordinarias concurrentes se comparten. Se detiene la vigilancia al salir o cerrar sesión. Las pruebas simulan pérdida de rol o permiso, 401/403, respuesta anterior a un 403, cambio de sesión y retirada del contenido. El interceptor mantiene la lista cerrada, no reintenta la operación denegada y entrega el error original.

La ventana de 15 segundos puede reutilizar una identidad reciente en la entrada o recuperación de foco; la consulta periódica de 60 segundos no supone revocación instantánea. Con el primer fallo temporal se conserva la vista con aviso; al segundo se retira. Los temporizadores del navegador pueden retrasarse en segundo plano. Estas son limitaciones de la política, no evidencia de autorización Backend.

### Defectos y correcciones de esta auditoría

1. Foco y cambio de visibilidad podían compartir una sola consulta y registrar dos veces su fallo. Se reprodujo: 17/18, salida 1; la vista se retiraba tras un solo fallo. Se evita una segunda suscripción de vigilancia a la misma revalidación.
2. Una consulta `/me` que nunca respondía podía mantener una vista sin nueva comprobación indefinidamente. Se limita su espera al intervalo configurado de revalidación y se trata como fallo temporal, sin reintentar operaciones académicas. Las dos pruebas añadidas cubren fallo compartido y ausencia de respuesta; la prueba dirigida terminó 19/19, salida 0.

## H-58-01 y navegador local real

Se ejecutó Chrome Headless contra `ng serve` vinculado a `127.0.0.1:4381`, sin credenciales y con resolución de hosts externos bloqueada. Se observaron URL final, montaje, distintivo y solicitudes relevantes mediante el protocolo de depuración. No se pulsó conectar ni se probaron servicios remotos. El acceso gráfico integrado agotó el tiempo de espera dos veces; se usó esta alternativa. Los registros locales de QA, desarrollo y demo se guardaron en archivos temporales `codex-fe58-16-browser-*.jsonl`.

| Configuración local | Rutas solicitadas                                                                                                  | Resultado observado                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `production`        | `/simulador`, `/simulador-unreal?demo=true`, `/simulador-tecnico-2d5`, `/simulador-integrado?idIntentoContenido=…` | Las cuatro terminaron en `http://127.0.0.1:4381/login`; sin simulador ni distintivo montado. No se observaron solicitudes externas en esa carga.                                                                                                                                                                                                           |
| `qa`, sin sesión    | Las mismas cuatro                                                                                                  | Las cuatro terminaron en `/login` en la repetición; sin simulador ni distintivo. La primera carga de `/simulador` se observó antes de terminar la compilación y no se considera resultado.                                                                                                                                                                 |
| `development`       | Las mismas cuatro                                                                                                  | Las cuatro terminaron en `/login`, sin simulador ni distintivo. Recarga y navegación atrás permanecieron en `/login`. El WebSocket local observado corresponde al servidor Vite.                                                                                                                                                                           |
| `demo`              | Las mismas cuatro                                                                                                  | `/simulador` redirigió a `/simulador-unreal`; Unreal, técnica e integrada montaron componentes con distintivo. La escena técnica informó «Escena lista». La recarga conservó la ruta integrada y volver atrás mostró la ruta técnica. No se observaron llamadas académicas ni Pixel Streaming durante estas cargas; se observó el WebSocket local de Vite. |

La comprobación real de recarga y atrás se realizó en desarrollo y demo; la cobertura de Router simulado también verifica esos escenarios. No se realizaron capturas gráficas ni se verificaron despliegues remotos. La red se observó durante las cargas, no durante una sesión Pixel Streaming ni operaciones posteriores.

`canActivate` decide la activación y evita montar los componentes al denegar, como muestran las pruebas y las cargas locales; `canMatch` decide si una ruta participa en la selección y puede ser útil para otras variantes de ruta. Ninguno protege la confidencialidad de los bundles públicos. En este alcance no se justifica cambiar el guard solo para impedir la inicialización; la autorización de datos sigue en Backend.

## `/simulador-integrado` e integración

`contextoAcademico` e `idIntentoContenido` tienen valor inicial `null`; no se registra `withComponentInputBinding` en la configuración revisada. El proveedor predeterminado es `ParticipacionPendienteGateway`. La prueba de Router y la carga demo con `idIntentoContenido` en la URL no observaron operaciones de participación ni llamadas académicas. Esto no sustituye una auditoría de despliegue o de integraciones futuras con proveedores explícitos. No se activaron DD-02, M5, M6 ni N2, ni se publicaron calificaciones o escribieron datos académicos durante la auditoría.

El endpoint `/v1/personal/me` y sus datos de rol y permisos existen en Backend `develop` de referencia. Consulta remota de solo lectura: PR Backend #94, #95, #96 y #97 siguen abiertos en Draft y sin fusionar; no se asumieron sus contratos como integrados ni se implementaron clientes candidatos.

## Pruebas y controles

| Verificación independiente               | Resultado                                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Revalidación H-58-02 tras corrección     | 19/19, salida 0                                                                                                                    |
| Autenticación, guards, H-58-01 y H-58-02 | 225/225, salida 0                                                                                                                  |
| Académico y recorrido                    | 120/120, salida 0                                                                                                                  |
| Dashboard                                | Primera ejecución 57/59, salida 1, dos tiempos agotados; repetición 59/59, salida 0. Causa de los tiempos agotados no determinada. |
| Suite completa, bloque aplicación        | 442/442, salida 0                                                                                                                  |
| Suite completa, bloque simulador         | 306/306, salida 0                                                                                                                  |
| Builds `production`, `qa`, `demo`        | salida 0 cada uno                                                                                                                  |
| TypeScript aplicación y pruebas          | salida 0 cada uno                                                                                                                  |
| Control de URLs y `git diff --check`     | salida 0 cada uno                                                                                                                  |

La suite suma 748 pruebas: 746 históricas más las dos pruebas independientes. Prettier pasó en 36 archivos revisados; `app.routes.ts`, `app.routes.spec.ts` y `simulador-temporal.spec.ts` fallan tanto en el estado actual como en la base con la misma configuración. No se reformatearon y no se declara Prettier global. La búsqueda de patrones comunes de secretos en 42 archivos señaló únicamente siete valores `solo-prueba` en tests. El índice estaba vacío; no se incluyeron evidencias ni credenciales QA. Esta búsqueda no garantiza ausencia absoluta de secretos.

La API QA local en `127.0.0.1:18094` no aceptó conexión. No se alteraron cuentas o permisos, no se habilitaron rutas para probarlas y no se repitió revocación real en Backend.

## Coordinación y límites para Dirección Central

- **Nicolás:** verificar Unreal–Angular, Pixel Streaming y adaptación de simuladores en el entorno y despliegue autorizados; no se probó una conexión real.
- **Cristian:** confirmar SIM-01 y componentes narrativos en su integración correspondiente; aquí solo se ejecutó la regresión existente del simulador.
- **Ingrid:** comprobar revocación real y permisos efectivos con QA aislado y coordinar el aprovisionamiento pendiente D-05.
- **Dirección Central:** revisar el límite temporal de revocación, autorizar eventualmente cada ruta y verificar H-58-01 en despliegues. No se presume aprobación de otros integrantes ni se declara cierre definitivo.
