# Simulador: diagnóstico de la base existente

Fecha: 2026-11-13. Etapa 2: revisión, sin cambios funcionales.

## Referencias revisadas

- Frontend: `fd88daa6b81a61aaea693ce6a420855eed21c499`, base de `feature/simulador-integracion-nicolas`.
- Backend: árbol remoto `origin/develop` en `0a94526`; incluye la referencia de la guía `cfab46bb7025acf7dc0d4a8eaafc82114c914d46`.
- El Backend se inspeccionó mediante `git show`, sin cambiar su checkout ni sus archivos pendientes.

## Inventario y reutilización

| Pieza | Comportamiento actual | Tratamiento recomendado |
| --- | --- | --- |
| `narrativa/motor-narrativo.ts` | Motor puro: diálogos, decisiones, consecuencias, transiciones, historial y reinicio. Sin HTTP. | Conservar a cargo de Cristian. |
| `components/panel-narrativo.ts` | Crea el motor con `GUION_DEMOSTRACION`; recibe pausa, pero no emite decisiones hacia la página. | Coordinar su futura interfaz con Cristian. |
| `services/simulador.store.ts` | Presentación, preguntas de ejemplo, selecciones locales y temporizador informativo. Solo consulta sesiones mediante el gateway. | Reutilizar presentación; separar selección local y confirmación académica. |
| `services/participacion.gateway.ts` | Puerto con resultados `unknown`; implementación pendiente por defecto. | Tipar las operaciones publicadas reutilizando los DTO existentes, sin duplicar el gateway. |
| `services/participacion-http.gateway.ts` | GET de intento y PUT de respuesta, validación, credenciales y errores clasificados. | Preservar N9; no necesita reconstrucción. |
| `pages/simulador-page.*` | Compone narrativa y preguntas independientes; narrativa visible solo en demostración. | Integración futura coordinada; no cambiar navegación global. |
| Modelos y datos demo | Identificadores locales como `demo-p1`; sin relación declarada con M3/M5. | No enviar estos identificadores al Backend ni inferir equivalencias. |

## Comparación estática de contratos

Se revisaron `IntentosEstudianteM5Controlador`, `IntentosM5Dto` e `IntentosM5Controlador` en el Backend remoto.

- GET `/api/v1/estudiantes/intentos/{idIntento}`: coincide con N9. Devuelve `idIntento`, `estado` (`EnCurso` o `Finalizado`), `inicio`, `limiteTemporal`, `motivoFinalizacion`, `respuestas` y `ahoraServidor`.
- PUT `/api/v1/estudiantes/intentos/{idIntento}/respuestas/{idPregunta}`: coincide con N9. Entrada: `idOpcionSeleccionada` y `revisionEsperada`. Salida: `idPregunta`, `idOpcionSeleccionada` y `revision`.
- La URL base centralizada agrega `/api`; el gateway usa la ruta relativa `v1/estudiantes/...`.
- Los POST de inicio y finalización permanecen en una clase sin registro MVC. No se deben consumir como operaciones disponibles.
- No se encontró aquí un contrato de convocatorias autorizadas ni de contenido narrativo estudiantil. El GET de intento no incluye enunciados, opciones ni guion.
- `prisaly.m1.student-access.enabled` sigue en `false` en la configuración base. `provideParticipacionHttp()` no está registrado en `app.config.ts`.

Esta comparación acredita correspondencia del código, no disponibilidad HTTP en QA ni integración real con cookies.

## Brechas para el siguiente incremento

1. Falta una fuente autorizada de contexto académico y contenido: conocer un UUID no autoriza la participación. No reutilizar endpoints docentes como acceso estudiantil por suposición.
2. No existe correspondencia explícita entre guion/escena/decisión e identificadores de pregunta/opción reales. No toda decisión narrativa debe convertirse en respuesta.
3. El store no mantiene intento, respuestas confirmadas, revisiones ni estado de sincronización. `respondidas` cuenta selecciones locales, no persistencia.
4. `fallarPor` del store reconoce `HttpErrorResponse`, pero N9 entrega `FalloParticipacionError`. Al conectar GET/PUT se debe conservar su clasificación; hoy estas operaciones no se invocan desde el store.
5. El retroceso narrativo restaura historia local. Su efecto sobre respuestas ya persistidas requiere acuerdo; no debe borrar ni deshacer datos académicos implícitamente.
6. Un fallo de red durante PUT deja incierto si el servidor guardó. La marca `reintentable` del clasificador no autoriza repetir una escritura a ciegas: hace falta reconciliar mediante consulta y revisión.
7. Los comentarios del store y de modelos todavía describen los contratos como totalmente pendientes; deben precisarse cuando se implemente su consumo, distinguiendo GET/PUT de las operaciones no habilitadas.

## Propuesta para discutir en etapa 3

- Nicolás: mantener el gateway existente y definir el estado académico y sincronización junto a sus pruebas.
- Cristian: mantener motor y componentes narrativos; acordar entrada de guion y salida de decisiones válidas.
- Contrato de enlace separado del motor: correspondencia explícita de guion/escena/decisión a pregunta/opción, basada en contenido autorizado. Los nombres y archivos definitivos siguen pendientes de coordinación.
- Diferenciar opción seleccionada, envío pendiente y respuesta confirmada con revisión. No mostrar éxito académico antes de confirmación.
- Acordar qué ocurre al avanzar, retroceder, cambiar una selección, perder conexión y recibir `409 REVISION_OBSOLETA` antes de implementar esos comportamientos.
- Mantener demostración y acceso HTTP real separados; no activar el proveedor ni implementar inicio/finalización en este incremento.

## Verificación y límites

- Se inspeccionaron pruebas existentes de motor, página, store, componentes y gateway; incluyen ramas narrativas, aislamiento de M5, revisión esperada y errores HTTP.
- Se intentó `npm ci --offline --no-audit --no-fund`: falló por paquete no disponible en caché (`ENOTCACHED`, zod). Puede haber quedado un `node_modules` parcial e ignorado por Git.
- Node local: `24.13.1`. Los paquetes Angular fijados en el lockfile exigen `^22.22.3 || ^24.15.0 || >=26.0.0`; es necesario un runtime compatible para validar.
- No se ejecutaron las suites Angular ni la compilación. No se realizó E2E ni se inició Backend.
- No se modificaron dependencias, configuración de acceso ni código funcional.
