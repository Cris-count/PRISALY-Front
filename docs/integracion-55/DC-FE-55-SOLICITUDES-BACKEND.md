# DC-FE-55: solicitudes a Ingrid Backend

- **Fecha:** 2026-11-22.
- **Frontend:** `develop` `9df44cc967880f95d200ceccb61d20f74c66051c`, rama local `feature/fe-55-recorrido-docente`.
- **Backend inspeccionado:** `develop` `773818caf62758d66019a71dac6508d13148abad`, sin cambios.

Ninguna de estas solicitudes está aprobada. Cada una describe la situación actual y la decisión que necesita el Frontend. El Frontend no implementa nada que dependa de ellas.

---

## SOL-55-01 · BLQ-53-01: mapeo oficial ruta, rol y permiso

**Situación actual**

- Las rutas `usuarios-docentes`, `casos-academicos`, `rubricas`, `sesiones`, `convocatorias` y `configuracion` usan el guard `requiereMapeoPersonalQa`.
- `MAPEO_RUTAS_PERSONAL_OFICIAL` tiene `aprobado: null` en todas. Con una sesión válida, el guard redirige a `/dashboard?aviso=permisos-pendientes`.
- El recorrido docente funciona contra la API, pero ninguna de sus pantallas es navegable.

**Evidencia**

- `src/app/features/autenticacion/m1-mapeo-rutas.ts`.
- Matriz `docs/integracion-55/DC-FE-55-MATRIZ-RUTAS-PERMISOS.csv`.
- Prueba real FE-55, etapa 1: las cuatro rutas del recorrido se redirigen con la cuenta QA docente.

**Contratos relacionados**

- `openapi-m3-casos.yaml`: `CREAR_CASO`, `CONSULTAR_CASO`, `MODIFICAR_CASO`, `PUBLICAR_CASO` y `ARCHIVAR_CASO`.
- M4: `GESTIONAR_SESION` (`SesionAcademicaService.verificarPermiso`).
- `/v1/admin/**`: rol `ADMINISTRADOR`.

**Decisión requerida**

Por cada ruta, Ingrid confirma y Dirección Central aprueba:

- qué permisos dan acceso a la pantalla (todos o alguno);
- si `configuracion` exige solo sesión.

Propuesta técnica, no aprobada:

| Ruta               | Permisos           |
| ------------------ | ------------------ |
| `casos-academicos` | `CONSULTAR_CASO`   |
| `rubricas`         | `CONSULTAR_CASO`   |
| `sesiones`         | `GESTIONAR_SESION` |
| `convocatorias`    | `GESTIONAR_SESION` |

**Impacto en el Frontend**

- Se rellena `aprobado.permisos` en `m1-mapeo-rutas.ts`. No cambia ningún componente.
- La continuidad FE-55 (`?caso=`, `?sesion=`) empieza a funcionar navegando, porque ya pasa por el guard.

**Criterio de aceptación**

- Documento firmado por Ingrid y Dirección Central con una fila por ruta.
- Las pruebas FE-54/FE-55 de denegación siguen pasando.
- Una prueba real navega las cuatro rutas del recorrido con la cuenta docente QA.

---

## SOL-55-02 · Rol ADMINISTRADOR en la ruta de administración

**Situación actual**

- El Backend exige el rol `ADMINISTRADOR` en `/v1/admin/**` (`ADMIN_REQUIRED`); no es un permiso.
- El mapeo actual solo admite permisos, así que la ruta `usuarios-docentes` sigue pendiente.

**Decisión requerida**

Elegir una de dos opciones:

- Expresar el acceso a la ruta por rol, para lo cual el Frontend añadiría `rolRequerido` al tipo `RequisitoRutaAprobado`.
- Publicar un permiso administrativo explícito.

**Impacto en el Frontend**

Un cambio pequeño en el tipo y en `decidirRuta`. No se infiere el rol a partir de los permisos de `/me`.

**Criterio de aceptación**

La decisión está escrita, y una prueba real confirma que una cuenta sin el rol recibe la redirección y un 403 `ADMIN_REQUIRED`.

---

## SOL-55-03 · D-05: aprovisionamiento seguro de credenciales docentes

**Situación actual**

- `POST /v1/admin/docentes` crea al docente sin una credencial que pueda usar.
- La prueba real usa la cuenta de la semilla pública local de Bruno (`docente.bruno@prisaly.local`), que solo existe en local.
- La credencial local `docente.pass` (OBS-54-01) sigue sin una cuenta conocida.

**Decisión requerida**

Definir el mecanismo de primera contraseña o invitación, y quién lo ejecuta.

**Impacto en el Frontend**

- Si se publica un endpoint de invitación o activación, el Frontend añadiría su pantalla.
- Hasta entonces, no existe ningún recorrido docente productivo sin intervención en base de datos.

**Criterio de aceptación**

- Contrato documentado.
- Una cuenta docente nueva puede iniciar sesión sin acceso manual a la base de datos.

---

## SOL-55-04 · OBS-53-01: autoasignación de `CREAR_CASO`

**Situación actual**

En FE-53 se observó que la autoasignación de `CREAR_CASO` devuelve 200 con `habilitado=false`, cuando se esperaba un 403 `PERMISSION_SELF_ASSIGNMENT_NOT_ALLOWED`.

**Decisión requerida**

Confirmar si el comportamiento es intencional:

- Si lo es, documentar el significado de `habilitado=false`.
- Si no lo es, corregirlo.

**Impacto en el Frontend**

`PanelAdministracionM1` muestra la respuesta tal como llega. Según la decisión, ajustaría el mensaje.

**Criterio de aceptación**

Comportamiento documentado en el contrato M1, con una prueba Backend que lo fije.

---

## SOL-55-05 · Listados oficiales

**Situación actual**

- No existen `GET /v1/casos`, `GET /v1/admin/usuarios` ni ninguna consulta de estudiantes convocables.
- El docente introduce UUID a mano o reutiliza los casos recordados en memoria durante su sesión.
- FE-55 reduce las copias de identificadores entre pantallas con `?caso=` y `?sesion=`, pero no sustituye un listado: al empezar una sesión nueva el docente necesita el UUID.

**Evidencia**

`docs/integracion-54/DC-FE-54-DEPENDENCIAS-LISTADOS.md`, que sigue vigente.

**Decisión requerida**

Publicar, en este orden:

1. `GET /v1/casos`: del propietario, filtrable por estado y paginado.
2. Estudiantes convocables por sesión.
3. `GET /v1/admin/usuarios`.

Cada uno con su DTO, filtros, paginación, orden, permisos y códigos de error.

**Impacto en el Frontend**

- Un método `listar` en cada API y su ruta en la lista cerrada del interceptor.
- Un selector en lugar del campo UUID.

**Criterio de aceptación**

Contrato OpenAPI publicado y probado en QA con datos ficticios.

---

## SOL-55-06 · Edición y eliminación de contenido (solo si Dirección Central lo autoriza)

**Situación actual**

- `openapi-m3-casos.yaml` no tiene `PUT`, `PATCH` ni `DELETE` para escenarios, preguntas u opciones.
- Un error de contenido en borrador solo se corrige añadiendo elementos nuevos.

**Decisión requerida**

Dirección Central decide si se incorpora en una fase futura. Si se incorpora, Ingrid define los contratos con If-Match.

**Impacto en el Frontend**

Acciones de editar y eliminar en `PanelContenidoM3`, con el mismo mecanismo de versión y relectura.

**Criterio de aceptación**

Contratos publicados y la decisión de Dirección Central por escrito.
