# Mapa de PRISALY-Front

Generado: 2026-11-25 23:31 · rama `develop` · SHA `e23172b`

> Si `git -C PRISALY-Front rev-parse --short HEAD` no da `e23172b`, este mapa está desactualizado: regenéralo con `node .claude/mapa/generar-mapa.mjs` antes de usarlo.
> El mapa dice **dónde** está cada cosa. Para saber **cómo** funciona, lee solo los archivos que señala.

## Rutas

| Ruta | Guard | Destino | Archivo:línea |
|---|---|---|---|
| `/` | — | → /login | src/app/app.routes.ts:14 |
| `/login` | — | ./features/autenticacion/login-page · LoginPage | src/app/app.routes.ts:16 |
| `/estudiante/acceso` | `() => inject(M1_PERSONAL_LOCAL) || inject(Router).createUrlTree(['/log` | ./features/autenticacion/acceso-estudiante-real · AccesoEstudianteReal | src/app/app.routes.ts:23 |
| `/activacion-docente` | — | ./features/autenticacion/activacion-docente · ActivacionDocente | src/app/app.routes.ts:33 |
| `/acceso-estudiante` | `requiereEntornoDemostracion` | ./features/autenticacion/acceso-estudiante-demo · AccesoEstudianteDemo | src/app/app.routes.ts:40 |
| `/dashboard` | — | ./features/dashboard/dashboard.routes · DASHBOARD_ROUTES | src/app/app.routes.ts:47 |
| `/simulador` | — | → /simulador-unreal | src/app/app.routes.ts:53 |
| `/simulador-tecnico-2d5` | `requiereEntornoDemostracion` | ./features/simulador/pages/simulador-temporal · SimuladorTemporal | src/app/app.routes.ts:58 |
| `/simulador-integrado` | `requiereEntornoDemostracion` | ./features/simulador/pages/simulador-integrado-page | src/app/app.routes.ts:65 |
| `/simulador-unreal` | `requiereEntornoDemostracion` | ./features/simulador/unreal/simulador-unreal-page · SimuladorUnrealPage | src/app/app.routes.ts:74 |
| `/**` | — | → /login | src/app/app.routes.ts:79 |
| `/` | — | ./dashboard-layout · DashboardLayout | src/app/features/dashboard/dashboard.routes.ts:12 |
| `/` | `requiereSesionPersonalQa` | ./dashboard-inicio · DashboardInicio | src/app/features/dashboard/dashboard.routes.ts:16 |
| `/perfil` | `requiereSesionPersonalQa` | ./dashboard-perfil · DashboardPerfil | src/app/features/dashboard/dashboard.routes.ts:34 |

## Opciones booleanas por entorno (`src/environments`)

| Opción | demo | development | qa-navegacion | qa | base |
|---|---|---|---|---|---|
| `demostracionesHabilitadas` | sí | no | no | no | no |
| `personalQaHabilitado` | no | no | sí | sí | no |
| `production` | no | no | no | no | sí |
| `simuladorUnrealLocal` | no | sí | no | no | no |

Otros archivos de entorno: `src/environments/senalizacion-unreal.ts`

## Rutas de API usadas por el Front

| Ruta API | Archivo:línea |
|---|---|
| `v1/estudiantes/**` | src/app/features/academico/academico-http.ts:92 |
| `v1/acceso-estudiante/**` | src/app/features/academico/academico-http.ts:92 |
| `v1/admin` | src/app/features/academico/administracion-m1.api.ts:107 |
| `v1/admin/roles` | src/app/features/academico/administracion-m1.api.ts:116 |
| `v1/admin/permisos` | src/app/features/academico/administracion-m1.api.ts:120 |
| `v1/admin/usuarios/${idUsuario}/permisos` | src/app/features/academico/administracion-m1.api.ts:125 |
| `v1/admin/usuarios/${idUsuario}/permisos/${idPermiso}` | src/app/features/academico/administracion-m1.api.ts:133 |
| `v1/admin/usuarios/${idUsuario}/permisos/${idPermiso}` | src/app/features/academico/administracion-m1.api.ts:155 |
| `v1/admin/docentes` | src/app/features/academico/administracion-m1.api.ts:171 |
| `v1/admin/estudiantes` | src/app/features/academico/administracion-m1.api.ts:190 |
| `v1/admin/estudiantes` | src/app/features/academico/administracion-m1.api.ts:205 |
| `v1/admin/docentes/${idUsuario}/activacion` | src/app/features/academico/administracion-m1.api.ts:237 |
| `v1/casos` | src/app/features/academico/casos-m3.api.ts:317 |
| `v1/casos/${idCaso}` | src/app/features/academico/casos-m3.api.ts:329 |
| `v1/casos/${idCaso}/contenido` | src/app/features/academico/casos-m3.api.ts:333 |
| `v1/casos/${idCaso}` | src/app/features/academico/casos-m3.api.ts:339 |
| `v1/casos/${idCaso}/publicar` | src/app/features/academico/casos-m3.api.ts:355 |
| `v1/casos/${idCaso}/rubrica` | src/app/features/academico/casos-m3.api.ts:371 |
| `v1/casos/${idCaso}/rubrica` | src/app/features/academico/casos-m3.api.ts:397 |
| `v1/casos/${idCaso}/escenarios` | src/app/features/academico/casos-m3.api.ts:428 |
| `v1/casos/${idCaso}/escenarios/${idEscenario}/preguntas` | src/app/features/academico/casos-m3.api.ts:451 |
| `v1/casos/${idCaso}/preguntas/${idPregunta}/opciones` | src/app/features/academico/casos-m3.api.ts:475 |
| `v1/admin` | src/app/features/academico/panel-administracion-m1.ts:48 |
| `v1/docente/sesiones/${idSesion}/participaciones` | src/app/features/academico/participaciones-dc92.api.ts:250 |
| `v1/docente/sesiones/${idSesion}/reporte-participacion` | src/app/features/academico/participaciones-dc92.api.ts:270 |
| `v1/acceso-estudiante/solicitar` | src/app/features/autenticacion/acceso-estudiante-real.ts:47 |
| `v1/acceso-estudiante/validar` | src/app/features/autenticacion/acceso-estudiante-real.ts:70 |
| `v1/personal/activar` | src/app/features/autenticacion/activacion-docente.ts:102 |
| `v1/personal/me` | src/app/features/autenticacion/aviso-acceso-personal.ts:10 |
| `v1/personal/autenticar` | src/app/features/autenticacion/m1-personal-api.ts:61 |
| `v1/personal/me` | src/app/features/autenticacion/m1-personal-api.ts:78 |
| `v1/personal/cerrar-sesion` | src/app/features/autenticacion/m1-personal-api.ts:100 |
| `v1/personal/me` | src/app/features/autenticacion/m1-personal-http.ts:28 |
| `v1/personal/cerrar-sesion` | src/app/features/autenticacion/m1-personal-http.ts:30 |
| `v1/personal/me` | src/app/features/autenticacion/m1-personal-sesion.ts:238 |
| `v1/personal/me` | src/app/features/dashboard/dashboard-perfil.ts:8 |
| `v1/personal/me` | src/app/features/dashboard/navegacion-rol.ts:15 |
| `v1/estudiantes/${segmentos.join(` | src/app/features/simulador/services/participacion-http.gateway.ts:119 |

## Archivos de `src/app` (sin specs) y lo que exportan

**./** (3 archivos)
- app.config.ts — appConfig
- app.routes.ts — routes
- app.ts — App

**core/config/** (1 archivos, 1 specs)
- api.config.ts — ApiConfig, crearApiConfig, API_CONFIG, provideApiConfig, construirUrlApi

**core/http/** (1 archivos, 1 specs)
- clasificar-error-api.ts — TipoFalloApi, FalloApi, clasificarErrorApi

**features/academico/** (17 archivos, 10 specs)
- academico-http.ts — SOLICITUD_ACADEMICA, contextoAcademico, esRutaSinBearer, rutaRelativaApi, esRutaAcademicaAutorizada (+7)
- administracion-m1.api.ts — DocenteAltaRequest, UsuarioDocente, RolResumen, PermisoResumen, AsignacionPermisoUsuario (+3)
- capacidades-dc99.ts — CapacidadesBackendDc99, leerCapacidadesDc99, CAPACIDADES_DC99, provideCapacidadesDc99
- casos-m3.api.ts — CrearCasoRequest, CrearCasoResponse, CasoDocente, Versionado, CasoPatch (+13)
- casos-sesion.store.ts — CasosSesionStore
- contexto-recorrido.ts — PARAM_CASO, PARAM_SESION, SELECCION_INVALIDADA, NombreParametroRecorrido, uuidDeParametro (+1)
- panel-administracion-m1.ts — mensajeFalloActivacionAdmin, PERMISOS_SEPARACION_FUNCIONES, PanelAdministracionM1
- panel-casos-m3.ts — PanelCasosM3
- panel-contenido-m3.ts — MENSAJES_CONTENIDO, PanelContenidoM3
- panel-convocatorias-m4.ts — PanelConvocatoriasM4
- panel-estudiantes-m1.ts — mensajeFalloEstudiantes, PanelEstudiantesM1
- panel-participaciones-dc92.ts — GuardarArchivo, GUARDAR_ARCHIVO, PanelParticipacionesDc92
- panel-rubrica-m3.ts — PanelRubricaM3
- panel-sesiones-m4.ts — MENSAJES_M4, mensajeM4, aInstante, aLocal, ETIQUETA_ESTADO (+1)
- participaciones-dc92.api.ts — ETIQUETA_PARTICIPACION, ETIQUETA_EVALUACION, etiqueta, FilaParticipacion, ReporteDescargado (+6)
- recorrido-docente.ts — EtapaRecorrido, PASOS_RECORRIDO, RecorridoDocente
- sesiones-m4.api.ts — EstadoSesion, ESTADOS_SESION, SIGUIENTE_ESTADO, admiteCambios, CrearSesionRequest (+4)

**features/autenticacion/** (18 archivos, 17 specs)
- acceso-estudiante-demo.ts — leerEstudianteDemo, ESTUDIANTE_DEMO_CONFIG, SesionEstudianteDemo, AccesoEstudianteDemo
- acceso-estudiante-real.ts — ResultadoAcceso, clasificarErrorAcceso, AccesoEstudianteApi, AccesoEstudianteReal
- activacion-docente.ts — CodigoPoliticaContrasena, ResultadoActivacion, FORMATO_TOKEN_ACTIVACION, MINIMO_CARACTERES_CONTRASENA, MAXIMO_BYTES_CONTRASENA (+6)
- aviso-acceso-personal.ts — AvisoAccesoPersonal
- entorno-demostracion.ts — DEMOSTRACIONES_HABILITADAS, provideEntornoDemostracionAutorizado, salidaSinDemostracion, requiereEntornoDemostracion
- estado-acceso-personal.ts — EstadoAccesoPersonalPanel
- estado-verificacion-acceso.ts — EstadoVerificacionAcceso
- habilitacion-qa-navegacion.ts — RUTAS_AUTORIZADAS_QA_NAVEGACION, EntornoNavegacion, mapeoConHabilitacionQa
- login-page.ts — LoginPage
- m1-mapeo-rutas.ts — RequisitoRutaAprobado, MapeoRutaPersonal, MAPEO_RUTAS_PERSONAL_OFICIAL, MAPEO_RUTAS_PERSONAL, DecisionRuta (+4)
- m1-personal-api.ts — FalloAutenticacionPersonal, M1PersonalApi
- m1-personal-guards.ts — requiereSesionPersonalM1, requierePermisosPersonalM1
- m1-personal-http.ts — M1_PERSONAL_LOCAL, provideM1PersonalLocal, SOLICITUD_PERSONAL_M1, personalM1Interceptor
- m1-personal-memoria.ts — CredencialPersonalMemoria, esTokenPersonal
- m1-personal-rutas-qa.ts — requiereSesionPersonalQa, requiereMapeoPersonalQa
- m1-personal-sesion.ts — VerificacionIdentidad, VIGENCIA_IDENTIDAD_MS, SesionPersonalM1
- m1-personal.models.ts — PersonalAutenticarRequest, PersonalAutenticarResponse, PersonalMeResponse, IdentidadPersonal, EstadoAccesoPersonal (+2)
- vigilancia-acceso-personal.ts — INTERVALO_REVALIDACION_ACCESO_MS, FALLOS_TEMPORALES_TOLERADOS, VigilanciaAccesoPersonal

**features/dashboard/** (16 archivos, 6 specs)
- dashboard-administracion.ts — DashboardAdministracion
- dashboard-convocatorias.ts — DashboardConvocatorias
- dashboard-docente.ts — DashboardDocente
- dashboard-estudiante.ts — DashboardEstudiante
- dashboard-inicio.ts — DashboardInicio
- dashboard-layout.ts — DashboardLayout
- dashboard-perfil.ts — CAPACIDADES_PERSONAL, capacidadesDe, DashboardPerfil
- dashboard-seccion.ts — DashboardSeccionPage
- dashboard-secciones.ts — DashboardSeccion, DASHBOARD_SECCIONES, DASHBOARD_ESTUDIANTE, DASHBOARD_NAVEGACION
- dashboard-sesiones.ts — DashboardSesiones
- dashboard.routes.ts — DASHBOARD_ROUTES
- docente-vistas.ts — VISTAS_DOCENTES
- estado-panel.ts — TipoEstadoPanel, ESTADOS_PANEL, EstadoPanel
- estado-recorrido-estudiantil.ts — TipoRecorridoEstudiantil, EstadoRecorridoEstudiantil, EstadoRecorridoEstudiantilPanel
- estructura-docente.ts — BloqueDocente, EstructuraDocente
- navegacion-rol.ts — MATRIZ_NAVEGACION_ROL, seccionesPorRol, NAVEGACION_PRESENTACION, hayRutasHabilitadas, crearModoDocenteOperativo (+2)

**features/simulador/components/** (11 archivos, 6 specs)
- barra-acciones.ts — BarraAcciones
- confirmacion-finalizacion.ts — ConfirmacionFinalizacion
- contenido-academico.ts — ContenidoAcademico
- escenario-2d.ts — Escenario2d
- indicador-progreso.ts — IndicadorProgreso
- panel-contexto.ts — PanelContexto
- panel-narrativo.ts — PanelNarrativo
- panel-preguntas.ts — PanelPreguntas
- pantalla-inicio.ts — PantallaInicio
- temporizador.ts — Temporizador
- visor-ciudad-2d5.ts — VisorCiudad2d5

**features/simulador/demo/** (4 archivos)
- caso-demostracion.ts — CASO_DEMOSTRACION
- guion-demostracion.ts — GUION_DEMOSTRACION
- guion-paciente-hospital-demo.ts — GUION_PACIENTE_HOSPITAL_DEMO
- guiones-edificios-demo.ts — GUION_HOSPITAL_DEMO, GUION_POLICIA_DEMO, GUION_FISCALIA_DEMO, GUIONES_POR_EDIFICIO

**features/simulador/exploracion/** (6 archivos, 2 specs)
- confirmacion-entrada.ts — ConfirmacionEntrada
- exploracion.store.ts — ExploracionStore
- mapa-demo.ts — MAPA_DEMOSTRACION
- mapa-interactivo.ts — MapaInteractivo
- mapa.models.ts — EspacioDemostrativo, ConfiguracionMapa, FaseExploracion, ContextoExterior, EventoEspacioVisual (+2)
- recorrido-mapa.ts — RecorridoMapa

**features/simulador/investigacion/** (3 archivos, 2 specs)
- investigacion.models.ts — ContextoInvestigacion, OrigenPista, PistaInvestigacion, NotaInvestigacion, EstadoLibreta (+1)
- libreta-panel.ts — LibretaPanel
- libreta.store.ts — LibretaStore

**features/simulador/models/** (3 archivos)
- contenido-intento.models.ts — ContenidoIntentoM5, CasoContenidoM5, EscenarioContenidoM5, PreguntaContenidoM5, OpcionContenidoM5
- participacion.models.ts — EstadoIntentoM5, RespuestaGuardadaM5, IntentoM5
- simulador.models.ts — OpcionVista, PreguntaVista, TipoElementoEscena, ElementoEscena, EscenarioVista (+3)

**features/simulador/mundo-tecnico/** (15 archivos, 7 specs)
- adaptador-interior.ts — contextoInteriorTecnico
- adaptador-mundo-simulador.ts — EstadoAdaptadorMundo, AdaptadorMundoSimulador
- adaptador-visual.ts — precargarPaqueteVisual, InstanciaVisual, paqueteCargado
- contrato-visual.ts — OrientacionVisual, CapaVisual, AnimacionVisual, RecursoVisual, PaqueteVisual (+1)
- estado-exploracion.ts — MotivoSuspension, EstadoExploracion
- movimiento-tecnico.ts — avanzarPorCaminos
- mundo-tecnico.fixture.ts — MUNDO_PRUEBA
- mundo-tecnico.models.ts — Punto, Rectangulo, Nodo, Camino, EdificioTecnico (+4)
- navegacion-tecnica.ts — intersectaObstaculo, validarMundo, rutaEntre, nodoCercano, rutaAPunto (+1)
- paquete-visual.ts — PAQUETE_VISUAL_V1
- personaje-tecnico.ts — PersonajeTecnico
- phaser-mundo.ts — ControlMundo, iniciarMundoPhaser
- proyeccion-tecnica.ts — ProyeccionSuelo, PROYECCION_PROPUESTA, PROYECCION_ACTUAL, aPantalla, aMundo (+3)
- puerto-mundo.ts — FabricaMundo, PAQUETE_VISUAL, FABRICA_MUNDO
- volumen-calibracion.ts — dibujarHospitalCalibrado

**features/simulador/narrativa/** (3 archivos, 2 specs)
- adaptador-guion-m3.ts — GuionM3, IntervencionAdaptada, adaptarIntervencionesM3
- motor-narrativo.ts — MotorNarrativo
- narrativa.models.ts — Expresion, PersonajeNarrativo, CondicionNarrativa, ConsecuenciaNarrativa, DialogoNarrativo (+5)

**features/simulador/pages/** (3 archivos, 5 specs)
- simulador-integrado-page.ts — ContextoNarrativoAcademico, FaseExperiencia, SimuladorIntegradoPage
- simulador-page.ts — ContextoNarrativoAcademico, SimuladorPage
- simulador-temporal.ts — SimuladorTemporal

**features/simulador/services/** (9 archivos, 8 specs)
- adaptador-pistas-narrativas.ts — DefinicionPistaNarrativa, PISTAS_DEMOSTRATIVAS_CATALOGO, AdaptadorPistasNarrativas
- coordinador-narrativo-interiores.ts — ErrorIncompatibilidadSnapshot, SnapshotNarrativoEdificio, CoordinadorNarrativoInteriores
- enlace-narrativo.ts — VinculoDecisionAcademica, EnlaceNarrativo
- leer-contenido-intento.ts — leerContenidoIntento
- participacion-http.gateway.ts — FalloParticipacionError, ParticipacionHttpGateway, provideParticipacionHttp
- participacion.coordinador.ts — SeleccionAcademica, EstadoSincronizacion, ParticipacionCoordinador
- participacion.gateway.ts — OperacionParticipacion, ContratoPendienteError, ParticipacionGateway, ParticipacionPendienteGateway
- puerto-transicion-fase.ts — FaseAcademicaOficial, SolicitudTransicionFase, ResultadoTransicionFase, ConsultaEstadoFase, PuertoTransicionFase (+2)
- simulador.store.ts — SimuladorStore

**features/simulador/testing/** (1 archivos)
- contenido-intento.fixture.ts — ID_INTENTO_CONTENIDO, contenidoPrueba

**features/simulador/unreal/** (8 archivos, 4 specs)
- configuracion-unreal.ts — SesionVisualUnreal, SESION_VISUAL_LOCAL, resolverSesionVisual, SESION_VISUAL_UNREAL, validarSesionVisual
- correspondencia-mundo.ts — CORRESPONDENCIA_MUNDO_UNREAL, PLAZA_UNREAL, edificioPorZonaUnreal, zonaUnrealPorNodo
- hospital-narrativo-unreal.ts — HospitalNarrativoUnreal
- hospital-unreal.ts — VistaHospital, ProgresoInteriorUnreal, HospitalUnreal
- interiores-narrativos-unreal.ts — NpcInteriorUnreal, HOSPITAL_UNREAL, NPCS_HOSPITAL_UNREAL, INTERIORES_NARRATIVOS_UNREAL, InteriorNarrativoUnreal
- reproductor-unreal.ts — ReproductorUnreal, FabricaReproductorUnreal, FABRICA_REPRODUCTOR_UNREAL, crearReproductorUnreal
- simulador-unreal-page.ts — SimuladorUnrealPage
- transporte-pixel-streaming.ts — CanalPixelStreaming, TransportePixelStreaming

**features/simulador/unreal/protocolo/** (3 archivos)
- cargar-esquemas-browser.ts — CARGAR_ESQUEMAS_UNREAL
- validador-esquema.ts — Esquema, ErrorEsquema, PALABRAS_SOPORTADAS, verificarSubconjunto, validar
- validador-mensaje.ts — VERSION_PROTOCOLO, TAMANO_MAXIMO_BYTES, Origen, EntradaCatalogo, Catalogo (+7)

**features/simulador/unreal/puente/** (3 archivos, 1 specs)
- puente-unreal.ts — ErrorOrden, OpcionesAdaptador, PuenteUnreal
- registro.ts — EntradaRegistro, Registro
- transporte.ts — Transporte, OpcionesCanal, CanalMemoria, vaciarCola

**shared/ui/** (2 archivos)
- aviso.ts — TipoAviso, Aviso
- estado-carga.ts — EstadoCarga

