# Contrato compartido — Angular y mundo Unreal

No amplía el catálogo v1 existente. Especifica cómo utiliza Angular los mensajes, los identificadores y los componentes del incremento. La autoridad académica pertenece al Backend; los mensajes espaciales no registran respuestas ni notas académicas.

## Correspondencias

| Edificio Angular | Zona v1 | Puerta | NPC espacial | Personaje / guion existente |
|---|---|---|---|---|
| hospital-prueba | hospital_entrada | hosp-puerta | hosp-npc-doctor | doctor / guion-hospital-demo |
| hospital-prueba | hospital_entrada | hosp-puerta | hosp-npc-paciente-01 | paciente-01 / guion-hospital-paciente-demo |
| policia-prueba | policia_entrada | pol-puerta | pol-npc-oficial | oficial / guion-policia-demo |
| fiscalia-prueba | fiscalia_entrada | fis-puerta | fis-npc-fiscal | fiscal / guion-fiscalia-demo |

Fuentes: [correspondencia-mundo.ts](../../src/app/features/simulador/unreal/correspondencia-mundo.ts) e [interiores-narrativos-unreal.ts](../../src/app/features/simulador/unreal/interiores-narrativos-unreal.ts). Se conservan las exportaciones históricas HOSPITAL_UNREAL/NPCS_HOSPITAL_UNREAL.

## Componentes que consume Mariana

| Componente / adaptador | Responsabilidad |
|---|---|
| [SimuladorUnrealPage](../../src/app/features/simulador/unreal/simulador-unreal-page.ts) | Visor, sesión visual, reproducción, foco, navegación semántica y coordinación de conexión/recuperación |
| [HospitalUnreal](../../src/app/features/simulador/unreal/hospital-unreal.ts) | Nombre conservado por compatibilidad; coordina los tres interiores y cuatro NPC, el seguimiento y la libreta |
| [HospitalNarrativoUnreal](../../src/app/features/simulador/unreal/hospital-narrativo-unreal.ts) | Panel contextual, progreso y acceso a LibretaPanel existente |
| [PuenteUnreal](../../src/app/features/simulador/unreal/puente/puente-unreal.ts) | Validación v1, correlación, ACK/error, deduplicación y cierre |
| [TransportePixelStreaming](../../src/app/features/simulador/unreal/transporte-pixel-streaming.ts) | Canal de texto del puente ↔ objetos UIInteraction de Epic; serialización única |
| [Configuración](../../src/app/features/simulador/unreal/configuracion-unreal.ts) | SesionVisualUnreal y token de asignación; no representa acceso académico |

HospitalUnreal conserva las operaciones vincular/desvincular, procesar, avanzarDialogo, elegir, completarTransicion, cerrarConversacion, abrirLibreta/cerrarLibreta y restaurarEstadoVisual. Expone señales de edificio/NPC activos, espacio/conversación, vista/error, recorrido, última zona y ocupación. LibretaStore, CoordinadorNarrativoInteriores y MotorNarrativo existentes conservan sus responsabilidades; no se modificaron sus contratos.

## Secuencias existentes

1. `mundo.listo` → `sesion.iniciar` → `orden.ack`. Sesión y reproducción de video deben estar confirmadas para habilitar controles.
2. `interactuable.activado` de puerta → `puerta.abrir {zoneId}` → ACK y hecho `edificio.entro {zoneId}`. El ACK solo no abre el diálogo; la zona debe corresponder a la solicitud vigente.
3. NPC de la sala activa → `camara.enfocar {objetivoId,modo:conversacion}` y `npc.reproducirAnimacion {npcId,animacion:hablar}`. Tras sus confirmaciones se inicia/reanuda el guion Angular.
4. Decisiones Angular → motor narrativo/adaptador de pistas → libreta. No generan HTTP académico. El paciente mantiene progreso separado del doctor.
5. Cierre → guardar narrativa → animación idle → estado completado si terminó el guion → `camara.liberar`. Una liberación no confirmada conserva el progreso y permite reintento.
6. `edificio.salio` de la sala activa → guardar y cerrar. Los hechos ajenos y ACK tardíos no abren otra conversación.
7. Reconexión del mismo contexto → `estado.restaurar` con último acceso exterior, estados visuales y zonas visitadas → liberar cámara → terminar la ventana de quietud. No crea ni reanuda un intento académico.

Los esquemas vigentes están en [public/simulador-unreal/protocolo/v1](../../public/simulador-unreal/protocolo/v1). No se crean mensajes `interior.*`. El sobre conserva `v,tipo,id,correlacion,sesion,ts,origen,datos`. El prefijo aleatorio de conexión respeta el formato de ID existente; no modifica el esquema.

## Dependencias y garantías pendientes

- SesionVisualUnreal contiene urlSenalizacion/streamerId/sesion/casoId de la conexión visual. No contiene una autorización Backend ni sustituye los UUID académicos.
- La cámara y las animaciones necesitan confirmación visible en Unreal. Las unitarias usan canales simulados y no acreditan esa consecuencia física.
- Cristian conserva sus interiores/componentes/recursos. Este cambio no incorpora ni regenera assets y no declara su confirmación artística.
- La copia nativa debe contener las tres salas y los cuatro IDs anteriores. El mismo nombre de proyecto en la ventana de Unreal no permite distinguir principal, PS2-LAB-03 y MUNDO-24.
