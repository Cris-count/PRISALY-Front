# PRISALY — Frontend

Angular 22.2.3. La rama consolidada implementa la presentación del simulador y SIM-01: narrativa, preguntas de ejemplo, progreso, temporizador informativo, confirmación y cierre de demostración. No registra intentos ni calcula notas.

## Instalar y comprobar

Node probado: 26.13.0; npm declarado: 11.17.0. Instalar desde el lockfile, sin actualizar dependencias:

```sh
npm exec --yes --package=npm@11.17.0 -- npm ci --no-audit --no-fund
npm run check:urls
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

El runner configurado es **Karma/Jasmine**, con Chrome Headless. Si Chrome no se encuentra automáticamente, definir CHROME_BIN con la ruta de su ejecutable. No hay una suite e2e configurada; las pruebas de componentes y RouterTestingHarness no sustituyen un recorrido contra Backend real.

El build de producción se guarda en `dist/PRISALY-Front`. `npm start` abre el servidor de desarrollo; navegar a `/simulador`. La raíz y las rutas desconocidas redirigen al inicio del simulador. La demostración es pública y no atribuye identidad estudiantil.

## Integración y límites

La URL base reside en `src/environments/`. Los servicios deben construir rutas con API_CONFIG; la validación impide rutas absolutas, navegación por segmentos punto y repetición de la base. Ver [configuración de API](docs/configuracion-api.md).

ParticipacionGateway sigue con un proveedor que rechaza operaciones pendientes; no se simuló un Backend. El Backend consolidado ya registra GET de intento y PUT de respuesta protegidos, pero eso no completa el acceso estudiantil, contenido del caso, listado de sesiones elegibles ni los POST de inicio/finalización. No se conecta SIM-01 a un flujo parcial ni se usan credenciales de personal como identidad de estudiante.

No hay login, guards de recursos privados, gestión de casos/sesiones ni vistas de resultados implementados en este Frontend. Sus contratos/políticas deben conciliarse antes de presentarlos como disponibles. El acceso se autoriza en Backend; un guard visual no lo sustituye.

## Verificación continua

`.github/workflows/frontend-ci.yml` reproduce instalación, análisis TypeScript, validación de URL, pruebas Chrome Headless y build de producción para PR hacia develop. No despliega la aplicación ni usa secretos. No se publicó ni ejecutó remotamente durante el cierre local.

[SIM-01 y separación académica](docs/sim-01-narrativa.md) · [Informe nocturno](docs/CIERRE-NOCTURNO-FRONTEND-20261108.md)
