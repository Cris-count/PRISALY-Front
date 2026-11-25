# Integración de página, panel y sincronización

Fecha: 2026-11-13. Continuación del enlace narrativo.

El usuario confirmó que está coordinada con Cristian la edición de `panel-narrativo.ts` y `simulador-page.*` en esta conversación. No se modificó el motor ni la navegación global de Mariana.

## Comportamiento

`SimuladorPage` admite la entrada opcional `contextoAcademico`, tipada como `ContextoNarrativoAcademico`: ID de intento, guion, preguntas/opciones y vínculos. Es un contrato interno de composición, no un endpoint ni prueba de autorización.

Sin esa entrada la página conserva la pantalla inicial y la demostración existentes y no consulta M5 automáticamente. La ruta actual no aporta contexto académico; no se agregaron parámetros URL ni datos ficticios para abrir participación real.

Al recibir un contexto, la página valida el contenido creando el enlace y consulta el intento con el coordinador. El panel se mantiene bloqueado hasta confirmar un intento en curso. Contenido inconsistente muestra un error seguro antes de consultar M5.

El mismo `PanelNarrativo` acepta un enlace opcional. En modo académico presenta su motor y dirige los controles al enlace. Su instantánea reactiva se actualiza también después de una confirmación HTTP asíncrona, sin permitir que el panel escriba directamente en el motor académico.

- Guardando: muestra espera y bloquea controles.
- Confirmada: actualiza el número de respuestas confirmadas y permite continuar.
- Guardado incierto o conflicto: bloquea controles y ofrece verificar el intento mediante GET.
- Reconciliación: no aplica transiciones antiguas; si el guardado coincide, seleccionar de nuevo la decisión permite continuar sin otro PUT.
- Error 401/403/404: conserva la clasificación segura, sin detalles internos ni reintento automático.
- Error de consulta recuperable: permite verificar nuevamente.
- Finalizado: informa el estado recibido y bloquea decisiones.

El progreso académico cuenta preguntas del contexto con respuesta y opción confirmadas válidas; no cuenta selecciones pendientes. El progreso de escenas sigue siendo narrativo.

El panel académico no ofrece reiniciar ni finalizar el intento. El cierre narrativo explica que no equivale al cierre académico. Los controles de retroceso solo restauran historia local, manteniendo las respuestas confirmadas.

Salir descarta el enlace, cancela las suscripciones del coordinador y muestra la pantalla inicial. Cambiar contexto o destruir la página también cancela y descarta el anterior. No se promete revertir una escritura que alcanzó el servidor.

## Archivos

Rutas relativas a `src/app/features/simulador/`:

- `services/enlace-narrativo.ts`: instantánea reactiva y disponibilidad del enlace.
- `components/panel-narrativo.ts`: consumo opcional del enlace, conservando la demostración.
- `pages/simulador-page.ts`: contexto de entrada, ciclo de vida, confirmaciones y errores.
- `pages/simulador-page.html`: estados de participación y composición del panel.
- `pages/simulador-participacion.spec.ts`: pruebas funcionales con HTTP interceptado.

## Validación y dependencias

Compilación de producción correcta, tipos de aplicación y pruebas correctos, verificación de URLs y diff sin errores. La suite completa en Chrome Headless terminó con 148 pruebas correctas, incluidas 10 nuevas de la página académica y la regresión de la demostración original.

Las pruebas de participación crean un contexto ficticio únicamente dentro del archivo de pruebas y registran N9 explícitamente con `HttpTestingController`. No equivalen a E2E ni validan cookies, permisos o persistencia real.

`provideParticipacionHttp()` sigue sin registrarse en la aplicación. La activación operativa depende del acceso estudiantil autorizado y de un contrato que suministre el contexto y su asociación con el intento. Inicio/finalización, reglas académicas pendientes y resultados de M6 no se implementaron.

Antes de un despliegue de participación real se deben resolver las reglas aplicables a edición/retroceso y contar con contenido autorizado. Esta integración no aprueba esas políticas.
