# DC-SIM-F3-CODEX-28 — Integración narrativa del Hospital

19 de noviembre de 2026, Colombia. Implementación y pruebas: Codex. Proyecto Angular: PRISALY-Front. Rama inicial: `feature/simulador-integracion-nicolas`, HEAD `e7add19050e19ff6650fa5f19324758cfc9cba4b`.

## Resultado

Se implementó el enlace de la puerta y el NPC del Hospital con el guion, las pistas y la libreta reales de Angular. La prueba aislada ejecutó Angular en Chrome y Unreal real por WebSocket: entrada, conversación, pista, libreta, cierre parcial, salida, reconexión, reingreso con transición pendiente conservada y finalización del guion.

**Alcance funcional: demostración en memoria.** No se inició un intento académico, se inventaron IDs institucionales, ni se persistieron respuestas. El progreso narrativo se conserva al salir/reingresar y al reconectar el transporte en la misma página y con la misma sesión/caso. Recargar o abandonar esa página descarta su estado. Una sesión/caso distintos reciben estado nuevo para evitar mezclar progresos.

**No se declara terminada la integración gráfica dentro de PRISALY.** El producto conserva Pixel Streaming como transporte del visor; no existe una asignación de servidor habilitada por esta intervención. El laboratorio es una aplicación Angular separada, sin video, y no sustituye ese pendiente.

## Preservación y auditoría

Antes de editar se conservaron 134 archivos de referencia del simulador/contratos y se registró el estado Git local completo. Había cambios locales previos, incluidos todo el directorio `unreal/` y sus pruebas; se editaron únicamente las partes necesarias, sin restaurar ni reemplazar el árbol por otra versión.

Se revisaron `ControlMundo`, `MotorNarrativo`, `CoordinadorNarrativoInteriores`, `AdaptadorPistasNarrativas` y `LibretaStore`. No se alteró su implementación. `ControlMundo` sigue siendo el contrato del renderer Phaser: su pausa reversible general y su consulta de coordenadas no se atribuyen al puente Unreal. Para esta conversación se usa el modo modal confirmado mediante `camara.enfocar/liberar`, ya existente en v1.

No se modificaron Backend, migraciones, Phaser, el catálogo/esquemas v1 ni las fuentes/configuración del proyecto Unreal. Los hashes del respaldo y la comprobación final identifican esa conservación. No hubo commits, push o merges.

## Implementación

- `HospitalUnreal` coordina el contexto de sesión/caso, el estado exterior/interior y la conversación. Usa la correspondencia existente: `hospital-prueba`, `hospital_entrada`, `hosp-puerta` y `hosp-npc-doctor`.
- `interactuable.activado` de la puerta, con categoría `puerta`, envía `puerta.abrir {zoneId: hospital_entrada}`. El ack no se presenta como entrada: se espera `edificio.entro`. Repetir la activación durante apertura o dentro no envía otra orden.
- Activar el doctor, con categoría `npc`, requiere interior confirmado. Se espera el ack de `camara.enfocar {modo: conversacion}` y de la animación `hablar` antes de mostrar el guion real mediante `iniciarOReanudar('hospital-prueba')`.
- El panel Angular usa `avanzarDialogo`, `elegirOpcion` y `completarTransicion` del coordinador real. Solo una decisión disponible puede ejecutarse. No concede pistas por acercarse al NPC o por pulsar E.
- La decisión existente `consultar-expediente` activa `pista_historial_clinico`; el adaptador narrativo registra `pista-historial-clinico` con su origen real en `LibretaStore`. Se reutiliza `LibretaPanel`, incluida su UI de notas, y se muestra un resumen de pistas al regresar al exterior.
- Cerrar una conversación guarda el snapshot sin destruir el motor activo. Conserva así también una transición pendiente, que el snapshot actual no representa explícitamente. El NPC solo se marca completado si terminó el guion. La animación vuelve a idle y la cámara se libera mediante órdenes v1.
- Un fallo de animación/estado visual no impide intentar liberar la cámara. Si falla la liberación, el progreso permanece guardado y el panel permite reintentar. Las respuestas tardías tras salida o desconexión no reabren el diálogo.
- `edificio.salio` guarda progreso y termina solo la presentación interior. No reinicia la libreta. Los providers pertenecen a la página, no al panel que se monta/desmonta.
- `SimuladorUnrealPage` incorpora esta composición y desactiva navegación exterior/entrada nativa del visor durante transiciones o conversación. El diálogo no usa el bloqueo irreversible del cuestionario.

No se crearon mensajes `interior.*`. Las órdenes nuevas de este enlace son tipos ya existentes: `puerta.abrir`, `camara.enfocar`, `npc.reproducirAnimacion`, `interactuable.estado` y `camara.liberar`.

## Evidencia y pruebas

Carpeta de entrega: `Entregables/Simulador2/F3-CODEX-28-20261119`, en la raíz del workspace.

| Comprobación | Resultado y evidencia |
|---|---|
| Compilación de desarrollo | Correcta, `compilacion.log` |
| Compilación de producción final | Correcta, `compilacion-produccion.log` |
| Regresión Angular final | **526/526**, ChromeHeadless, `pruebas-angular-final.log` |
| Pruebas nuevas del Hospital | 13 casos del coordinador y un recorrido de DOM de la página; transporte simulado, motor narrativo y libreta reales |
| Recorrido aislado con motor real, primera versión | **10/10**, `prueba-real-1/resultado-real.json` |
| Recorrido con versión final | **10/10**, `prueba-real-final/resultado-real.json` y `recorrido-real-final.log` |
| Consola del navegador final | Sin excepciones JavaScript ni entradas de error capturadas; `prueba-real-final/consola-browser.json` |
| Unreal real | Log `unreal-real.log` y registro nativo `puente-unreal-real.jsonl`; sin cambios de C++ por Codex |

Las pruebas cubren entrada confirmada, rechazo de puerta/enfoque, duplicados, objeto o sesión incorrectos, decisión anticipada o inválida, pista/origen, salida/reingreso durante transición, nota conservada, finalización, respuestas tardías, fallo visual y reintento de cierre.

El primer intento de ChromeHeadless dentro del sandbox no pudo iniciar el navegador: `pruebas-angular.log`. No se cuenta como regresión aprobada. `pruebas-angular-ejecucion.log` contiene la ejecución intermedia 525/525; la versión final añadió el caso de recuperación de animación y pasó 526/526. No se reescriben los resultados anteriores.

Producción conserva advertencias de presupuesto CSS de `simulador-integrado-page.css` (66 bytes sobre el aviso de 4 kB) y dependencias CommonJS de Phaser, sdp y ws. No impiden compilar; no se modificaron esas dependencias o estilos ajenos al cambio.

### Qué fue real y qué fue simulado

| Elemento | Naturaleza de la prueba final |
|---|---|
| Angular, componentes, guion, decisiones, pista y libreta | Implementación real ejecutada en Chrome |
| `puerta.abrir`, enfoque, animación, completado y liberación | Órdenes al proceso Unreal real, confirmadas con ack correlacionado |
| `edificio.entro` y `edificio.salio` | Emitidos por Unreal real; dos entradas y dos salidas en el recorrido final |
| Activaciones E de puerta y doctor | Estímulos explícitamente simulados por botones de laboratorio; no se atribuyen al motor ni a Nicolás |
| Caminar al vestíbulo | Automatizado por el modo nativo existente `PrisalyPruebaProtocoloInterior` |
| Pulsación de decisiones y libreta | Automatizada sobre los botones reales del DOM por el controlador del laboratorio |
| Video de Unreal dentro de Angular | No probado: no hay stream gráfico en este laboratorio |
| Intento académico, evaluación y persistencia | No ejecutados; no se simulan como resultados institucionales |

Las capturas `01-dialogo-angular.png`, `02-libreta-angular.png`, `03-reingreso-progreso.png` y `04-retorno-exterior.png` son del navegador real. No son imágenes de un interior 3D integrado en la página. La prueba manual anterior de Unreal con el cliente de Claude sigue siendo histórica; no se convierte en una prueba manual nueva de este enlace.

## CA-14 a CA-18

Se conserva la matriz oficial sin sobrescribirla. Esta tabla actualiza únicamente lo comprobado por este incremento.

| Criterio oficial | Estado comprobado | Pendiente para aceptación general |
|---|---|---|
| CA-14 — Cada edificio tiene al menos un NPC con conversación funcional | **Parcial: Hospital operativo en el laboratorio**, NPC doctor conectado al diálogo Angular | Otros edificios; pulsación E y experiencia gráfica del enlace final. No se aprueba el criterio global por un solo Hospital. |
| CA-15 — Las decisiones activan los nodos narrativos previstos por los guiones | **Verificado para el guion demostrativo del Hospital**: `consultar-expediente` → `sala-consulta` | Contenido académico autorizado y guiones del alcance restante |
| CA-16 — Las pistas aparecen en la libreta con su origen correcto | **Verificado para la pista del Hospital**, incluido ID, interacción, personaje y lugar | Catálogos académicos reales y alcance restante |
| CA-17 — Repetir un diálogo no duplica pistas | **Verificado para Hospital**: reapertura/reingreso y eventos duplicados conservan una pista | Aplicar la misma comprobación al resto del contenido autorizado |
| CA-18 — Salir, regresar o reconectar restaura el estado narrativo | **Verificado en la misma página/sesión/caso**: salida, reconexión y reingreso conservan decisión y transición | Recarga de página, reconstrucción de snapshots, reinicio de servidor y persistencia académica no están cubiertos |

No se cambian aprobaciones de otros criterios ni se declara cerrada Fase 2 o completada Fase 3.

## Reproducción y pendientes

`scripts/f3-hospital-lab/README.md` describe la ejecución aislada con las dependencias existentes, puertos dedicados y carpeta de evidencias nueva. El controlador `recorrer.mjs` guarda cada comprobación, el estado del guion/libreta, estímulos simulados, hechos reales, registros correlacionados, consola y capturas. Los procesos de esta ejecución se cerraron al terminar; no se dejó habilitado un servidor productivo.

Para validar el producto completo faltan el servidor de video y la adaptación bidireccional del puente C++ al DataChannel Pixel Streaming. La ruta del producto ya consume `HospitalUnreal`, pero no se presenta como una conexión web operativa sin esa infraestructura.

Para progreso académico persistido se necesita una fuente autorizada de guion/contexto de intento y la política de restauración/persistencia ya acordada con sus responsables. La libreta actual solo admite registrar pistas de demostración en memoria; no se extendió arbitrariamente su contrato académico ni se creó un endpoint.

Antes de reconstruir un motor desde snapshot, debe resolverse la representación de transición pendiente y el versionado/caso de `SnapshotNarrativoEdificio`. Este incremento conserva el motor activo y no afirma persistencia tras recarga.
