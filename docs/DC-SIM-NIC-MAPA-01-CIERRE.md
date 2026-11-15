# DC-SIM-NIC-MAPA-01 — CIERRE DEL INCREMENTO

Fecha: 14 de noviembre de 2026. Estado: **mapa y recorrido demostrativo implementados; integración visual definitiva pendiente de Cristian**. No constituye integración académica E2E.

## Base y conservación

- Rama: `feature/simulador-integracion-nicolas`.
- SHA inicial: `6e4f5ee3308ca0eb7abbfd435727e10de26f25a4`. Base actualizada antes del commit: `87d55f2023bdd085e1e1abc777499a5e6d61e4dc` (PR #7 y #8 de develop).
- Se actualizó la referencia remota antes de editar: `origin/develop` coincide con esa base; se pudo continuar en la rama existente.
- Estado inicial: únicamente `docs/SIM-QA-PREPARACION.md` sin seguimiento. Se conservó sin modificar.
- No se crearon commits ni se hicieron push, PR, merge o cambios en ramas de otros integrantes.

## Componentes reutilizados

Se reutilizan `PanelPreguntas`, `IndicadorProgreso` y `SimuladorStore` para preguntas exclusivamente demostrativas, `PanelNarrativo` para la historia original independiente de SIM-01 y el logotipo ya integrado en `public/images/prisaly-logo.png`.

No se modificaron motor/guiones SIM-01, N9, coordinador M5, enlace académico, DTO ni contratos Backend. Tampoco login, dashboards, navegación, guards, rutas o estilos globales de Mariana. El proveedor HTTP sigue sin registro global.

## Archivos del incremento

Rutas relativas a `src/app/features/simulador/`:

| Archivo | Responsabilidad |
| --- | --- |
| `exploracion/mapa.models.ts` | Tipos locales del mapa y contrato visual para plantillas. |
| `exploracion/mapa-demo.ts` | Configuración de tres espacios y posiciones demostrativas. |
| `exploracion/exploracion.store.ts` | Estado visual en memoria, selección, visitas y transiciones. |
| `exploracion/mapa-interactivo.ts` | Único componente responsable del mapa y selección. |
| `exploracion/mapa-interactivo.css` | Composición isométrica fija y adaptación móvil. |
| `exploracion/confirmacion-entrada.ts` | Diálogo modal accesible, confirmación y cancelación. |
| `exploracion/recorrido-mapa.ts` | Composición presentación/mapa/interior/preguntas de ejemplo. |
| `exploracion/exploracion.store.spec.ts` | Ocho pruebas de estados, integridad y navegación. |
| `exploracion/recorrido-mapa.spec.ts` | Nueve pruebas de componentes, composición, accesibilidad y aislamiento de M5. |
| `pages/simulador-page.ts` y `.html` | Entrada opcional al mapa dentro del simulador, sin modificar rutas globales. |

Único documento nuevo: este informe. Las capturas se guardaron fuera del repositorio Frontend, en `Entregables/Simulador/DC-SIM-NIC-MAPA-01/`.

## Estructura y recorrido

Punto de entrada: `/simulador`, botón **Explorar mapa demostrativo**. La demostración original **Ver demostración con datos simulados** se conserva.

El mapa usa cámara fija y un suelo isométrico estilizado, sin motor 3D. Hospital, comisaría y oficinas son marcadores neutros con aviso de plantilla pendiente, no edificios nuevos que dupliquen la biblioteca visual de Cristian. Los IDs llevan prefijo `demo-`, no son UUID académicos.

Cada espacio declara `id`, `nombre`, `plantillaVisual`, `posicion {x,y}` y `disponible`. La posición se expresa en porcentajes visuales de la configuración local, no se persiste ni existe un editor. Cambiarla no cambia la navegación por ID. Se validan unicidad, prefijo local, disponibilidad y coordenadas finitas dentro del margen visual.

Selección y entrada son acciones distintas. Se destaca el espacio seleccionado, se puede entrar, volver al mapa, elegir otro lugar y repetir visitas en cualquier orden. Los contadores no califican ni habilitan/bloquean preguntas. No hay un mínimo de exploración.

El interior provisional explica que faltan las piezas de Cristian. No inventa personajes, testimonios o diálogos del lugar. Opcionalmente muestra el `PanelNarrativo` original, rotulado como historia independiente sin asociación con el edificio ni con preguntas académicas. Esa historia conserva su ciclo de vida original; no se declara progreso narrativo persistido por espacio.

## Contrato visual mínimo para coordinar con Cristian

Se expone `PlantillasEspacio` con dos `TemplateRef` opcionales:

- `exterior: TemplateRef<ContextoExterior>` recibe el espacio (`$implicit`), `seleccionado` y número de `visitas`.
- `interior: TemplateRef<ContextoInterior>` recibe el espacio (`$implicit`), `interaccionActiva` y la función `emitir(evento)`.

`plantillaVisual` selecciona la pieza dentro de la plantilla externa. Cristian conserva sus componentes, personajes, expresiones y lógica de diálogos. El mapa no interpreta la estructura interna de SIM-01.

Eventos visuales definidos:

| Evento | Efecto del anfitrión |
| --- | --- |
| `interaccion-iniciada` + `espacioId` | Marca la interacción visual del espacio actual como activa. |
| `interaccion-finalizada` + `espacioId` | Termina ese estado visual; no guarda ni evalúa respuestas. |
| `salida-solicitada` + `espacioId` | Regresa al mapa conservando selección y visitas. |

Los eventos de otro espacio o fuera de exploración se ignoran. La salida también está disponible en el anfitrión; no depende de finalizar una conversación.

El exterior se inserta dentro del botón accesible del mapa: debe ser presentacional, sin botones/enlaces anidados. El interior puede contener los controles y personajes de Cristian. Esta regla evita dos capas responsables del mismo clic o mapa.

La prueba de integración usa plantillas externas ficticias y verifica selección, renderizado y los tres eventos. **Es un contrato local propuesto y preparado, no un acuerdo ya confirmado por Cristian ni una integración de sus componentes definitivos.** Antes de incorporarlos se debe confirmar juntos ese contrato y asignar cualquier archivo compartido. No se enviaron mensajes a otros integrantes.

## Punto PRISALY y preguntas

El punto central usa el logotipo disponible y permanece accesible sin visitas. Abre un `dialog` nativo con foco dentro del modal y cancelación mediante botón o Escape. Cancelar conserva selección y visitas; la exploración no recibe acciones mientras el modal está activo.

Confirmar cambia únicamente la fase visual y abre las preguntas del `CASO_DEMOSTRACION` usando los componentes existentes. Durante ese bloque desaparecen mapa, interiores y salida del recorrido. El store visual también rechaza acciones de exploración.

Para cerrar este ejemplo se solicita una selección en las tres preguntas de ejemplo. Se identifica explícitamente como una condición de la demostración, **no como política académica aprobada**. El cierre solo finaliza la vista demo; no invoca M5 ni calcula notas. No se define un regreso académico a exploración después de completar preguntas: se permite salir de la demostración.

Fases locales: presentación, explorando, confirmando, cuestionario, completado. No amplían el catálogo de Intento. Toda la información permanece en memoria; recargar reinicia la demostración y se avisa en pantalla.

## Pruebas y verificaciones

Entorno: Node 24.22.1 y Chrome Headless 157.

- **271 pruebas aprobadas** sobre la base anterior `6e4f5ee`, incluidas 17 nuevas del mapa. Tras actualizar a `87d55f2`, la compilación de pruebas terminó pero Chrome Headless no pudo iniciarse; no se declara aprobada la suite sobre la base actual.
- Se cubren renderizado, edificios, selección, entrada/salida, orden libre, visitas repetidas, preguntas sin visitas, cancelación/Escape, modal/foco, transición, bloqueo visual y de estado, finalización demo, controles nativos y plantillas externas.
- Las pruebas espían las ocho operaciones del gateway y verifican que ninguna se invoca; `HttpTestingController` comprueba que no hay solicitudes HTTP. No se sustituyen operaciones académicas por éxitos simulados.
- TypeScript de aplicación y pruebas: correcto.
- Compilación de producción en la base anterior: correcta; paquete inicial 277.90 kB, sin exceder presupuestos.
- Verificación de URLs y `git diff --check`: correctos.
- Navegador real en `http://localhost:4201/simulador`: selección y entrada con Enter, regreso al mapa, conservación de visitas, confirmación, cancelación con Escape y recorrido de preguntas hasta el cierre demostrativo comprobados.
- Diseño revisado en anchos efectivos de 1067 y 375 px; sin desbordamiento horizontal. En móvil se reorganizan los controles, conservando el acceso a todos los espacios y al punto PRISALY.
- No hay animaciones de movimiento ni cámara móvil. La transición decorativa de selección se elimina con `prefers-reduced-motion: reduce`. No se cambió la preferencia de movimiento del sistema ni se afirma una emulación de esa preferencia durante la revisión visual.

La primera ejecución encontró un selector de texto incorrecto en una prueba nueva; se corrigió y la suite final pasó completamente. La automatización visual también omitió una selección al avanzar demasiado rápido entre preguntas; al revisar el estado visible se completó la pregunta pendiente y se comprobó el cierre. No fue necesario modificar el sistema de preguntas.

Capturas sanitizadas: `mapa-demostrativo.jpg` y `cuestionario-demo.jpg`. La captura de página completa falló en el navegador; se conservaron las capturas de vista disponibles. La adaptación móvil se comprobó visualmente y por medidas DOM, sin atribuirle una captura completa que no se obtuvo.

## Dependencias y siguiente acción

- Cristian: aceptación conceptual del contrato recibida; faltan los componentes reales y la validación conjunta del hospital exterior/interior con dos personajes. Fase 3 no se declara finalizada.
- Mariana: conserva el acceso general; no se modificó su dashboard. El nuevo punto de entrada está dentro del simulador existente.
- Backend/Dirección Central: fases persistidas, transición autorizada al cuestionario, regla académica de bloqueo, completitud, contexto y contenido narrativo oficial. No se inventaron endpoints ni correspondencias.

Paquete preparado: dos archivos versionados modificados (página TS/HTML), nueve archivos nuevos en `exploracion/` y dos documentos (este informe y `CONTRATO-MAPA-BIBLIOTECA-VISUAL.md`): 13 archivos. El documento QA preexistente permanece sin seguimiento y queda excluido del paquete. Al preparar el paquete el índice estaba vacío y aún no había publicación remota.

Siguiente acción recomendada: revisar el mapa demostrativo con Nicolás y confirmar el contrato visual con Cristian. Después incorporar su biblioteca por las entradas previstas, manteniendo separada cualquier integración académica futura.

## Preparación de publicación controlada — 15 de noviembre de 2026

El cuestionario demostrativo no ofrece «Pregunta anterior» y exige seleccionar una opción antes de avanzar. La suite de 271 pruebas ya aprobó con ese ajuste; esta preparación solo actualiza documentación y no repite la suite.

Inventario exacto autorizado para revisión, sin preparar todavía el índice:

```text
docs/CONTRATO-MAPA-BIBLIOTECA-VISUAL.md
docs/DC-SIM-NIC-MAPA-01-CIERRE.md
src/app/features/simulador/exploracion/confirmacion-entrada.ts
src/app/features/simulador/exploracion/exploracion.store.spec.ts
src/app/features/simulador/exploracion/exploracion.store.ts
src/app/features/simulador/exploracion/mapa-demo.ts
src/app/features/simulador/exploracion/mapa-interactivo.css
src/app/features/simulador/exploracion/mapa-interactivo.ts
src/app/features/simulador/exploracion/mapa.models.ts
src/app/features/simulador/exploracion/recorrido-mapa.spec.ts
src/app/features/simulador/exploracion/recorrido-mapa.ts
src/app/features/simulador/pages/simulador-page.html
src/app/features/simulador/pages/simulador-page.ts
```

Excluido: `docs/SIM-QA-PREPARACION.md`, documento anterior de QA que se conserva intacto. Sin cambios en Backend ni archivos de biblioteca de Cristian. Al preparar el paquete el índice estaba vacío y no se había realizado commit, push, PR ni merge. El usuario autorizó posteriormente el commit y PR; el paquete no forma parte de develop hasta que se integre el PR.

Mensaje de commit solicitado: `BaseSimulador`.