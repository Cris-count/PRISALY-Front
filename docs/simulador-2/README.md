# Simulador 2.0 — incremento compartible

Rama de integración: `integration/simulador2-controlado-20261122`. Base Frontend: `0b341c029407ca871183e6346bc6e730e9778f34`. Referencia de contratos Backend: `773818caf62758d66019a71dac6508d13148abad`.

Este incremento comparte componentes Angular, adaptadores y contratos para continuar la integración. La publicación de código no acepta el recorrido Unreal ni la integración académica. No activa DD-02, M5, migraciones o servicios institucionales. La confirmación de Nicolás es obligatoria antes del push; no se autoriza PR ni merge a develop.

## Qué pueden consultar

- **Mariana:** [contrato visual/narrativo](CONTRATO-VISUAL-NARRATIVO.md), el visor y coordinador en [unreal](../../src/app/features/simulador/unreal), la configuración de asignación y el adaptador oficial Epic. La inyección existente de servicios narrativos y libreta se conserva.
- **Ingrid:** [matriz académica](DC-SIM-F4-02-MATRIZ-CONTRATOS-ACADEMICOS.md), con las 13 capacidades, endpoints, DTO, autorización, persistencia, RF/CU y referencias de código fijadas por SHA. Los servicios HTTP ya existentes se reutilizan; esta rama no añade operaciones académicas.
- **Cristian:** identidades y responsabilidades del [contrato visual](CONTRATO-VISUAL-NARRATIVO.md). No se modifican sus componentes, guiones, recursos o PlantillasEspacio. La confirmación conjunta de recursos sigue pendiente; no se atribuye una aprobación artística a las pruebas Angular.

## Obtener y verificar

Después de que Nicolás confirme y se realice el push:

```powershell
git fetch origin
git switch --track origin/integration/simulador2-controlado-20261122
```

Usar un checkout limpio o aislado; conservar cualquier trabajo propio antes de cambiar de rama. No es necesario fusionar con develop para consultar este avance.

La CI versionada usa Node `26.13.0` y npm `11.17.0`. La verificación local de esta entrega usó Node `24.22.1`, npm `11.17.0` y Chrome Headless `157.0.0.0`, con el mismo lockfile. No se presenta como ejecución de GitHub Actions.

Desde la raíz del repositorio, con Node y Chrome disponibles:

```powershell
npm exec --yes --package=npm@11.17.0 -- npm ci --no-audit --no-fund
npm run check:urls
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

El build produce `dist/PRISALY-Front`, que no se versiona. Las unitarias usan canales simulados para el transporte Unreal; no necesitan servidor Unreal, Backend ni cuentas reales. No aprobar scripts adicionales ni modificar políticas del equipo por inferencia de estos comandos: comunicar cualquier dependencia que el entorno rechace.

## Abrir el visor local, por separado de las pruebas

```powershell
npm start -- --host 127.0.0.1 --port 4213
```

Abrir `/simulador-unreal`. Esto inicia únicamente Angular. La conexión al mundo se solicita con el botón del visor; requiere señalización e instancia Unreal compatibles, que no se distribuyen ni arrancan desde esta rama.

La referencia local conservada usa player `ws://127.0.0.1:8898/`, streamer `PRISALY-LAB-03`, sesión visual `ses-lab-ps2-0001` y Origin exacto `http://127.0.0.1:4213`. Producción y QA mantienen la asignación local deshabilitada. Los valores viven en [sesion-visual-unreal-local.ts](../../src/environments/sesion-visual-unreal-local.ts), sin contraseñas ni tokens.

Los identificadores locales pueden permanecer como texto en el bundle de producción aunque la bandera sea falsa. Son valores demostrativos, no credenciales; separar ese archivo mediante una sustitución de build sigue pendiente de decisión. Esta rama no se entrega como despliegue productivo.

**Seleccionar la copia Unreal correcta:** la ciudad e interiores nuevos están en MUNDO-24; el lanzador del laboratorio PS2-LAB-03 abre otra copia. El proyecto principal tampoco recibe automáticamente estos cambios. `-PrisalyModoDiseno` permite revisar el mundo local, pero no abre la sesión integrada Angular. Esta rama no resuelve esa selección mediante copias o cambios de Unreal.

## Funcionalidades y límites

| Estado | Alcance |
|---|---|
| Implementado y comprobado por unitarias | Correspondencias de los tres edificios y cuatro NPC; activación tras entrada confirmada; narrativa/decisiones existentes; libreta, pistas y notas; seguimiento por NPC; aislamiento de contexto; recuperación visual; protección de ACK; serialización única |
| Demostrativo | Guiones y entrevista provisional del paciente; progreso/pistas/notas en memoria de la página; asignación de desarrollo al laboratorio |
| Pendiente de recorrido real | Entradas/NPC/cámara/animaciones visibles y recuperación con MUNDO-24 en el navegador; confirmación artística y recursos de Cristian |
| Bloqueado o condicionado | DD-02 y publicación académica; fases/narrativa candidatas y sus esquemas; consulta REST estudiantil de calificaciones; aceptación Fase 4 |
| Incidencia abierta | INC-05 del paciente en PS2-LAB-03. Las unitarias Angular no la cierran |

La libreta pierde su contenido al abandonar/recargar la página o cambiar de contexto. Abrirla inhibe la entrada del visor; una ruta automática nativa ya emitida puede continuar. Reconectar recupera el último acceso/zona exterior confirmados, no una posición interior exacta. La espera de recuperación cubre el segundo de supresión de hechos que implementa el MUNDO-24 actual.

Ver [alineación](DC-SIM-F4-01-ALINEACION-BE-FE-RESULTADO.md) y [resultado de comprobaciones y alcance](DC-SIM-GIT-SINCRONIZACION-10-RESULTADO.md).
