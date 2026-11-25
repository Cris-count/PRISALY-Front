# Enlace narrativo con participación

Fecha: 2026-11-13. Incremento posterior al tipado y coordinador.

## Implementado

`src/app/features/simulador/services/enlace-narrativo.ts` contiene `EnlaceNarrativo` y `VinculoDecisionAcademica`.

El enlace recibe un ID de intento, guion, preguntas/opciones, correspondencias y el coordinador existente. Valida las correspondencias antes de permitir elecciones: guion correcto, escena y decisión existentes, preguntas únicas, opciones únicas por pregunta, IDs académicos UUID y pertenencia de opción a pregunta. La clave usa escena y decisión para distinguir IDs repetidos entre escenas; cada instancia tiene un único guion.

Crea un `MotorNarrativo` sin modificar su implementación. Para decisiones vinculadas llama a `guardar` y solo aplica la elección narrativa al confirmarse la respuesta. Las decisiones sin vínculo afectan únicamente la narrativa. El contexto debe tener un intento en curso y el coordinador estar disponible.

Durante guardado, reconciliación o conflicto bloquea sus controles. Retroceder mediante el enlace no borra respuestas ni genera HTTP. Después de reconciliar no avanza automáticamente: el consumidor debe solicitar la elección de nuevo si sigue disponible. Si esa opción ya está confirmada, el coordinador no repite PUT.

`cerrar()` invalida las continuaciones narrativas locales. Al salir, el dueño de la página también debe cerrar el coordinador para cancelar suscripciones. La respuesta de una escritura ya enviada puede persistirse aunque la vista se cierre; al regresar corresponde consultar M5.

## Integración prevista con Cristian

1. Obtener contexto y contenido desde una fuente estudiantil autorizada. Este incremento no define ni inventa ese endpoint.
2. Proveer el coordinador en la página y consultar el intento.
3. Crear el enlace con el contenido y sus correspondencias aprobadas. Capturar el error de configuración y presentar un mensaje seguro si falla.
4. Hacer que el panel presente el motor del enlace y dirija sus controles a `elegir`, `avanzarDialogo`, `completarTransicion` y `volver` del enlace. No llamar directamente a `motor.elegir`, porque omitiría la coordinación de persistencia.
5. Presentar estado de sincronización, selección pendiente y errores del coordinador. Ofrecer `verificar` ante guardados inciertos, sin reenviar automáticamente.
6. Descartar enlace y coordinador al salir o cambiar contexto. Un enlace cerrado no se reutiliza.

No se cambió el panel ni la página. La visibilidad de edición y retroceso en participación real sigue dependiendo de reglas académicas autorizadas; el enlace aporta mecanismos, no aprueba esas reglas. No expone reinicio académico ni finalización.

La validación de UUID y correspondencias comprueba consistencia local, no autorización ni asociación real con el intento. Estas últimas deben proceder del contrato Backend y mantenerse verificadas por M5. Los datos de prueba no son contenido aprobado y no se registraron como datos de aplicación.

## Pruebas y límites

- 14 pruebas nuevas ejercitan enlace + motor + coordinador + N9 mediante `HttpTestingController`.
- Cubren decisiones anticipadas, doble clic, confirmación diferida, elección sin vínculo, retroceso, reconciliación, cierre y cambio de contexto, referencias inválidas, ambigüedad y aislamiento de datos.
- Suite completa: 138 pruebas correctas en Chrome Headless 157.
- Tipos de aplicación y pruebas, compilación de producción, URLs API y `git diff --check`: correctos.
- Node 24.22.1 incluido con la aplicación, sin cambiar runtime global ni dependencias.

El nuevo flujo se ejecutó en pruebas con HTTP interceptado; no está conectado a la interfaz ni a Backend real. No se activó `provideParticipacionHttp`, no se implementaron nuevos endpoints, inicio, cierre ni calificación. La demostración conserva el comportamiento previo.
