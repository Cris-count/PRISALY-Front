# integracion/alineacion-final — Frontend

Manifiesto canónico: `Cris-count/PRISALY-Backen`, rama `integracion/alineacion-final`, archivo `ops/alineacion-final/PRISALY-INTEGRACION-MANIFEST.json`. Allí están el SHA de código del Backend, la configuración Docker/Flyway, los flags, las pruebas y el rollback. También están el script `ACTUALIZAR-PRISALY.ps1` y `HANDOFF-NICOLAS.md`.

SHA de código del Frontend validado: `66d9e7108d4a33950629dfff4f0dbe361496029e`. Esta rama solo añade este documento.

| Commit | Contenido |
|---|---|
| `bb2db40` | Base `trabajo/presentacion-20261127` (incluye `fbe6a02` y CB-05A) |
| `69e6a65`, `38a980d` | Reconexión acotada del visor Unreal (cherry-pick de `35c5694` y `837e687`, Nicolás, PR #35) |
| `fc4ca55` | Panel docente: casos propios con `GET /v1/casos` (capacidad `listadoCasos`, solo `dc106-qa`) |
| `66d9e71` | Resolución del cherry-pick en el spec del visor |

Perfil de compilación: `ng build --configuration dc106-qa`. Pruebas focalizadas: visor Unreal 119/119 y paneles académicos 18/18. El visor solo se ha probado con dobles del canal; no hay prueba real con el motor.
