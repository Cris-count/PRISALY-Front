# DC-FE-54 — Dependencias de listados oficiales

Fecha: 2026-11-21. Backend inspeccionado: `develop` `773818caf62758d66019a71dac6508d13148abad`, sin cambios respecto de FE-53. Lo inspeccioné en el worktree `PRISALY-Backen-INT` y no lo modifiqué.

En el Backend vigente:
- Ningún endpoint publica paginación (`Pageable`, `page`, `size`) ni ordenamiento configurable.
- El único listado de personal que existe es `GET /m4/sesiones`, con el parámetro opcional `docenteId`.

El Frontend no sustituye ningún listado ausente por consultas masivas, por enumeración de identificadores ni por llamadas repetidas. El almacén `CasosSesionStore` no es un listado del Backend:
- Solo recuerda en memoria los casos que el usuario creó o consultó durante su sesión.
- La interfaz lo rotula así: «no es un listado del servidor».

## Resumen

| Recurso | Pantallas que lo necesitan | Endpoint disponible | Endpoint ausente | Dependencia |
| --- | --- | --- | --- | --- |
| Casos del docente | Casos académicos, Contenido del caso, Rúbricas, Sesiones (selección de caso) | `GET /v1/casos/{idCaso}` y `GET /v1/casos/{idCaso}/contenido` (uno por identificador) | `GET /v1/casos` | Ingrid Backend (M3) |
| Usuarios de personal | Usuarios y docentes (asignar y revocar permisos) | `GET /v1/admin/usuarios/{id}/permisos` (por identificador) | `GET /v1/admin/usuarios` | Ingrid Backend (M1) |
| Docentes | Usuarios y docentes | `POST /v1/admin/docentes` (solo alta) | `GET /v1/admin/docentes` | Ingrid Backend (M1) |
| Estudiantes | Convocatorias (estudiante a convocar) | Ninguno para personal | `GET` de estudiantes elegibles por sesión | Ingrid Backend (M1/M4) y Dirección Central (datos personales) |
| Sesiones | Sesiones, Convocatorias | `GET /m4/sesiones` (lista completa, sin paginar) | Paginación y filtros por estado o fecha | Opcional, por volumen |
| Convocatorias | Convocatorias | `GET /m4/sesiones/{id}/convocatorias` | Ninguno | — |
| Roles y permisos | Usuarios y docentes | `GET /v1/admin/roles`, `GET /v1/admin/permisos` | Ninguno | — |

## Detalle por recurso

### Casos del docente (prioridad alta)

- **Pantallas que lo consumen:** `PanelCasosM3`, `PanelContenidoM3` (FE-54), `PanelRubricaM3` y `PanelSesionesM4`, en el campo de caso.
- **Endpoint disponible:** consulta por identificador UUID.
- **Endpoint ausente:** `GET /v1/casos`, que filtre por el docente autenticado (propietario) en el Backend.
- **DTO mínimo requerido:** `idCaso`, `titulo`, `estado` y `tiempoEstimadoSegundos`; es la misma proyección que `CasoDocenteConsultaResponse`. Podría añadirse una fecha de actualización para ordenar la lista.
- **Filtros necesarios:**
  - `estado` (`BORRADOR`, `PUBLICADO`, `ARCHIVADO`).
  - Texto en el título, si Dirección Central lo aprueba.
- **Paginación:** no existe en el contrato. Hay que definir `page`/`size` o un cursor.
- **Ordenamiento:** no existe en el contrato.
- **Permisos:** `CONSULTAR_CASO` más la condición de propietario, como en `prisaly.m3.lectura`.
- **Alternativa limitada actual:**
  - El docente introduce el UUID a mano.
  - O lo elige entre los casos recordados en la sesión.
  - Al recargar el navegador, la lista recordada se pierde.

### Usuarios de personal y docentes (prioridad alta para administración)

- **Pantalla que lo consume:** `PanelAdministracionM1`.
- **Endpoints ausentes:**
  - `GET /v1/admin/usuarios`, con filtro de rol.
  - O bien `GET /v1/admin/docentes`.
- **DTO mínimo requerido:** `idUsuario`, `nombre`, `correo`, `rol` y `estado`. El correo es un dato personal, así que Dirección Central debe decidir si se muestra completo.
- **Filtros necesarios:** `rol` y `estado`.
- **Paginación y ordenamiento:** no existen.
- **Permisos:** rol `ADMINISTRADOR`, igual que el resto de `/v1/admin`.
- **Alternativa limitada actual:**
  - El administrador pega el UUID del usuario.
  - Tras dar de alta un docente, el panel usa el identificador que devuelve el alta.

### Estudiantes elegibles (prioridad alta para convocatorias)

- **Pantalla que lo consume:** `PanelConvocatoriasM4`.
- **Endpoint ausente:** una consulta de personal que liste los estudiantes convocables para una sesión.
- **DTO mínimo requerido:** `estudianteId` más un identificador visible que Dirección Central apruebe. Es un dato personal y no se infiere.
- **Filtros necesarios:** grupo o curso, si existe en el modelo; hoy no está definido.
- **Paginación y ordenamiento:** no existen.
- **Permisos:** `GESTIONAR_SESION`, más la regla de privacidad que se decida.
- **Alternativa limitada actual:** el docente introduce el UUID del estudiante.

### Sesiones (prioridad media)

`GET /m4/sesiones` existe y es lo que usa `PanelSesionesM4`. Solo falta paginación y filtros si el volumen crece. No es un bloqueo.

## Lo que el Frontend no hace

- No llama a `GET /v1/casos/{id}` con identificadores generados o enumerados.
- No recorre sesiones o convocatorias para reconstruir listados de estudiantes.
- No guarda listados en el navegador entre sesiones.
- No consume el gateway estudiantil M5 para obtener datos de personal.

## Solicitud a Ingrid Backend

Publicar, en este orden de prioridad:
1. `GET /v1/casos` (propietario, filtro por estado, paginado).
2. `GET /v1/admin/usuarios` (filtro por rol y estado, paginado).
3. Consulta de estudiantes convocables para una sesión.

Cada contrato debe documentar DTO, filtros, paginación, orden, permisos y códigos de error. Al publicarse, el Frontend reemplazará el campo de UUID por la lista sin cambiar los servicios existentes. Bastará con añadir un método `listar` a cada API y su ruta a la lista cerrada del interceptor.
