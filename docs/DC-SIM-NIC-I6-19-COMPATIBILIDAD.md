# DC-SIM-NIC-I6-19 — Compatibilidad preliminar

Referencia examinada: Backend `origin/develop` 16dd7968b2abab97d028e40ce3d775269cc1f02, validación y modelo M3 de `prisaly-guion-1`. No se activaron sus rutas de autoría.

| Elemento M3 | Estado en el adaptador | Pendiente |
| --- | --- | --- |
| Formato e inicio | Tipo de documento; la traducción comprueba formato | Validación completa en el límite de lectura estudiantil y contrato de entrega del guion publicado |
| Espacios, descripción, información y accesos | Tipados, conservados en el documento | Correspondencia explícita con mapa, ubicación visual, reglas de accesos y recursos autorizados |
| Personajes y atributos iniciales opcionales | Tipados en M3 | SIM-01 exige estado y expresión; no se inventan valores por defecto |
| Intervención y diálogos | Traducción tipada a fragmentos compatibles con SIM-01 | Ciclo de selección, condiciones y ejecución compartidos con Cristian |
| Consecuencias de marca/personaje | Traducción tipada sin ejecutarlas | Acordar cuándo se aplican; SIM-01 aplica `alEntrar` o al elegir una decisión, M3 no define aquí una decisión equivalente |
| Preguntas y respuestas | Ausentes del guion | Permanecen en los contratos académicos M3/M5; no deducir correspondencias |

El adaptador recibe datos ya validados y no es un parser ni una validación de seguridad. No construye un `GuionNarrativo` ejecutable: hacerlo implicaría inventar escenas, transiciones o condiciones de finalización. No lee HTTP, no cambia el motor y no registra respuestas. El contrato de lectura del guion por estudiante aún no está establecido aquí; no reutilizar rutas docentes de autoría.

### Semántica que debe acordarse

M3 agrupa diálogos, una condición opcional y consecuencias dentro de una intervención. La estructura revisada no establece aquí un evento de ejecución que determine si las consecuencias ocurren al iniciar la conversación, al terminar cada diálogo o al completar la intervención. En SIM-01, `alEntrar` se aplica al iniciar la escena y las consecuencias de una decisión al elegirla, antes de completar su transición. Ninguno de estos momentos se puede asumir equivalente. También falta definir la evaluación y reevaluación de la condición, qué sucede si se abandona o repite una interacción, y cómo se conserva su estado al regresar o recargar. El adaptador conserva estas piezas sin ejecutarlas ni asignarles una escena. Ingrid, Cristian y Nicolás deben acordar la semántica antes de conectarlas al motor.

## M5 y gateway

El gateway HTTP Angular implementa consulta de intento, consulta de contenido y registro de respuesta; el proveedor sigue desactivado por defecto. Contraste con controladores del Backend examinado (rutas bajo `/api`):

| Operación | Backend | Angular |
| --- | --- | --- |
| Consultar intento | GET `/v1/estudiantes/intentos/{idIntento}` registrado | HTTP implementado; activación explícita |
| Consultar contenido | GET `/v1/estudiantes/intentos/{idIntento}/contenido` registrado | HTTP implementado; activación explícita |
| Guardar respuesta | PUT `/v1/estudiantes/intentos/{idIntento}/respuestas/{idPregunta}` registrado; revisión esperada | HTTP implementado; no se usa durante exploración |
| Iniciar o reanudar en sesión | POST `/v1/estudiantes/sesiones/{idSesion}/intentos` preparado detrás de interruptor desactivado por defecto; sujeto a políticas | Pendiente, sin activar |
| Finalizar | POST `/v1/estudiantes/intentos/{idIntento}/finalizar` preparado detrás del mismo interruptor | Pendiente, sin activar |
| Sesiones autorizadas y progreso | No se identificó un contrato equivalente en los controladores M5 revisados; sesiones pertenecen a M4 | Pendiente; requiere verificación de contrato |

La existencia de un controlador no acredita su habilitación en el entorno, autenticación productiva ni autorización de uso. No se activaron escrituras.

Pendiente del Incremento B: contrato de lectura y transición de fase, autorización, errores, idempotencia, revisión y recuperación tras recarga. No se añadió un booleano local como regla académica. La exploración y el cuestionario existentes del mapa son demostrativos y sus estados no prueban persistencia.

## Integración visual y pruebas

El contrato con Cristian fue aceptado conceptualmente; aún no se dispone aquí de su hospital real y no se afirma integración funcional. Las pruebas previas usan plantillas ficticias. Quedan pendientes pruebas E2E de fase oficial y recarga, así como evidencia con los componentes reales cuando estén disponibles. Los cambios visuales de la ciudad se conservan como trabajo local independiente.

## Continuación CONT-20 — 15 de noviembre de 2026

- Base local `b62751297e09b595847376f65c59c6b8bee29751`; `origin/develop` consultado en `f26264f4ea6a2994a0afcddeb5be89f4bd192909`, que incorpora el PR #9. No se modificó el árbol de Backend.
- El adaptador cubre datos de prueba con personajes referenciados, condiciones, diálogos y ambos tipos de consecuencias; prueba listas opcionales, orden, formatos y tipos de consecuencias no soportados. La validación integral del documento y sus referencias sigue siendo responsabilidad del Backend y del futuro límite de entrada.
- Suite Angular ejecutada con Chrome Headless 157: **322/322 aprobadas**, incluyendo pruebas del mapa, contrato visual ficticio y adaptador. TypeScript aplicación y pruebas: correcto. Compilación de producción: correcta.
- Diagnóstico: Chrome `--version` responde dentro del aislamiento, pero `--headless --disable-gpu --dump-dom about:blank` termina sin salida con código 2147483651 (0x80000003); Karma tampoco pudo iniciar Chrome allí. La misma suite, sin modificar pruebas ni flags, se ejecutó correctamente con permisos fuera del aislamiento. Esto identifica una diferencia del entorno; no establece la causa técnica exacta ni el estado de CI remoto.
- Se consultaron referencias remotas: no se identificó una entrega del hospital en `origin/feature/simulador-2d` (último commit 0331392). Se requiere de Cristian la rama, SHA, rutas, inputs, outputs y dependencias de hospital exterior/interior y dos personajes para probar montaje, eventos y reingreso. Ninguna prueba con plantillas ficticias acredita integración visual real.
- Se mantienen pendientes de Ingrid los contratos de lectura narrativa estudiantil, fase y transición oficial al cuestionario, autorización, errores, idempotencia, completitud y recuperación tras recarga, así como las decisiones semánticas anteriores. No se habilitó DD-02, M6 ni el proveedor HTTP.
