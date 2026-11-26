> **OBSOLETO (DC-SIM-LIMPIEZA-01, 26/11/2026):** documento histórico del simulador 2D/2.5D, ya retirado. El único simulador oficial es MUNDO-24 (ver `docs/SIMULADOR-2D5-RETIRADO.md`).

# Propuesta visual provisional para coordinación Nicolás–Cristian

> Registro histórico de 4B. Para el estado vigente, la referencia congelada y la integración preparada, consultar [SIM-FASE4C-INTEGRACION-VISUAL.md](SIM-FASE4C-INTEGRACION-VISUAL.md). El hospital activo de calibración es geométrico; el PNG mencionado abajo se conserva como recurso anterior. El paquete real de Cristian todavía no está disponible.

Esta propuesta no es un contrato definitivo ni una equivalencia con los componentes de Cristian.

- Referencia artística aprobada: `PRISALY_perspectiva_02.png`. No se usa como fondo.
- Cámara deseada: vista aérea inclinada, proyección y ángulo exactos pendientes de aprobación conjunta. La calibración 4B aplica una proyección paralela provisional y conserva las coordenadas lógicas existentes; la apariencia final todavía requiere validación conjunta.
- Terreno y caminos actuales: gráficos técnicos en Phaser, no recursos finales. La navegación continúa sobre el grafo y la colisión usa las áreas configuradas del mundo.
- Hospital: sprite provisional independiente generado con la herramienta de generación de imágenes a partir de la referencia como guía visual. Archivo `public/images/simulador/hospital-provisional-v1.png`; versión 1, ancho provisional 160 unidades lógicas conservando su relación de aspecto; origen normalizado (0.5, 1). Su volumen no define su colisión, que sigue siendo `EdificioTecnico.area`; la entrada corresponde al nodo configurado.
- Personaje: gráfico técnico dibujado en Phaser, origen lógico en los pies y radio de colisión independiente. Su tamaño y su perspectiva no están aprobados frente al hospital.
- Profundidad provisional: personaje y recursos independientes usan la coordenada Y del apoyo como profundidad. Las rutas se dibujan como capa de suelo. Es una aproximación; las superposiciones con edificios reales y cuerpos parcialmente ocultos requieren pruebas con los recursos definitivos.
- Cámara: sigue al personaje, respeta los límites lógicos y usa ajuste de escala. Se debe validar la proyección, recorte y tamaños con recursos coherentes y distintos dispositivos.
- Pendiente de acuerdo: ángulo/cámara, orientación, proyección lógica-pantalla, escala de persona y puerta, anclajes y márgenes transparentes, huellas, capas y máscaras para ocultamiento parcial, iluminación, formatos y resolución de entrega.
- El interior real requiere una versión compartida de Cristian, sus dependencias y recursos, integración con `PlantillasEspacio` y pruebas de eventos, montaje, desmontaje y reingreso. No se alteraron sus componentes.

La escena actual es una prueba técnica mixta y no alcanza todavía una zona visual 2.5D coherente: hospital inclinado, terreno y personaje provisionales no comparten una perspectiva ni escala verificadas.

Prompt del recurso generado: hospital futurista independiente con transparencia, vista aérea inclinada de tres cuartos compatible con la referencia, arquitectura blanca, cristal azul, luz naranja, cruz médica y entrada visible, sin terreno, texto ni otras edificaciones.

## Propuesta concreta para validar con Cristian (no activada)

1. **Cámara:** ortográfica, orientación sin giro horizontal inicial, elevación de 40° sobre el suelo. La imagen aprobada es una referencia ilustrada, por lo que no permite deducir un ángulo exacto; 40° es una propuesta, no una medición de la imagen. Cámara Phaser sigue el punto de apoyo, limitada al terreno; FIT conserva proporciones. En pantallas más amplias puede quedar espacio libre si el mundo completo ya está visible.
2. **Proyección:** lógica `(x, y)` sobre el suelo; propuesta `pantalla = (origenX + x, origenY + 0.6428*y)`, inversa `x=(pantallaX-origenX)`, `y=(pantallaY-origenY)/0.6428`. Es una proyección paralela inclinada sin perspectiva de fuga. La calibración 4B activa la escala vertical propuesta con origen visual y=90; los recursos de terreno y personaje aún no están calibrados con el hospital. Rutas, puntos, velocidades y colisiones permanecen en lógica de mundo.
3. **Escala propuesta:** figura de pie de 40 unidades de alto, puerta útil de 50–55 unidades, camino transitable visual de 40–50 unidades de ancho y radio lógico del personaje de 12 unidades. Las dimensiones son referencias de prueba, no escala definitiva; se debe validar que la puerta dibujada y el ancho del hospital coincidan antes de aprobarlas.
4. **Recursos que necesita Cristian:** hospital exterior PNG/WebP con alfa real, sin suelo incrustado, vista de tres cuartos superior con elevación acordada; lienzo y ancho/alto en píxeles, coordenadas exactas del punto de apoyo y de la puerta; huella de colisión en coordenadas lógicas separada, punto de entrada y capas frontal/trasera o máscara de oclusión. Un personaje provisional/definitivo de cuerpo completo con la misma vista y escala, en PNG/atlas transparente, con anclaje idéntico en pies, reposo y caminar, orientaciones mínimo frente, espalda y ambos lados (o 8 direcciones si así se acuerda), misma dimensión y origen para todos los fotogramas y duración de cada animación. También piezas independientes de terreno, camino y vegetación con apoyos y capas acordados.
5. **Profundidad:** ordenar por `y` lógico del apoyo, no por creación ni por la parte superior del sprite; suelo debajo, personaje y cuerpos por apoyo. Cuando una construcción deba ocultar solo parte del personaje se necesitan piezas frontal/trasera o una máscara y pruebas de ambos lados. La imagen provisional del hospital incluye márgenes y decoración sin apoyo calibrado; no prueba esta oclusión.
6. **Interiores:** Cristian debe publicar una versión accesible y documentar el montaje, el contrato de entradas y outputs, recursos y reinicio de conversación. El adaptador usa `PlantillasEspacio`; no sustituye la integración real.

La composición completa de la calibración 4B no está aceptada: sigue faltando un conjunto terreno-personaje-hospital con perspectiva, escala y anclajes verificados, y una prueba visual real de oclusión delante/detrás. El modo de pantalla completa y la ampliación no alteran las coordenadas lógicas.


## Resultado de la calibración 4B

La escena aplica `xPantalla=xLogica`, `yPantalla=90+sin(40°)*yLogica`; el clic aplica la inversa. El terreno y sus puntos se proyectan, mientras que el sprite del hospital y el personaje se dibujan sin compresión no uniforme. El grafo, las rutas, las entradas y la colisión permanecen en unidades lógicas. La cámara usa la vista y límites técnicos 900×540; no se ha medido el ángulo real de la imagen de referencia.

Un árbol decorativo de prueba usa apoyo lógico (270,250), profundidad 250 y no forma parte de las colisiones; el trayecto cercano permite observar al personaje con profundidad menor y mayor. Se verificaron ambas posiciones por clic y la entrada y salida del hospital provisional. Este árbol es un recurso técnico para probar el orden, no una validación de colisión con troncos ni de perspectiva artística definitiva.

Continúan pendientes los recursos de Cristian con la misma vista, escala y anclajes. El personaje y el suelo siguen siendo dibujos técnicos: la coherencia artística, el ajuste de la puerta y la oclusión parcial frente a un edificio real no están demostrados; la fase 4B no debe declararse completada por esta prueba.
