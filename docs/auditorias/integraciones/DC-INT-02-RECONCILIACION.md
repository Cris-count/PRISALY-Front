# DC-INT-02 — Reconciliación de auditorías y cierre progresivo de integraciones

Fecha: 2026-11-24 · Solo lectura · No se modificó código ni se levantó infraestructura.

---

## A. Estado consolidado del proyecto

### A.1 Línea base real (verificada en el workspace, no asumida)

| Repo | Rama activa | HEAD | Relación |
|---|---|---|---|
| PRISALY-Front | `fix/integracion` | `00a2fa2` (`00a2fa25ff…d2f4f5738687ddfc2d1772`) | `fix/integracion` == `develop` |
| PRISALY-Backend | `fix/integracion` | `5d61972` (`5d61972d2f…a2e74d1c2a6`) | `fix/integracion` == `develop` |

Ambos HEAD coinciden **exactamente** con los commits de referencia del enunciado. No hay commits posteriores en la línea de integración. El working tree del frontend solo tiene `docs/auditorias/` sin trackear (salida de la auditoría 001).

### A.2 Dimensiones independientes por integración

Se separan **implementación** (¿existe el código?) de **validación** (¿qué se comprobó?). Ninguna entrada usa «VERIFICADO» sin indicar qué se verificó.

| Integración | Implementación | Validación | Flag / condición |
|---|---|---|---|
| M1 login/sesión personal | Existe | Código inspeccionado + compilación previa; **prueba HTTP real: no probado** | opt-in `M1_PERSONAL_LOCAL` |
| M1 administración (`v1/admin/**`) | Existe | Código inspeccionado; HTTP real: no probado | rol `ADMINISTRADOR` (backend) |
| M3 casos (`v1/casos/**` CRUD/rúbrica/contenido/publicar) | Existe | Código inspeccionado; HTTP real: no probado | permisos `CREAR_CASO`/`CONSULTAR_CASO`/… |
| M3 listado `GET /v1/casos` | **No existe** (bean/route off) | — | `m3.listado.enabled=false` (deliberado) |
| M3 narrativa | Parcial (bean off; adaptador frontend existe) | No probado | `m3.narrativa.publicacion.enabled=false` |
| M4 sesiones (`m4/sesiones/**`) | Existe | Código inspeccionado; HTTP real: no probado | `m4.consulta-bd0052.enabled=true` |
| M4 convocatorias (`m4/sesiones/{id}/convocatorias`) | Existe | Código inspeccionado; HTTP real: no probado | permiso `GESTIONAR_SESION` |
| M5 inicio/finalización intento | **No publicado** (route off) | — | `m5.inicio-finalizacion.publicacion.enabled=false` |
| M5 fases (narrativa/fase/cuestionario) | **No ensamblado** | — | `m5.exploracion.fases.enabled=false` + `.http.enabled=false` |
| Gateway participación frontend→M5 | Parcial (stub por defecto; HTTP opt-in no registrado) | No probado | `ParticipacionPendienteGateway` |
| M6 evaluación docente | **No publicado** (bean/route off) | — | `m6.evaluacion.enabled=false` |
| M7 notificaciones | **No publicado** (worker off) | — | `m7.worker.enabled=false` |
| Acceso estudiantil (DD-02) | **Deshabilitado** | — | `m1.student-access.enabled=false` |
| Simulador (Phaser/SIM-01/Unreal) | Existe (demo) | Código + specs; ejecución real: no probado | `requiereEntornoDemostracion` |

**Conclusión A**: lo único realmente conectado de punta a punta a nivel de código es el **recorrido de personal** (M1 + M3 escritura + M4). Todo lo demás está **deliberadamente desactivado por flag** (no es defecto) o es **demo** (simulador). Ningún flujo tiene todavía evidencia de **persistencia real en PostgreSQL** porque el entorno no se ha levantado.

### A.3 Lo que está implementado pero NO certificado

- Todo el recorrido docente (FE-60) está cableado en código, pero **nunca se ejecutó contra un backend vivo**.
- El simulador funciona como demo, sin persistencia académica.

---

## B. Diferencias entre auditorías

### B.1 Coincidencias (ambas auditorías)

1. M1/M3/M4 conectados por código.
2. Gateway M5 pendiente (stub).
3. DD-02 deshabilitado.
4. Simulador = demo.
5. M6/M7 sin consumidor frontend completo.

### B.2 Diferencia y causa comprobada

| Afirmación en conflicto | Causa comprobada |
|---|---|
| «M1/M3/M4 VERIFICADOS» (auditoría A) vs «no se ejecutaron servicios ni flujos reales» (auditoría B) | **No es un conflicto real**: A usó «VERIFICADO» en sentido de *correspondencia de código* (endpoint ↔ consumidor ↔ DTO), B en sentido de *validación en ejecución*. Ambas son ciertas sobre dimensiones distintas. La reconciliación exige **dos dimensiones** (A.2), que es lo que elimina la contradicción. |
| «9 rutas de personal habilitadas por FE-59» (resumen previo) vs «6 rutas, `habilitada:false`, `verificacionQa:'pendiente'`» (código actual) | El código actual (`m1-mapeo-rutas.ts` en `00a2fa2`) declara **6** rutas, todas `habilitada:false`. La habilitación **no** está hardcodeada: la activa `mapeoConHabilitacionQa()` solo en el build `qa-navegacion` (`production:false`, `personalQaHabilitado:true`, `rutasPersonalHabilitadasQa`). La cifra de «9 rutas habilitadas» era una lectura de una rama FE-59 anterior o una inferencia; **no corresponde a `fix/integracion` actual**. |

### B.3 Topología de ramas (causa de divergencias de evidencia)

```
c87045a  (PR #21: audit/fullstack-integracion-01)  ← merge-base
├── feature/fe-59-habilitacion-funcional → 9c2da7a "no se" → 56b4ed9 (merge develop)   [NO fusionado]
└── develop → c284904 (FE-60: paneles por rol + acceso estudiantil QA)
            → e06697f (docs FE-60) → 00a2fa2 (PR #22) = fix/integracion
```

- El trabajo FE-59 (navegación por rol + `qa-navegacion`) **ya está en develop** vía PR #20 (`b0f6236`) y `ada9874` (PR #21).
- `feature/fe-59-organizacion-roles` (@ `b0f6236`) es **ancestro** de develop, no divergente.
- `feature/fe-59-habilitacion-funcional` (@ `56b4ed9`) **sí divergió**: contiene un commit `9c2da7a "no se"` que **no está en develop**. Es el único cambio no integrado; debe revisarse antes de descartarse (probablemente abandonable, pero no lo afirmo sin abrirlo).

### B.4 PR backend confirmados (fusionados en develop)

| PR | Commit | Contenido |
|---|---|---|
| #97 | `9578803` | ops: paquete instalable de orquestación local desde raíz |
| #96 | `44585e7` | m3: listado de casos propios desactivado por defecto |
| #95 | `ed1eaeb` | m6: evaluación docente protegida con S1 desactivada |
| #94 | `904b9de` | m4: retirar lectura de convocatorias sin autorización |

Todos presentes en `git log develop` del backend. Coinciden con lo reportado.

---

## C. Estado de FE-60 (recorrido docente)

### C.1 Mapeo de los 10 pasos a evidencia de código

| # | Paso | Endpoint real | Consumidor frontend | Implementación |
|---|---|---|---|---|
| 1 | Autenticación válida | `POST /v1/personal/autenticar` | `SesionPersonalM1.autenticar` | Existe |
| 2 | Identidad y permisos | `GET /v1/personal/me` | `SesionPersonalM1` | Existe |
| 3 | Acceso al dashboard | — | guard `requiereSesionPersonalQa` + `requiereMapeoPersonalQa` | Existe |
| 4 | Creación de caso | `POST /v1/casos` | `CasosM3Api.crear` | Existe |
| 5 | Preguntas/escenarios/rúbrica | `POST …/escenarios·preguntas·opciones`, `PUT …/rubrica` | `CasosM3Api` | Existe |
| 6 | Publicación autorizada | `POST /v1/casos/{id}/publicar` | `CasosM3Api.publicar` | Existe |
| 7 | Creación de sesión | `POST /m4/sesiones` | `SesionesM4Api.crear` | Existe |
| 8 | Configuración de convocatoria | `POST /m4/sesiones/{id}/convocatorias` | `SesionesM4Api.convocar` | Existe |
| 9 | Consulta de registros | `GET /v1/casos/{id}`, `GET /m4/sesiones` | `CasosM3Api` / `SesionesM4Api` | Existe (parcial: ver C.2) |
| 10 | Persistencia en PostgreSQL | (BD) | — | **No probado** |

### C.2 Primer bloqueo pendiente

En **código**, los pasos 1–8 están completamente cableados: **no falta ningún endpoint ni DTO en el recorrido docente**. Los bloqueos son de tres tipos y hay que distinguirlos:

1. **Bloqueo de entorno (el primero real)**: no hay backend, Postgres ni frontend en ejecución. Sin entorno no puede validarse **ningún** paso en runtime, y el paso 10 (persistencia) queda sin evidencia.
2. **Restricción deliberada de habilitación (no defecto)**: las rutas docentes están `habilitada:false` en el mapeo oficial; solo se activan en el build `qa-navegacion`. Ejecutar el recorrido requiere compilar con esa configuración y apuntar a `localhost:18094/api` (QA aislado).
3. **Limitación deliberada de listado (no defecto)**: `GET /v1/casos` no existe (`m3.listado.enabled=false`). El listado docente es en memoria (`CasosSesionStore`). El paso 9 funciona por id y por sesión, pero **no** hay listado persistente de casos propios. Habilitarlo exige autorización de Dirección Central.

**Primer punto exacto donde el flujo se detiene**: la **ejecución** (paso 1 no puede correr porque el entorno está apagado). El primer punto de **código** con limitación deliberada es el **paso 9 (listado)**, y el primer punto **sin validación posible** es el **paso 10 (persistencia)**.

---

## D. Plan de integración ejecutable

Orden por dependencias. `Aprobación` = requiere autorización previa (no se ejecuta en esta orden).

| ID | Conexión | Implementación | Validación | Bloqueador | Archivos a intervenir | Dependencia | Prioridad | Criterio de cierre |
|---|---|---|---|---|---|---|---|---|
| T-01 | Cierre docente FE-60 (recorrido completo) | Existe (M1+M3+M4) | Código inspeccionado | entorno apagado; habilitación `qa-navegacion` | — (no requiere cambios de código; solo entorno + build) | T-00 | **Crítica** | Recorrido docente ejecutado contra QA aislado y persistencia confirmada en Postgres |
| T-00 | Levantar entorno QA aislado (Postgres+backend+frontend `qa-navegacion`) | — | — | autorización | `compose.yaml`, `environment.qa-navegacion.ts` | — | Crítica | Servicios arriba, `/api/health` 200, credenciales de prueba creadas |
| T-02 | Habilitar `GET /v1/casos` (listado docente) | No existe | — | autorización Dirección Central | `CasoListadoController` (ya creado, bean condicional), `application.yml` | T-01 | Alta | Listado de casos propios persiste entre recargas |
| T-03 | Conectar gateway M5 (registrar HTTP + completar operaciones) | Parcial | No probado | `m5.*.enabled=false`, DD-02 | `participacion-http.gateway.ts`, `app.config.ts`, contratos M5 | T-02 | Alta | Simulador persiste intento/respuesta real en M5 |
| T-04 | Activar acceso estudiantil DD-02 | Deshabilitado | — | autorización institucional | `application.yml`, flujo de identidad estudiantil | T-03 | Alta | Estudiante autenticado accede a sesión asignada |
| T-05 | Consumir M6 (evaluación docente) | No publicado | — | `m6.evaluacion.enabled=false` | `EvaluacionDocenteController` (ya creado), pantalla frontend | T-03 | Media | Resultado de evaluación docente consultable |
| T-06 | Consumir M7 (notificaciones) | No publicado | — | `m7.worker.enabled=false` | módulo M7, pantalla frontend | T-05 | Media | Notificación académica entregada y leída |
| T-07 | Reconciliar rama `feature/fe-59-habilitacion-funcional` (commit `9c2da7a "no se"`) | — | — | revisión manual | git | — | Media | Decidir si el commit se integra o se descarta |

**Paralelismo**: T-00 y T-07 son transversales e independientes. T-01…T-06 son secuenciales. T-02 puede avanzar en paralelo con T-03 una vez T-01 esté cerrado.

---

## E. Próximo incremento recomendado

### Objetivo
Cerrar **FE-60**: ejecutar el recorrido docente completo contra un QA aislado y obtener la **primera evidencia de persistencia end-to-end** (Angular → M1/M3/M4 → PostgreSQL).

### Alcance exacto
Los 10 pasos del recorrido docente (C.1), con datos **ficticios** en QA aislado. **No** incluye DD-02, M5, M6 ni M7.

### Repositorio y rama
- Frontend: `PRISALY-Front` en `fix/integracion` (`00a2fa2`), build con configuración `qa-navegacion`.
- Backend: `PRISALY-Backend` en `fix/integracion` (`5d61972`).

### Archivos previstos (lectura; no requieren cambios de código)
- `PRISALY-Backend/compose.yaml` (Postgres), `app/src/main/resources/application.yml` (flags ya en su estado correcto).
- `PRISALY-Front/src/environments/environment.qa-navegacion.ts` (rutas habilitadas).

### Dependencias
- Docker Desktop + Postgres 16.15.
- Backend compilado y en ejecución (`./mvnw -pl app -am package`).
- Frontend servido con `qa-navegacion`.

### Riesgos
- QA (`18094`) vs desarrollo (`8080`): confirmar que el backend QA real corre en `18094` y no es el mismo despliegue que `18170`/`18176` (DC-OPS-70).
- El paso 9 quedará limitado al listado en memoria (`GET /v1/casos` off). No se confundirá con un defecto.

### Pruebas
1. `GET /api/health` → 200.
2. Autenticación personal → token → `GET /v1/personal/me` con rol/permisos esperados.
3. Crear caso → asociar escenario/pregunta/opción → rúbrica → publicar → crear sesión → convocar.
4. Re-consultar por id y verificar que los registros persisten (no solo en memoria).

### Criterio de aceptación
Los 10 pasos se completan con datos ficticios y se confirma la **persistencia en PostgreSQL** (re-consulta tras recarga). Sin eso, FE-60 no se declara cerrado.

### Operaciones que requieren autorización
1. Levantar Postgres (Docker) y el backend QA.
2. Servir el frontend con `qa-navegacion`.
3. Crear usuario de pruebas con permisos `CONSULTAR_CASO`, `CREAR_CASO`, `MODIFICAR_CASO`, `PUBLICAR_CASO`, `GESTIONAR_SESION`.
4. Crear caso/sesión/convocatoria con datos ficticios.
5. Cualquier habilitación de flag si el entorno de QA no la tiene ya activa.

**Me detengo aquí. No ejecuto ninguna de estas operaciones sin aprobación explícita.**
