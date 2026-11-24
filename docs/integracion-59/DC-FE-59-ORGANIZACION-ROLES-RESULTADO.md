# DC-FE-59 — Organización de vistas y navegación por roles

- SHA inicial: `b0f6236eacb78dac10b0b3963c27618175714056` (`origin/develop`, PR #20, FE-58).
- Rama de trabajo: `feature/fe-59-organizacion-roles`, sin commit, sin push y sin PR.
- Relación con FE-58: esta rama parte del merge ya integrado. No sustituye la matriz ni pone `habilitada: true`.

## Rutas reutilizadas

- `/login`
- `/dashboard` y el shell `DashboardLayout`
- `/dashboard/usuarios-docentes`
- `/dashboard/casos-academicos`
- `/dashboard/rubricas`
- `/dashboard/sesiones`
- `/dashboard/convocatorias`
- `/dashboard/configuracion`
- `/dashboard/estudiante` (demostración, guard de entorno)
- `/simulador`, `/simulador-tecnico-2d5`, `/simulador-integrado`, `/simulador-unreal` (sin cambios; siguen en demostración)

## Rutas nuevas

Justificadas como preparación. No están en la matriz FE-58, así que `requiereMapeoPersonalQa` las deja en `permisos-pendientes` y no las abre con sesión de personal.

- `/dashboard/estudiantes`
- `/dashboard/vista-general`
- `/dashboard/mi-perfil`

## Menús

Con sesión de personal el lateral muestra solo la experiencia del rol de `/me`. Cada sección distinta del inicio enlaza a `/dashboard?aviso=...` y se rotula «No disponible». No abre la pantalla protegida.

Administrador: Inicio, Gestión de docentes, Gestión de estudiantes, Vista general, Configuración, Mi perfil.

Docente: Inicio, Casos académicos, Rúbricas, Sesiones, Convocatorias, Mi perfil.

Estudiante: la experiencia sigue siendo «Mi espacio de aprendizaje» en `/dashboard/estudiante`. El menú declarado (perfil, sesiones, convocatorias, participaciones, notificaciones, recorrido y simulador) corresponde a las secciones ya presentes en esa vista. No es un rol de personal. Un rol `ESTUDIANTE` en `/me` no hereda los menús de administrador ni de docente.

La demostración pública, sin sesión de personal, conserva el recorrido visual de FE-58.

## Componentes reutilizados

- `DashboardLayout`, estilos de menú, encabezado y perfil
- `DashboardInicio`, `DashboardAdministracion`, `PanelAdministracionM1`
- `DashboardDocente` y los paneles M3/M4
- `DashboardEstudiante`
- Guards `requiereSesionPersonalQa`, `requiereMapeoPersonalQa`, `requiereEntornoDemostracion`
- `MAPEO_RUTAS_PERSONAL_OFICIAL` (sin cambios de habilitación)

## Archivos creados

- `src/app/features/dashboard/experiencias-navegacion.ts`
- `src/app/features/dashboard/experiencias-navegacion.spec.ts`
- `src/app/features/dashboard/fe59-navegacion.spec.ts`
- `src/app/features/dashboard/preparacion-institucional.ts`
- `src/app/features/dashboard/preparacion-institucional.html`
- `docs/integracion-59/DC-FE-59-ORGANIZACION-ROLES-RESULTADO.md`

## Archivos modificados

- `src/app/features/dashboard/dashboard-layout.ts`
- `src/app/features/dashboard/dashboard-layout.html`
- `src/app/features/dashboard/dashboard-menu.css`
- `src/app/features/dashboard/dashboard-inicio.ts`
- `src/app/features/dashboard/dashboard-inicio.html`
- `src/app/features/dashboard/dashboard.routes.ts`
- `src/app/features/dashboard/dashboard-estudiante.html`

## Guards y permisos

Se reutilizan los guards de FE-58. La matriz sigue con `habilitada: false` para `usuarios-docentes` (rol `ADMINISTRADOR`), `casos-academicos` y `rubricas` (`CONSULTAR_CASO`), `sesiones` y `convocatorias` (`GESTIONAR_SESION`) y `configuracion` (sesión). El rol administrativo no concede permisos M3 ni M4. `CONSULTAR_CASO` no abre crear, editar ni publicar.

## Endpoints

Existentes y no abiertos por esta navegación: `POST /v1/personal/autenticar`, `GET /v1/personal/me`, `POST /v1/admin/docentes`, catálogo de roles y permisos, operaciones M3 de caso y operaciones M4 de sesión y convocatoria.

Faltantes para los indicadores del inicio: no hay contrato de conteos de usuarios, docentes, estudiantes, casos, sesiones ni convocatorias. Las tarjetas dicen «Información no disponible».

`GET /v1/estudiantes/convocatorias` existe en el backend y, con DD-02 apagado, no llega al controlador. La vista estudiantil no lo llama y no simula un 200.

## Funciones habilitadas

- Inicio de sesión de personal y cierre, como en FE-58.
- Menú filtrado por rol.
- Inicio con resumen sin cifras y accesos marcados como no disponibles.
- Demostración pública y simulador en el entorno demo, con las mismas restricciones.

## Funciones bloqueadas

- Alta y gestión de docentes (incluida D-05 y cualquier contraseña predeterminada).
- Listado y alta de estudiantes.
- Vista general como edición.
- Casos, rúbricas, sesiones y convocatorias de docente.
- Perfil editable.
- Identidad estudiantil, convocatorias, participaciones, notificaciones y resultados.
- `/simulador-integrado` como participación académica.

## Pruebas

Chrome headless, sin marcar como aprobadas las dependencias de DD-02:

- `experiencias-navegacion.spec.ts`: 5 de 5.
- `fe59-navegacion.spec.ts`: 5 de 5. Cubre menú de administrador, denegación de casos con `CREAR_CASO`, URL de estudiantes, rol sin experiencia y estudiante fuera de demo.
- `dashboard.spec.ts` y `dashboard-personal-qa.spec.ts`: en verde tras la navegación nueva.
- `fe58-resolucion.spec.ts`: en verde. La matriz oficial sigue sin habilitar rutas.

No hay evidencia de captura de pantalla en este incremento. La regresión visual automática de `dashboard.spec.ts` cubre 768 px y 1440 px.

## Riesgos y dependencias

- Backend: los indicadores y el listado estudiantil siguen sin contrato utilizable. M5, M6 y M7 no se consumen.
- Simulador: sin cambios en Phaser, Unreal ni SIM-01. Cristian y Nicolás no tienen una ruta académica nueva.
- Próximo incremento: habilitar una ruta de la matriz FE-58 solo con autorización de Dirección Central, cambiando `habilitada` en revisión. No forma parte de FE-59.

## Estado Git

Rama local `feature/fe-59-organizacion-roles` sobre `b0f6236`, con los archivos de arriba sin commit.
