> **OBSOLETO (DC-SIM-LIMPIEZA-01, 26/11/2026):** documento histórico del simulador 2D/2.5D, ya retirado. El único simulador oficial es MUNDO-24 (ver `docs/SIMULADOR-2D5-RETIRADO.md`).

# PRISALY — Propuesta técnica del mundo 2.5D y prueba de movimiento

**Estado:** diseño local para revisión; no es contrato aprobado, implementación, esquema de base de datos ni especificación REST. Fecha: 15 de noviembre de 2026. Se conserva la pantalla temporal de `/simulador` y todo el trabajo local existente.

## 1. Decisiones y límites

- El estudiante se representa mediante un personaje que camina desde el primer piloto; puede usar clic y teclado.
- Cada caso configura los edificios y sus posiciones. Cada uno requiere dimensiones, colisión, entrada, salida y conexión transitable validada.
- Al regresar a un espacio la conversación continúa; su restauración necesita elecciones, condiciones, consecuencias y versión suficientes para reproducir el estado coherentemente.
- La libreta contiene pistas y notas. No son respuestas académicas y sus permisos aún deben acordarse.
- Al confirmar el cuestionario la transición oficial será irreversible por intento, persistida y garantizada por Backend, incluso tras recarga. Los estados locales no la sustituyen.
- Se recuperará la posición del personaje. Si es inválida, se buscará un punto seguro conforme a la política acordada; si ninguno es válido no se inventará una posición ni se habilitará exploración.

`PRISALY_perspectiva_02.png` es la referencia arquitectónica aprobada. La prueba propuesta es técnica y usa datos y figuras sintéticas; no reproduce la ciudad definitiva ni usa esa imagen como fondo.

## 2. Estado existente verificado

| Elemento | Existe | Límite |
| --- | --- | --- |
| `mapa.models.ts` / `PlantillasEspacio` | Tipos de mapa demostrativo y eventos de interior/exterior. | Coordenadas porcentuales, sin terreno, geometría transitable, colisión ni persistencia. Contrato conceptual compartido: no modificar sin Cristian. |
| `ExploracionStore` | Selección, visitas, transición y eventos visuales en memoria. | IDs de demostración, sin fase académica oficial ni recuperación tras recarga. |
| SIM-01 | Motor de escenas, marcas, diálogos y consecuencias en memoria. | Sin contrato público de restauración persistente por conversación. |
| Adaptador M3 local | Traduce fragmentos de diálogos, condiciones y consecuencias. | No produce un guion ejecutable ni determina cuándo ejecutar consecuencias. |
| Gateway y coordinador M5 | Consultas y guardado tipados; revisión y manejo de conflictos en Angular. | El proveedor HTTP sigue desactivado por defecto; fase oficial, narrativa y libreta no están definidos aquí. |
| Ruta `/simulador` | Pantalla temporal posterior a la limpieza visual. | No hay ciudad, navegación del personaje ni integración real del hospital. |
| Anime.js | Declarado en cambios locales. | No es un motor de rutas, colisiones ni persistencia. Phaser no está instalado. |

La referencia local Backend examinada anteriormente fue `16dd7968b2abab97d028e40ce3d775269cc1f02`; verificar la versión vigente con Backend antes de integrar. Inicio y finalización tienen controladores preparados detrás de un interruptor desactivado por defecto; no activar ni asumir reglas autorizadas. El hospital de Cristian fue reportado como local y sin commit: falta una versión compartida para comprobarlo.

## 3. Arquitectura propuesta

```text
Angular: acceso, herramientas, diálogo accesible y cuestionario
       ↕ comandos/observaciones tipados
Aplicación: recorrido, conversación, libreta y coordinación de fase
       ↕ puertos independientes de implementación
Mundo: configuración + navegación geométrica + adaptador de render
       ↕                                     ↕
Renderer Angular o Phaser             Gateway académico autorizado
       ↕                                     ↕
Recursos de Cristian                 Backend: identidad, versiones y persistencia
```

El renderer comunica intención y posición visual; no decide elegibilidad ni escribe respuestas. El controlador de aplicación valida acciones y pide autorización/persistencia por puertos acordados. La capa académica no depende de Phaser, del DOM ni de eventos de colisión. El cuestionario y el soporte accesible permanecen en Angular.

## 4. Convenciones geométricas propuestas

1. Un mundo tiene ancho/alto finitos en **unidades lógicas**, origen arriba a la izquierda, X hacia la derecha, Y hacia abajo. Una unidad no es necesariamente un píxel físico. Usar números finitos; la elección de unidades concretas será parte de cada versión.
2. Posición, dimensiones, colisiones, puntos y caminos usan el mismo sistema; la posición del personaje se mide en sus pies y la de edificio en un ancla explícita. La imagen, su escala y su sombra son presentación.
3. Proyección 2.5D: terreno, personaje y edificios comparten transformación mundo → pantalla. El clic pasa por la inversa pantalla → mundo, con cámara, zoom, desplazamiento, recorte y relación de píxeles considerados. El tipo exacto de proyección debe aprobarse con Cristian sobre recursos de cámara coherente; no asumir que una fotografía dibujada aporta geometría exacta.
4. Conservar proporción con `contain`/letterboxing o una cámara equivalente; no estirar ejes para adaptar pantalla. Un clic fuera del área visible del mundo se ignora.
5. Propuesta para la prueba: grafo de nodos y conexiones bidireccionales explícitas. Una arista es válida si todo el recorrido del cuerpo del personaje, con margen de seguridad, queda en zona transitable y fuera de obstáculos; no basta con comprobar su centro. La búsqueda puede usar A* con coste de distancia; implementación y estrategia de conexión de clics se comparan, sin declararlas producto final.
6. Un clic se proyecta únicamente a un punto alcanzable de la red según una distancia máxima acordada. Si está demasiado lejos, bloqueado o inaccesible, se notifica y no se atraviesa ningún obstáculo. No convertir silenciosamente cualquier clic en éxito.
7. Al iniciar el edificio, salida y el punto seguro deben quedar en terreno válido, sin colisión y conectados a la red accesible desde el inicio y la plaza. Si el caso cambia la configuración, se valida antes de publicarlo; no mover automáticamente edificios para resolver errores.
8. Posición recuperada: comprobar versión, límites, cuerpo completo, colisiones y conectividad. Si no es válida, buscar entre puntos seguros explícitos alcanzables de esa misma versión; elegir el más cercano por distancia lógica y desempatar por ID. Reportar la recuperación. Si faltan puntos válidos o la versión no es compatible, informar y bloquear la entrada al mundo hasta reconciliación. No persistir la corrección sin contrato.

## 5. Modelos TypeScript propuestos

Los siguientes tipos son **borradores para conversación**, no código a incorporar ni DTO de Backend. Los IDs son opacos: no se deducen relaciones entre edificios, escenas y preguntas.

```ts
type Id = string;
interface Punto { readonly x: number; readonly y: number }
interface Tamano { readonly ancho: number; readonly alto: number }
interface Poligono { readonly vertices: readonly Punto[] }
interface NodoCamino { readonly id: Id; readonly posicion: Punto }
interface ConexionCamino { readonly desde: Id; readonly hasta: Id }
interface PuntoSeguro { readonly id: Id; readonly posicion: Punto; readonly nodoCaminoId: Id }

interface MundoPropuesto {
  readonly id: Id;
  readonly versionPublicada: string;
  readonly dimensiones: Tamano;
  readonly zonasTransitables: readonly Poligono[];
  readonly obstaculos: readonly Poligono[];
  readonly nodos: readonly NodoCamino[];
  readonly conexiones: readonly ConexionCamino[];
  readonly puntosSeguros: readonly PuntoSeguro[];
  readonly inicioSeguroId: Id;
  readonly plaza: PuntoAcceso;
  readonly edificios: readonly EdificioPropuesto[];
}
interface PuntoAcceso {
  readonly posicion: Punto;
  readonly nodoCaminoId: Id;
  readonly radioInteraccion: number; // unidades lógicas
}
interface EdificioPropuesto {
  readonly id: Id;
  readonly plantillaVisual: string;
  readonly posicion: Punto; // ancla lógica acordada
  readonly dimensiones: Tamano;
  readonly colisiones: readonly Poligono[]; // coordenadas locales respecto al ancla
  readonly entrada: PuntoAcceso; // coordenadas del mundo
  readonly salida: PuntoAcceso;  // coordenadas del mundo
  readonly disponible: boolean;
  readonly recursoVisualId: string; // clave de catálogo autorizado, no URL libre
}
type AnimacionPersonaje = 'detenido' | 'caminando';
interface PersonajePropuesto {
  readonly posicion: Punto;
  readonly radioColision: number;
  readonly velocidad: number; // unidades lógicas por segundo
  readonly destino: Punto | null;
  readonly ruta: readonly Punto[];
  readonly animacion: AnimacionPersonaje;
}
```

Las dimensiones y radio son positivos; las formas no se autointersecan; IDs son únicos; conexiones hacen referencia a nodos existentes; entradas y salidas son alcanzables; colisiones no bloquean la red; la plaza y puntos seguros son accesibles. Un mismo diseño puede tener más o menos edificios sin códigos fijos. El catálogo debe definir huella, ancla de imagen, escala permitida y compatibilidad de recursos; `recursoVisualId` no concede autorización.

### Estado narrativo y libreta — propuesta, no DTO

```ts
interface InstantaneaNarrativaPropuesta {
  readonly versionEsquema: number;
  readonly versionGuion: string;
  readonly idEspacio: Id;
  readonly idConversacion: Id;
  readonly idPersonaje: Id;
  readonly nodoActual: Id;
  readonly elecciones: readonly Id[];
  readonly marcas: Readonly<Record<string, boolean>>;
  readonly estadosPersonajes: readonly { readonly id: Id; readonly estado: string; readonly expresion: string }[];
  readonly efectosAplicados: readonly Id[]; // identificadores estables si el contrato los define
}
interface PistaPropuesta { readonly id: Id; readonly contenido: string; readonly origenNarrativoId: Id }
interface NotaPropuesta { readonly id: Id; readonly texto: string }
interface LibretaPropuesta { readonly pistas: readonly PistaPropuesta[]; readonly notas: readonly NotaPropuesta[] }
```

**No basta serializar ciegamente el motor actual.** La instantánea anterior es una propuesta de información mínima; Ingrid y Cristian deben definir semántica, migración, límites, privacidad y el instante de aplicación. Backend determina cómo se vincula al intento y la versión. El registro de efectos solo sirve si se acuerdan identidades estables y reglas de idempotencia; no significa que existan hoy. No guardar datos privados ni notas en logs o capturas.

## 6. Contratos de comunicación — propuestas pendientes

| Emisor → receptor | Intención propuesta | Propiedad y restricciones |
| --- | --- | --- |
| Entrada UI → aplicación | Solicitar destino o acción accesible. | No transporta identidad ni autoridad. |
| Aplicación → navegador de mundo | Pedir ruta con configuración validada y cuerpo del personaje. | Respuesta tipada: ruta, destino inalcanzable o configuración inválida; motor puro y comprobable. |
| Navegación → renderer | Publicar posición, orientación y animación. | Sin escribir Backend; se puede cambiar renderer sin alterar estado académico. |
| Renderer → aplicación | Llegó a entrada / seleccionó interacción / salió. | ID estable de instancia, evento validado; eventos duplicados deben ser inocuos. |
| Aplicación ↔ componente Cristian | Montar exterior e interior, iniciar y restaurar conversación, recibir eventos. | `PlantillasEspacio` actual existe; restauración, ciclo de vida y representación requieren contrato coordinado, no modificación unilateral. |
| Aplicación ↔ puertos académicos | Consultar estado, solicitar transición, guardar o recuperar progreso y libreta. | Firmas, autorizaciones, errores, concurrencia e idempotencia por acordar con Ingrid; no son endpoints existentes. |

Ante pérdida de conexión durante un guardado o transición, mostrar estado incierto y consultar estado oficial antes de permitir acciones incompatibles; no duplicar efectos ni presentar éxito falso. La fase oficial debe validarse en el servidor, no solo en Angular. Las rutas docentes M3 no son sustituto de un contrato estudiantil.

## 7. Diseño de prueba comparativa — no implementada

### Montaje común

Una zona sintética sin recursos de PRISALY: mismo rectángulo lógico, posición inicial, grafo, un obstáculo, destino identificable como entrada de hospital y mismo personaje de prueba en las dos alternativas. El obstáculo debe obligar a una ruta alternativa; también probar destino desconectado. Ambas implementaciones utilizan el mismo motor de búsqueda y datos de prueba cuando sea posible, para comparar renderer e integración sin cambiar reglas. No hay HTTP, sesión, casos, guiones ni escritura académica.

| Criterio medible | Evidencia requerida para ambas alternativas |
| --- | --- |
| Clic | Sale del punto inicial, rodea obstáculo y termina dentro de tolerancia definida del acceso. |
| Teclado | Controles documentados y enfocados; permite alcanzar el mismo acceso y detenerse; alternativa de acciones accesibles mediante HTML. |
| Destino inválido | Rechazo claro, sin colisión, saltos ni éxito falso. |
| Escalado | Probar 390×844 y 1280×800: misma posición lógica y destino sin distorsión ni desplazamiento de hitboxes. |
| Determinismo | Misma secuencia lógica y llegada en ejecuciones repetidas; desplazamiento por delta de tiempo con límites ante pausas prolongadas. |
| Ciclo de vida | Entrar/salir de la escena 20 veces; comprobar cancelación de animaciones, listeners y observadores, sin duplicar eventos ni actualizaciones tras desmontar. Medir memoria y describir límites de la medición. |
| Accesibilidad | Teclado, foco visible, nombres accesibles, anuncio de llegada/error y preferencia de movimiento reducido. |
| Rendimiento | Medir FPS y tiempo de carga, tamaño descargado y memoria en los mismos equipos/navegadores; registrar hardware y procedimiento. Objetivos orientativos del piloto: 30 FPS sostenidos en equipo acordado y sin fuga observable; umbrales definitivos pendientes de QA. |
| Mantenimiento | Registrar LOC propia, complejidad, dependencia/licencia, integración Angular, pruebas y limitaciones; comparar con el mismo alcance. |

### Alternativa A — Angular con renderer propio

Componente aislado con capa HTML/Canvas y bucle controlado; eventos de teclado y puntero pasan a la misma navegación pura. Debe cancelar `requestAnimationFrame`, observadores y listeners al destruirse. No se modifica la ruta pública ni el motor académico. El soporte accesible vive en HTML, incluso si el dibujo es Canvas.

### Alternativa B — Angular + Phaser

Un anfitrión Angular crea y destruye la instancia/escena; el adaptador traduce comandos y observaciones al mismo contrato. Phaser ofrece escenas, entrada, cámaras y objetos 2D; sus físicas Arcade admiten rectángulos y círculos, lo que no sustituye la validación de geometría ni el cálculo de rutas. La navegación se mantiene externa al renderer. La accesibilidad y las instrucciones permanecen en Angular.

Fuentes oficiales: [escenas Phaser](https://docs.phaser.io/phaser/concepts/scenes), [entrada Phaser](https://docs.phaser.io/phaser/concepts/input), [físicas Arcade](https://docs.phaser.io/phaser/concepts/physics/arcade), [destrucción de la instancia](https://docs.phaser.io/phaser/concepts/game). Esta documentación describe capacidades; el rendimiento y la idoneidad en PRISALY deben medirse. No se ha seleccionado versión ni instalado Phaser.

### Criterio de decisión

Ambas alternativas deben superar las pruebas funcionales y de accesibilidad. Comparar después métricas, complejidad y coste de integración en la misma máquina. Si una falla una condición obligatoria, se registra el fallo y se corrige o descarta; una puntuación visual no compensa una falla de seguridad, navegación o accesibilidad. Phaser es candidato principal de evaluación, no decisión final.

## 8. Plan de archivos para una futura prueba, sujeto a autorización

Preferencia: dos directorios de experimento aislados fuera del módulo académico, con un núcleo compartido sintético, sin rutas globales ni cambios a Mariana/Cristian. Nombres orientativos nuevos, sujetos a revisión de colisiones antes de crearlos:

```text
experimentos/movimiento-25d/README.md            # instrucciones y resultados
experimentos/movimiento-25d/fixture.ts          # geometría y caso sintético comunes
experimentos/movimiento-25d/navegacion.ts       # cálculo común y validación
experimentos/movimiento-25d/navegacion.spec.ts  # pruebas de lógica común
experimentos/movimiento-25d/angular/            # anfitrión/render y pruebas propios
experimentos/movimiento-25d/phaser/             # anfitrión/render y pruebas propios
```

Definir un mecanismo de ejecución aislado durante la autorización: una aplicación Angular de experimento con configuración propia, sin modificar `/simulador`. Para B se requerirían manifiesto y lockfile **aislados** con una versión de Phaser fijada tras revisión; no modificar `package.json` ni `package-lock.json` del Frontend principal durante la comparación. Si el aislamiento no puede resolverse sin cambiar la aplicación principal, documentar la limitación y coordinar antes de tocarla. No se crean esos archivos en esta etapa.

## 9. Responsables y dependencias

- **Nicolás:** modelo de mundo, navegación y coordinación del recorrido; coordinar archivos compartidos antes de integrarlos.
- **Cristian:** exterior/interior, personaje y narrativa; confirmar geometría, recursos, anclas, eventos y restauración.
- **Ingrid/Backend:** contrato y autoridad de identidad, guion publicado, versión, persistencia, libreta y fase.
- **Mariana:** acceso y paneles docentes; coordinar cualquier integración o ruta compartida.
- **QA:** condiciones de prueba, accesibilidad, métricas, fallos de red y recarga.

Riesgos: incompatibilidad de perspectiva; hitboxes desalineadas; zonas inaccesibles; guardar una posición o conversación de otra versión; duplicar consecuencias; transición académica incierta; fuga de datos en libreta; renderer sin alternativa accesible; cambios de archivos compartidos. Cada riesgo requiere evidencia en pruebas antes del piloto.

## 10. Aprobaciones pendientes

1. Cristian e Ingrid: semántica de diálogo/efectos y restauración; identidad y versión de las instantáneas.
2. Backend/Dirección Central: fase oficial, concurrencia, idempotencia, permisos y recuperación; sin inferir endpoints.
3. Equipo: unidades, tipo de proyección, colisiones, conexión de clics, distancia máxima de ajuste y conjuntos de puntos seguros.
4. QA/equipo: hardware, navegadores y umbrales definitivos de rendimiento.
5. Usuario: autorización de la prueba aislada y, separadamente, instalación aislada de Phaser si se decide ejecutar la alternativa B.

La propuesta no implementa componentes, no activa proveedor HTTP y no modifica contratos compartidos. La aprobación de este documento no equivale a aprobar APIs, políticas académicas, fases ni publicación.
