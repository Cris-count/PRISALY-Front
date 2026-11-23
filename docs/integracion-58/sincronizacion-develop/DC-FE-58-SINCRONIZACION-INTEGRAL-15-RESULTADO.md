# DC-FE-58 · Sincronización integral con `develop` (orden 15): resultado

- **Fecha:** 2026-11-23.
- **Ejecutor:** Claude.
- **Responsable:** Mariana.
- **Auditor posterior:** Codex.

## Clasificación

**SINCRONIZADO Y LISTO PARA AUDITORÍA FINAL.**

1. Las referencias remotas de Frontend y Backend están actualizadas y verificadas.
2. Ni `develop` del Frontend ni el del Backend avanzaron respecto a la base de FE-58. Por eso no hay conflictos ni hace falta merge.
3. FE-58 se conserva íntegro, con un respaldo verificable.
4. Las pruebas y los builds pasan en los dos contextos:
   - A, `develop` limpio;
   - B, FE-58.
5. No hay defectos críticos.

Los contratos Backend nuevos solo existen como **PR en Draft**, con sus banderas desactivadas. Quedan documentados como candidatos y no se consumen. No hubo ninguna publicación.

## 1. Ubicación actual del proyecto

| Dato                           | Valor                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equipo                         | `Mariana`, Windows 11 Home Single Language (Git Bash MSYS2)                                                                                                                                  |
| Carpeta raíz                   | `C:\Users\57316\OneDrive\Escritorio\PRISALY`                                                                                                                                                 |
| Continuidad                    | Es el mismo equipo de FE-58: no hubo transferencia desde otro computador                                                                                                                     |
| Repositorio Frontend principal | `PRISALY-Front` (remoto `https://github.com/Cris-count/PRISALY-Front.git`), con sus worktrees asociados                                                                                      |
| Clones Backend                 | `PRISALY-Backen` (rama `backup/m3-antes-sync-20261105-1dfa986`, con archivos ajenos sin seguimiento; no se tocó), `PRISALY-Backen-INT` (worktree usado para consultar) y `PRISALY-Backen-QA` |

## 2. Worktrees

| Worktree                                                 | HEAD      | Rama                                   | Función                               |
| -------------------------------------------------------- | --------- | -------------------------------------- | ------------------------------------- |
| `PRISALY-Front`                                          | `5723658` | `feature/frontend-mariana-visual-04`   | Repositorio principal; no se tocó     |
| `PRISALY-Front-53` a `-57`, `-53-BASE`, `-INT`, `-QA-01` | Varios    | Ramas históricas                       | Se conservan sin cambios              |
| **`PRISALY-Front-58`**                                   | `32ba32a` | `feature/fe-58-preparacion-navegacion` | **B: FE-58**, con los cambios locales |
| **`PRISALY-Front-DEVELOP-15`** (nuevo, desacoplado)      | `32ba32a` | `origin/develop`                       | **A: referencia limpia**; 0 cambios   |

## 3. Estado Git inicial de FE-58

- `## feature/fe-58-preparacion-navegacion`
- 23 archivos modificados (`M`) y 9 elementos sin seguimiento: 7 archivos de código y pruebas, `src/environments/environment.demo.ts` y la carpeta `docs/integracion-58/`. En total, 16 archivos sin seguimiento con `-uall`.
- Contiene todo lo esperado:
  - autorización por rol, permiso y sesión;
  - la matriz M1–M4;
  - la revalidación de `/me` con temporizador de 60 s;
  - las correcciones de concurrencia de Codex 06;
  - los guards de demostración y el entorno `demo`;
  - las restricciones del simulador;
  - la documentación y las pruebas.
- **Recuperación:** completa; no faltaba ningún archivo.

## 4. Respaldo

Carpeta `C:\Users\57316\OneDrive\Escritorio\PRISALY\RESPALDO-FE58-20261123-123140\`, fuera del repositorio y sin publicar.

| Contenido                | Detalle                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `base-HEAD.txt`          | `32ba32a…` y la rama                                                                      |
| Estado Git               | `git-status-short.txt` y `git-status-porcelain.txt` (`-uall`)                             |
| Diff                     | `fe58-diff-binary.patch` (`git diff --binary`) y `fe58-diff-name-status.txt`              |
| Archivos sin seguimiento | `no-rastreados.txt`, con 16 entradas, inventariadas aparte                                |
| Copias                   | `archivos/`, copia íntegra de los 39 archivos modificados o nuevos, y `fe58-archivos.tar` |
| `SHA256SUMS.txt`         | 47 hashes, verificados con `sha256sum -c`                                                 |

**Secretos:** la única coincidencia es la contraseña ficticia `solo-prueba`, en 7 líneas de pruebas. No hay tokens, credenciales ni datos personales. Se excluyeron `node_modules`, `dist` y `.angular`.

## 5. Repositorios consultados y SHA

Consulta del 2026-11-23 a las 17:32 UTC, con `git fetch origin --prune`.

| Repositorio | SHA anterior (referencia)                  | `origin/develop` actual                    | Commits nuevos |
| ----------- | ------------------------------------------ | ------------------------------------------ | -------------- |
| Frontend    | `32ba32ab0189344e71e380a7f7a59cedbb8e7705` | `32ba32ab0189344e71e380a7f7a59cedbb8e7705` | 0              |
| Backend     | `773818caf62758d66019a71dac6508d13148abad` | `773818caf62758d66019a71dac6508d13148abad` | 0              |

## 6. Estado de los PR

Ver `DC-FE-58-PR-Y-RAMAS-PENDIENTES-15.md`.

| Repositorio | Situación                                                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend     | Hay 4 PR abiertos, todos en Draft, no fusionados y con CI `verify=success`: #94 (M4, sin impacto HTTP), #95 (M6, candidato `POST` y `GET /v1/evaluacion/intentos/{id}`), #96 (M3, candidato `GET /v1/casos`) y #97 (orquestación local con el build Angular de producción) |
| Frontend    | Sin PR abiertos                                                                                                                                                                                                                                                            |

## 7. Archivos recuperados, nuevos y modificados

No hizo falta recuperar nada: el worktree estaba intacto. El inventario coincide con el respaldo:

- **Modificados (23):** `angular.json`; los archivos raíz `app.*` (5) y `app.routes.spec.ts`; autenticación (7); el interceptor académico y su spec del recorrido; el dashboard (4); los entornos (3); la spec del simulador `simulador-temporal.spec.ts`.
- **Nuevos:**
  - `entorno-demostracion.ts`, `estado-verificacion-acceso.ts` y `vigilancia-acceso-personal.ts`;
  - las specs `fe58-resolucion`, `fe58-revalidacion`, `fe58-simulador` y `m1-mapeo-rutas-rol`;
  - `environment.demo.ts`;
  - la documentación de `docs/integracion-58/`.

## 8. Diferencias entre FE-58 y `develop`

| Aspecto         | Resultado                                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base de FE-58   | `git merge-base HEAD origin/develop` es `32ba32a`, el mismo que `origin/develop`                                                                                                    |
| Contenido       | `git diff --stat HEAD origin/develop` está vacío: el HEAD de FE-58 es `develop`                                                                                                     |
| Diferencia real | Son exclusivamente los cambios locales sin commit de FE-58                                                                                                                          |
| Dependencias    | `package-lock.json` idéntico (`node_modules` compartido con `PRISALY-Front-54` mediante una unión)                                                                                  |
| Simulador       | `develop` ya contiene la publicación curada de Nicolás (`publication/simulador02-nicolas-20261120`). La rama `feature/simulador-integracion-nicolas`, no integrada, no se incorpora |

## 9. Conflictos

| Tipo                                           | Resultado                                                                                                                                                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| De contenido                                   | **Ninguno**: no hay commits nuevos en `develop`                                                                                                                                                                             |
| Funcionales con contratos Backend integrados   | **Ninguno**: el Backend de `develop` no cambió                                                                                                                                                                              |
| Con PR candidatos, si se fusionan en el futuro | PR #96 requeriría añadir `GET v1/casos` a la lista cerrada del interceptor. PR #97 empaqueta un build de producción que con FE-58 solo muestra `/login`. Están documentados y no se resolvieron, porque no están integrados |

## 10. Conciliaciones realizadas

No hizo falta ninguna operación de conciliación: ni merge, ni rebase, ni parches, ni copias.

- El worktree FE-58 no se modificó durante la sincronización; solo se añadieron documentos en `docs/integracion-58/sincronizacion-develop/`.
- Se creó el worktree limpio `PRISALY-Front-DEVELOP-15` para validar `develop` de forma independiente.

## 11. Resultado de las pruebas

Ejecutadas de una en una, sin mezclar contextos. Los registros están en `PRISALY/INTEGRACION-58-EVIDENCIAS/sincronizacion-15/`.

### A. `develop` limpio (`PRISALY-Front-DEVELOP-15`, `32ba32a`)

| Comando                                                                        | Resultado           |
| ------------------------------------------------------------------------------ | ------------------- |
| `ng test`, bloque 1 (`app`, `core`, `academico`, `autenticacion`, `dashboard`) | **356/356**, exit 0 |
| `ng test`, bloque 2 (`simulador`: Phaser, Unreal y SIM-01)                     | **306/306**, exit 0 |
| Total A                                                                        | **662/662**         |
| `ng build` (producción)                                                        | exit 0              |
| `ng build --configuration qa`                                                  | exit 0              |

`develop` no tiene configuración `demo`: llega con FE-58.

### B. FE-58 (`PRISALY-Front-58`, base `32ba32a` más los cambios locales)

| Comando                                                                                                                                                                     | Resultado                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ng test --include src/app/features/autenticacion` (autenticación, guards, matriz de permisos, revalidación de `/me`, demostraciones, acceso directo y rutas del simulador) | **223/223**, exit 0                                                                                                                                           |
| `ng test --include src/app/features/academico` (M3 y M4)                                                                                                                    | **120/120**, exit 0                                                                                                                                           |
| `ng test --include src/app/features/dashboard`                                                                                                                              | **59/59**, exit 0                                                                                                                                             |
| Suite, bloque 1                                                                                                                                                             | **440/440**, exit 0                                                                                                                                           |
| Suite, bloque 2 (simulador: Phaser, Unreal y SIM-01, con su implementación sin modificar)                                                                                   | **306/306**, exit 0                                                                                                                                           |
| Total B                                                                                                                                                                     | **746/746**. Coincide con la cifra histórica de FE-58: 662 de `develop` más 84 pruebas de FE-58                                                               |
| `ng build` (producción)                                                                                                                                                     | exit 0                                                                                                                                                        |
| `ng build --configuration qa`                                                                                                                                               | exit 0                                                                                                                                                        |
| `ng build --configuration demo`                                                                                                                                             | exit 0                                                                                                                                                        |
| `tsc` de la aplicación y de las pruebas                                                                                                                                     | exit 0 y exit 0                                                                                                                                               |
| Prettier (código cambiado)                                                                                                                                                  | exit 0. Excepciones preexistentes no reformateadas: `app.routes.ts`, `app.routes.spec.ts` y `simulador-temporal.spec.ts`, que ya no eran conformes en la base |
| `check:urls` y `git diff --check`                                                                                                                                           | exit 0                                                                                                                                                        |
| Revisión de secretos                                                                                                                                                        | Sin hallazgos                                                                                                                                                 |
| Implementación del simulador                                                                                                                                                | 0 archivos cambiados                                                                                                                                          |
| `habilitada: false`                                                                                                                                                         | Las 6 rutas oficiales                                                                                                                                         |

No hay fallos previos ni regresiones: A y B pasan por completo.

## 12. Riesgos

| Riesgo                                | Detalle                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| PR #97 (orquestación)                 | Con FE-58, el Frontend servido como producción solo mostraría `/login`. Requiere decidir qué configuración usar |
| Contratos candidatos (PR #95 y #96)   | Pueden cambiar antes de fusionarse. No se consumen                                                              |
| Rama de Nicolás no integrada          | Divergente en 3 archivos del simulador; cualquier publicación futura debe respetar los guards de H-58-01        |
| Memoria del equipo                    | La suite se ejecuta en bloques                                                                                  |
| Verificación en despliegue de H-58-01 | Pendiente: navegador por entorno y sesión estudiantil real                                                      |

## 13. Bloqueos (externos, sin efecto en esta sincronización)

| Bloqueo                        | Estado                          |
| ------------------------------ | ------------------------------- |
| D-05 (activación docente)      | PENDIENTE                       |
| DD-02 y M5                     | BLOQUEADOS por banderas         |
| M6 y N2                        | Candidato y pendiente           |
| M7 y reportes                  | PENDIENTES                      |
| OBS-53-01                      | Decisión aplazada               |
| Habilitación de las seis rutas | Requiere QA real y autorización |

## 14. Estado Git final

| Worktree                   | Estado                                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRISALY-Front-58`         | HEAD `32ba32a`, rama `feature/fe-58-preparacion-navegacion`. Los mismos 23 archivos modificados más los sin seguimiento, a los que se suma `docs/integracion-58/sincronizacion-develop/` |
| `PRISALY-Front-DEVELOP-15` | HEAD `32ba32a` desacoplado; 0 cambios                                                                                                                                                    |
| Backend                    | Solo `fetch`: sin cambios locales en `PRISALY-Backen-INT`                                                                                                                                |

**Sin commits, push, PR, merge ni despliegue.**

## 15. Conclusión

**SINCRONIZADO Y LISTO PARA AUDITORÍA FINAL.**

- **Referencias:** actualizadas; ninguna línea de integración avanzó.
- **FE-58:** preservado, respaldado y verificado.
- **H-58-01 y H-58-02:** se conservan y sus pruebas pasan.
- **Seis rutas oficiales:** siguen con `habilitada: false`.
- **Contratos nuevos de M3, M6 y la orquestación:** solo existen como PR en Draft. No se integraron ni se consumieron.

**Siguiente paso recomendado:** la auditoría final de Codex sobre `PRISALY-Front-58` y, después, la verificación en despliegue por entorno.
