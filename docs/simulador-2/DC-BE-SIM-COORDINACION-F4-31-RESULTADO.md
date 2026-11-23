# DC-BE-SIM-COORDINACION-F4-31 — Conciliación del simulador con FE-57

Fecha: 23/11/2026. Implementación y comprobaciones: Codex para Nicolás. Repositorio: `Cris-count/PRISALY-Front`.

**Resultado: incremento reciente del simulador conciliado sobre FE-57, sin conflictos, con 683 pruebas Angular y build correctos. F4-03 no está implementada ni validada como recorrido académico.** La publicación y apertura del PR quedan pendientes de la confirmación de alcance que Nicolás debe proporcionar antes del push, según DC-SIM-GIT-SINCRONIZACION-10. No se realizó merge a develop.

## Referencias y respuesta a Ingrid

| Referencia | SHA / estado comprobado |
| --- | --- |
| `origin/develop` consultado en esta entrega | `32ba32ab0189344e71e380a7f7a59cedbb8e7705`, incluye FE-57 / PR #19 |
| Rama histórica `feature/simulador-integracion-nicolas` | `cb6ecd8d56f729b65b1205d1c1cfcab0e815ee1e`; cuatro commits exclusivos. No se fusiona ni se usa como origen de la nueva rama. |
| PR histórico #13 | Cerrado sin merge; su descripción lo declara sustituido por #14. |
| PR #14, `publication/simulador02-nicolas-20261120` | Fusionado históricamente; cabeza `a7264905e6ae1f0033d6f6d590d72b6b5d321546`. Se comprobó que ya es ancestro de develop. No se vuelve a aplicar. |
| Incremento reciente conservado | `integration/simulador2-controlado-20261122`, HEAD `5e20687a21bb7f7384daf3f3bc1d5bb712e026c6`; local, sin PR encontrado para esta rama. |
| Commits recientes de origen | `c0e7b3933e48ddcca9a6016f55159534d3fa56ba` y `5e20687a21bb7f7384daf3f3bc1d5bb712e026c6` |
| Nueva rama | `codex/simulador-fe57-f4-31-20261123`, creada directamente desde `32ba32a` en el worktree actual |
| Traslado selectivo | `fedae4a` y `563e2baea8addadf0445680ffcf40ec23a74ac6b`; aplicados sin conflictos. La documentación de esta entrega añade un commit posterior. |
| Referencia documental Backend | `773818caf62758d66019a71dac6508d13148abad`; no se consulta ni modifica Backend en esta conciliación. |

Worktree actual: `C:\Users\NICOLAS\.codex\worktrees\fase4-frontend-20261122\PRISALY-Front`.

Para obtener el SHA final, ejecutar `git rev-parse codex/simulador-fe57-f4-31-20261123`; se comunica también en la ficha de entrega. El documento no intenta insertar el hash del commit que lo contiene.

La matriz F4-02 existente identifica F4-03 como **condicionada y sin implementación nueva**. No hay un SHA publicado de una implementación F4-03 que pueda presentarse como terminada. Las pruebas de esta entrega validan el incremento Angular y su compatibilidad con FE-57, no el acceso académico, sesiones estudiantiles ni intentos reales.

## Conciliación y conservación

Se compararon los archivos del incremento reciente con los cambios incorporados por FE-57 desde `0b341c0`. FE-57 cambia el mensaje de `M4-OPERACION-NO-PERMITIDA`, añade dos pruebas y sus documentos. No existe solapamiento de archivos con los 16 archivos fuente/configuración del simulador trasladados.

Se reutilizó el worktree limpio existente. La rama anterior se conserva en `5e20687`. Se creó una rama nueva con prefijo `codex/` desde el develop remoto comprobado y se trasladaron exclusivamente los dos commits recientes mediante cherry-pick. No se reconstruyó el simulador ni se incorporó la comparación histórica de 127/81 archivos.

La comprobación del diff contra `32ba32a` confirmó que permanecen idénticos:

- M1/autenticación, M3/M4/pantallas académicas y dashboard, incluidas las dos pruebas de FE-57 y su corrección M4.
- Rutas, guards, mapeo de permisos, interceptores y composición global de providers.
- Motor/guiones SIM-01, servicios académicos, contratos/modelos y exploración Phaser. La composición Angular de los interiores Unreal reutiliza estos servicios existentes.
- Catálogo y esquemas del protocolo v1, manifiestos npm, lockfile, Angular y CI.

Backend, Unreal principal, MUNDO-24 y PS2-LAB-03 no se modificaron. No se iniciaron servicios, no se crearon intentos reales y no se habilitaron DD-02, M5 ni M6. El provider académico por defecto sigue siendo `ParticipacionPendienteGateway`.

## Inventario incluido: 22 archivos

Los 16 archivos fuente/configuración coinciden con el incremento reciente ya preparado; esta conciliación no cambia su comportamiento adicionalmente:

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
```

Se incluyen seis documentos portables; README e informe F4-31 describen el estado actual, y los demás conservan sus antecedentes:

```text
docs/simulador-2/README.md
docs/simulador-2/CONTRATO-VISUAL-NARRATIVO.md
docs/simulador-2/DC-SIM-F4-01-ALINEACION-BE-FE-RESULTADO.md
docs/simulador-2/DC-SIM-F4-02-MATRIZ-CONTRATOS-ACADEMICOS.md
docs/simulador-2/DC-SIM-GIT-SINCRONIZACION-10-RESULTADO.md
docs/simulador-2/DC-BE-SIM-COORDINACION-F4-31-RESULTADO.md
```

Excluidos: cambios administrativos/docentes ajenos al incremento, otros repositorios/worktrees, archivos Unreal, binarios, recursos gráficos nuevos, secretos/credenciales, dependencias, dist, cachés, logs, respaldos y evidencias locales. La configuración visual local compartida está identificada explícitamente; no constituye una asignación académica o de producción. No se introducen permisos nuevos ni asociaciones entre pistas y respuestas académicas.

## Comprobaciones nuevas ejecutadas

| Comprobación | Resultado real |
| --- | --- |
| `npm run check:urls` | Correcto, exit 0 |
| `tsc --noEmit -p tsconfig.app.json` | Correcto, exit 0 |
| `tsc --noEmit -p tsconfig.spec.json` | Correcto, exit 0 |
| `npm test -- --watch=false --browsers=ChromeHeadless --progress=false` | **683/683 aprobadas**, exit 0; ejecutadas por Codex fuera del sandbox para permitir Chrome. Incluyen las dos pruebas M4 añadidas por FE-57. |
| `npm run build` | Producción correcta, exit 0 |
| `git diff --check` | Correcto |
| Diff de archivos protegidos contra develop | Vacío |

Entorno real: Windows, Node `24.22.1`, npm `11.19.1`, Chrome Headless `157.0.0.0`. Se reutilizó la instalación realizada con el lockfile exacto y npm `11.17.0` en Sincronización-10: manifiestos, lockfile y configuración Angular no cambian entre ambas bases. No se instalaron paquetes ni se modificó el lockfile en esta entrega. CI usa Node `26.13.0`/npm `11.17.0`; no se afirma haber ejecutado GitHub Actions.

Avisos existentes de build: CSS de `simulador-integrado-page.css`, 4,07 kB frente al aviso de 4 kB (66 bytes), y CommonJS Phaser/Epic (`sdp`, `ws`). No se modifican presupuestos ni dependencias para ocultarlos.

Evidencias locales, excluidas de Git:

`C:\Users\NICOLAS\.codex\visualizations\2026\11\16\01a1e261-f64e-7b03-b1d8-f03c22272379\coordinacion-f4-31-20261123\angular-completo.log`

`C:\Users\NICOLAS\.codex\visualizations\2026\11\16\01a1e261-f64e-7b03-b1d8-f03c22272379\coordinacion-f4-31-20261123\build-produccion.log`

Las unitarias emplean transporte/datos simulados. No se realizó E2E académico ni se arrancó el simulador Unreal. No acreditan video, controles, acceso físico al Hospital o reconexión en navegador. No se modifica la evidencia histórica de Nicolás, Claude o Mariana.

## Incompatibilidades y pendientes

- **Conflictos de código detectados: ninguno.** FE-57 se conserva íntegramente y sus nuevas pruebas pasan.
- F4-03 sigue pendiente de contratos/habilitación y de una autorización específica para el contexto académico; esta conciliación no lo sustituye.
- H-58-01 y la clasificación FE-58 siguen pendientes de ratificación/controles de Mariana. No se añaden guards durante esta conciliación ni se presenta el acceso público actual como corregido.
- Los identificadores visuales locales pueden permanecer en el bundle de producción, con activación deshabilitada. Son demostrativos, no credenciales. La separación de archivo por build y el despliegue productivo siguen pendientes de decisión.
- Continúan pendientes las pruebas funcionales Unreal en navegador y la aceptación conjunta del recurso visual. La libreta demostrativa permanece en memoria.

## PR preparado y obtención

Destino: `develop`. Origen: `codex/simulador-fe57-f4-31-20261123`. Modalidad: **Draft**, sin merge ni auto-merge.

Título propuesto: **Conciliar simulador con FE-57 — F4-31**.

Descripción preparada:

> Concilia el incremento reciente del simulador sobre develop 32ba32a (FE-57), conservando M1–M4, autenticación, rutas, SIM-01 y los contratos académicos existentes.
>
> Incluye la composición Angular de los tres interiores, seguimiento narrativo/libreta, recuperación visual y documentación. No incorpora la rama histórica cb6ecd8 ni los proyectos Unreal/laboratorio.
>
> Verificación local por Codex: 683/683 pruebas Angular, build de producción, TypeScript y URLs correctos. F4-03, DD-02, M5/M6 y la validación Unreal real permanecen pendientes; no se habilitan operaciones académicas.

Antes del push se mantiene la confirmación de alcance de Nicolás exigida en DC-SIM-GIT-SINCRONIZACION-10. **PR no abierto todavía; rama no publicada.** La orden F4-31 permite preparar el PR para revisión, sin fusionarlo.

Después de su publicación, desde un checkout limpio o aislado:

```powershell
git fetch origin
git switch --track origin/codex/simulador-fe57-f4-31-20261123
```

Usar las instrucciones de instalación/verificación del README. Consultar esta rama no requiere merge a develop ni habilitar Backend, Pixel Streaming o funciones académicas.
