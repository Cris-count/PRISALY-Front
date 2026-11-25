# DC-SIM-NIC-INTEGRACION-09 — Compatibilidad con Backend integrado

Fecha: 13 de noviembre de 2026. Estado: validación local completada mediante DC-SIM-NIC-VALIDACION-10.

## Referencias y alcance

- Rama aislada: `feature/simulador-integracion-nicolas`.
- HEAD Frontend previo al commit autorizado en VALIDACION-10: `ee16bef4bdbd23704d06a465fafd7b02424023a6`.
- `origin/develop` Frontend: `74b4b78f968da0d05648e78907e5d738cb780dcb`; su árbol coincide con HEAD. No se hizo merge.
- Backend contrastado: `bf47bdd3de51e800e340b4847b7b050b70bda3bc`, confirmado como parte de `origin/develop`.
- Cambios conservados para un único commit local autorizado en VALIDACION-10; sin push, PR ni merge. Backend no modificado.

Se revisaron exclusivamente DTO, controlador, proyección M3 y traducción de errores del contrato de contenido integrado. El GET ya estaba implementado en Angular; no se duplicó.

## Compatibilidad y ajustes

Ruta: `GET /v1/estudiantes/intentos/{idIntento}/contenido`, relativa a la base `/api`. Mantiene cookie estudiantil mediante `withCredentials: true`, sin leer HttpOnly ni enviar identidad como autorización.

El record definitivo `ContenidoIntento` conserva `idIntento`, `idSesion` y `caso`, y la proyección anidada conserva campos, nulabilidad y orden. No se requieren cambios estructurales en los DTO Angular ni en los estados de carga/lectura.

El 409 definitivo usa el cuerpo común `{code, message}` con `CONTENIDO_INTENTO_NO_DISPONIBLE`, ya compatible con el gateway. Se actualizaron fixtures y se añadió una prueba específica sin dependencia de ProblemDetail.

Se corrigió la validación del código técnico del 503: M4 emite `M4-CONSULTA-PROGRAMACION-NO-DISPONIBLE`, con guiones. Ahora se conserva ese código, con longitud y caracteres acotados, manteniendo la clasificación y sin mostrar el mensaje interno. Se añadió su prueba específica.

Control de revisiones, exclusión de escrituras simultáneas y separación narrativa/académica se conservaron sin cambios. El proveedor HTTP no se activa globalmente.

## Archivos modificados

Rutas relativas a `src/app/features/simulador/`:

- `models/contenido-intento.models.ts`: referencia al contrato definitivo.
- `services/participacion.gateway.ts`: referencia al contrato integrado.
- `services/participacion-http.gateway.ts`: referencia definitiva y reconocimiento del código M4 con guiones.
- `services/contenido-http.gateway.spec.ts`: cuerpo de errores definitivo y dos pruebas nuevas de 409/503.
- `pages/simulador-contenido.spec.ts`: cuerpo 409 definitivo.

Se añade únicamente este informe documental.

## Validación

- TypeScript de aplicación y pruebas: correcto, Node compatible 24.22.1.
- Compilación de producción: correcta, paquete inicial 248.50 kB; sin exceder presupuestos.
- Verificación de URLs y `git diff --check`: correctos.
- Suite Angular actualizada: **190 SUCCESS**, Chrome Headless 157, Node 24.22.1. Se ejecutaron las 188 pruebas anteriores y las dos nuevas de compatibilidad de errores 409/503. La suite incluye la regresión de N9, SIM-01, revisiones y exclusión de escrituras simultáneas.
- El lanzamiento había sido bloqueado durante INTEGRACION-09 por un límite de uso de la revisión automática. En VALIDACION-10 se autorizó y ejecutó normalmente, sin eludir controles. El bloqueo de pruebas quedó resuelto.
- `provideParticipacionHttp()` permanece ausente de `app.config.ts`; la implementación pendiente por defecto conserva sus pruebas correctas.
- Repetidas en VALIDACION-10: comprobaciones TypeScript de aplicación y pruebas, compilación de producción, URLs y revisión del diff, todas correctas.
- No se realizó E2E con Backend real.

## Bloqueos restantes

1. Para prueba HTTP real: entorno QA autorizado, DD-02 configurado y habilitado para ese entorno, sesión estudiantil válida y datos de intento/sesión/caso acordados con Backend. La integración del GET no acredita autenticación productiva.
2. La ruta actual no recibe una fuente operativa de contexto estudiantil. Sigue pendiente concretar cómo obtiene el usuario autorizado el ID de su intento; conocer un UUID no acredita acceso.
3. Inicio/finalización HTTP permanecen sin contrato operativo habilitado; no se consumen. Elegibilidad, duración y repetición siguen a cargo de Backend y sus decisiones pendientes.
4. El contenido persistido no incluye guion SIM-01 ni correspondencias oficiales de decisiones con preguntas/opciones. No se inventaron.
5. Evaluación y resultados liberados requieren sus contratos y autorizaciones propios; no se implementó M6.

Siguiente acción: conservar el commit local de VALIDACION-10 y coordinar el ensayo de lectura en QA. No realizar push, PR, merge ni activar funcionalidades fuera del alcance autorizado.
