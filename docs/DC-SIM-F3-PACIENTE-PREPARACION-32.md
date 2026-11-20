# Hospital: doctor y paciente — Preparación Angular

19 de noviembre de 2026. Responsable: Codex. Órdenes: F3-CLAUDE-31 y PRUEBAS-32. **Estado: PENDIENTE DE PRUEBA MANUAL por Nicolás.**

Nicolás autorizó contenido provisional: «hazlos demostrativos yo despues te paso los guiones». Esta entrega prepara ese contenido y su integración. No declara aprobado el comportamiento del paciente.

## Código implementado

- Incorporado un guion independiente del paciente, marcado como demostración y sin hechos de un caso académico. Conservado el guion existente del doctor.
- Añadida la correspondencia entre `hosp-npc-paciente-01` y el personaje narrativo provisional `paciente-01`.
- La activación espacial selecciona el NPC: enfoque, animación y estado de completado se dirigen al personaje correspondiente. Un personaje desconocido no se sustituye por el doctor.
- Doctor y paciente utilizan instancias separadas del coordinador narrativo, con el identificador real del mismo edificio `hospital-prueba`. Comparten el adaptador de pistas y `LibretaStore` de la página. No se crean edificios ficticios para separar el progreso.
- El cierre y la salida guardan las dos conversaciones. Los motores activos permanecen en memoria; el cambio de NPC no reinicia al otro. Se conserva el mecanismo de invalidación de respuestas tardías.
- La decisión disponible del paciente registra una pista de demostración mediante el adaptador narrativo existente. Pulsar E por sí solo no incorpora la pista.
- El panel identifica a quien está hablando y cierra la libreta modal al abandonar una conversación.
- Añadido modo manual al laboratorio Angular. Recibe las activaciones E del motor, oculta los botones de estímulos simulados y permite descargar un registro técnico sin asignarle un dictamen automático.

## Correspondencia para Claude

| Elemento | Doctor existente | Paciente provisional |
|---|---|---|
| ID espacial Unreal | `hosp-npc-doctor` | `hosp-npc-paciente-01` |
| Categoría de interacción | `npc` | `npc` |
| Personaje narrativo Angular | `doctor` | `paciente-01` |
| Guion | `guion-hospital-demo` | `guion-hospital-paciente-demo` |
| Edificio | `hospital-prueba` | `hospital-prueba` |

Unreal debe emitir el mensaje existente `interactuable.activado` con `interactuableId: hosp-npc-paciente-01` y `categoria: npc`. Angular utiliza `camara.enfocar {objetivoId, modo: conversacion}`, `npc.reproducirAnimacion {npcId, animacion: hablar/idle}`, `interactuable.estado` y `camara.liberar`. El paciente debe resolver esas órdenes con los mismos contratos que el doctor. No se introduce un mensaje de respiración: el reposo/respiración es una presentación local de Unreal.

El punto de interacción debe quedar al costado de la camilla, con línea de vista y acceso caminando. El encuadre debe reconocer al actor del paciente. La cámara y las colisiones se implementan en Unreal por Claude; este incremento de Codex no modifica C++ ni afirma que el paciente 3D ya esté entregado.

La lectura inicial de las fuentes compartidas solo identificó al doctor. Para una prueba conjunta, Nicolás necesita la versión de Claude que incluya al paciente; no debe interpretarse la ausencia del personaje como una prueba aprobada de la integración.

## Contenido demostrativo preparado

Paciente: dos intervenciones de presentación y una decisión «Registrar conversación de demostración con el paciente». La decisión activa `demo_entrevista_paciente_registrada`, pasa a `paciente-cierre` y permite finalizar la conversación.

Pista: `demo-entrevista-paciente-01`, «Entrevista al paciente (demostración)». Origen: edificio `hospital-prueba`, interacción `hosp-npc-paciente-01`, personaje `paciente-01`, lugar «Hospital Central · camilla del paciente». La descripción aclara que no contiene hechos académicos.

Los guiones definitivos, sus identificadores y sus pistas requieren la entrega posterior de Nicolás. No se convierten estos ejemplos en contenido publicado ni en respuestas académicas.

## Archivos preparados

Rutas relativas a PRISALY-Front:

1. `src/app/features/simulador/demo/guion-paciente-hospital-demo.ts` — nuevo guion provisional.
2. `src/app/features/simulador/services/adaptador-pistas-narrativas.ts` — entrada demostrativa del paciente; conserva las anteriores.
3. `src/app/features/simulador/unreal/hospital-unreal.ts` — selección de NPC y continuidad separada.
4. `src/app/features/simulador/unreal/hospital-narrativo-unreal.ts` — identificación visual de conversación y cierre de libreta al cambiarla.
5. `scripts/f3-hospital-lab/main.ts` — modo manual y descarga de registro.
6. `docs/DC-SIM-F3-PACIENTE-PREPARACION-32.md` — esta entrega.
7. `docs/DC-SIM-F3-PACIENTE-GUIA-MANUAL-32.md` — instrucciones para Nicolás.

Se respaldaron los cuatro archivos existentes antes de editarlos en `Entregables/Simulador2/F3-PACIENTE-PRUEBAS-32-20261119/respaldo/`. No se restauró ni sobrescribió el árbol de cambios locales.

## Estado de ejecución y aceptación

No se ejecutaron compilación, pruebas manuales o automatizadas, integración, Automation, recorridos ni mediciones de rendimiento de esta versión. No se abrieron el juego o el navegador para validarla. Los comandos de la guía se entregan para que los ejecute Nicolás.

Las capturas, 526 pruebas y recorridos de la entrega F3-CODEX-28 permanecen históricos e intactos; no acreditan los cambios del paciente. No se generaron capturas nuevas ni se atribuyeron pruebas a Nicolás.

| Alcance | Estado de este incremento |
|---|---|
| Compilación Angular | Pendiente de Nicolás |
| Doctor y paciente: interacción, conversación y bloqueo | PENDIENTE DE PRUEBA MANUAL |
| Pista y origen en libreta | PENDIENTE DE PRUEBA MANUAL |
| No duplicación, salida, reingreso y reconexión | PENDIENTE DE PRUEBA MANUAL |
| Paciente en camilla, respiración, cámara y colisiones | Entrega de Claude y prueba de Nicolás pendientes |
| CA-14 a CA-18, incremento del paciente | Sin aprobación nueva; PENDIENTE DE PRUEBA MANUAL |

## Limitaciones

- El laboratorio muestra Angular y utiliza Unreal en otra ventana, por WebSocket. No transmite el video del juego dentro de Angular. Pixel Streaming continúa como dependencia del producto.
- El progreso existe solo en la página/sesión/caso activos. Recargar, cerrar la página o cambiar de sesión lo descarta. No hay persistencia académica nueva.
- Las conversaciones son independientes; no se implementaron condiciones académicas cruzadas entre doctor y paciente.
- Los guiones y la pista del paciente son demostrativos, por autorización de Nicolás.
- Un error de compilación o funcionamiento debe reportarse para corregirlo. Después de cada corrección se pedirá a Nicolás repetir los pasos afectados; ningún resultado se marcará como obtenido sin su reporte.

No se modificaron Backend, migraciones, Phaser, el catálogo v1 ni el mundo 3D. No se hicieron commits, push o merges.
