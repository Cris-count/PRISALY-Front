> **OBSOLETO (DC-SIM-LIMPIEZA-01, 26/11/2026):** documento histórico del simulador 2D/2.5D, ya retirado. El único simulador oficial es MUNDO-24 (ver `docs/SIMULADOR-2D5-RETIRADO.md`).

# PRISALY — Revisión integral del simulador

Fecha de referencia: 16 de noviembre de 2026, Colombia. Revisión de código, documentación, compilación, suite Angular y recorrido real en navegador de la versión local.

## Conclusión

El proyecto tiene una demostración funcional que alcanza las fases 8 y 9. El frente actual de integración corresponde a Fase 9B y VISUAL-32, ambos parciales. La integración gráfica definitiva de Fase 5 y el funcionamiento académico real todavía no están cerrados. No corresponde afirmar que el simulador está terminado ni asignar un porcentaje global sin criterios de aceptación comunes.

## Base revisada y publicación

- Repositorio: PRISALY-Front.
- Rama: `feature/simulador-integracion-nicolas`.
- HEAD: `0887074005102aaefbabbb15f7f85bbdc06867bf`.
- Hay modificaciones y archivos sin seguimiento posteriores a ese commit, incluidos coordinación narrativa, transición de fase y recursos V1. El estado funcional revisado incluye esos archivos locales; no debe confundirse con lo que reciben los compañeros al descargar el commit publicado.
- Esta revisión no modifica implementación, Backend, contratos de compañeros ni publica cambios.

## Avance por frente

| Fase o frente | Evidencia y alcance actual | Estado |
| --- | --- | --- |
| Base técnica y 4B | Phaser, movimiento por clic, rutas, coordenadas lógicas, colisiones independientes y proyección provisional de 40°. Existe evidencia previa de profundidad con árbol. | Base técnica implementada; arte definitivo sin validar |
| 4C | Contrato visual y adaptador con recursos, apoyos, escala, colisiones y entradas separados. | Preparación técnica implementada |
| 5 / integración visual | Hospital técnico V1, explorador y árbol incorporados en la demo integrada. Hospital gráfico V2 y ficha VISUAL-31 no recibidos según la última información del usuario. | Parcial; aceptación visual pendiente |
| 6 / libreta | Pistas explícitas, notas personales, apertura modal y conservación durante la demo. | Funcional en memoria |
| 7 / experiencia integrada | Ciudad, interior de demostración, conversación, libreta y cuestionario conectados en una misma experiencia. | Demo funcional |
| 8 / control de fases | Plaza Central, confirmación de inicio, bloqueo de exploración, cuestionario y confirmación de finalización. | Demo funcional; transición oficial pendiente |
| 9 / continuidad narrativa | Guiones por edificio, decisiones, efectos, pistas sin duplicación y reingreso conservando conversación. | Implementación local; hospital comprobado manualmente |
| 9B / interiores de Cristian | Coordinación documentada. La página revisada renderiza su interior de demostración; no monta todavía el hospital real mediante PlantillasEspacio. | Preparación, integración real pendiente |
| VISUAL-32 | Diagnóstico V1 disponible. Comparación V1/V2 y validación conjunta requieren recursos faltantes. | Parcial, no completado conjuntamente |
| Participación académica | Existen tipos, puertos y adaptadores HTTP. El gateway predeterminado indica contratos pendientes y la página ejecuta estados locales. | Sin validación académica de extremo a extremo |

Las rutas `/simulador` y `/simulador-integrado` conviven. La primera conserva una experiencia técnica anterior; la segunda contiene el recorrido integrado más avanzado. Conviene indicarlo al equipo para evitar evaluaciones de versiones distintas.

## Recorrido ejecutado en navegador

Servidor local en `http://127.0.0.1:4213/simulador-integrado`.

1. Iniciar experiencia, caminar al hospital y entrar.
2. Avanzar el diálogo del Dr. Mendoza y solicitar el informe: se obtiene una pista.
3. Abrir libreta, consultar Historia Clínica de Emergencia y añadir una nota.
4. Continuar conversación, salir al mapa y reingresar: se conserva el último diálogo, una pista y una nota. Se observó un solo canvas.
5. Caminar a Plaza Central y confirmar inicio del cuestionario.
6. Responder tres preguntas de ejemplo. Cancelar la finalización conserva bloqueado el acceso al mapa.
7. Confirmar finalización: la interfaz informa expresamente que no se registró un intento en el servidor.
8. Iniciar una nueva demo: la libreta vuelve a cero.
9. Revisar viewport de 390 × 844: se confirma desbordamiento horizontal del mapa. La libreta sí abre como modal nativo y su ancho medido es aproximadamente 337 px.

Esto verifica el interior y la conversación de demostración. No acredita la ejecución del interior real de Cristian, su SIM-01 ni sus eventos de salida. Tampoco acredita persistencia académica, calificación o resultados oficiales.

## Hallazgos y pendientes

> Los puntos 1 a 3 quedaron resueltos en `e7add19`; véase [Actualización del 17/11/2026](#actualización-del-17112026).

1. **Adaptación móvil:** con viewport de 390 px, el documento alcanza 1229 px de ancho. La ciudad queda recortada y requiere desplazamiento horizontal. Debe resolverse antes de aceptar adaptación de pantalla. Durante el cambio de tamaño también se registraron errores `ResizeObserver loop completed with undelivered notifications`; queda pendiente diagnosticar su causa, sin atribuirla únicamente al desbordamiento.
2. **Confirmación inicial del cuestionario:** utiliza `dialog open`; durante la comprobación no coincide con `:modal`, no tiene `aria-modal` y el foco permanece fuera. El bloqueo lógico del mapa funciona, pero falta completar el comportamiento de teclado y foco. La libreta sí utiliza modal nativo correctamente.
3. **Texto de producto:** algunas instrucciones llaman “oficial” al cuestionario, aunque la experiencia ejecutada es una demo local con preguntas de ejemplo y sin intento registrado. Debe aclararse para evitar una evaluación incorrecta del avance.
4. **Gráficos y acceso:** falta V2 y VISUAL-31. En el diagnóstico V1 la puerta y el nodo de interacción tienen separación de 45 unidades lógicas, aproximadamente 28,93 px de escena. No debe moverse el nodo automáticamente: llevarlo al umbral entra en conflicto con la huella de colisión inflada por el radio del personaje. Véase el informe VISUAL-32 para la medición y recomendación.
5. **Interiores reales:** queda integrar el componente de Cristian mediante el contrato acordado y ejecutar entrada, conversación, salida y reingreso, comprobando entrega única de eventos. La demo propia no sustituye esa prueba.
6. **Persistencia y academia:** notas, pistas y continuidad permanecen en memoria de la experiencia; no sobreviven a recarga. La transición oficial, autorización del intento, respuestas persistidas y resultados reales requieren conexión y pruebas con los contratos académicos. Los adaptadores aislados no demuestran ese flujo completo.
7. **Trabajo compartido:** hay cambios locales sin publicar. Antes de una entrega al equipo se debe revisar el conjunto y separar archivos de implementación de utilidades locales; esta auditoría no realiza esa publicación.

## Verificación automatizada

- Suite Angular completa: **485 pruebas aprobadas**, proceso con salida 0.
- Compilación de producción: **correcta**, salida 0; conserva advertencia de dependencia CommonJS de Phaser.
- Logs: `../../Entregables/Simulador/revision-integral-tests-20261116.log` y `../../Entregables/Simulador/revision-integral-build-20261116.log`.
- Las pruebas automatizadas no sustituyen la aceptación artística ni la validación académica real.

## Evidencias

En `../../Entregables/Simulador/`:

- `revision-integral-mapa-actual.png`: escena actual con V1.
- `revision-integral-conversacion.png`: conversación de demostración.
- `revision-integral-libreta.png`: pista y nota.
- `revision-integral-reingreso.png`: conversación conservada.
- `revision-integral-confirmacion.png`: paso al cuestionario.
- `revision-integral-cuestionario.png`: preguntas de ejemplo.
- `revision-integral-finalizacion-demo.png`: cierre explícitamente simulado.
- `revision-integral-movil-desbordamiento.png`: problema de ancho móvil.
- `revision-integral-libreta-movil.png`: libreta en pantalla pequeña.

## Orden recomendado

Primero corregir adaptación móvil, foco de confirmación y texto de demo. Después cerrar la integración real con Cristian cuando entregue V2 y VISUAL-31, sin alterar rutas por suposición. En paralelo, acordar y conectar los contratos académicos para probar persistencia y transición oficial. Solo tras esas comprobaciones corresponde declarar aceptación visual y académica.

## Actualización del 17/11/2026

Recomprobación sobre `e7add19` (rama `feature/simulador-integracion-nicolas`, publicada en origin), sin cambios de implementación. Servidor de desarrollo local en `/simulador-integrado`.

| Hallazgo | Comprobación | Estado |
| --- | --- | --- |
| 1. Adaptación móvil | Viewport 390 × 844: ancho del documento 390 px, sin desplazamiento horizontal; canvas 343 × 206 px. Cambios 1280 → 768 → 390 sin errores `ResizeObserver` en consola. Escritorio: canvas 922 × 553 px, un solo canvas. | Resuelto |
| 2. Confirmación inicial del cuestionario | El diálogo se abre con `showModal()`: coincide con `:modal`, el foco entra en «Cancelar y seguir explorando». Escape cierra, vuelve a exploración y devuelve el foco al disparador. | Resuelto |
| 3. Texto de producto | Las vistas rotulan «demostración» y aclaran que no se persiste en Backend; cubierto por la prueba de auditoría de textos. | Resuelto |

Límites: la apertura del diálogo se invocó desde el componente, porque el navegador de verificación limitaba la animación y el personaje no completó el recorrido hasta Plaza Central. Conviene repetir manualmente el recorrido completo. La verificación usó Node 24.13.1 con el helper local `scripts/patch-node.cjs`; se recomienda Node ≥ 24.15 (referencia: 24.22.1).

Verificación automatizada: **489 pruebas aprobadas** y compilación de producción correcta (persiste la advertencia CommonJS de Phaser).

Siguen abiertos los puntos 4 a 7: recursos V2 y VISUAL-31, interior real de Cristian, persistencia y flujo académico, y publicación coordinada.
