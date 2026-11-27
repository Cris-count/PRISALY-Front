> **OBSOLETO (DC-SIM-LIMPIEZA-01, 26/11/2026):** documento histórico del simulador 2D/2.5D, ya retirado. El único simulador oficial es MUNDO-24 (ver `docs/SIMULADOR-2D5-RETIRADO.md`).

# PRISALY — Fase 4C: integración gráfica preparada

Estado: contrato y adaptador preparados; integración y aceptación gráfica de recursos reales pendientes de Cristian. La calibración técnica 4B se conserva como base. Este documento actualiza el estado descrito en `SIM-PROPUESTA-VISUAL-2D5-FASE4.md`.

## Referencia congelada provisionalmente

- Cámara ortográfica elevada 40°, sin giro horizontal. No es una cámara isométrica de 45°.
- Suelo: `(xPantalla, yPantalla) = (x, 90 + sin(40°) × y)`; escala Y = 0,6427876097.
- Altura física Z: `yPantalla = 90 + sin(40°) × y - cos(40°) × z`; factor Z = 0,7660444431.
- Clic: inversa de la proyección del suelo, después de convertir con la cámara Phaser.
- Unidades lógicas independientes de píxeles exportados y del ajuste FIT de pantalla.
- El personaje se ordena por su apoyo en los pies. Las capas de volumen se ordenan por apoyo Y + desplazamiento lógico de capa. Suelo/sombras quedan debajo.
- La escala del recurso es uniforme. No aplicar otra compresión Y a una imagen ya renderizada con esta cámara.

La revisión iniciada antes de la solicitud 4C corrigió el ancho proyectado de los caminos y añadió un hospital geométrico independiente y un personaje proyectado por altura. Son referencias técnicas locales; no sustituyen el trabajo gráfico de Cristian. Durante 4C no se cambió el ángulo ni el sistema de navegación.

## Qué está disponible

En este checkout solo se encontró `public/images/simulador/hospital-provisional-v1.png`, una imagen provisional sin paquete de metadatos compatible. No se encontraron hojas animadas ni el árbol final de Cristian. El provider `PAQUETE_VISUAL` permanece en `null`; no se activan recursos supuestamente finales.

El adaptador admite PNG/WebP locales con transparencia, imágenes estáticas y hojas regulares sin recorte ni rotación de fotogramas. El primer contrato admite cuatro orientaciones: sur, norte, este y oeste. Ocho direcciones, atlas recortados o máscaras dinámicas requerirán una ampliación coordinada.

## Contrato implementado

Fuente: `src/app/features/simulador/mundo-tecnico/contrato-visual.ts`.

| Dato | Convención |
|---|---|
| Identificador y versión | Por paquete, recurso y capa; identificadores únicos; versión entera positiva |
| Perspectiva | Elevación 40°, giro 0°, escala de suelo compartida |
| Dimensiones | Ancho/alto enteros en píxeles del lienzo o de un fotograma completo |
| Escala | Unidades de pantalla por píxel de imagen, igual en X e Y |
| Altura lógica | Altura física de referencia para verificar escala conjunta |
| Apoyo | `apoyoPx` relativo a la esquina superior izquierda, incluidos márgenes alfa |
| Colisión | Decorativo, rectángulo lógico relativo al apoyo o radio lógico del personaje |
| Entrada | Vector lógico relativo al apoyo del hospital; coincide con el nodo de entrada |
| Capas | Suelo o volumen; cada capa declara su apoyo y desplazamiento lógico Y para profundidad |
| Animaciones | Reposo/caminar por orientación; fotogramas enteros, fps y hoja de columnas/filas |

La carga comprueba dimensiones reales de cada archivo. El paquete se activa completo o conserva los provisionales si falta una textura o no coincide el tamaño, con diagnóstico en consola. Metadatos incompatibles se rechazan antes de crear Phaser. La validación no puede deducir de una imagen si el artista usó realmente 40° o una escala coherente; eso requiere revisión visual conjunta.

## Primera entrega solicitada a Cristian

1. **Hospital exterior:** PNG/WebP con alfa real, sin terreno ni panorama. Cámara común; ancho/alto exactos; posición del apoyo y de la puerta en píxeles; escala uniforme; altura lógica; huella y entrada relativas al apoyo; separación de sombra, cuerpo y fachada cuando sea necesaria. Identificar qué parte de la fachada puede ocultar al estudiante. No fijamos un tamaño final de lienzo sin ver sus recursos.
2. **Personaje:** hojas regulares transparentes para reposo y caminar en las cuatro orientaciones. Declarar dimensiones por fotograma, columnas, filas, índices y fps. Todos los fotogramas de una capa conservan lienzo y punto de apoyo; pies alineados. Entregar altura física y escala compatibles con la puerta y el hospital. El radio actual es 12 unidades lógicas; cambiarlo exige revisar navegación, no solo el dibujo.
3. **Árbol:** recurso independiente con apoyo identificado, altura lógica, escala y capas si la copa requiere oclusión separada. Indicar explícitamente si es decorativo o bloqueante. Un tronco bloqueante necesita una huella rectangular y un obstáculo equivalente aprobado en el mundo lógico. El árbol de calibración sigue siendo decorativo.
4. **Manifiesto:** objeto TypeScript que cumpla `PaqueteVisual`, con rutas versionadas bajo `/images/`, acompañado por los archivos y una referencia de los tres juntos. No se ha inventado un manifiesto final con dimensiones desconocidas.

Para la primera prueba conservar la geometría configurada del hospital:

| Dato lógico actual | Valor |
|---|---|
| Edificio | `hospital-prueba` |
| Huella absoluta | x=745, y=150, ancho=110, alto=105 |
| Apoyo absoluto del exterior | (800,255) |
| Huella relativa al apoyo | x=-55, y=-105, ancho=110, alto=105 |
| Nodo de entrada y regreso | `entrada`, posición (795,300) |
| Entrada relativa al apoyo | (-5,45) |
| Árbol de prueba | Apoyo inicial (270,250), decorativo |

La puerta dibujada y su camino de acceso deben concordar con ese nodo exterior. Si los recursos necesitan otra huella o ubicación, coordinar primero el mundo lógico y validar nuevamente sus rutas. Los tamaños gráficos no cambian automáticamente la colisión.

## Activación al recibir el paquete

1. Copiar los archivos entregados a una carpeta versionada bajo `public/images/simulador/`.
2. Importar el manifiesto real, comprobarlo con `validarPaqueteVisual(paquete, MUNDO_PRUEBA)` y registrar `{ provide: PAQUETE_VISUAL, useValue: paquete }` en el inyector que crea `FABRICA_MUNDO` (el mismo inyector; no un hijo de la fábrica raíz).
3. El puerto entrega el paquete como cuarto argumento opcional de `iniciarMundoPhaser`. También puede pasarse directamente en un anfitrión de prueba.
4. Phaser precarga los tres recursos, comprueba dimensiones, crea capas, anima el personaje y conecta el clic del hospital al nodo configurado. La ausencia de paquete conserva la calibración existente.
5. Revisar a escala de escritorio y móvil, y aceptar conjuntamente las capturas antes de activar la biblioteca real.

No se modificó `PlantillasEspacio`, el montaje de interiores ni los componentes internos de Cristian/Mariana. No se cambió Backend ni se implementó la libreta.

## Validación y límites

| Comprobación | Resultado |
|---|---|
| Personaje delante/detrás del árbol | Capturas reales de provisionales; se aprecia ocultamiento parcial y cambio de orden |
| Clic al hospital | Llegada por la ruta existente, verificada en navegador |
| Entrada/regreso | Interior provisional abierto y regreso confirmado |
| Obstáculo central | Clic rechazado; mensaje de destino no disponible |
| Escala gráfica vs. colisión | Tests admiten distintas dimensiones/escala sin mutar el mundo; rechazan huella/radio incompatibles |
| Animaciones del adaptador | Test real de Phaser con texturas sintéticas: reposo/caminar y orientación sur, apoyo y escala uniforme |
| Archivos ausentes/tamaño incorrecto | Tests detectan ambas condiciones |
| Profundidad frente a edificio | Orden numérico comprobado con texturas sintéticas; oclusión visual real del edificio pendiente |
| Adaptación | Captura 390×844, acceso a botones y clic de movimiento; FIT mantiene proporciones; los detalles se ven pequeños |
| Recursos reales de Cristian | No disponibles: coherencia artística y oclusión con sus fachadas aún no verificadas |

El grafo actual no ofrece un trayecto detrás del hospital. No se añadió uno para fabricar una demostración ni se atravesó su colisión. La prueba visual detrás de la construcción debe hacerse cuando el recurso y la geometría transitable lo permitan. Las capas ordenadas por apoyo resuelven oclusiones separables; un dibujo con geometría entrelazada podría necesitar una máscara futura.

Las imágenes de esta entrega son capturas reales de la escena provisional, no muestras de recursos de Cristian:

- `Entregables/Simulador/fase4c-delante.png`
- `Entregables/Simulador/fase4c-detras.png`
- `Entregables/Simulador/fase4c-hospital.png`
- `Entregables/Simulador/fase4c-interior.png`
- `Entregables/Simulador/fase4c-obstaculo.png`
- `Entregables/Simulador/fase4c-movil.png`

## Archivos de esta intervención

Todos dentro de `src/app/features/simulador/mundo-tecnico/`, salvo este documento:

- Nuevos de 4C: `contrato-visual.ts`, `adaptador-visual.ts`, `contrato-visual.spec.ts`.
- Integración 4C: `puerto-mundo.ts`, `phaser-mundo.ts`.
- Documentación: este informe y nota de estado en `docs/SIM-PROPUESTA-VISUAL-2D5-FASE4.md`.
- Revisión técnica 4B iniciada en este mismo chat: `volumen-calibracion.ts` (nuevo), `personaje-tecnico.ts`, `proyeccion-tecnica.ts`, `proyeccion-tecnica.spec.ts`, `phaser-mundo.ts`.

El checkout ya contenía otros cambios previos; no se atribuyen a esta intervención. Sin commit, push, PR ni merge.

## Verificación reproducible

Ejecutar desde `PRISALY-Front`:

```text
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --progress=false
node node_modules/@angular/cli/bin/ng.js build --progress=false
```

Pruebas: 348 aprobadas en Chrome Headless, incluidas las cinco pruebas nuevas del contrato/adaptador y dos de proyección. Compilación final: código de salida 0, incluida la copia de recursos estáticos. Logs de la entrega: `Entregables/Simulador/fase4c-tests.log` y `fase4c-build.log`. La compilación conserva la advertencia conocida sobre Phaser/CommonJS.
