# PRISALY — DC-SIM-NIC-VISUAL-32 — Resultado parcial

**Responsable:** Nicolás — Mapa y navegación. **Colaborador:** Cristian — Biblioteca visual y narrativa. **Dirección Central:** 6.0.

**Resultado:** hospital técnico **V1 probado realmente en Phaser**, funcional con observaciones. La comparación V1/V2 y la validación conjunta completa permanecen **bloqueadas**: Nicolás confirmó que aún no ha recibido V2 ni la ficha VISUAL-31. No se declara completada la integración del hospital gráfico ni la conversación/interior de Cristian.

## 1. Preservación y alcance

- Rama: `feature/simulador-integracion-nicolas`.
- HEAD: `0887074005102aaefbabbb15f7f85bbdc06867bf`.
- Estado inicial: 13 archivos versionados modificados y 9 archivos nuevos sin seguimiento, correspondientes a trabajo local posterior al push. Se conservaron.
- Respaldo: `Entregables/Simulador/VISUAL-32-preservacion-1794865258529/`; incluye estado Git, patch y copias con SHA-256. Se verificaron 26 archivos del estado previo y contratos de referencia, sin modificaciones durante esta tarea.
- El único archivo añadido dentro del repositorio por esta intervención es este informe. El laboratorio y la recepción se crearon fuera del repositorio Frontend, dentro de `Entregables/Simulador`.
- No se sustituyeron archivos de Cristian, contratos compartidos, recursos productivos, provider `PAQUETE_VISUAL`, posiciones, caminos ni colisiones. Sin commit, push, PR ni merge.

## 2. Recepción e integridad

ZIP recibido: `C:/Users/NICOLAS/Downloads/PRISALY-CRIS-VISUAL-28-PAQUETE.zip`.

SHA-256 del ZIP: `8aec1b3d97e77424aa2aec7cca0d58956f38cd7b52e8920b9ef4f69f9d442c9e`.

Se extrajo en una carpeta nueva, `Entregables/Simulador/VISUAL-32-recibido-VISUAL28/`, tras comprobar que las rutas permanecían dentro del destino. El contenido recibido se trató como material técnico de consulta; sus instrucciones no sustituyen el alcance autorizado por Nicolás.

| Recurso | Disponibilidad | Comprobación |
|---|---|---|
| Hospital técnico V1 | Recibido: `recursos/hospital-exterior-v1.png` | PNG 236×274, alfa real; apoyo (118,266), escala 0,5 |
| Hospital gráfico V2 | **No recibido** | Nicolás lo confirmó; no se generó un sustituto |
| Explorador V1 | Recibido: `recursos/explorador-v1.png` | Hoja 256×48, 8×1, celdas 32×48, apoyo (16,48), escala 0,63 |
| Árbol V1 | Recibido: `recursos/arbol-v1.png` | PNG 64×64, apoyo (32,64), escala 0,8, decorativo |
| Manifiesto `PaqueteVisual` | Recibido: `paquete-visual.ts` | Compatible con el validador y mundo actuales, sin cambiar el manifiesto |
| Ficha actualizada VISUAL-31 | **No recibida** | No puede contrastarse su medición con Phaser todavía |
| Composición de referencia | Recibida: 420×300 | No se utilizó como fondo ni como evidencia de ejecución |
| Interior Angular/SIM-01 de Cristian | No incluidos en este ZIP | No se montaron ni se sustituyeron por una conversación de demostración |

Las cuatro imágenes coinciden con `SHA256SUMS.txt`. Las tres rutas requeridas por el manifiesto existen en el laboratorio, con dimensiones reales correctas, incluida la hoja del explorador. La copia recibida de `contrato-visual.ts` tiene exactamente el mismo SHA-256 que el contrato actual: `dd1db4bd10e282a78e33337c36e4cec025fe24a2537e2c0b3ad33621f7ffee3f`. No se copió sobre el contrato del repositorio.

Antes de recibir el ZIP se inspeccionaron los directorios locales conocidos y las 13 ramas remotas del repositorio. No aparecían VISUAL-28/31; no se asumió que el hospital provisional antiguo de Nicolás fuera V1 o V2 de Cristian.

## 3. Prueba real y condiciones

Laboratorio: `Entregables/Simulador/VISUAL-32-laboratorio/`, servido únicamente en `http://127.0.0.1:4212/`.

- Importa directamente el `iniciarMundoPhaser`, adaptador gráfico, validador, fixture y funciones de proyección del checkout actual.
- Importa el manifiesto recibido sin editar; copia las tres imágenes sin alterar sus bytes a las rutas locales requeridas.
- Usa una copia en memoria del mundo actual. No cambia su geometría, no añade rutas ni desplaza el hospital.
- Canvas 900×540, inspección en viewport 1440×950, FIT sin deformación. No hay desplazamiento de cámara en este encuadre.
- Las marcas de apoyo, puerta, nodo y huella se dibujan en una capa SVG de diagnóstico sobre el canvas, usando la transformación real de la aplicación. La capa no recibe clics y no modifica el renderizado ni la geometría de los recursos.
- La selección se hizo por clic en la imagen del hospital, no mediante teletransporte. El controlador real registró movimiento y llegada a `(795,300)`.
- La interfaz indica expresamente que se muestra V1 y que V2 no está disponible. **No es una comparación V1/V2** ni una activación productiva.

## 4. Medición de acceso V1

Proyección conservada:

```text
xEscena = xLogico
yEscena = 90 + sin(40°) * yLogico
sin(40°) = 0,6427876096865393
cos(40°) = 0,766044443118978
```

El renderer coloca el sprite en el apoyo proyectado y aplica únicamente su escala uniforme. Para un punto del PNG:

```text
puertaEscena = apoyoEscena + escala * (puertaPx - apoyoPx)
```

| Elemento | Coordenada lógica o imagen | Coordenada de escena |
|---|---|---|
| Huella hospital | x=745, y=150, ancho=110, alto=105 | Huella de suelo proyectada, conservada |
| Apoyo | Mundo (800,255), PNG (118,266) | (800; 253,910840) |
| Pie de la puerta visible V1 | PNG (108,266), punto en el borde inferior de la abertura | (795; 253,910840) |
| Nodo de interacción | Mundo (795,300), manifiesto relativo (-5,45) | (795; 282,836283) |
| Diferencia nodo − puerta | Mundo (0,45) | **(0; 28,925442)** |

La abertura de color oscuro ocupa los píxeles x=85…131, y=187…265; su borde inferior es y=266. La medición usa el centro horizontal x=108 y ese borde, no el centro de la hoja completa. El rectángulo visual de puerta mide aproximadamente 23,5×39,5 unidades de escena con escala 0,5.

### Diagnóstico por causa

1. **Anclaje:** no se demuestra un error de anclaje V1. La puerta y el apoyo comparten y=266 en el PNG, por lo que ambos quedan en la misma línea de suelo después del renderizado.
2. **Escala:** la transformación uniforme 0,5 se aplica como declara el paquete. Cambiarla no elimina la separación vertical puerta/apoyo, porque esa diferencia en el PNG es cero. No se recomienda deformar el recurso.
3. **Geometría del recurso:** V1 coloca el umbral visual sobre la base del edificio, mientras su `entrada` describe un punto de interacción exterior 45 unidades por delante. Esa distinción explica la separación medida; no se dispone todavía de la geometría de V2.
4. **Perspectiva:** no se demuestra un fallo de la transformación. Los factores y el origen son los actuales. La aceptación artística conjunta sigue pendiente, y no puede extrapolarse de este V1 técnico al V2 ausente.
5. **Ubicación lógica del nodo:** es la causa directa del desplazamiento V1 observado entre el umbral y el punto de parada. El nodo actual queda fuera de la huella y es alcanzable. No equivale a decir que el nodo sea incorrecto: puede ser deliberadamente el punto exterior desde el que Angular permite entrar.

### Decisión técnica recomendada

**Conservar por ahora la huella, el apoyo y el nodo (795,300).** Distinguir explícitamente en la ficha: puerta gráfica/umbral y nodo exterior de interacción. Diseñar visualmente su conexión —acceso, escalón o sendero— cuando se revise V2, sin afirmar que eso ya está implementado.

No trasladar el nodo directamente al umbral actual `(795,255)`: cae sobre la huella y dentro del bloqueo ampliado por el radio 12 del personaje. La navegación real rechaza ese destino; el nodo actual sí es alcanzable. Cambiar solo el anclaje para bajar todo el hospital desplazaría la base respecto de su huella y ocultaría la causa en lugar de resolverla.

No se atribuye esta causa a V2 ni a la ficha VISUAL-31, que no se recibieron. Antes de ajustar rutas o colisiones, Cristian debe aportar puertaPx, apoyoPx, escala, huella y significado del nodo de interacción de V2. Las dos versiones deberán compararse con el mismo apoyo, mundo y encuadre.

## 5. Escala, profundidad y oclusión

- El ancho opaco del hospital es compatible aproximadamente con su huella de 110 unidades a escala 0,5. La altura total visible de V1 también resulta próxima a la suma proyectada del volumen de referencia y su profundidad de suelo; esto no constituye aprobación artística.
- El explorador muestra una silueta de 43 píxeles de alto en la hoja, aproximadamente 27,09 unidades de escena a escala 0,63. Si `alturaLogica:26` se interpreta como altura física Z, correspondería a 19,917 unidades proyectadas. **Observación para calibrar con Cristian:** documentar el significado y consistencia de esa altura; no se cambió su escala ni su manifiesto.
- Árbol de apoyo lógico `(270,250)`. El explorador se observó detrás en `(260;247,360088)` y delante en `(260;259,805879)`. Las capturas de detalle muestran ocultamiento parcial en la posición posterior y el cuerpo visible en la delantera.
- El árbol continúa siendo decorativo. La oclusión de dibujo no prueba bloqueo físico de tronco.
- No se ensayó caminar detrás del hospital: el grafo actual no ofrece un recorrido válido allí. No se añadió uno para fabricar esa evidencia.

## 6. Resultado funcional y clasificación

| Hallazgo | Clasificación | Evidencia o límite |
|---|---|---|
| Integridad de VISUAL-28, rutas y manifiesto V1 | Funcional con observaciones | Cuatro hashes correctos; dimensiones y contrato reales compatibles |
| Hospital, explorador y árbol de V1 en Phaser | Funcional con observaciones | Capturas reales del laboratorio y recursos recibidos |
| Selección del hospital y caminata al nodo exterior | Funcional con observaciones | Clic sobre el sprite; `moviendo` y `llegada` del controlador real |
| Profundidad y oclusión parcial del árbol | Funcional con observaciones | Dos posiciones medidas y capturas de detalle |
| Puerta V1 frente al nodo | Funcional con observaciones | Separación explicada y reproducida: 28,925442 unidades de escena |
| Aceptación conjunta de proporciones y perspectiva | Pendiente | No hubo revisión conjunta completa con Cristian |
| Comparación V1/V2 y contraste de VISUAL-31 | Bloqueado | V2 y ficha no entregados, confirmado por Nicolás |
| Montaje del interior real de Cristian | Bloqueado | Componentes no incluidos ni montados en el laboratorio |
| Conversación real SIM-01, evento de salida, regreso y reingreso | Bloqueado | No se ejecutaron; no se reemplazaron por fixtures locales |
| Validado conjuntamente | Pendiente | Ningún elemento se presenta como aprobación conjunta definitiva |

La llegada al nodo no es una prueba de apertura del interior. El laboratorio no contiene un botón que finja una conversación o la salida del hospital real.

En el registro de eventos, cada caminata ejecutada produjo su par movimiento/llegada, además de un único `listo` inicial. Las repeticiones de llegada corresponden a caminatas separadas. Esto **no** verifica unicidad de eventos Angular/SIM-01, que siguen sin ejecutarse en la integración real solicitada.

## 7. Evidencias y pruebas

Archivos en `Entregables/Simulador`:

- `VISUAL-32-V1-marcas.png`: V1 con apoyo, puerta, huella y nodo.
- `VISUAL-32-V1-llegada.png`: personaje detenido en la entrada exterior.
- `VISUAL-32-V1-puerta-nodo-detalle.png`: detalle de la separación medida.
- `VISUAL-32-V1-arbol-detras.png` y `VISUAL-32-V1-arbol-delante.png`.
- `VISUAL-32-V1-arbol-detras-detalle.png` y `VISUAL-32-V1-arbol-delante-detalle.png`.
- `VISUAL-32-eventos-V1.json`: eventos reales leídos de la interfaz de diagnóstico.
- `VISUAL-32-consola-V1.json`: sin errores ni advertencias capturados en el laboratorio (`[]`).
- `VISUAL-32-validacion-recibido.json`: seis comprobaciones específicas correctas: contrato, hashes, rutas/dimensiones, distancia puerta/nodo, rechazo del umbral por colisión y acceso al nodo actual.
- `VISUAL-32-tests-base.log`: **485 pruebas Angular aprobadas** de la base local conservada, incluidas pruebas del mundo y continuidad narrativa. No equivalen a ejecución del interior de Cristian.
- `VISUAL-32-build-base.log`: compilación correcta, salida 0; advertencia conocida de Phaser/CommonJS.

El laboratorio utiliza el renderer real mediante una compilación aislada con las dependencias instaladas. Sus fuentes `main.ts`, `index.html`, `preparar.mjs`, `servidor.mjs` y `validar-recibido.ts` permiten repetir el ensayo sin copiar recursos ni contratos sobre producción.

## 8. Continuación necesaria

Recibir hospital gráfico V2, su manifiesto versionado y la ficha VISUAL-31; después comparar ambas versiones sin cambiar la base lógica. Para cerrar el flujo completo hacen falta también una entrega accesible del interior Angular y conversación de Cristian con sus dependencias y eventos tipados. Solo tras ejecutarlos realmente podrán aprobarse entrada, conversación, salida y reingreso.

**VISUAL-32 no queda completada.** Esta entrega aporta un diagnóstico reproducible y evidencia real de V1; V2 y la integración interior siguen pendientes de recepción y prueba.
