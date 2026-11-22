# FE-55 — revisión, corrección de sincronización y publicación

## Alcance y contexto

Trabajo realizado en el worktree `PRISALY-Front-55`, rama `feature/fe-55-recorrido-docente`, sobre la base `9df44cc967880f95d200ceccb61d20f74c66051c`. Se conservó el incremento recibido de Claude: continuidad del recorrido docente entre casos, contenido, rúbrica, sesiones y convocatorias, con los enlaces del dashboard y la documentación de integración.

## Defecto reproducido y corrección

Con una consulta del caso A pendiente, la URL cambiaba a B y luego a un UUID inválido. Al terminar A se solicitaba B aunque ya no era la selección vigente. La prueba de regresión reprodujo el defecto: 33/34, salida 1.

La causa era que los valores inválidos y ausentes se filtraban antes de que los paneles pudieran observar la invalidación. La corrección distingue ausencia e invalidez, invalida la selección pendiente y limpia detalles anteriores; las respuestas y errores tardíos no se atribuyen a la selección actual. La última intención válida se procesa cuando termina la operación activa. Se protege también el resultado de escrituras en curso sin reenviar automáticamente los POST. La destrucción del componente cancela sus suscripciones. En sesiones, un cambio explícito del caso en la URL actualiza el formulario incluso si este se había editado.

Los cambios afectan `contexto-recorrido.ts`, `recorrido-docente.ts`, los paneles académicos M3 y M4, sus plantillas, los enlaces del dashboard y `recorrido-docente.spec.ts`. No se modificaron backend, simulador, guards ni interceptor.

## Pruebas y comprobaciones

- Regresión original después de corregir: 34/34, salida 0.
- Cobertura adicional: A → B → inválido; A → B con respuesta tardía; A → B → A; parámetro ausente; cambio rápido de sesión; destrucción durante consulta; error anterior; escritura en curso sin duplicación; y cambio de caso con formulario editado.
- Regresiones dirigidas del recorrido, M3, M4, FE-53, FE-54 y guards: 105/105, salida 0.
- Suite Angular completa: 660/660, salida 0 en repetición. Una ejecución anterior terminó 659/660, salida 1, por una aserción de movimiento en una prueba Phaser. La causa no se determinó; no se modificó el simulador. Una ejecución anterior al último par de pruebas había terminado 658/658, salida 0.
- Builds de producción y QA: salida 0. TypeScript de aplicación y pruebas: salida 0. Prettier de los archivos de código, control de URL y `git diff --check`: salida 0.
- La prueba HTTP real de Claude (1/1, con evidencia de 412 y persistencia) es histórica. No se repitió: la API QA local no respondió. No se modificaron PostgreSQL ni los datos de QA.

## Seguridad y límites

Los UUID inválidos no generan la consulta correspondiente; la navegación depura parámetros ajenos y sensibles. Las rutas conservan sus guards y las consultas siguen sujetas a los permisos del backend: los parámetros de URL no conceden autorización. La revisión no encontró credenciales reales en los archivos preparados; las cadenas de autenticación detectadas son valores de prueba. BLQ-53-01 sigue vigente y limita la validación de extremo a extremo. Persisten las solicitudes y decisiones pendientes registradas en la documentación de FE-55.

## Publicación

- Commit de código y pruebas: `30d437d8580ca2f796761b9ffd247a1a922b0d14`.
- Commit de documentación: `docs(integracion-55): matriz del recorrido, permisos, solicitudes Backend y entrega FE-55`; su SHA está disponible en el historial del PR.
- PR hacia `develop`: https://github.com/Cris-count/PRISALY-Front/pull/18.
- El PR queda abierto y pendiente de revisión y decisión de Dirección Central; no se autorizó ni realizó el merge.
