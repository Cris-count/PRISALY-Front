# Etapa 3: contrato interno motor–participación

Fecha: 2026-11-13. Base Frontend: `fd88daa`.

Estado: propuesta técnica documentada para coordinación con Cristian y Backend.
No constituye aprobación académica, contrato REST nuevo ni cambio del comportamiento actual.
Complementa [el diagnóstico de etapa 2](simulador-etapa-02-diagnostico.md).

## 1. Límite de responsabilidades

Flujo propuesto: panel narrativo → coordinador de participación → `ParticipacionGateway` → N9 → M5.
La confirmación vuelve por el mismo flujo hasta la presentación.

- El motor conserva escenas, diálogos, marcas, personajes e historial. No conoce HTTP, cookies, revisiones ni notas.
- El panel presenta elecciones y comunica una solicitud válida; no escribe directamente en M5.
- El coordinador resuelve el vínculo académico, administra solicitudes y confirmaciones y usa el gateway existente. Es un consumidor del puerto, no otro gateway HTTP.
- M5 conserva autorización, titularidad, estado del intento, tiempo y concurrencia.
- La página compone la experiencia; no contiene reglas de elegibilidad ni evaluación.

## 2. Datos del enlace

Los siguientes tipos son una propuesta local para implementación posterior, no DTO del Backend.
Los DTO `IntentoM5` y `RespuestaGuardadaM5` existentes se reutilizan; se propone extraerlos a un archivo de modelos y tipar GET/PUT en el puerto sin cambiar sus rutas o cuerpos.

```ts
interface DecisionSolicitada {
  readonly guionId: string;
  readonly escenaId: string;
  readonly decisionId: string;
}

interface VinculoDecisionAcademica extends DecisionSolicitada {
  readonly idPregunta: string;
  readonly idOpcionSeleccionada: string;
}
```

La clave narrativa es la combinación de los tres identificadores: los IDs de decisión actuales solo son únicos dentro de cada escena.

El contexto del coordinador contiene el intento consultado y una correspondencia de contenido autorizada. El panel no proporciona identidad del estudiante, revisiones ni un intento alternativo en cada evento.

Reglas del enlace:

1. Una decisión exclusivamente narrativa no tiene vínculo académico y no genera HTTP.
2. Cada decisión académica se vincula a una sola pregunta/opción en este primer incremento; no hay guardados múltiples ni transacciones inventadas.
3. Un vínculo debe referenciar una decisión existente y una opción perteneciente a su pregunta en el contenido recibido. Se rechazan claves ambiguas, duplicadas o referencias inexistentes antes de habilitar interacción académica.
4. Los identificadores de demostración nunca se transforman artificialmente en UUID ni se envían a M5.
5. La fuente, versión y vinculación del contenido con el intento requieren contrato autorizado. GET de intento no entrega ese contenido; no se suplanta esta ausencia con datos docentes o de demostración.
6. La validación local detecta inconsistencias; la autorización definitiva siempre corresponde al Backend.

## 3. Estado académico separado de la selección visual

Por pregunta, conservar por separado:

- Opción seleccionada localmente, que puede no estar guardada.
- Última respuesta confirmada por GET/PUT, con su revisión.
- Operación en curso: contexto de intento, pregunta, opción y revisión enviada, más una identificación local de la carga vigente.
- Estado de sincronización y error clasificado, si existe.

| Estado propuesto | Significado | Acción permitida |
| --- | --- | --- |
| `sin-respuesta` | No hay respuesta confirmada ni selección pendiente. | Seleccionar cuando el contexto esté listo. |
| `pendiente` | La selección local difiere de la confirmación. | Solicitar guardado. |
| `guardando` | Existe un PUT en curso. | Esperar; no duplicar ni cambiar la selección académica. |
| `guardada` | La opción visible coincide con una respuesta confirmada. | Continuar; editar solo según las reglas autorizadas. |
| `por-verificar` | No se conoce el resultado definitivo del PUT o llegó una respuesta inconsistente. | Consultar el intento; no repetir PUT automáticamente. |
| `conflicto` | M5 rechazó la revisión o el estado actual impide aplicar el cambio. | Consultar y mostrar el estado vigente; no sobrescribir automáticamente. |
| `error` | No se puede continuar con la operación actual. | Presentar la acción correspondiente al error. |

La carga del intento tiene estados independientes: cargando, disponible, finalizado y error. Hasta obtener una consulta válida y el contenido autorizado no se habilita el guardado.
La ausencia de respuesta se representa como tal; `revisionEsperada = 0` se usa solo al enviar una primera escritura. No se inventa una respuesta confirmada con revisión cero.

## 4. Secuencia de una decisión académica

Propuesta a coordinar con Cristian: para una decisión vinculada, aplicar consecuencias y habilitar su transición después de confirmar la respuesta. Así una escena no comunica un avance académico que falló al guardarse.

1. El panel emite la intención solo para una decisión actualmente disponible, sin ejecutar todavía sus efectos académicamente vinculados.
2. El coordinador verifica contexto vigente, vínculo y ausencia de otra operación pendiente. En el primer incremento se propone un solo PUT a la vez por instancia del simulador.
3. Toma la revisión de la última respuesta confirmada de esa pregunta, o cero si no existe.
4. Invoca `registrarRespuesta` de N9 con los cuatro parámetros actuales.
5. Conserva la solicitud inmutable hasta recibir respuesta. Doble clic o evento duplicado mientras guarda no provoca otro PUT.
6. Comprueba que la respuesta corresponde a la pregunta y opción enviadas y que su revisión avanza respecto a la enviada. No incrementa revisiones localmente ni exige una revisión exacta inventada.
7. Si la confirmación es válida y la carga sigue vigente, actualiza la respuesta confirmada y permite al panel aplicar la elección una sola vez.
8. Si falla o la respuesta no corresponde, conserva la selección pendiente y no aplica la transición. Un cuerpo inconsistente requiere reconciliación, pues la escritura pudo ocurrir.

Si ya hay confirmación vigente para esa misma opción, no se envía un PUT redundante. La posibilidad de volver a aplicar esa decisión narrativa se valida por separado en el motor.

Una recarga, salida o cambio de contexto invalida callbacks de la carga anterior y libera suscripciones. Cancelar HTTP en el navegador no garantiza deshacer una escritura en el servidor: al regresar se consulta M5.

## 5. Errores y reconciliación

Se consume `FalloParticipacionError.fallo`, `estado` y el código técnico canónico de N9. No se muestran mensajes internos del servidor ni se pierde su clasificación tratándolo como error genérico.

| Situación | Comportamiento propuesto |
| --- | --- |
| 401 | Detener escrituras y pedir recuperar el acceso mediante el mecanismo existente autorizado. No inventar login estudiantil. |
| 403 | Bloquear la operación e informar falta de acceso; no repetir automáticamente. |
| 404 | Informar recurso no disponible y detener la operación; no crear otro intento. |
| 409 `REVISION_OBSOLETA` | Consultar intento, actualizar confirmaciones y pedir resolver la diferencia. No reenviar con la nueva revisión silenciosamente. |
| Otro 409 | Consultar estado; puede ser un intento que ya no admite cambios. No tratar todo conflicto como revisión obsoleta. |
| Red o 5xx durante PUT | Marcar `por-verificar`; consultar antes de proponer una nueva escritura. |
| Red o 5xx durante GET | Ofrecer repetir la consulta, conservando el estado pendiente y bloqueando escrituras dependientes de esa consulta. |
| Validación local o cuerpo inesperado | No presentar guardado exitoso. Corregir entrada o consultar para reconciliar según si hubo una escritura posible. |
| `ContratoPendienteError` | Explicar indisponibilidad; no simular una operación exitosa. |

Después de consultar:

- Si M5 confirma la opción solicitada, mostrar esa respuesta como guardada. La lectura acredita el estado actual, no qué solicitud lo produjo.
- Si existe otra opción o sigue sin respuesta, mostrar la diferencia y conservar la intención local como pendiente. Reenviar requiere una acción explícita, revisión recién consultada y que M5 admita la operación.
- Si el intento está finalizado, bloquear edición y respetar lo devuelto por M5.
- Si la consulta también falla, mantener el resultado como incierto. No avanzar como si se hubiese guardado.

## 6. Retroceso, reinicio y finalización

La demostración conserva su comportamiento actual, sin llamadas HTTP.

Para participación real se propone:

- Retroceder en la historia no borra respuestas ni revierte revisiones. Una nueva elección académica sería otra escritura explícita, si las reglas vigentes permiten cambios.
- Mientras haya un guardado o reconciliación sin resolver, pausar las acciones narrativas que puedan cambiar el contexto de la elección.
- Reiniciar una historia no inicia otro intento ni elimina respuestas. La disponibilidad de ese control en modo real queda pendiente de coordinación.
- El progreso narrativo cuenta escenas; el progreso académico confirmado cuenta respuestas de M5. Las selecciones pendientes se muestran aparte.
- Terminar la narrativa no llama a `finalizarIntento`. La operación real seguirá bloqueada hasta habilitación y contrato de M5, incluida idempotencia.
- El temporizador solo informa. La aceptación temporal y la calificación pertenecen al Backend.
- No se bloquea la finalización por preguntas sin contestar basándose en una regla inventada; REG-NC y reglas de cierre siguen pendientes.

## 7. Archivos y coordinación

| Alcance previsto | Responsable principal | Coordinación necesaria |
| --- | --- | --- |
| Modelos M5 compartidos, firmas tipadas GET/PUT y pruebas N9 | Nicolás | Backend para compatibilidad; conservar implementación N9. |
| Estado y coordinación de sincronización junto al store | Nicolás | Cristian para entrega de intenciones y confirmaciones. |
| Modelo local de vínculo narrativo–académico | Nicolás y Cristian | Acordar un responsable por archivo antes de editar. |
| Panel, motor y pruebas narrativas | Cristian | Acordar emisión diferida y confirmación de elección. |
| Composición de página y plantillas del simulador | Coordinación Nicolás–Cristian | Asignar edición antes de modificar. |
| Navegación general, pantallas y componentes globales | Mariana | Sin cambios en este incremento. |

No se ha contactado a otros integrantes ni se considera aprobado este reparto de archivos.

## 8. Criterios para la implementación posterior

1. Demostración conserva ambos recorridos y no llama a M5.
2. Una decisión sin vínculo no guarda; una vinculada válida emite un único PUT con la revisión confirmada.
3. No se muestra guardado ni se aplica la transición vinculada antes de confirmar.
4. La primera escritura usa revisión cero; la siguiente usa la revisión devuelta por M5.
5. Doble clic, fallo, conflicto y respuesta HTTP tardía no duplican transiciones ni sobrescriben contexto nuevo.
6. Se prueba la pérdida de respuesta tras un posible guardado, consulta fallida, opción diferente en M5 e intento finalizado.
7. Retroceso no borra respuestas confirmadas y no genera HTTP por sí solo.
8. El proveedor HTTP permanece sin registro por defecto; inicio, cierre y resultados siguen pendientes.
9. Pruebas de coordinación con dobles del gateway y N9 con `HttpTestingController`; regresión del motor/página y compilación en Node compatible. Estas pruebas no acreditan E2E real.

## 9. Decisiones aún abiertas

- Cristian: aceptar la elección en dos pasos (solicitud y confirmación) y acordar qué archivos modificará cada integrante.
- Backend: fuente autorizada del intento, contenido, vínculo y versión del guion para estudiantes.
- Dirección académica: cambios de respuesta tras retroceder, política de repetición, límites temporales y tratamiento de no contestadas. No se resuelven aquí.
- Backend y entorno QA: acceso estudiantil real habilitado y condiciones para verificar cookies y permisos.

Mientras se coordinan estos puntos, se puede preparar el tipado de GET/PUT y el coordinador aislado con pruebas. La integración en panel/página y activación real dependen de resolver los puntos aplicables.

## Verificación de esta entrega

Entrega documental: cotejada con modelos y comportamiento de SIM-01 y N9 revisados en etapa 2. No modifica código, rutas, proveedores, dependencias ni Backend; no afirma ejecución de suites o integración HTTP.
