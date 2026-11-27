> **OBSOLETO (DC-SIM-LIMPIEZA-01, 26/11/2026):** documento histórico del simulador 2D/2.5D, ya retirado. El único simulador oficial es MUNDO-24 (ver `docs/SIMULADOR-2D5-RETIRADO.md`).

# PRISALY — Fase 5: preparación y validación del estado existente

**Estado: preparación técnica verificada; integración gráfica real todavía no realizada.** Nicolás confirmó durante esta intervención que Cristian aún no ha entregado el paquete y que no se necesita por ahora. Se conserva la escena técnica y se aplaza la aceptación visual. No se generaron nuevos escenarios, edificios ni imágenes sustitutas.

## Inspección antes de implementar

- Checkout activo: `feature/simulador-integracion-nicolas`, base `b62751297e09b595847376f65c59c6b8bee29751`; había cambios locales anteriores, conservados.
- Se inspeccionaron `public`, `src`, `docs` y las entregas del workspace. Se encontró el contrato `PaqueteVisual`, su adaptador y el provider `PAQUETE_VISUAL` con valor predeterminado `null`.
- Se revisó también el checkout existente `C:/Users/NICOLAS/.codex/worktrees/sim01-existente/PRISALY-Front`, solo mediante lectura.
- En GitHub se listaron las ramas actuales y se inspeccionaron sus árboles completos, sin checkout, merge ni modificación de referencias locales:

| Rama | Commit inspeccionado | Resultado |
|---|---|---|
| `develop` | `2ce06e07c75d36b092f93dd03363bb3f1b7842d9` | Contrato de biblioteca documentado; sin paquete gráfico compatible ni interior real del hospital identificable |
| `feature/simulador-2d` | `0331392372cee28be226ffa131e66c89f8716099` | Componentes técnicos del simulador; sin el paquete solicitado |
| `trabajo/consolidacion-sim01-20261108` | `343541e59764be6587a60ec3493d038a77787120` | Componentes del simulador/narrativa; sin el paquete solicitado |

Fuentes remotas: [develop](https://github.com/Cris-count/PRISALY-Front/tree/2ce06e07c75d36b092f93dd03363bb3f1b7842d9), [simulador-2d](https://github.com/Cris-count/PRISALY-Front/tree/0331392372cee28be226ffa131e66c89f8716099), [consolidación](https://github.com/Cris-count/PRISALY-Front/tree/343541e59764be6587a60ec3493d038a77787120).

No se recibió una ubicación compartida adicional. La ausencia del paquete fue confirmada por Nicolás; no se interpretaron componentes técnicos existentes como recursos definitivos de Cristian.

## Recursos utilizados y origen

| Elemento activo | Origen | Alcance de la comprobación |
|---|---|---|
| Terreno/caminos | Gráficos Phaser locales existentes | Calibración técnica; no terreno artístico final |
| Hospital | `mundo-tecnico/volumen-calibracion.ts`, geometría provisional existente | Exterior independiente, apoyo, puerta y selección por clic |
| Personaje | `mundo-tecnico/personaje-tecnico.ts`, dibujo animado procedural existente | Movimiento, orientación y apoyo técnicos; no sprite de Cristian |
| Árboles | Gráficos locales existentes en `phaser-mundo.ts` | Profundidad y ocultamiento parcial; decorativos sin colisión de tronco |
| Interior | Fallback provisional de `SimuladorTemporal` | Apertura/regreso; no integración del interior real |
| `hospital-provisional-v1.png` | Recurso provisional de la etapa anterior | Presente en disco, no activo en esta verificación |

No se usó la referencia artística ni una imagen panorámica como fondo. No se deformaron recursos gráficos ni se cambiaron los parámetros congelados: elevación 40°, giro 0°, escala de suelo 0,6427876097 y factor de altura 0,7660444431.

## Avance independiente de los recursos

Se añadió una prueba de integración Angular–Phaser real en `src/app/features/simulador/pages/simulador-temporal.spec.ts`. A diferencia del test anterior con un control simulado, esta prueba crea el motor real, camina hasta el hospital y realiza dos ciclos de entrada/salida mediante los botones Angular.

Comprueba que:

- La posición lógica sigue siendo `(795,300)` al volver. Solicitar de nuevo esa entrada emite llegada inmediata sin un evento de movimiento.
- Se conserva exactamente el mismo elemento canvas, con un solo canvas en el componente.
- La fábrica y el evento `listo` ocurren una sola vez; entrar/salir no recrea el motor.
- El renderer no se destruye al visitar el interior y se destruye una sola vez al desmontar el componente.

No fue necesario modificar código de producción para superar esta comprobación. El mapa queda montado mientras el interior está visible. No se incorporó lógica académica, persistencia ni controles de teclado.

## Verificación en navegador

Escena local: `http://127.0.0.1:4204/simulador`.

| Comprobación | Resultado observado |
|---|---|
| Clic directo en hospital | Inicia caminata; no teletransporta. Capturas de inicio, recorrido y llegada |
| Ruta alrededor del obstáculo | Se conserva el recorrido configurado; clic central bloqueado muestra destino no disponible |
| Llegada a entrada | Angular habilita «Entrar a Hospital» |
| Entrada | Abre explícitamente el interior provisional |
| Regreso | Personaje permanece en la entrada; mensaje de regreso; corroborado por la prueba del motor real |
| Profundidad del árbol | Dos capturas muestran personaje detrás y delante, con ocultamiento parcial |
| Escritorio | Capturado con viewport 1366×768 |
| Móvil | Viewport 390×844; un canvas, 347,1875×208,3125 CSS px; botones accesibles |
| Clic tras redimensionar | Desde la entrada del hospital camina a otro punto y confirma llegada |
| Escala y anclajes finales | No aprobados: faltan los recursos compatibles |
| Animaciones definitivas | No disponibles; el adaptador se prueba con texturas sintéticas en la suite existente |
| Oclusión detrás del hospital | No probada visualmente: el grafo actual no tiene ese recorrido válido |

La prueba actual conserva las áreas azules de calibración y sus gráficos básicos. No se presentan como una zona hospitalaria terminada. No se rediseñó el terreno mientras está aplazada la integración gráfica.

## Capturas reales de esta intervención

Rutas relativas al workspace `C:/Users/NICOLAS/OneDrive/Desktop/Prisaly`:

- `Entregables/Simulador/fase5-escritorio-inicio.png`
- `Entregables/Simulador/fase5-caminando.png`
- `Entregables/Simulador/fase5-hospital-entrada.png`
- `Entregables/Simulador/fase5-interior-provisional.png`
- `Entregables/Simulador/fase5-hospital-regreso.png`
- `Entregables/Simulador/fase5-movil-regreso.png`
- `Entregables/Simulador/fase5-movil-movimiento.png`
- `Entregables/Simulador/fase5-arbol-detras.png`
- `Entregables/Simulador/fase5-arbol-delante.png`
- `Entregables/Simulador/fase5-obstaculo.png`

## Pruebas y compilación

Desde `PRISALY-Front`:

```text
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --progress=false
node node_modules/@angular/cli/bin/ng.js build --progress=false
```

- **349 pruebas aprobadas**, incluidas las 348 existentes y la nueva prueba de conservación con Phaser real.
- **Compilación correcta, salida 0**, incluida la copia de recursos estáticos.
- Permanece la advertencia conocida sobre Phaser/CommonJS.
- Logs: `Entregables/Simulador/fase5-tests.log` y `Entregables/Simulador/fase5-build.log`.

## Pendientes exactos de integración, aplazados por ahora

1. Hospital independiente compatible: PNG/WebP con alfa, perspectiva compartida, dimensiones, escala, apoyo, puerta, huella y capas.
2. Personaje: hojas regulares transparentes con reposo/caminar en norte/sur/este/oeste, fotogramas, fps, dimensiones y apoyo consistente en pies.
3. Árbol compatible: dimensiones, escala, apoyo y capas; declaración explícita de decoración o bloqueo.
4. Manifiesto real que cumpla `PaqueteVisual`, con rutas versionadas, metadatos y archivos. No se inventó uno con características finales desconocidas.
5. Interior real: ubicación/versionado del componente, dependencias y recursos, y montaje acordado mediante los contratos existentes sin cambiar `PlantillasEspacio` unilateralmente.
6. Validación conjunta de proporciones, iluminación, pies/suelo, puerta/nodo, vegetación/sombras y profundidad. Solo entonces diseñar el terreno artístico continuo y considerar la aceptación visual de fase 5.

La especificación detallada y el procedimiento de activación siguen en [SIM-FASE4C-INTEGRACION-VISUAL.md](SIM-FASE4C-INTEGRACION-VISUAL.md). No se exige recibir el paquete ahora; estos puntos registran lo necesario para reanudar la integración gráfica cuando corresponda.

## Archivos modificados en esta intervención

- `src/app/features/simulador/pages/simulador-temporal.spec.ts`: prueba nueva con Angular y Phaser reales.
- `docs/SIM-FASE5-ESTADO-Y-VALIDACION.md`: este informe.
- Capturas y logs nuevos enumerados arriba, fuera del repositorio Frontend.

Se conservaron todos los cambios locales anteriores. No se modificaron Backend, componentes internos de Cristian/Mariana, navegación, cámara, contratos de interiores ni recursos gráficos. Sin libreta, cuestionario definitivo, commit, push, PR ni merge.

**No se declara completada la fase visual 5.** El resultado de esta intervención es la verificación técnica y evidencia actual, manteniendo aplazada la integración artística según la aclaración del usuario.
