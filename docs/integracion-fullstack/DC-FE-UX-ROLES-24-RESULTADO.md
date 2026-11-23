# DC-FE-UX-ROLES-24 — Resultado

Navegación por rol y presentación limpia para la demostración docente. Frontend Angular 22, rama de trabajo `feature/fullstack-integracion-01` (worktree `PRISALY-Front-FULLSTACK-01`). Sin commits, push, PR ni merge.

## 1. Componentes responsables de los avisos (identificados)

| Aviso | Componente | Corrección |
|---|---|---|
| «QA de personal · Permisos por ruta pendientes de confirmación…» | `dashboard/dashboard-layout.html` (banner `.area > p[role=status]`) | Solo se muestra en QA ordinario (`avisoTecnicoQa`: QA de personal **sin** ninguna ruta efectivamente habilitada). En `qa-navegacion` no aparece. |
| Nota lateral «Rutas administrativas y docentes pendientes del mapeo oficial…» | `dashboard-layout.html` (`.nota-demo`) | Igual criterio; en `qa-navegacion` dice «Entorno QA local. Las operaciones las autoriza el servidor.» |
| Lista de permisos internos y rol en el aviso de acceso | `autenticacion/aviso-acceso-personal.ts` | En `qa-navegacion` (presentación) no se muestran códigos de permisos ni el código de rol. El **texto** de acceso denegado se conserva siempre. En QA ordinario el diagnóstico sigue visible. |
| «Habilitación pendiente» (`aviso=habilitacion-pendiente`) | `AVISOS_ACCESO` en `m1-mapeo-rutas.ts`, emitido por el guard | Sin cambios: solo aparece cuando el guard realmente bloquea. Con la ruta habilitada y permisos suficientes no se emite. |

Guards, `/me`, 401/403, revocaciones y mapeo oficial: **sin modificar**.

## 2. Componentes modificados

- NUEVO `src/app/features/dashboard/navegacion-rol.ts`: `MATRIZ_NAVEGACION_ROL`, `seccionesPorRol`, `hayRutasHabilitadas`, `NAVEGACION_PRESENTACION`.
- NUEVO `src/app/features/dashboard/navegacion-rol.spec.ts` (8 pruebas).
- `dashboard/dashboard-layout.ts|html`: menú lateral calculado (`computed`) desde la identidad de `/me`; banner técnico condicionado; etiqueta de perfil («Personal académico» / «Administración»).
- `dashboard/dashboard-inicio.ts|html`: las tarjetas «Explora la plataforma» usan el mismo filtro que el menú.
- `autenticacion/aviso-acceso-personal.ts`: sin códigos internos en presentación.

## 3. Matriz de navegación

| Identidad (desde `/v1/personal/me`) | Secciones visibles |
|---|---|
| Sin sesión válida (pendiente, expirada, denegada, cerrando, cierre confirmado) | Solo «Inicio» |
| Rol vacío / con espacios / no textual | Solo «Inicio» |
| `ADMINISTRADOR` (comparación exacta) | `usuarios-docentes`, `configuracion` — **solo si** la decisión FE-58 es `autorizada`. Hoy ninguna está habilitada, por tanto ninguna se muestra. |
| Otro rol de personal válido (p. ej. docente) | `casos-academicos`, `rubricas` (exigen `CONSULTAR_CASO`), `sesiones`, `convocatorias` (exigen `GESTIONAR_SESION`) — cada una solo si FE-58 decide `autorizada` |
| Personal (cualquier rol) | **Nunca** «Mi espacio de aprendizaje» |
| Entorno de presentación `demo` (sin sesión M1) | Vistas demostrativas existentes, incluido «Mi espacio de aprendizaje», con distintivo de demostración |

Ocultar un enlace no protege: los guards FE-58 siguen decidiendo en cada navegación (URL directa incluida) y el Backend autoriza cada operación.

«Crear caso» está dentro de «Casos académicos» (formulario de la misma pantalla); «Seguimiento» y «Mis resultados» no se muestran porque no existe funcionalidad autorizada.

## 4. Rol recibido del Backend

`GET /api/v1/personal/me` (QA `localhost:18094`, cuenta `docente.bruno@prisaly.local`) devolvió:

- `rol`: **`DocenteBruno`** (rol de semilla del entorno QA, no el literal `DOCENTE`).
- `permisos`: `MODIFICAR_CASO, CREAR_CASO, PUBLICAR_CASO, CONSULTAR_CASO, GESTIONAR_SESION`.

Por eso la regla no depende de que el rol sea exactamente `DOCENTE` (no se infiere del correo ni del nombre): para personal no administrador, las secciones docentes salen de los **permisos efectivos** con la decisión FE-58. Ver limitación L1.

## 5. Comportamiento docente (navegador, `qa-navegacion`, puerto 4300)

Antes (`../INTEGRACION-FULLSTACK-EVIDENCIAS/ux24-antes-inicio-docente.jpg`): menú lateral solo «Inicio» y las tarjetas de Inicio incluían «Usuarios y docentes» y «Mi espacio de aprendizaje»; perfil «Personal · QA».

Después (`../INTEGRACION-FULLSTACK-EVIDENCIAS/ux24-despues-inicio-docente.jpg`), lectura del DOM tras login real:

```
nav: Inicio, Casos académicos, Rúbricas, Sesiones, Convocatorias
tarjetas Inicio: Casos académicos, Rúbricas, Sesiones, Convocatorias
banner técnico: ausente
«Mi espacio de aprendizaje» en la página: false
códigos CONSULTAR_CASO/GESTIONAR_SESION en la página: false
perfil: «Docente Bruno Con Permiso · Personal académico»
```

## 6. Comportamiento estudiantil

No existe autenticación estudiantil real en el Backend (DD-02 no activado). El espacio estudiantil sigue siendo **demostrativo** (`/dashboard/estudiante`, entorno `demo`, distintivo «Entorno de demostración · Datos ficticios»), y no se presenta como sesión M1. El personal nunca lo ve en su navegación.

## 7. Pruebas

| # | Caso | Resultado |
|---|---|---|
| 1 | Docente: no aparece «Mi espacio de aprendizaje» | OK (spec + navegador) |
| 2 | Docente: solo opciones docentes autorizadas | OK (spec; sin `GESTIONAR_SESION` no ve sesiones/convocatorias) |
| 3 | Administrador: sin opciones estudiantiles | OK (spec) |
| 4 | Estudiante demo: aparece su espacio | OK (`dashboard.spec.ts`, navegación de presentación sin cambios) |
| 5 | Sesión sin rol válido: restrictiva | OK (spec) |
| 6 | Cambio de usuario: sin información anterior | OK (spec: estados no válidos → menú vacío; el menú es `computed` del estado de sesión) |
| 7 | Logout: navegación limpia | OK (spec: `cierre-confirmado` → vacío) |
| 8 | URL directa prohibida: denegada | OK (guards FE-58 sin cambios; suites `m1-personal-guards`, `fe58-*`) |
| 9 | Sin permiso: bloqueada | OK (spec + guards) |
| 10 | QA autorizado sin aviso técnico | OK (navegador) |
| 11 | Producción conserva FE-58 | OK (spec: mapeo oficial → ninguna sección; build prod exit 0) |
| 12 | Regresión | Suites `dashboard/**` + `autenticacion/**`: **298/298 SUCCESS**; `tsc` app y spec sin errores; `ng build --configuration production` exit 0; `git diff --check` limpio |

No se ejecutó la suite completa del proyecto ni los builds `qa`/`demo`/`qa-navegacion` tras este cambio por el plazo; `qa-navegacion` sí compiló en caliente (`ng serve`, navegador verificado).

## 8. Limitaciones

- **L1.** El QA devuelve roles de semilla (`DocenteBruno`) en lugar de un rol canónico `DOCENTE`. Recomendado a Ingrid Backend: normalizar el rol de `/me`; entonces la matriz puede exigir `DOCENTE` exacto.
- **L2.** Las secciones administrativas siguen sin habilitar (FE-58), por lo que el administrador ve solo «Inicio».
- **L3.** Recargar la página pierde la sesión (token solo en memoria, diseño FE-58): navegar con los enlaces internos durante la demostración.
- **L4.** Espacio estudiantil solo demostrativo hasta DD-02.

## 9. Estado Git

Rama `feature/fullstack-integracion-01` (base `origin/develop` b0f6236), sin commits nuevos. Cambios sin confirmar: `angular.json`, `environment.qa-navegacion.ts`, `habilitacion-qa-navegacion*.ts`, `m1-mapeo-rutas.ts` (orden 03) y, de esta orden, `navegacion-rol*.ts`, `dashboard-layout.*`, `dashboard-inicio.*`, `aviso-acceso-personal.ts`, este documento. Publicación a cargo de Codex.
