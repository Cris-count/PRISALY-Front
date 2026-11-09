# Cierre nocturno — Frontend PRISALY

Fecha de trabajo: 8 de noviembre de 2026, America/Bogota. Ejecutor de los cambios de esta sesión: Codex. No se atribuyen a Ingrid ni a otro integrante.

## Identificación y respaldo

Repositorio: copia local de trabajo de PRISALY-Front (ruta personal omitida).
Rama inicial/final: trabajo/consolidacion-sim01-20261108.
SHA inicial/final: 8b940a52fa70dd67e35d249873c0019ae9209385. Sin commits nuevos; los cambios y el informe quedan locales y no están representados por ese SHA. La autorización permite commits, pero no son necesarios para entregar este candidato revisable. Sin push, PR, merge, reescritura ni cambios sobre develop.

El árbol estaba limpio. Antes de editar se guardaron estado, SHA, diff e historia completa en ../EVIDENCIAS-NOCTURNO-20261108/PRISALY-Front-*. No se sobrescribió trabajo de otros integrantes. La historia SIM-01 se conserva. Se verificó también el Backend como fuente de contratos; sus cambios M01/M03 se respaldaron por separado.

## Entorno e instalación

Node 26.13.0, npm declarado 11.17.0, Angular CLI/build 22.2.3 y TypeScript 6.0.2. Instalación ejecutada con:

```powershell
npm exec --yes --package=npm@11.17.0 -- npm ci --no-audit --no-fund
```

451 paquetes instalados desde package-lock.json. package.json y package-lock.json permanecen sin cambios. No se actualizaron versiones ni se ejecutó npm audit fix. npm notificó paquetes de instalación no aprobados; no se concedieron aprobaciones adicionales de scripts porque build/pruebas funcionaron con las dependencias opcionales instaladas. Los avisos de dependencias obsoletas no se confundieron con fallos de instalación. npm audit --json terminó con 0 vulnerabilidades reportadas (no constituye una auditoría exhaustiva de seguridad).

## Línea base y defectos corregidos

Línea base: build producción aprobado; 84 pruebas Karma/Jasmine/Chrome Headless aprobadas; check:urls aprobado. No existían errores de compilación que corregir.

### FN-01 — Consulta pendiente, salida de carga y respuestas tardías

SimuladorStore conservaba la suscripción al volver al inicio, entrar a demostración o destruir la vista. Un Subject de prueba podía entregar un resultado/fallo tardío y cambiar la nueva pantalla a error; al destruir la vista seguía observado. La pantalla de carga no ofrecía salida.

Reproducción previa al cambio: 3 regresiones fallidas y 21 pruebas existentes aprobadas en la selección de store (frontend-cancelacion-antes.log).

Corrección: cancelar la suscripción al reiniciar/destruir; cancelar cualquier consulta anterior antes de iniciar otra; limpiar reintentable al iniciar la consulta. La carga ofrece Volver al inicio. No se inicia ni finaliza un intento al cancelar o reintentar. Se conservan el temporizador informativo y la separación narrativa/académica.

Pruebas: tres regresiones de store y una de página que pulsa los botones reales, abandona la carga y comprueba que un error tardío no altera el inicio. Suite tras este bloque: 88/88 aprobadas.

RF/CU relacionados: presentación de RF-10/RF-11 y SIM-01; contexto de CU-14/CU-15 histórico. No acredita persistencia ni acceso estudiantil productivo.

### FN-02 — Constructor de URL permite salir de la base o duplicarla

construirUrlApi aceptaba ../health, navegación intermedia, navegación codificada, separadores de Windows y la base api/api?pagina=1 sin recurso posterior. El navegador/servidor podía normalizar una ruta fuera de /api, contrariando el contrato local del constructor. No se encontró un flujo productivo que estuviera usando esas rutas; es un defecto de la infraestructura preparada, no evidencia de una filtración en producción.

Reproducción previa al cambio: 6 regresiones fallidas y 9 casos aprobados (frontend-url-rutas-antes.log).

Corrección: validar el camino decodificado, rechazar segmentos punto, separadores ambiguos/control y codificación inválida; comprobar repetición exacta o por prefijo de la base incluso con query. Se conservan las consultas relativas válidas y no se interpretan los valores de query como caminos. Siete pruebas añadidas (seis negativas y una compatibilidad). Suite tras este bloque: 95/95 aprobadas.

RF/CU relacionados: infraestructura transversal de integración y RF-02; no implementa autenticación ni modifica un contrato Backend.

### Navegación y CI

Tres pruebas RouterTestingHarness verifican raíz, enlace directo y ruta desconocida: llegan al inicio público, sin identidad ni operaciones M5. No se añadió un guard a la demostración pública. No existen rutas privadas implementadas a las que se pueda atribuir protección Frontend; su ausencia se registra explícitamente.

No había workflow Frontend. Se añadió frontend-ci.yml para PR hacia develop, con Ubuntu, Node probado 26.13.0, npm declarado, instalación de lockfile, check:urls, typecheck app/spec, Chrome Headless, build producción y artefacto. No despliega ni configura secretos; permisos contents:read. YAML y etapas comprobados localmente con SnakeYAML y ValidarFrontendCi.java. No se lanzó Actions remotamente porque no hubo publicación.

README corregido: el proyecto usa Karma/Jasmine, no Vitest; no existe una suite e2e configurada. docs/configuracion-api.md ahora distingue GET/PUT M5 existentes de los POST y del flujo estudiantil completo pendientes.

RF/CU: soporte transversal de calidad; no cambia reglas académicas.

## Resultado final real

- 98/98 pruebas Angular aprobadas: 84 iniciales +14 nuevas. 0 fallos finales. Incluyen narrativa SIM-01, aislamiento de preguntas, confirmación, progreso, temporizador, errores, rutas y regresiones descritas.
- Build producción aprobado. Tamaño inicial 246.48 kB, transferencia estimada 69.40 kB; chunk simulador 37.41 kB. Sin errores ni superación de presupuestos.
- TypeScript noEmit de aplicación y pruebas: código 0.
- check:urls: aprobado.
- Auditoría npm: 0 vulnerabilidades reportadas.
- Validación estructural YAML/etapas CI: aprobada. No se ejecutó actionlint ni un run remoto.
- git diff --check: aprobado.

Comandos finales:

```powershell
$env:CHROME_BIN='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm run check:urls
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json
npm audit --json
```

Evidencias: ../EVIDENCIAS-NOCTURNO-20261108/frontend-*.log, frontend-versiones.json, frontend-audit.json y frontend-artefactos-sha256.json. Build entregable: ../EVIDENCIAS-NOCTURNO-20261108/frontend-produccion.zip. La comprobación de componentes/rutas con dobles no equivale a e2e contra datos reales; no se simularon endpoints.

## Archivos modificados por esta sesión

- src/app/core/config/api.config.ts y api.config.spec.ts
- src/app/features/simulador/services/simulador.store.ts y simulador.store.spec.ts
- src/app/features/simulador/pages/simulador-page.html y simulador-page.spec.ts
- src/app/app.routes.spec.ts (nuevo)
- .github/workflows/frontend-ci.yml (nuevo)
- README.md
- docs/configuracion-api.md
- docs/CIERRE-NOCTURNO-FRONTEND-20261108.md (este informe)

El diff y los archivos nuevos se guardan aparte en la carpeta de evidencias. No cambian dependencias, BD-005.2 ni contratos.

## Funcionalidad pendiente y decisión de integración

| Prioridad inspeccionada | Estado real |
| --- | --- |
| Dependencias/build/pruebas | Completados con versiones del lockfile. |
| Autenticación y guards | No hay login, sesión de personal ni rutas privadas Frontend implementadas. La demostración es pública. No se inventó identidad estudiantil, guard permisivo ni almacenamiento de credenciales. |
| SIM-01 | Demostración narrativa operativa y probada; no registra intentos ni califica. |
| Participación real M5 | GET de intento y PUT CAS registrados en Backend, pero acceso estudiantil productivo deshabilitado. POST inicio/finalización no registrados. No se conecta un flujo parcial como si fuera completo. |
| Casos M3 | Backend tiene creación protegida; lectura depende de política vacía; modificación/publicación y ETag requieren contratos/ratificación. No hay interfaces de gestión Frontend. |
| Sesiones/convocatorias M4 | Backend tiene operaciones docentes protegidas; falta flujo de personal Frontend. Retiro sigue sin contrato suficiente. |
| Historial/resultados/retroalimentación | Lecturas internas Backend no equivalen a endpoints estudiantiles/docentes de resultado completos. Sin pantallas Frontend ni fórmula M6 implementada. |
| Cargas/errores/validaciones | Dos defectos reproducidos y corregidos; 14 pruebas nuevas; control de URL y cancelación verificados. |

No se encontró OpenAPI operativo completo en los repositorios autorizados. Se inspeccionaron controladores, contratos e informes V27, sin inventar rutas faltantes. Para desarrollar el recorrido estudiantil real se necesita la ratificación/habilitación correspondiente de DD-02, D07, elegibilidad/tiempo, contenido M3 y publicación de resultados. La autorización nocturna no sustituye esas decisiones. Para ampliar el recorrido docente hace falta conciliar un contrato Frontend operativo de autenticación/gestión y sus capacidades habilitadas; la ausencia de pantallas no se presenta como funcionalidad entregada.

Puede integrarse tras revisión: correcciones FN-01/FN-02, sus pruebas, rutas de presentación verificadas, CI y documentación. Puede revisarse/desplegarse como demostración el build generado, si se decide hacerlo por separado. No debe integrarse como simulador académico productivo, login terminado, gestión de casos/sesiones ni sistema de resultados completo. No se publicará desde esta sesión.
