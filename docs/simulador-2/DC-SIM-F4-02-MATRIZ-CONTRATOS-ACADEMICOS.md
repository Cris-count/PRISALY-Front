# DC-SIM-F4-02 — Matriz de contratos académicos

Fecha: 22/11/2026. Orden DC-SIM-5F-08. Revisión de código y documentación por Codex; sin llamadas HTTP, instalaciones, cambios de reglas, compilación ni pruebas.

**Bases comprobadas después de fetch:** Backend `773818caf62758d66019a71dac6508d13148abad`; Frontend `0b341c029407ca871183e6346bc6e730e9778f34`. Los IDs B/F del índice final identifican archivo, línea y SHA. Los fuentes académicos se leyeron en esas bases. El simulador/configuración local se conserva adicionalmente por SHA-256, según F4-01; no se atribuye ese trabajo sin commit al SHA remoto.

## Lectura del estado

La clasificación describe la **capacidad contractual del código Backend**, contrastada con servicio, seguridad y persistencia. IMPLEMENTADA no significa desplegada, accesible en el entorno actual ni conectada al visor. PARCIAL identifica una parte existente y una dependencia concreta. NO DISPONIBLE indica un contrato HTTP no localizado para la operación solicitada. PENDIENTE DE DECISIÓN se aplica a las autorizaciones/definiciones explícitamente identificadas; no transforma una decisión ya ratificada en pendiente.

Las rutas siguientes incluyen `/api`, el `server.servlet.context-path` versionado (B0:24). Los controladores declaran el tramo `/v1/...`. No se añaden prefijos duplicados.

| Configuración versionada por defecto | Valor | Consecuencia documental; no resultado HTTP observado |
|---|---|---|
| prisaly.m1.student-access.enabled | false | DD-02 no habilitado. Solicitar/validar/cerrar acceso devuelve el contrato pendiente según el controlador; no hay identidad estudiantil disponible por el login de personal |
| prisaly.m5.inicio-finalizacion.publicacion.enabled | false | Los POST de inicio/finalización no se registran por defecto |
| prisaly.m3.narrativa.publicacion.enabled | false | Narrativa académica M3 candidata deshabilitada |
| prisaly.m5.exploracion.fases.enabled | false | No se ensambla la persistencia de fases del intento |
| prisaly.m5.exploracion.fases.http.enabled | false | No se registran GET narrativa/fase/completitud ni POST cuestionario |
| prisaly.m4.consulta-bd0052.enabled | true | Proveedor M4 disponible en el ensamblaje correspondiente; no sustituye autenticación o elegibilidad |

Son valores del repositorio, no una inspección de servicios en ejecución ni de posibles overrides de un despliegue. No se modificó ninguno.

## Matriz A — operación, contrato, datos y autorización

La correspondencia RF/CU usa V27 y las **21 filas históricas** de PLAN-21-CU. El catálogo numera CU-01…CU-22 sin CU-04; no se inventa el faltante ni se renumeran los casos de uso. La relación funcional de esta matriz no constituye aceptación completa de un RF.

| ID / funcionalidad | RF / CU | Módulo | Método y endpoint reales | Entrada → salida | Autorización / límites | Estado |
|---|---|---|---|---|---|---|
| A01 Identificar al estudiante autenticado | RF-01/02/20; CU-01 | M1 + APP | POST `/api/v1/acceso-estudiante/solicitar`, `/validar`, `/cerrar-sesion` | `{correo}` → `{challengeId,mensaje}`; `{challengeId,codigo}` → 204 + cookie; cierre → 204 | Origin permitido, validación estricta y sesión estudiantil. DD-02 B deshabilitado; `/api/v1/personal/me` identifica personal, no estudiantes | **PARCIAL**: autenticación B implementada/condicionada; falta conexión estudiantil autorizada en FE. No se localizó un `/me` estudiantil; M4/M5 resuelven identidad dentro del servidor |
| A02 Consultar casos disponibles | RF-05/09; CU-01 (CU-05/09 son gestión docente) | M4 + M3 | GET `/api/v1/estudiantes/convocatorias` aporta `idCaso`; contenido por intento en A09 | D1; luego D4 | Solo convocatorias propias. No existe un catálogo estudiantil general de casos publicado en lo revisado; no usar GET docente de caso por ID como sustituto | **PARCIAL**: descubrimiento por convocatoria; sin listado estudiantil completo de casos |
| A03 Consultar sesión/convocatoria autorizada | RF-04/18/19/20/21; CU-01/11/12 | M4 | GET `/api/v1/estudiantes/convocatorias` | Sin IDs estudiantiles en entrada → D1[] | Identidad de M1; filtra `Autorizado` y `fechaRetiro` ausente. Filtro de datos, no aprobación de primer inicio | **IMPLEMENTADA**, sujeta al acceso estudiantil y proveedor M4; consumidor estudiantil FE pendiente |
| A04 Validar participación | RF-09/22/23/25; CU-01/15/18 | M5 + M4 | No hay GET de elegibilidad. Comprobación interna al POST de A05 | Contexto M4 + instante PostgreSQL → elegible/límite o rechazo | E1: sesión EnCurso, convocatoria propia autorizada/no retirada y caso publicado/activo. L1: mínimo de inicio+duración y finPrevisto; RF-22: inicio anterior al fin. Reanudación no amplía tiempo | **IMPLEMENTADA como regla interna** por DC-45; su exposición de inicio sigue deshabilitada |
| A05 Iniciar o recuperar intento | RF-12/22/23/25; CU-01/15 | M5 | POST `/api/v1/estudiantes/sesiones/{idSesion}/intentos`; GET `/api/v1/estudiantes/intentos/{idIntento}` | POST sin cuerpo → D2; GET → D3 | Cookie estudiantil y titularidad. El servidor resuelve convocatoria propia por sesión. POST bajo flag de publicación; GET no permite crear un intento | **PARCIAL**: lectura/servicio de inicio-reanudación implementados; POST sin habilitar y consumidor FE de inicio pendiente |
| A06 Asociar investigación al contexto académico | RF-05/06/09; CU-15 + incremento SIM | M5 + M3 | GET `/api/v1/estudiantes/intentos/{idIntento}/contenido`; GET `.../{idIntento}/narrativa` condicionado | D4; D5 para versión fijada del guion | Titularidad del intento; M3 limita contenido a caso publicado/activo. Narrativa exige fases/guion y contexto persistido | **PARCIAL**: existe relación intento→sesión→caso y guion candidato fijado; falta adaptar el contexto al visor. Sesión visual/caso de laboratorio no son UUID académicos |
| A07 Registrar paso investigación→cuestionario | RF-10/11/12; CU-15 + incremento SIM | M5 | POST `/api/v1/estudiantes/intentos/{idIntento}/cuestionario` | Sin cuerpo → D6 | Sesión estudiantil, titularidad, intento EnCurso, fase existente y límite decidido atómicamente por PostgreSQL. HTTP de fases deshabilitado | **PARCIAL**: contrato/caso de uso implementados, condicionados a habilitación de fases y ensamblaje |
| A08 Aplicar transición irreversible | RF-10/12/23; CU-15 + R4 del incremento SIM | M5; FE coordina Unreal | A07 y GET `/api/v1/estudiantes/intentos/{idIntento}/fase` | D6 y D7 | Backend no ofrece vuelta de cuestionario a exploración; deniega narrativa cuando corresponde. El bloqueo visual se aplica solo tras confirmar fase académica; ACK de Unreal no reemplaza confirmación Backend | **PARCIAL**: reglas existentes, rutas condicionadas y puerto FE todavía pendiente. `SIN_FASES` no acredita investigación cerrada |
| A09 Presentar preguntas | RF-06/07/10; CU-15 | M5 → M3 | GET `/api/v1/estudiantes/intentos/{idIntento}/contenido` | Sin cuerpo → D4 | Titularidad; proyección sin corrección/rúbrica/explicaciones. Con fases habilitadas, preguntas ocultas durante exploración: `CUESTIONARIO_NO_INICIADO` | **IMPLEMENTADA como consulta autorizada**, gateway FE existente/optativo; composición académica con el visor pendiente |
| A10 Registrar/modificar respuestas | RF-10/11/23; CU-15 | M5 | PUT `/api/v1/estudiantes/intentos/{idIntento}/respuestas/{idPregunta}` | `{idOpcionSeleccionada,revisionEsperada}` → `{idPregunta,idOpcionSeleccionada,revision}` | Estudiante propietario, pregunta/opción válidas, revisión optimista, reglas del intento/fase/tiempo. No recibe nota ni un ID de estudiante del cliente | **IMPLEMENTADA como contrato**, gateway/coordinador FE existentes; no activados por este trabajo |
| A11 Finalizar intento | RF-12/23/24; CU-16 | M5 | POST `/api/v1/estudiantes/intentos/{idIntento}/finalizar` | Sin cuerpo → D8 | Titularidad y motivo efectivo/tiempo decididos en Backend. Reintento con mismo motivo efectivo conserva cierre; M5 no califica. Ruta condicionada a publicación | **PARCIAL**: servicio/DTO existentes, POST deshabilitado y gateway FE pendiente |
| A12 Consultar nota/retroalimentación según permisos | RF-13/14; CU-17 (CU-19 para consulta docente) | M6 + futuros consumidores | No se localizó ruta REST estudiantil de resultados en las fuentes vigentes | No inventar DTO de calificación a partir de D3/D8 | M6 contiene puertos y persistencia; su documentación conserva consulta interna sin REST/autorización institucional de consulta. M5 excluye calificaciones | **NO DISPONIBLE** como contrato HTTP estudiantil para este recorrido; definición/publicación requiere decisión vigente |
| A13 Errores, reconexión y duplicados | RF-02/10/11/12/23; CU-01/15/16 | M1/M4/M5; FE/Unreal separados | GET intento; GET fase condicionado; PUT revisión; POST inicio/cuestionario/finalización condicionados | DTO previos; errores y revisión/fecha persistidos | No reenviar a ciegas escrituras inciertas. Consultar estado; mantener identidad/titularidad. No usar ACK v1 ni memoria narrativa como prueba de persistencia | **PARCIAL**: mecanismos existentes, falta recorrido integrado, activación autorizada y validación E2E |

### DTO reutilizables

- **D1 ConvocatoriaEstudianteResponse:** `idConvocatoria,idSesion,idCaso,estadoSesion,estadoAutorizacion,inicioPrevisto,finPrevisto,fechaInicioReal,fechaFinReal,tiempoMaximoParticipacionSegundos` (B4).
- **D2 Inicio:** `{intento:D3,reanudado:boolean}` (B7:46).
- **D3 Intento:** `idIntento,estado(EnCurso|Finalizado),inicio,limiteTemporal,motivoFinalizacion,respuestas[],ahoraServidor`; cada respuesta contiene `idPregunta,idOpcionSeleccionada,revision` (B7).
- **D4 ContenidoIntento:** `{idIntento,idSesion,caso}`; caso: `idCaso,titulo,historia,desarrolloSituacional,escenarios[]`; cada escenario incluye preguntas y cada pregunta opciones con UUID/texto/orden. Sin respuesta correcta, explicación ni rúbrica (B9).
- **D5 Narrativa:** `idIntento,idGuion,version,hashDefinicion,definicion` (B11).
- **D6 Cuestionario:** `idIntento,fase(CUESTIONARIO),fechaInicioCuestionario,yaIniciado` (B11:49).
- **D7 Fase:** `idIntento,estadoIntento,fase(SIN_FASES|EXPLORACION|CUESTIONARIO),fechaInicioExploracion,fechaInicioCuestionario,limiteTemporal,ahoraServidor` (B11:33). Estado del intento y fase son conceptos distintos. GET `.../completitud`, también condicionado, devuelve `idIntento,preguntasPresentables,respondidas,sinResponder`; es informativo, no criterio de aprobación.
- **D8 Finalizacion:** `idIntento,estado,fin,motivoFinalizacion` (B7). No contiene calificación.

## Matriz B — consumidor, evento, persistencia y evidencia

Los IDs enlazan con todas las columnas de la matriz A. Un evento espacial no se convierte en una respuesta académica por compartir un nombre o por aparecer cerca de un NPC.

| ID | Frontend reutilizable / brecha | Solicitud del simulador | Persistencia real / límite | Evidencia con revisión |
|---|---|---|---|---|
| A01 | Login/M1PersonalHttp son personal; falta consumidor estudiantil autorizado de DD-02 B | Acceso explícito del estudiante antes del recorrido, nunca E/puerta | DD-02 B: credencial/sesión/challenge/entrega según V014–V016, fuera de Flyway productivo por defecto | BE B1/B2/B16 @773818c; FE F5/F6 @0b341c0 |
| A02 | SesionesM4Api/CasosM3Api son gestión de personal; no consumirlos como catálogo del estudiante | Selección académica previa al visor | Convocatoria/Sesion/Caso; no genera intento | BE B3/B4 @773818c; FE F2/F6 @0b341c0 |
| A03 | `consultarSesionesAutorizadas` sigue en gateway pendiente; adaptar a convocatoria real, sin nuevo endpoint | Elegir convocatoria propia | Convocatoria propia autorizada, Sesion y caso asociado | BE B3/B4 @773818c; FE F1:95/F2 @0b341c0 |
| A04 | FE puede presentar condiciones; no adjudicar elegibilidad ni recalcular límite | Solicitud explícita de inicio académico, distinta de abrir ciudad | Participacion/Intento, contexto de M4 y reloj PostgreSQL | BE B13/B5 @773818c |
| A05 | Reutilizar ParticipacionGateway/Coordinador; `iniciarIntento` y `reanudarIntento` siguen pendientes en el proveedor HTTP | Iniciar/reanudar desde contexto autorizado; abrir una puerta no crea intentos | Participacion + Intento; unicidad/bloqueos y límite persistido | BE B5/B6/B7/B13 @773818c; FE F1:58/F1:99/F2/F4 @0b341c0 |
| A06 | Reutilizar gateway de contenido y adaptador-guion-m3. Validar versión/hash/UUID; el guion demo y el EnlaceNarrativo no autorizan por sí solos equivalencias académicas | Preparar investigación tras resolver contexto del intento | Contenido M3; GuionNarrativoCaso V017 y FaseIntento V018 solo en ensamblaje candidato autorizado. Libreta/visitas siguen en memoria | BE B8/B9/B10/B11/B16 @773818c; FE F1:68/F7 @0b341c0 |
| A07 | PUERTO_TRANSICION_FASE existe sin implementación HTTP; no duplicarlo | Botón explícito «Finalizar investigación» + confirmación; cancelar no escribe | Cambio atómico FaseIntento; fecha persistida; `yaIniciado` en reintentos | BE B10/B11/B12 @773818c; FE F3 @0b341c0 |
| A08 | Adaptar enums y consulta de fase; el puerto actual usa minúsculas y no modela SIN_FASES | Cerrar acceso al mundo después de confirmación Backend; recuperar fase tras reconectar | FaseIntento + estado Intento. R4 rechaza narrativa en cuestionario/finalizado según reglas; la cámara no ofrece esa garantía | BE B12/B14/B16 @773818c; FE F3 @0b341c0 |
| A09 | ParticipacionHttpGateway.consultarContenidoIntento y modelos/lector existentes; componer pantalla cuando el contexto lo autorice | Mostrar cuestionario tras fase confirmada | Caso/Escenario/Pregunta/OpcionRespuesta; M5 aplica titularidad y visibilidad | BE B8/B9/B12:74 @773818c; FE F1:68/F4 @0b341c0 |
| A10 | ParticipacionHttpGateway.registrarRespuesta y ParticipacionCoordinador.guardar/verificar; mantenerlos como único flujo de guardado | Selección explícita de una opción académica de UUID conocido, no diálogo demostrativo | Respuesta + revisión; intención local no equivale a confirmación persistida | BE B6/B7/B15 @773818c; FE F1:77/F4 @0b341c0 |
| A11 | `finalizarIntento` permanece en proveedor pendiente; implementar solo tras publicación autorizada | «Finalizar intento», distinto de «Finalizar investigación» | Intento.fin/estado/motivo. Cierre idempotente con mismo motivo efectivo | BE B5:62/B7/B17 @773818c; FE F1:111/F2 @0b341c0 |
| A12 | No hay gateway estudiantil oficial de nota/feedback identificado | Mostrar resultados solo cuando exista contrato y permiso | Calificacion/RetroalimentacionGeneral en M6 no implican publicación HTTP ni nota calculada al finalizar M5 | BE B7/B18 @773818c; FE F2 @0b341c0 |
| A13 | Reutilizar estados de sincronización del coordinador, revisionEsperada y consulta; coordinar después con sesión visual | Reconexión explícita y reconciliación académica independiente de estado.restaurar visual | Intento/Respuesta/FaseIntento según flags; cookie/backend como autoridad. La libreta demostrativa no tiene persistencia académica | BE B2/B12/B15/B17 @773818c; FE F1/F3/F4 @0b341c0 |

## Decisiones y brechas que no deben fabricarse

1. **DD-02 B y entorno:** solicitar decisión vigente de habilitación, esquema y entrega de códigos; no reutilizar Bearer de personal ni enviar `idEstudiante`, `X-Student-Id` o credenciales inventadas. `validar` retorna 204/cookie, no un perfil estudiantil JSON. La ausencia de `/me` estudiantil no autoriza a crear uno ni impide que M4/M5 resuelvan identidad del lado servidor.
2. **Inicio/finalización:** E1, L1, RF-22 y los ajustes DC-45 ya están ratificados/implementados. Lo pendiente es publicar/activar los POST y completar el consumidor, no volver a declarar esas reglas inexistentes. Parte de M5-INICIO-REANUDACION conserva redacción histórica que no sustituye el código DC-45.
3. **Fases/narrativa:** D-SIM-2/3/4/10 tienen implementación explícita. V017/V018 y los flags de ensamblaje/HTTP siguen fuera del modo productivo por defecto; los guards de esquema fallan cerrado si el ensamblaje no es compatible. No se aplicaron migraciones. D-SIM-5 sigue siendo completitud informativa: no imponer «100 % respondido» como condición nueva.
4. **Contexto del visor:** falta enlazar explícitamente los UUID oficiales del intento/caso/sesión/convocatoria con la asignación visual. No asignar `caso-lab-demo` o la sesión visual al ID de un intento ni inferirlo de Hospital/Comisaría/Fiscalía. El estado/restauración v1 conserva su responsabilidad espacial.
5. **Libreta/pistas:** no se localizó contrato HTTP para persistir notas, pistas o progreso por NPC del estudiante. Su memoria actual se conserva como investigación demostrativa, sin convertirla en respuesta, nota, participación o evidencia académica persistida. No crear tablas/endpoints ad hoc.
6. **Resultados:** M6 tiene código y persistencia internos; no se localizó consulta REST estudiantil de nota/feedback habilitable a partir de los DTO de M5. Publicación, permisos y decisiones de evaluación deben provenir de Dirección Central/Backend. No calcular ni simular calificaciones en Angular/Unreal.
7. **Entorno real:** el Frontend paralelo apunta al laboratorio; verificar qué proyecto Unreal está conectado antes de probar los tres interiores. Coordinar Origin/cookie/CORS con Backend sin cambiar aquí P2, seguridad ni configurar orígenes indiscriminados.

## Flujo propuesto, condicionado a los contratos y habilitaciones

**A — Acceso:** acceso estudiantil DD-02 B autorizado → GET convocatorias propias → selección de sesión/convocatoria y caso. Una convocatoria listada no prueba elegibilidad. Iniciar/reanudar por el POST oficial cuando se publique; recuperar UUID y tiempos del servidor. Visitar una zona no ejecuta este POST.

**B — Investigación:** fijar contexto del intento; consultar fase y narrativa académica publicada cuando estén habilitadas. Adaptar el guion real sin reescribir SIM-01, preservando las funcionalidades demostrativas existentes por separado. Recorrer los tres edificios; no enviar respuestas M5 por E, puertas, pistas o visitas. La publicación narrativa no convierte automáticamente decisiones demo en preguntas académicas.

**C — Transición:** confirmación explícita de «Finalizar investigación». Cancelar conserva investigación; aceptar solicita POST `/cuestionario` sin cuerpo inventado. Si hay resultado incierto, consultar GET `/fase`. Solo una fase `CUESTIONARIO` confirmada justifica el bloqueo irreversible del mundo y la apertura del cuestionario. Un ACK visual no decide la fase. `SIN_FASES` requiere tratamiento explícito de compatibilidad, no una conversión automática a exploración. Este paso no usa `/finalizar`.

**D — Cuestionario:** leer contenido del intento autorizado y renderizar las preguntas/opciones reales. Guardar vía PUT con `revisionEsperada`, 0 cuando no existe respuesta. Tras un resultado incierto o revisión obsoleta, consultar y reconciliar; no reintentar escrituras automáticamente. Usar tiempos persistidos y `ahoraServidor`, sin ampliar límites desde Angular.

**E — Cierre:** finalizar mediante el POST oficial cuando esté publicado. Persistencia y motivo efectivo corresponden a M5; no atribuirle una calificación. Consultar nota/feedback solo después de disponer del contrato M6 autorizado. Al recargar/reautenticar se recuperan intento/fase/respuestas desde Backend; la libreta actual no ofrece esa persistencia.

## Incrementos implementables y dependencia por responsable

| Incremento | Estado de esta entrega | Próximo trabajo / responsable |
|---|---|---|
| F4-01 Sincronización | **REALIZADA:** fetch, bases aisladas, conservación y reconciliación textual FE sin commit | Nicolás/DC revisan base; Codex conserva ambas líneas. No fusionar/publicar |
| F4-02 Contratos | **DOCUMENTADA POR REVISIÓN ESTÁTICA**, esta matriz | DC/Backend confirman habilitaciones y contratos faltantes; no inferir disponibilidad de servicios |
| F4-03 Contexto académico | **CONDICIONADO; SIN IMPLEMENTACIÓN NUEVA** | Codex reutiliza los puertos/modelos existentes al recibir decisión DD-02/entorno e inicio autorizado; selección por convocatoria propia |
| F4-04 Investigación integrada | Fase 3 conservada; relación académica pendiente | Codex adapta contexto/guion oficiales sin convertir pistas en notas. Claude verifica mundo compatible; Nicolás comprueba recorrido |
| F4-05 Transición | Contratos candidatos identificados, flags off | DC autoriza ensamblaje/exposición; Codex adapta PuertoTransicionFase a D6/D7 y sus estados reales |
| F4-06 Respuestas/resultados | GET contenido/intento y PUT respuesta reutilizables; POST condicionados; resultados sin contrato HTTP | Codex conserva gateway/coordinador. Backend/DC resuelven publicación y consulta de resultados |
| F4-07 Validación E2E | Guion esperado preparado debajo, **SIN EJECUTAR** | Nicolás ejecuta solo en entorno autorizado; DC acepta con evidencia |

### Preparación E2E: esperado, no obtenido

| Comprobación futura | Resultado esperado condicionado al entorno autorizado |
|---|---|
| Acceso sin DD-02 o identidad ajena | Pendiente/denegación según contrato; sin leer/escribir intentos de terceros |
| Convocatorias propias | Solo autorizadas/no retiradas; el visor no dispara inicio académico |
| Inicio/reanudación duplicados | Mismo intento en curso y límite persistido; sin ampliación del tiempo |
| Investigación y reconexión | Guion/versión/contexto correctos; ninguna escritura académica por interacción espacial; fase académica consultada al recuperar |
| Cancelar transición | Sin POST al cuestionario ni bloqueo irreversible |
| Confirmar / respuesta incierta | Backend decide fase/tiempo; GET fase reconcilia; no vuelta a narrativa después de fase cerrada |
| Guardar con revisión vigente/obsoleta | Guardado autorizado o conflicto; reconciliar por consulta, sin éxito local simulado |
| Finalizar/repetir cierre | Fecha/motivo persistidos e idempotencia según M5; no nota inventada |
| Consultar resultados sin contrato | Disponibilidad pendiente explícita, sin reutilizar el resumen M5 como calificación |

Los escenarios E2E de esta matriz no se ejecutaron. La verificación Angular del incremento se registra separadamente en DC-SIM-GIT-SINCRONIZACION-10-RESULTADO.md; no se confunde con aceptación del recorrido académico. No se declara completada Fase 4. INC-05 y la validación funcional de Fases 2/3 permanecen abiertos.

## Índice de evidencia: archivo, línea y revisión

**BE = 773818caf62758d66019a71dac6508d13148abad. FE = 0b341c029407ca871183e6346bc6e730e9778f34.** Las referencias A/B señalan el ID y, cuando corresponde, una línea adicional del mismo archivo. Son fuentes revisadas, no resultados de ejecución.

| ID | Fuente y línea | SHA |
|---|---|---|
| B0 | [application.yml:24](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/app/src/main/resources/application.yml#L24), flags en 35/59/75/81/86/89 | BE |
| B1 | [EstudianteCuentaController.java:37](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m1/src/main/java/com/prisaly/m1/presentation/EstudianteCuentaController.java#L37), métodos 67/81/103 | BE |
| B2 | [HttpApiConfig.java:90](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/app/src/main/java/com/prisaly/config/HttpApiConfig.java#L90) | BE |
| B3 | [ConvocatoriasEstudianteController.java:41](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m4/src/main/java/com/prisaly/m4/presentation/controller/ConvocatoriasEstudianteController.java#L41) | BE |
| B4 | [ConvocatoriaEstudianteResponse.java:13](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m4/src/main/java/com/prisaly/m4/presentation/dto/ConvocatoriaEstudianteResponse.java#L13) | BE |
| B5 | [IntentosM5Controlador.java:54](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/presentation/rest/IntentosM5Controlador.java#L54), condición 37, cierre 62 | BE |
| B6 | [IntentosEstudianteM5Controlador.java:49](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/presentation/rest/IntentosEstudianteM5Controlador.java#L49), guardado 55 | BE |
| B7 | [IntentosM5Dto.java:21](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/presentation/rest/IntentosM5Dto.java#L21) | BE |
| B8 | [ContenidoIntentoEstudianteControlador.java:20](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/presentation/rest/ContenidoIntentoEstudianteControlador.java#L20) | BE |
| B9 | [ContenidoIntento.java:7](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/application/ContenidoIntento.java#L7) y [ContenidoCasoEstudiantilPort.java:12](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m3/src/main/java/com/prisaly/m3/api/ContenidoCasoEstudiantilPort.java#L12) | BE |
| B10 | [FasesIntentoEstudianteControlador.java:59](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/presentation/rest/FasesIntentoEstudianteControlador.java#L59), condición 36, fase 65, cuestionario 71, completitud 77 | BE |
| B11 | [FasesIntentoDto.java:22](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/presentation/rest/FasesIntentoDto.java#L22) | BE |
| B12 | [FasesIntento.java:117](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/application/fase/FasesIntento.java#L117), respuestas 62, contenido 74, consulta 98, narrativa 142 | BE |
| B13 | [ElegibilidadInicioDesdeM4.java:41](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/infrastructure/programacion/ElegibilidadInicioDesdeM4.java#L41) y [LimiteTemporalDesdeM4.java:44](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/infrastructure/programacion/LimiteTemporalDesdeM4.java#L44) | BE |
| B14 | [PoliticasFaseAprobadas.java:12](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/application/fase/PoliticasFaseAprobadas.java#L12) | BE |
| B15 | [RegistrarRespuestaServicio.java:31](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/application/servicio/RegistrarRespuestaServicio.java#L31) | BE |
| B16 | [EsquemaAccesoEstudianteConfig.java:23](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/app/src/main/java/com/prisaly/config/EsquemaAccesoEstudianteConfig.java#L23), [EsquemaFasesIntentoConfig.java:21](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/app/src/main/java/com/prisaly/config/EsquemaFasesIntentoConfig.java#L21) y [V018__sim_fase_intento.sql:9](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/app/src/main/resources/db/sim-propuesta-b/V018__sim_fase_intento.sql#L9) | BE |
| B17 | [FinalizarIntentoServicio.java:27](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m5/src/main/java/com/prisaly/m5/application/servicio/FinalizarIntentoServicio.java#L27) | BE |
| B18 | [M6-INC-05.md:99](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m6/docs/M6-INC-05.md#L99), [M6-INC-06.md:77](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m6/docs/M6-INC-06.md#L77); se contrastó el inventario de controladores actual | BE |
| B19 | [V27-MATRIZ.md:1](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/docs/integration/V27-MATRIZ.md#L1), [PLAN-21-CU.csv:1](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/docs/integration/PLAN-21-CU.csv#L1), [BD-005.2-REFERENCE.md:1](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/docs/BD-005.2-REFERENCE.md#L1) | BE; antecedentes documentales contrastados con fuentes/migraciones |
| B20 | [openapi-m3-casos.yaml:11](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/docs/api/openapi-m3-casos.yaml#L11); GET de contenido docente en [CasoContenidoConsultaController.java:40](https://github.com/Cris-count/PRISALY-Backen/blob/773818caf62758d66019a71dac6508d13148abad/m3/src/main/java/com/prisaly/m3/presentation/CasoContenidoConsultaController.java#L40) | BE; no se toma como catálogo estudiantil |
| F1 | [participacion-http.gateway.ts:58](../../src/app/features/simulador/services/participacion-http.gateway.ts#L58), contenido 68, PUT 77, pendientes 95/99/111, opt-in 124 | FE |
| F2 | [participacion.gateway.ts:35](../../src/app/features/simulador/services/participacion.gateway.ts#L35) | FE |
| F3 | [puerto-transicion-fase.ts:48](../../src/app/features/simulador/services/puerto-transicion-fase.ts#L48), modelo de fases 5 | FE |
| F4 | [participacion.coordinador.ts:27](../../src/app/features/simulador/services/participacion.coordinador.ts#L27) | FE |
| F5 | [m1-personal-http.ts:21](../../src/app/features/autenticacion/m1-personal-http.ts#L21) | FE |
| F6 | [sesiones-m4.api.ts:137](../../src/app/features/academico/sesiones-m4.api.ts#L137) y [app.config.ts:20](../../src/app/app.config.ts#L20) | FE |
| F7 | [adaptador-guion-m3.ts:1](../../src/app/features/simulador/narrativa/adaptador-guion-m3.ts#L1) y [enlace-narrativo.ts:1](../../src/app/features/simulador/services/enlace-narrativo.ts#L1) | FE |

La referencia BD-005.2 y la matriz V27 contienen estados/redacciones históricos; no se usaron para negar implementaciones nuevas presentes en DC-45 ni para afirmar migraciones desplegadas. Las responsabilidades de esta matriz corresponden a M1/M3/M4/M5/M6, con dependencia de entrega del acceso en M7; no se activó su worker. M2 conserva únicamente `package-info.java` en su árbol Java principal y no ofrece una operación HTTP para estas capacidades. No se efectuó una auditoría general M1–M7 ni se modificaron índices históricos de cumplimiento.
