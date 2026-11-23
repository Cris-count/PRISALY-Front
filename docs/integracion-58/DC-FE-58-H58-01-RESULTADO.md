# DC-FE-58 · H-58-01: protección del simulador por entorno

- **Fecha:** 2026-11-23.
- **Orden:** DC-FE-58-H58-01-EJECUCION-12, sobre DC-FE-58-H58-01-IMPLEMENTACION-11.
- **Responsable:** Mariana (Frontend).
- **Ejecutor:** Claude.
- **Revisión posterior:** Codex.

## Recomendación

**LISTO PARA AUDITORÍA FINAL DE CODEX.**

- La matriz ratificada del simulador está aplicada en el Router Angular.
- H-58-01 **no se declara cerrada**: falta la revisión de Codex y la verificación en un despliegue real de cada entorno.
- No se publicó nada.

## 1. Estado Git

| Dato                     | Valor                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| Worktree                 | `C:\Users\57316\OneDrive\Escritorio\PRISALY\PRISALY-Front-58`                                  |
| Rama                     | `feature/fe-58-preparacion-navegacion`                                                         |
| HEAD                     | `32ba32ab0189344e71e380a7f7a59cedbb8e7705`. `origin/develop` no avanzó tras `git fetch origin` |
| Commits, push, PR, merge | Ninguno                                                                                        |

Se conservan todos los cambios anteriores de Claude y Codex: el mapeo, la vigilancia H-58-02 y las correcciones de Codex 06.

## 2. Rutas modificadas

| Archivo                                  | Cambio                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/app.routes.ts`                  | `canActivate: [requiereEntornoDemostracion]` en `/simulador-tecnico-2d5`, `/simulador-integrado` y `/simulador-unreal`. `/simulador` conserva su `redirectTo: 'simulador-unreal'`, con un comentario. El diff solo contiene el import, los comentarios y los tres guards; el resto del archivo, que ya no era conforme a Prettier en la base, no se reformateó |
| `src/app/app.ts`, `app.html` y `app.css` | Distintivo visible «Entorno de demostración · Datos ficticios · Sin operaciones académicas reales», solo cuando `DEMOSTRACIONES_HABILITADAS` es verdadero. Posición fija, sin alterar la maquetación                                                                                                                                                           |

No se modificó ningún componente, servicio o adaptador del simulador: ni Phaser, ni Unreal, ni Pixel Streaming, ni SIM-01. La implementación de `src/app/features/simulador` no tiene cambios. Solo cambió su spec de ruta (sección 9).

## 3. Categorías ratificadas

| Ruta                     | Categoría | Comportamiento implementado                                                |
| ------------------------ | --------- | -------------------------------------------------------------------------- |
| `/simulador-tecnico-2d5` | A         | Solo en `demo`                                                             |
| `/simulador-unreal`      | A         | Solo en `demo`                                                             |
| `/simulador`             | A         | Redirección a Unreal; el destino exige `demo`                              |
| `/simulador-integrado`   | A/B       | En `demo`, solo la modalidad demostrativa; la académica está deshabilitada |

Sin cambios de categoría.

## 4. Entornos

| Entorno                                              | Simulador | Fuente                                                        |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------- |
| Producción (`environment.ts`)                        | Denegado  | `demostracionesHabilitadas: false`                            |
| Desarrollo (`environment.development.ts`)            | Denegado  | `false`                                                       |
| QA (`environment.qa.ts`)                             | Denegado  | `false`. QA no equivale a demostración                        |
| Demo (`environment.demo.ts`, `--configuration demo`) | Permitido | `true`, sin integración de personal y sin URL de backend real |

**Cómo se fija el valor:** al compilar, mediante `fileReplacements` en `angular.json`. No dependen de él la URL, los parámetros ni el almacenamiento del navegador.

## 5. Guards

`requiereEntornoDemostracion` (reutilizado de FE-58-05):

| Entorno                               | Resultado                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Demo                                  | `true`                                                                                                                |
| Fuera de QA (producción o desarrollo) | Redirige a `/login`                                                                                                   |
| QA                                    | Redirige a `/dashboard?aviso=demostracion-no-autorizada`. Sin sesión, el guard del dashboard lleva después a `/login` |

El guard no consulta `/me` ni HTTP y no depende de la sesión ni del rol. Con sesión docente o administrativa el resultado es igual de restrictivo.

## 6. Redirecciones

| Entorno       | Destino de `/simulador`                                                                       |
| ------------- | --------------------------------------------------------------------------------------------- |
| Demo          | `/simulador-unreal`                                                                           |
| Fuera de demo | `/simulador-unreal`, cuyo guard redirige a `/login` (o al aviso en QA). Unreal nunca se monta |

## 7. Acceso directo

El guard actúa en el Router, así que se aplica igual a:

- la navegación programática;
- la URL escrita a mano;
- la recarga (una navegación inicial nueva);
- el historial (atrás o adelante).

Los enlaces del simulador (`href="simulador-integrado"` y `href="simulador-unreal"`, dentro de páginas del propio simulador) provocan una carga completa y pasan por el mismo guard. El dashboard y el login no enlazan con el simulador (comprobado con `grep` en `features/dashboard`, `features/autenticacion` y la raíz).

## 8. `/simulador-integrado`: separación de modalidades

Se inspeccionó la inicialización de `SimuladorIntegradoPage` sin modificarla.

**Modalidad académica:**

- Solo se activa con las entradas `contextoAcademico` o `idIntentoContenido`. Su efecto llama a `ParticipacionCoordinador.cargar` o `cargarContenido`.
- `app.config.ts` registra `provideRouter(routes)` **sin** `withComponentInputBinding`, así que **ningún parámetro de URL puede rellenar esas entradas**. Por ruta, la página arranca siempre sin contexto académico.
- `ParticipacionGateway` se resuelve por defecto (`providedIn: 'root'`) a `ParticipacionPendienteGateway`: cualquier operación de participación termina en «contrato pendiente».
- `ParticipacionCoordinador` no hace llamadas al construirse.
- Resultado: la modalidad académica queda **deshabilitada** sin tocar el componente. Está pendiente de los contratos M1, M3, M4 y M5, de autorización posterior y de pruebas reales.

**Modalidad demostrativa:** solo en `demo`. Usa datos locales (`SimuladorStore`, libreta y narrativa demostrativa). No hay identidad estudiantil ficticia, ni HTTP, ni participación ni calificaciones, y DD-02 no se activa.

**Prueba:** en demo, con `?idIntento=…&idIntentoContenido=…&contextoAcademico=1`, la página se monta, no hay ninguna petición HTTP y no se invoca ninguna operación del gateway.

**Dependencia documentada, sin aplicar:** cuando exista un recorrido académico autorizado, haría falta una ruta propia (categoría B) con autenticación estudiantil (DD-02) y autorización, que entregue las entradas académicas. Su diseño corresponde a Nicolás y Cristian junto con Ingrid.

## 9. Servicios y datos de la demostración

| Ruta                     | Servicios y datos                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/simulador-tecnico-2d5` | `FABRICA_MUNDO` (Phaser) con datos de mundo locales (`MUNDO_PRUEBA`). Sin HTTP                                                                       |
| `/simulador-unreal`      | Página de integración demostrativa del Hospital. El puente y Pixel Streaming solo actúan si se configura la señalización (local). No inicia intentos |
| `/simulador-integrado`   | Ver la sección 8                                                                                                                                     |

Ninguna demostración consulta información académica protegida.

## 10. Pruebas

`src/app/features/autenticacion/fe58-simulador.spec.ts` es nuevo y contiene 13 pruebas. Entornos simulados con proveedores, Router real con `app.routes.ts` y HTTP simulado. Después de cada prueba se comprueba que no hubo HTTP ni llamadas al gateway de participación.

| #   | Escenario                             | Prueba                                                                                                                     |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Producción                            | 3 rutas → `/login`, sin montar el simulador ni llamar a la fábrica Phaser                                                  |
| 2   | QA                                    | Sin sesión → `/login`. Con sesión → aviso `demostracion-no-autorizada`                                                     |
| 3   | Demo                                  | Unreal e integrado se montan; la ruta técnica inicializa el mundo (fábrica llamada 1 vez)                                  |
| 4   | Acceso directo por URL                | Incluido en 1 a 3, más el desarrollo ordinario                                                                             |
| 5   | Navegación por enlaces                | Los enlaces son `href` de carga completa hacia rutas protegidas (sección 7); no hay enlaces desde el dashboard ni el login |
| 6   | Redirección de `/simulador`           | Demo → Unreal; producción → `/login`, sin montar                                                                           |
| 7   | Ausencia de sesión                    | QA sin sesión                                                                                                              |
| 8   | Sesión administrativa                 | QA con ADMINISTRADOR: denegado                                                                                             |
| 9   | Sesión docente                        | QA con DOCENTE: denegado                                                                                                   |
| 10  | Sesión estudiantil                    | **Pendiente:** no hay contexto estudiantil autorizado (DD-02 desactivado). No se presenta como aprobada                    |
| 11  | Activar la modalidad académica        | Parámetros en `/simulador-integrado` (demo): sin HTTP ni participación                                                     |
| 12  | Navegación hacia atrás                | Tras la denegación, `back()` no lleva al simulador                                                                         |
| 13  | Recarga                               | Una navegación inicial nueva a la ruta protegida vuelve a denegar                                                          |
| 14  | Cambio de configuración               | Producción, demo y desarrollo dan destinos distintos según el entorno compilado                                            |
| 15  | Ausencia de inicialización al denegar | Fábrica Phaser con 0 llamadas; ningún componente del simulador en el DOM                                                   |
| —   | Parámetros de URL                     | `?demo=true`, `?demostracionesHabilitadas=true` y `#demo` no habilitan nada                                                |
| —   | Distintivo visible                    | Presente en demo y ausente en producción                                                                                   |

**Pruebas existentes adaptadas** (comportamiento nuevo intencional, sin ocultar defectos):

| Archivo                                                           | Cambio                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fe58-revalidacion.spec.ts`                                       | La caracterización «sin guard» pasa a exigir el guard en los tres destinos y la redirección de `/simulador`                                                                               |
| `app.spec.ts`                                                     | Comprueba el layout sobre el dashboard y el simulador demostrativos; recibe el entorno demo                                                                                               |
| `features/simulador/pages/simulador-temporal.spec.ts` (simulador) | Una sola línea: añade `provideEntornoDemostracionAutorizado()` a la prueba de ciclo de vida de la ruta técnica, que ahora solo existe en demo. No se tocó la implementación del simulador |

Los escenarios 16 a 20 (regresión de dashboard, guards, autenticación, navegación y simulador) están en la sección 11.

**Pendientes de despliegue** (no aprobados):

- comprobar en navegador, con un build real de cada entorno (producción, QA y demo), el acceso directo, la recarga y el historial;
- la sesión estudiantil real.

## 11. Ejecución y builds

Ejecutados de una en una. Los registros están en `PRISALY/INTEGRACION-58-EVIDENCIAS/r12-*`.

| Prueba                                                                                               | Resultado                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dirigidas: simulador, revalidación, raíz `app` y la spec técnica del simulador (`r12-dirigidas.log`) | 49/49, exit 0                                                                                                                                          |
| Regresión H-58-02, `fe58-revalidacion.spec.ts` (`r12-revalidacion-h5802.log`)                        | **17/17**, exit 0                                                                                                                                      |
| Autenticación, guards, demostración y revalidación (`r12-autenticacion.log`)                         | **223/223**, exit 0                                                                                                                                    |
| Regresión académica (`r12-academico.log`)                                                            | **120/120**, exit 0                                                                                                                                    |
| Regresión del dashboard (`r12-dashboard.log`)                                                        | **59/59**, exit 0                                                                                                                                      |
| Suite, bloque 1: todo salvo el simulador, incluida la navegación (`r12-suite-bloque-1.log`)          | **440/440**, exit 0                                                                                                                                    |
| Suite, bloque 2: compatibilidad con el simulador (`r12-suite-bloque-2.log`)                          | **306/306**, exit 0                                                                                                                                    |
| Total                                                                                                | **746/746** (733 de referencia más 13 nuevas)                                                                                                          |
| `ng build` (producción)                                                                              | exit 0; solo las advertencias previas del simulador                                                                                                    |
| `ng build --configuration qa`                                                                        | exit 0                                                                                                                                                 |
| `ng build --configuration demo`                                                                      | exit 0                                                                                                                                                 |
| `tsc` de la aplicación y de las pruebas                                                              | exit 0 y exit 0                                                                                                                                        |
| Prettier (código cambiado)                                                                           | exit 0. Excepciones preexistentes, no conformes ya en la base y no reformateadas: `app.routes.ts`, `app.routes.spec.ts` y `simulador-temporal.spec.ts` |
| `check:urls`, `git diff --check`                                                                     | exit 0                                                                                                                                                 |
| Revisión de secretos (`r12-verificaciones.log`)                                                      | Sin hallazgos                                                                                                                                          |
| Implementación del simulador                                                                         | 0 archivos cambiados (solo la spec de ruta)                                                                                                            |
| `habilitada: false` en el mapeo oficial                                                              | Las 6 rutas                                                                                                                                            |

## 12. Regresión de H-58-02

Sin cambios en la vigilancia ni en la sesión:

- temporizador único de 60 s;
- revalidación de `/me` compartida;
- descarte de respuestas obsoletas;
- invalidación tras un 403 (Codex 06);
- limpieza de temporizadores;
- retirada de datos.

`fe58-revalidacion.spec.ts`: ver la sección 11. Las seis rutas oficiales conservan `habilitada: false`.

## 13. Dependencias de Nicolás y Cristian

1. Confirmar que los guards en `app.routes.ts` no interfieren con el desarrollo del simulador. Para trabajar en él hay que usar `ng serve --configuration demo`.
2. Diseñar la futura ruta académica (B) de `/simulador-integrado` con Ingrid (DD-02 y M5), separada de la demostración.
3. Revisar la línea añadida a `simulador-temporal.spec.ts`.
4. Revisar el texto del distintivo de demo.

## 14. Riesgos

| Riesgo                                                                                                             | Mitigación o estado                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Equipos que usaban el simulador con `ng serve` por defecto (desarrollo) ahora reciben `/login`                     | Usar `--configuration demo`. Está documentado                                                                                               |
| La protección depende del build                                                                                    | Un despliegue con la configuración equivocada cambiaría el comportamiento: hay que verificar la configuración de cada despliegue            |
| `canActivate` impide montar el componente, pero el chunk diferido puede descargarse según la estrategia del Router | No ejecuta el simulador. Si se quiere evitar la descarga, `canMatch` es una alternativa que hoy no se aplica, para conservar el aviso en QA |
| El distintivo usa posición fija                                                                                    | Puede tapar contenido en pantallas muy pequeñas; es solo en demo                                                                            |

## 15. Recomendación de auditoría

Puntos que Codex debe revisar:

- el guard en los tres destinos y la redirección de `/simulador`;
- la ausencia de `withComponentInputBinding`, que es la base de la desactivación académica;
- el gateway por defecto;
- que la implementación del simulador no se tocó;
- la línea añadida a la spec del simulador;
- el distintivo, solo en demo;
- la regresión de H-58-02;
- las seis rutas sin habilitar.

Después: una verificación de despliegue por entorno.
