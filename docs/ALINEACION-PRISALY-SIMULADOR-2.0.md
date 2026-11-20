# PRISALY y Simulador 2.0 — alineación para navegador

Fecha: 17 de noviembre de 2026, Colombia.

## Resultado y alcance

El usuario confirmó que el estudiante debe acceder desde PRISALY, en el navegador, sin instalar un ejecutable, y que todavía no existe un servidor Pixel Streaming.

### Corrección del acceso tras la prueba del usuario

La primera alineación conservó el botón principal de demostración apuntando a Phaser. Eso permitía interpretar el mapa anterior como si fuera la nueva integración. Se corrigió el acceso:

- `/simulador` redirige ahora a `/simulador-unreal`.
- `/simulador-integrado` presenta como acción principal **Abrir simulador Unreal (3D)**. El mapa anterior requiere elegir explícitamente **Iniciar demostración anterior (Phaser 2.5D)**.
- Durante la demostración anterior se muestra su motor y un enlace **Ir a Unreal (3D)**.
- La calibración técnica conserva su implementación en `/simulador-tecnico-2d5`.
- La pantalla de Unreal explica que faltan el servidor Pixel Streaming y el puente de datos del juego; no abre Phaser automáticamente como reemplazo.

Comprobado en navegador: selección explícita de la demo anterior, enlace de su cabecera a Unreal y redirección de `/simulador`. Consola sin errores ni advertencias de la app. Suite actualizada: **512 pruebas aprobadas**; compilación de producción correcta. Logs `acceso-unreal-corregido-tests.log` y `acceso-unreal-corregido-build.log`, capturas `acceso-unreal-corregido-inicio.png` y `acceso-unreal-corregido-disponibilidad.png`, en `../../Entregables/Simulador2/`.

Se incorporó la preparación del cliente Angular para Pixel Streaming 2 compatible con Unreal 5.8. La ruta `/simulador-unreal` está disponible en la app y enlazada desde el inicio de `/simulador-integrado`. Sin una asignación visual muestra **Ciudad 3D pendiente de habilitación**, permite volver a la demo y no abre conexiones ni crea una ciudad simulada.

**No hay todavía una sesión Unreal transmitida y comprobada dentro de PRISALY.** Se completó la preparación y verificación local del cliente; faltan infraestructura y el transporte de datos del lado Unreal. La Fase 2 de construcción de ciudad sigue abierta.

## Responsabilidades

| Elemento | Responsabilidad |
| --- | --- |
| PRISALY / Angular | Identidad y acceso académico, caso, narrativa, decisiones, pistas, libreta, cuestionario y presentación de resultados. Los servicios actuales conservan sus responsabilidades. |
| Unreal | Representación de ciudad, avatar, movimiento, cámara, colisiones y hechos espaciales. No asigna calificaciones ni crea pistas académicas. |
| Pixel Streaming | Video y entrada del navegador; mensajes visuales mediante el canal de datos. |
| Infraestructura futura | Asignar y liberar una instancia visual por sesión autorizada, señalización y conectividad WebRTC. Esta asignación no está implementada como endpoint nuevo. |

El hardware de ejecución de Unreal deberá definirse para el servidor gráfico. También se deben verificar navegador, conectividad, latencia y capacidad de concurrencia de los estudiantes; la decisión de usar navegador no fija por sí sola los requisitos del servidor.

## Cambios implementados

- Biblioteca oficial de Epic `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`, fijada a `0.1.4`, con lockfile. Se carga dinámicamente al conectar el visor.
- Ruta y pantalla de integración `SimuladorUnrealPage`. Se mantiene separada de la autorización académica y de la demo actual.
- Configuración inyectable `SESION_VISUAL_UNREAL`, cuyo valor predeterminado es `null`. Requiere URL de señalización, `streamerId`, identificador de sesión y caso visual.
- Reproductor integrado mediante la API pública de Epic y transporte de texto sobre `emitUIInteraction` / `addResponseEventListener`.
- Protocolo candidato F1 importado y validado, sin ampliar nombres de mensajes ni modificar los esquemas originales.
- Correspondencia explícita de identificadores, sin convertir automáticamente guiones a guiones bajos.
- Pruebas de canal, protocolo, asignación, navegación semántica y ciclo de vida de la página.

## Garantías comprobadas del cliente

1. Sin servidor asignado no se solicita una conexión, no se inicia una actividad académica y no se muestra un éxito ficticio.
2. Canal abierto o video por sí solos no significan mundo listo: se requiere `mundo.listo`, `sesion.iniciar` y su `orden.ack`, además de reproducción de video.
3. El ack de `avatar.irA` se muestra como aceptación del destino, no como llegada. La ubicación se actualiza por hechos semánticos de zona.
4. Los mensajes pasan por validación de sobre, versión, tipo, origen, sesión, datos y correlación. No se entregan mensajes de otra sesión, de origen Angular recibidos por el canal entrante ni eventos repetidos con el mismo ID dentro de la ventana de deduplicación de 256 identificadores.
5. El bloqueo irreversible se conserva localmente aunque venza el ack. Repetir la solicitud no transforma un timeout en confirmación.
6. Los envíos fallidos y las desconexiones liberan las órdenes pendientes. La destrucción o cancelación durante la carga evita crear una conexión tardía.
7. Registro local limitado a las últimas 250 entradas. No se exporta automáticamente ni contiene respuestas académicas.
8. No se toman endpoints desde parámetros de URL. Se exige WSS para señalización remota; WS solo se permite en localhost. Micrófono y cámara permanecen desactivados.
9. La entrada del juego se habilita solo con la sesión visual confirmada, video y foco dentro del visor. No se activa un cuestionario desde un hecho espacial en esta pantalla experimental.

Las garantías de protocolo y sesión se probaron con dobles del canal; todavía no equivalen a una prueba con un servidor Pixel Streaming real.

## Identificadores — COMPAT-01 experimental

| Concepto | Edificio Angular | Nodo Angular | Zona Unreal | Puerta Unreal |
| --- | --- | --- | --- | --- |
| Hospital | `hospital-prueba` | `entrada` | `hospital_entrada` | `hosp-puerta` |
| Policía | `policia-prueba` | `este` | `policia_entrada` | `pol-puerta` |
| Fiscalía | `fiscalia-prueba` | `fiscalia-entrada` | `fiscalia_entrada` | `fis-puerta` |
| Plaza | — | `plaza-central` | `plaza_central` | `plaza-punto` |

La tabla se contrasta en pruebas con los edificios y entradas de `MUNDO_PRUEBA`. Es una implementación experimental de la propuesta existente; no cambia los identificadores de Phaser ni sustituye la decisión formal de COMPAT-01. Las zonas desconocidas no se traducen a edificios ni a coordenadas inventadas.

## Compatibilidad que impide sustituir todavía el visor académico

| Contrato actual | Protocolo candidato Unreal | Consecuencia |
| --- | --- | --- |
| `ControlMundo.irA(nodoId)` | `avatar.irA { zoneId }` | Tabla explícita para los destinos conocidos. El nodo inicial de Phaser no tiene correspondencia acordada. |
| `ControlMundo.direccion(vector)` | Entrada nativa de Pixel Streaming | No se finge una orden de dirección inexistente. |
| `suspenderInteraccion(true/false)` | Solo existe bloqueo irreversible; enfoque modal tiene otro significado | No se usa el bloqueo definitivo como pausa de libreta. Falta acordar una suspensión reversible completa del lado Unreal. Desactivar la entrada del navegador no demuestra que se detuvo una ruta en curso en el servidor. |
| `consultarEstado()` con posición/destino | Hechos de zona sin coordenadas ni llegada de ruta | No se fabrican posiciones 2D a partir de un solape de zona. |
| Entrada y salida de interior | Tipos presentes; prototipo C++ aún rechaza `puerta.abrir` | Se necesita implementar y probar esa transición antes de conectar el interior académico. |

Por estas diferencias **no se registró Unreal como reemplazo de `FABRICA_MUNDO`**. Phaser, el adaptador actual, la libreta, la continuidad narrativa, las rutas académicas y el Backend conservan su funcionamiento. El acceso 3D nuevo es una pantalla de integración, no un intento evaluativo.

## Asignación y activación futura

El punto de extensión es el token `SESION_VISUAL_UNREAL`. Una asignación válida debe proceder de la infraestructura confiable de PRISALY y corresponder a la misma sesión que usa el proceso Unreal (`-PrisalySesion=` en el prototipo). No debe generarse un identificador distinto de manera independiente en cada extremo.

Para una prueba técnica local se puede proporcionar el token en los `providers` de la ruta con una URL WS de localhost y los valores de la instancia de prueba. En producción se necesita asignación autenticada y aislada por estudiante; no se debe publicar una sesión fija compartida en la configuración del frontend.

La pantalla permite conectar, reproducir si el navegador exige un gesto, desconectar y solicitar destinos conocidos. No reintenta de forma automática una sesión perdida. Se debe comprobar que la instancia asignada no permita al usuario seleccionar o controlar otra instancia.

## Dependencias reales pendientes

- Servidor Pixel Streaming y señalización compatibles con UE 5.8; definición de servidor GPU, resolución, latencia y concurrencia.
- En el proyecto Unreal inspeccionado `PixelStreaming2` sigue desactivado y `PrisalyPuenteSubsistema` crea `FPrisalyTransporteWebSocket`. El canal de datos de Pixel Streaming debe conectarse al mismo núcleo de validación antes de esta integración real.
- Asignación y liberación de instancias por sesión autorizada, incluyendo conectividad ICE/STUN/TURN cuando el entorno la requiera. No hay un servicio productivo de asignación implementado en este cambio.
- Acuerdo explícito de las diferencias de pausa, posición/llegada e interiores, conservando la versión del protocolo o versionando cualquier ampliación autorizada.
- Prueba real PRISALY → streaming → Unreal → mensaje y ack → navegación → interacción → interior → regreso, incluyendo reconexión y bloqueos académicos.
- Cierre independiente de los pendientes artísticos y funcionales de Fase 2.

## Verificación y evidencias

- Compilación de producción: correcta, salida 0. Advertencias CommonJS de Phaser y dependencias `sdp` / `ws` de la biblioteca Epic. No se alteraron los límites de tamaño para ocultarlas.
- Suite Angular completa: **508 pruebas aprobadas**. Las pruebas nuevas usan el catálogo y los archivos de esquema reales servidos por el build.
- Integridad: **23 de 23 archivos JSON** coinciden por SHA-256 con `C:/PRISALY/prisaly-sim2-f1/protocolo/esquemas/v1`. Registro: `ALINEACION-UNREAL-ESQUEMAS-SHA256.json`.
- Navegador real: acceso a `/simulador-unreal`, aviso de disponibilidad pendiente, navegación hacia la demo integrada y regreso mediante el enlace nuevo. Consola sin errores o advertencias de la app durante esa comprobación.
- Captura: `../../Entregables/Simulador2/alineacion-prisaly-ciudad-3d.png`.
- Logs: `../../Entregables/Simulador2/alineacion-prisaly-tests.log` y `../../Entregables/Simulador2/alineacion-prisaly-build.log`.
- No se probó streaming real, controles del juego transmitido, rendimiento remoto, pausa de una ruta en Unreal, entrada de interiores reales ni intento académico desde este visor.

## Archivos y conservación

Cambios de este trabajo: `package.json`, `package-lock.json`, `src/app/app.routes.ts`, enlace en `simulador-integrado-page.html`, archivos bajo `src/app/features/simulador/unreal/`, esquemas bajo `public/simulador-unreal/protocolo/v1/` y los dos documentos de alineación.

Los validadores proceden de F1; el import de TypeScript se adaptó a la resolución de Angular. El puente reutiliza la implementación aislada y añade control de errores de envío, origen entrante, deduplicación, bloqueo idempotente sin confirmaciones ficticias y registro acotado. Los esquemas permanecen idénticos al original.

Rama revisada: `feature/simulador-integracion-nicolas`. HEAD de referencia: `e7add19050e19ff6650fa5f19324758cfc9cba4b`. Los cambios siguen locales. Se conservaron la modificación previa del informe de revisión y los dos scripts locales existentes. No se modificaron Backend ni el proyecto Unreal durante esta alineación. No se hizo commit, push, PR o merge.

## Referencias técnicas

- Biblioteca oficial: https://github.com/EpicGames/PixelStreamingInfrastructure/tree/UE5.8
- Preparación del motor y streaming: https://dev.epicgames.com/documentation/en-us/unreal-engine/getting-started-with-pixel-streaming-in-unreal-engine
- API pública local verificada en los tipos de `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8@0.1.4`.
