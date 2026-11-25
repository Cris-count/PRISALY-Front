# DC-SIM-GIT-SINCRONIZACION-10 — preparación controlada

Preparación: 22–23/11/2026. Ejecutor de comprobaciones locales: **Codex**, por autorización de esta orden. Repositorio: `Cris-count/PRISALY-Front`. Rama: `integration/simulador2-controlado-20261122`. SHA exacto: consultar `git rev-parse HEAD` en esta rama y la ficha de entrega de Codex; el documento no inserta su propio hash de commit.

**Push condicionado a la confirmación explícita de Nicolás sobre este alcance. No se abre PR ni se realiza merge.** La rama comparte un incremento comprobado de código; no declara terminado el Simulador 2.0.

## Comprobaciones ejecutadas

| Comprobación | Resultado real |
|---|---|
| Instalación exacta del lockfile mediante npm 11.17.0 | Correcta; package-lock.json conservado |
| npm run check:urls | Correcta, código 0 |
| TypeScript tsconfig.app.json, sin emisión | Correcta, código 0 |
| TypeScript tsconfig.spec.json, sin emisión | Correcta, código 0 |
| Angular completo / Chrome Headless | **681 pruebas aprobadas**, código 0 |
| npm run build de producción | Correcto, código 0, con avisos descritos debajo |

Entorno local: Node 24.22.1, npm 11.17.0 y Chrome Headless 157.0.0.0 en Windows. CI versiona Node 26.13.0; no se afirma ejecución de GitHub Actions. El primer arranque del runner dentro del sandbox terminó con un error nativo antes de ejecutar unitarias. La ejecución válida posterior, fuera de ese aislamiento, es la de 681 pruebas; no se oculta ni se contabiliza el primer intento como aprobado. Los logs completos permanecen locales y no forman parte del commit.

Avisos de build: presupuesto de estilo de simulador-integrado-page.css (4,07 kB frente a aviso de 4 kB) y dependencias CommonJS de Phaser/Epic (`sdp`, `ws`). No se cambiaron presupuestos ni se silenciaron avisos para aprobar el build. La instalación también reportó dependencias obsoletas y scripts pendientes según la política local de npm; no se cambiaron esas políticas.

## Archivos incluidos

Todos los siguientes archivos son del incremento Angular del simulador:

```text
src/app/features/simulador/unreal/configuracion-unreal.ts
src/app/features/simulador/unreal/configuracion-unreal.spec.ts
src/app/features/simulador/unreal/interiores-narrativos-unreal.ts
src/app/features/simulador/unreal/hospital-unreal.ts
src/app/features/simulador/unreal/hospital-unreal.spec.ts
src/app/features/simulador/unreal/hospital-narrativo-unreal.ts
src/app/features/simulador/unreal/simulador-unreal-page.ts
src/app/features/simulador/unreal/simulador-unreal-page.spec.ts
src/app/features/simulador/unreal/transporte-pixel-streaming.ts
src/app/features/simulador/unreal/transporte-pixel-streaming.spec.ts
src/app/features/simulador/unreal/puente/puente-unreal.ts
src/app/features/simulador/unreal/puente/puente-unreal.spec.ts
src/environments/environment.ts
src/environments/environment.development.ts
src/environments/environment.qa.ts
src/environments/sesion-visual-unreal-local.ts
docs/simulador-2/README.md
docs/simulador-2/CONTRATO-VISUAL-NARRATIVO.md
docs/simulador-2/DC-SIM-F4-01-ALINEACION-BE-FE-RESULTADO.md
docs/simulador-2/DC-SIM-F4-02-MATRIZ-CONTRATOS-ACADEMICOS.md
docs/simulador-2/DC-SIM-GIT-SINCRONIZACION-10-RESULTADO.md
```

La configuración paralela y sus entornos están identificados como tales: se conservó el comportamiento de desarrollo y se centralizaron constantes. Nicolás debe confirmar que compartirlos no incorpora trabajo incompleto de otras sesiones.

Limitación de esa configuración: los identificadores demostrativos de conexión pueden aparecer en el bundle productivo, con la activación deshabilitada. No son contraseñas/tokens. La separación por sustitución de archivos de desarrollo, propuesta en la conciliación F4-10, continúa pendiente de decisión; no se implementa ni se autoriza un despliegue productivo desde este incremento.

## Exclusiones y dependencias pendientes

- Backend y todos sus cambios locales; no se publican migraciones, contratos nuevos ni configuraciones de producción Backend.
- Unreal principal, MUNDO-24 y PS2-LAB-03, infraestructura Epic y señalización: no se copian a este repositorio.
- Archivos Unreal, assets binarios, paquetes ZIP, Binaries, Intermediate, Saved, cachés, dependencias npm, dist, logs y respaldos locales.
- Cambios administrativos/docentes, componentes internos o recursos de otros integrantes: no se añaden al diff del incremento.
- No se modifican los esquemas v1. Los ya versionados sirven de referencia, sin duplicarlos.

No se necesitan Git LFS ni empaquetado Unreal para estos 21 archivos de texto. La estrategia de versionado de recursos grandes se decidirá en su repositorio correspondiente.

Las pruebas Angular comprueban lógica y contratos con transporte simulado; no validan el video, acceso físico a NPC, perspectiva, oclusiones, rendimiento Unreal ni E2E académico. INC-05 sigue abierto. La libreta es memoria demostrativa de la página. M5/DD-02 y los endpoints condicionados mantienen sus límites. La selección de la instancia MUNDO-24 y la confirmación conjunta de recursos de Cristian siguen pendientes.

Mariana puede revisar componentes/contrato visual; Ingrid, la matriz académica con fuentes Backend fijadas por SHA. Las instrucciones reproducibles y de obtención están en el [README](README.md); solo serán utilizables desde origin después de la confirmación y push.
