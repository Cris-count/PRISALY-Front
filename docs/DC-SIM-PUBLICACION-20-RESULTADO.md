# DC-SIM-PUBLICACION-20 — Simulador02

20/11/2026 · Responsable: Nicolás · Preparación y comprobaciones Angular: Codex.

## Alcance e identificación

Publicación exclusiva del simulador dentro de PRISALY-Front. Rama nueva: `publication/simulador02-nicolas-20261120`.

Base remota consultada mediante fetch: `778dad776a47f95b56bb0c4aff515b37e8511c26` (develop).
Origen conservado: `cb6ecd8d56f729b65b1205d1c1cfcab0e815ee1e` (feature/simulador-integracion-nicolas).

Se seleccionó el delta identificado de los commits de Nicolás 0887074, e7add19 y cb6ecd8 sobre develop, sin incorporar su historial de merges. Los cambios de Mariana y Cristian que ya forman parte de develop se mantienen como base. No se cambian dashboards, administración, docencia, autenticación, entornos, workflows ni componentes internos de la biblioteca de Cristian. Los únicos archivos comunes modificados son las rutas, sus pruebas y las dependencias necesarias del simulador.

Los sprites V1 pequeños tienen procedencia de Cristian documentada en VISUAL-32: son copias de integración del simulador previamente recibidas, sin cambios en sus originales. La referencia artística incluida mide aproximadamente 403 kB; no se usa como fondo panorámico.

## Validación realizada para esta publicación

| Comprobación | Resultado real |
|---|---|
| Build de producción | Correcto, salida 0: node node_modules/@angular/cli/bin/ng.js build --configuration production --progress=false |
| Suite Angular completa | **531/531 aprobadas**, salida 0: node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --progress=false |
| Entorno | Node 24.22.1, Angular CLI/build 22.2.5, Angular core 22.2.3, TypeScript 6.0.3; Chrome Headless 157 |
| git diff --cached --check | Sin errores |
| Selección previa al informe | 116 archivos; ninguno mayor de 1 MB; sin coincidencias de los patrones revisados de claves privadas y tokens |
| Escenarios reales Unreal / Pixel Streaming / Hospital 3D | **No ejecutados. P1–P6 permanecen pendientes de Nicolás.** |

El primer intento de Karma compiló las pruebas, pero ChromeHeadless no pudo arrancar en el entorno restringido; terminó con salida 1 sin ejecutar la suite. Se conservó ese log. La ejecución autorizada con Chrome fuera de esa restricción terminó con 531 éxitos. No se utilizó el helper que altera la versión de Node.

Build conserva avisos conocidos: CSS del simulador integrado supera en 66 bytes el presupuesto de aviso de 4 kB, y Phaser/sdp/ws utilizan CommonJS. No hay errores de compilación. Estas pruebas Angular no acreditan la apertura real del Hospital mediante Pixel Streaming ni la recuperación de vídeo/controles.

Los logs originales de esta ejecución y el inventario JSON se conservan localmente en Entregables/Simulador2/DC-SIM-PUBLICACION-20-20261120, fuera del commit. No se publican registros locales.

## Archivos incluidos

Son los 116 archivos seleccionados a continuación más este informe (117 en total). La selección mantiene los archivos existentes de develop fuera de estas rutas.

- `docs/ALINEACION-DEVELOP-20261116.md`
- `docs/ALINEACION-PRISALY-SIMULADOR-2.0.md`
- `docs/ALINEACION-UNREAL-ESQUEMAS-SHA256.json`
- `docs/COORDINACION-INTERIORES-CRISTIAN-FASE9B.md`
- `docs/DC-SIM-F3-CODEX-28-RESULTADO.md`
- `docs/DC-SIM-F3-PACIENTE-GUIA-MANUAL-32.md`
- `docs/DC-SIM-F3-PACIENTE-PREPARACION-32.md`
- `docs/DC-SIM-NIC-I6-19-COMPATIBILIDAD.md`
- `docs/DC-SIM-NIC-VISUAL-32-RESULTADO.md`
- `docs/ENTREGA-SIMULADOR-20261116.md`
- `docs/PRISALY-ARQUITECTURA-MUNDO-25D-PROPUESTA.md`
- `docs/REVISION-INTEGRAL-SIMULADOR-20261116.md`
- `docs/SIM-FASE4C-INTEGRACION-VISUAL.md`
- `docs/SIM-FASE5-ESTADO-Y-VALIDACION.md`
- `docs/SIM-PROPUESTA-VISUAL-2D5-FASE4.md`
- `docs/SIM-QA-PREPARACION.md`
- `package-lock.json`
- `package.json`
- `public/images/prisaly-perspectiva-02-referencia.png`
- `public/images/simulador/arbol-v1.png`
- `public/images/simulador/explorador-v1.png`
- `public/images/simulador/hospital-exterior-v1.png`
- `public/simulador-unreal/protocolo/v1/catalogo.json`
- `public/simulador-unreal/protocolo/v1/sobre.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/avatar.irA.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/camara.enfocar.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/camara.liberar.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/edificio.entro.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/edificio.salio.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/estado.restaurar.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/fx.pistaObtenida.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/interactuable.activado.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/interactuable.disponible.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/interactuable.estado.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/interactuable.no_disponible.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/latido.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/mundo.bloquearExploracion.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/mundo.listo.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/npc.reproducirAnimacion.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/orden.ack.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/orden.error.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/puerta.abrir.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/sesion.iniciar.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/zona.entro.schema.json`
- `public/simulador-unreal/protocolo/v1/tipos/zona.salio.schema.json`
- `src/app/app.routes.spec.ts`
- `src/app/app.routes.ts`
- `src/app/features/simulador/components/visor-ciudad-2d5.spec.ts`
- `src/app/features/simulador/components/visor-ciudad-2d5.ts`
- `src/app/features/simulador/demo/guion-paciente-hospital-demo.ts`
- `src/app/features/simulador/demo/guiones-edificios-demo.ts`
- `src/app/features/simulador/exploracion/exploracion.store.spec.ts`
- `src/app/features/simulador/exploracion/mapa-demo.ts`
- `src/app/features/simulador/exploracion/mapa-interactivo.css`
- `src/app/features/simulador/exploracion/mapa-interactivo.ts`
- `src/app/features/simulador/exploracion/recorrido-mapa.spec.ts`
- `src/app/features/simulador/exploracion/recorrido-mapa.ts`
- `src/app/features/simulador/investigacion/investigacion.models.ts`
- `src/app/features/simulador/investigacion/libreta-panel.spec.ts`
- `src/app/features/simulador/investigacion/libreta-panel.ts`
- `src/app/features/simulador/investigacion/libreta.store.spec.ts`
- `src/app/features/simulador/investigacion/libreta.store.ts`
- `src/app/features/simulador/mundo-tecnico/adaptador-interior.ts`
- `src/app/features/simulador/mundo-tecnico/adaptador-mundo-simulador.spec.ts`
- `src/app/features/simulador/mundo-tecnico/adaptador-mundo-simulador.ts`
- `src/app/features/simulador/mundo-tecnico/adaptador-visual.ts`
- `src/app/features/simulador/mundo-tecnico/contrato-visual.spec.ts`
- `src/app/features/simulador/mundo-tecnico/contrato-visual.ts`
- `src/app/features/simulador/mundo-tecnico/estado-exploracion.spec.ts`
- `src/app/features/simulador/mundo-tecnico/estado-exploracion.ts`
- `src/app/features/simulador/mundo-tecnico/movimiento-tecnico.spec.ts`
- `src/app/features/simulador/mundo-tecnico/movimiento-tecnico.ts`
- `src/app/features/simulador/mundo-tecnico/mundo-tecnico.fixture.ts`
- `src/app/features/simulador/mundo-tecnico/mundo-tecnico.models.ts`
- `src/app/features/simulador/mundo-tecnico/navegacion-tecnica.spec.ts`
- `src/app/features/simulador/mundo-tecnico/navegacion-tecnica.ts`
- `src/app/features/simulador/mundo-tecnico/paquete-visual.ts`
- `src/app/features/simulador/mundo-tecnico/personaje-tecnico.ts`
- `src/app/features/simulador/mundo-tecnico/phaser-mundo.spec.ts`
- `src/app/features/simulador/mundo-tecnico/phaser-mundo.ts`
- `src/app/features/simulador/mundo-tecnico/proyeccion-tecnica.spec.ts`
- `src/app/features/simulador/mundo-tecnico/proyeccion-tecnica.ts`
- `src/app/features/simulador/mundo-tecnico/puerto-mundo.ts`
- `src/app/features/simulador/mundo-tecnico/volumen-calibracion.ts`
- `src/app/features/simulador/narrativa/adaptador-guion-m3.spec.ts`
- `src/app/features/simulador/narrativa/adaptador-guion-m3.ts`
- `src/app/features/simulador/narrativa/motor-narrativo.spec.ts`
- `src/app/features/simulador/narrativa/motor-narrativo.ts`
- `src/app/features/simulador/pages/simulador-integrado-page.css`
- `src/app/features/simulador/pages/simulador-integrado-page.html`
- `src/app/features/simulador/pages/simulador-integrado-page.spec.ts`
- `src/app/features/simulador/pages/simulador-integrado-page.ts`
- `src/app/features/simulador/pages/simulador-temporal.spec.ts`
- `src/app/features/simulador/pages/simulador-temporal.ts`
- `src/app/features/simulador/services/adaptador-pistas-narrativas.spec.ts`
- `src/app/features/simulador/services/adaptador-pistas-narrativas.ts`
- `src/app/features/simulador/services/coordinador-narrativo-interiores.spec.ts`
- `src/app/features/simulador/services/coordinador-narrativo-interiores.ts`
- `src/app/features/simulador/services/puerto-transicion-fase.ts`
- `src/app/features/simulador/unreal/configuracion-unreal.ts`
- `src/app/features/simulador/unreal/correspondencia-mundo.ts`
- `src/app/features/simulador/unreal/hospital-narrativo-unreal.ts`
- `src/app/features/simulador/unreal/hospital-unreal.spec.ts`
- `src/app/features/simulador/unreal/hospital-unreal.ts`
- `src/app/features/simulador/unreal/protocolo/cargar-esquemas-browser.ts`
- `src/app/features/simulador/unreal/protocolo/validador-esquema.ts`
- `src/app/features/simulador/unreal/protocolo/validador-mensaje.ts`
- `src/app/features/simulador/unreal/puente/puente-unreal.spec.ts`
- `src/app/features/simulador/unreal/puente/puente-unreal.ts`
- `src/app/features/simulador/unreal/puente/registro.ts`
- `src/app/features/simulador/unreal/puente/transporte.ts`
- `src/app/features/simulador/unreal/reproductor-unreal.ts`
- `src/app/features/simulador/unreal/simulador-unreal-page.spec.ts`
- `src/app/features/simulador/unreal/simulador-unreal-page.ts`
- `src/app/features/simulador/unreal/transporte-pixel-streaming.spec.ts`
- `src/app/features/simulador/unreal/transporte-pixel-streaming.ts`

## Archivos excluidos y conservados

Estos archivos continúan íntegros en la rama original; no se trasladan a la publicación:

- `docs/captura-ciudad-referencia-escritorio.jpg`
- `public/images/simulador/hospital-provisional-v1.png`
- `scripts/f3-hospital-lab/README.md`
- `scripts/f3-hospital-lab/main.ts`
- `scripts/f3-hospital-lab/recorrer.mjs`
- `scripts/f3-hospital-lab/servidor.mjs`
- `scripts/f3-hospital-lab/tsconfig.json`
- `scripts/ng-run.js`
- `scripts/patch-node.cjs`
- `scripts/servidor-local.mjs`
- `src/app/features/simulador/mundo-tecnico/recursos-visuales.ts`

La captura de escritorio es evidencia local; el hospital provisional de 1,38 MB y su descriptor no tienen uso activo; los scripts excluidos corresponden a ejecución o pruebas locales y no son necesarios para compilar la aplicación.

PS2-LAB-03 permanece independiente: no se modifica, copia ni publica. Backend, Entregables, logs, binarios Unreal y dependencias node_modules también quedan fuera. No se activan M5, DD-02 ni servicios productivos.

## Conservación y publicación

El checkout inicial estaba limpio: los cambios anteriores ya estaban conservados en cb6ecd8. La rama original y su commit permanecen intactos, incluidos los archivos excluidos. La rama nueva se creó desde develop y contiene una selección de archivos, sin sobrescribir las ramas anteriores.

El commit de publicación se titula exactamente **Simulador02**. El PR se abre como **Draft** hacia develop. No se realiza merge ni force push. El PR anterior #13 se sustituye por el Draft de esta rama, conservando su historial.
