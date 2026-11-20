# Alineación del simulador con develop — 16/11/2026

Base integrada: `2ce06e07c75d36b092f93dd03363bb3f1b7842d9` en `feature/simulador-integracion-nicolas`. La rama contiene los siete commits recibidos de develop. Esta intervención conserva todos los cambios locales anteriores; no crea commits ni publica cambios.

## Alcance comprobado

Se revisaron las rutas públicas, configuración de aplicación y entornos, acceso QA M1, página técnica del simulador, página integrada local, visor Phaser, adaptador del mundo y libreta. Se mantuvieron los cambios de presentación, autenticación y dashboard recibidos de develop sin modificar sus componentes internos.

Las rutas permanecen como estaban al comenzar la alineación:

- `/login` y `/dashboard`: presentación y navegación recibidas de develop.
- `/simulador`: calibración técnica con libreta demostrativa y pausa del mundo.
- `/simulador-integrado`: integración local de exploración y flujo demostrativo. No se convirtió en la ruta oficial de participación estudiantil ni se la habilitó por inferencia de roles.

## Problemas encontrados y correcciones

1. **Nombre del hospital desalineado en una prueba.** La suite inicial ejecutó 448 pruebas: 447 aprobadas y una fallida por esperar “Hospital General” donde el mundo configurado declara “Hospital”. La prueba ahora consulta el nombre del edificio configurado y simula su llegada antes de entrar.
2. **Entrada sin validar llegada.** El adaptador integrado admitía abrir cualquier edificio con un controlador conectado. Ahora exige mundo listo, entrada actual coincidente y posición dentro de una unidad del nodo lógico. Se usa el edificio canónico del mundo, sin aceptar geometría o nombre alternativos enviados por el llamador.
3. **Pausas superpuestas.** El interior y la suspensión externa se combinan en el adaptador. La página integrada registra interior, libreta y confirmación como motivos independientes. Cerrar uno no libera los otros; salir repetidamente del interior es idempotente.
4. **Conexión tardía de Phaser.** Al conectar se aplica la suspensión vigente. Los eventos de un visor ya destruido se descartan; si la creación asíncrona termina después de salir, el controlador tardío se destruye sin reconectarlo.
5. **Notas de otra demostración.** Iniciar otra demostración, volver al inicio o cambiar las entradas de contexto de la página limpia la libreta demostrativa. No se guarda ni restaura información académica.
6. **Versión de Node falsificada por un helper local.** `scripts/ng-run.js` delega al CLI conservando la versión real de Node, sin sobrescribir `process.versions`. La comprobación del helper reporta Node 24.22.1 y Angular CLI 22.2.5.

No se cambiaron la cámara de 40°, rutas del mundo, huellas de colisión, recursos gráficos ni `PlantillasEspacio`. No se añadieron endpoints, permisos o credenciales.

## Compatibilidad con QA de develop

- Producción y desarrollo conservan `personalQaHabilitado: false`.
- QA mantiene la activación explícita de personal y su API configurada por develop.
- No se incorporó la sesión de personal como identidad académica estudiantil.
- Se amplió la prueba de rutas públicas para incluir `/simulador-integrado`, comprobando que abrirlo no consulta ni escribe participaciones.
- Las pruebas existentes de autenticación y dashboard permanecen en la suite completa.

La compilación QA demuestra compatibilidad de tipos, configuración y empaquetado; no demuestra autenticación HTTP real, autorización efectiva ni disponibilidad de Backend. No se ejecutaron llamadas a servicios reales para esta alineación.

## Verificación final

| Comprobación | Resultado |
|---|---|
| Suite completa Chrome Headless | **456 pruebas aprobadas**, salida 0 |
| Compilación producción | Correcta, salida 0 |
| Compilación QA | Correcta, salida 0; salida aislada `dist/alineacion-qa` |
| `git diff --check` | Sin errores; avisos de normalización LF/CRLF ya presentes |
| Helper `scripts/ng-run.js version` | Correcto; informa la versión real de Node |
| Cambios ajenos a la intervención | Comparación contra el respaldo previo al pull: solo variaron los nueve archivos enumerados abajo |

La suite conserva las 448 pruebas iniciales y añade ocho comprobaciones: ruta integrada pública, validación y normalización de entrada, pausas simultáneas, conexión tardía, cambio de demostración y ciclo de destrucción del visor. No se eliminaron pruebas para conseguir el resultado.

Producción conserva la advertencia conocida de Phaser/CommonJS. No se realizó una nueva inspección visual en navegador ni se generaron nuevas capturas durante esta intervención; las comprobaciones de UI, foco y ciclo de vida aquí referidas son automatizadas en Chrome Headless.

Comandos, desde `PRISALY-Front`:

```text
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --progress=false
node node_modules/@angular/cli/bin/ng.js build --progress=false
node node_modules/@angular/cli/bin/ng.js build --configuration qa --output-path dist/alineacion-qa --progress=false
node scripts/ng-run.js version
```

Logs en `Entregables/Simulador` del workspace:

- `alineacion-develop-tests-inicial.log`
- `alineacion-develop-tests.log`
- `alineacion-develop-build-produccion.log`
- `alineacion-develop-build-qa.log`

## Archivos de esta intervención

- `src/app/app.routes.spec.ts`
- `src/app/features/simulador/mundo-tecnico/adaptador-mundo-simulador.ts`
- `src/app/features/simulador/mundo-tecnico/adaptador-mundo-simulador.spec.ts`
- `src/app/features/simulador/pages/simulador-integrado-page.ts`
- `src/app/features/simulador/pages/simulador-integrado-page.html`
- `src/app/features/simulador/pages/simulador-integrado-page.spec.ts`
- `src/app/features/simulador/components/visor-ciudad-2d5.ts`
- `src/app/features/simulador/components/visor-ciudad-2d5.spec.ts`
- `scripts/ng-run.js`
- Este informe, nuevo.

Respaldo focalizado previo a las modificaciones: `Entregables/Simulador/respaldo-alineacion-develop-1794852700279`. Respaldo completo de los 57 cambios previos al pull: `Entregables/Simulador/respaldo-antes-pull-develop-1794852482147`.

El ZIP de coordinación VISUAL-23/25 sigue siendo un snapshot histórico inmutable de la entrega anterior. No se sobrescribió ni se atribuyó a su manifiesto el nuevo HEAD. La integración artística de Cristian, el interior real, la persistencia de la libreta y la autorización académica definitiva continúan pendientes de sus contratos y entregas correspondientes.
