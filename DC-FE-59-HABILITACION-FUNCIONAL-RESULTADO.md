# DC-FE-59 — Habilitación funcional por rol (resultado)

Habilitación controlada de navegación por rol (Dirección Central 7.0, DC-FE-59-HABILITACION-FUNCIONAL-02).

> Fecha: 2026-11-23 · Rama: `feature/fe-59-habilitacion-funcional` · SHA inicial: `b0f6236eacb78dac10b0b3963c27618175714056`

Clasificación: **navegación implementada** · **validada en pruebas y en navegador** · **operaciones de Backend pendientes**.

## 1. SHA inicial y rama

- SHA inicial: `b0f6236eacb78dac10b0b3963c27618175714056` (`Merge pull request #20`, FE-58 en `develop`).
- Rama de trabajo: `feature/fe-59-habilitacion-funcional`, creada desde `feature/fe-59-organizacion-roles`. `develop` no se modificó.
- `git fetch origin` falló por `Permission denied (publickey)`. La ref local `origin/develop` ya apunta al mismo SHA, que es el merge de FE-58.

## 2. Rutas habilitadas

En `MAPEO_RUTAS_PERSONAL_OFICIAL`, `habilitada: true` y `verificacionQa: 'verificada'` solo para las rutas aprobadas. Producción no abre estas pantallas: `personalQaHabilitado` es false y el guard vuelve a `/login`.

| Ruta | Quién entra | Qué queda bloqueado dentro |
|---|---|---|
| `usuarios-docentes` | rol `ADMINISTRADOR` | Alta, edición, roles y D-05. Los botones siguen deshabilitados. |
| `estudiantes` | rol `ADMINISTRADOR` | Listado, búsqueda y registro. DD-02 no se activa. |
| `vista-general` | rol `ADMINISTRADOR` | Cifras. Sin API el indicador dice que no hay dato, y la página se abre. |
| `configuracion` | sesión de personal | No concede el resto de funciones administrativas. |
| `mi-perfil` | sesión de personal | No muestra token ni hash. No hay contrato de actualización. |
| `casos-academicos` | `CONSULTAR_CASO` | Crear, editar y publicar siguen siendo permisos distintos. |
| `rubricas` | `CONSULTAR_CASO` | No hay fórmulas ni evaluación M6. |
| `sesiones` | `GESTIONAR_SESION` | La pantalla no sustituye la titularidad ni los estados de M4. |
| `convocatorias` | `GESTIONAR_SESION` | Un alta no es un correo entregado. |

## 3. Menús por rol

- Administrador: Inicio, Gestión de docentes, Gestión de estudiantes, Vista general, Configuración, Mi perfil. Enlace real, sin «No disponible».
- Docente: Inicio, Casos académicos, Rúbricas, Sesiones, Convocatorias, Mi perfil. Sin gestión institucional.
- Estudiante: ocho anclas dentro de `/dashboard/estudiante` (espacio, perfil, sesiones, convocatorias, participaciones, notificaciones, recorrido, simulador). El simulador no abre `/simulador`. No ve menús de personal.
- El administrador sin `CONSULTAR_CASO` no entra a casos (`aviso=permiso-insuficiente`). El docente no entra a gestión de docentes (`aviso=rol-insuficiente`).

## 4. Configuración modificada

- `m1-mapeo-rutas.ts`: habilitación de navegación de las rutas aprobadas. La resolución FE-58 del requisito se conserva.
- `experiencias-navegacion.ts`: el aviso del menú queda vacío cuando la ruta está habilitada.
- `dashboard-layout.html` y `dashboard-inicio.html`: el clic va a `/dashboard/<ruta>` y la tarjeta dice «Abrir».
- `m1-personal-rutas-qa.ts`: fuera de QA, la cuenta local usa el mismo `decidirRuta` (rol y permisos declarados). No omite el guard.
- `preparacion-institucional`: el perfil muestra nombre, correo, rol y origen de la sesión.

## 5. Guards reutilizados

`requiereSesionPersonalQa`, `requiereMapeoPersonalQa`, `requiereSesionPersonalM1` y `VigilanciaAccesoPersonal`. En QA la entrada sigue confirmando `/me` antes de abrir una ruta habilitada. No hay un rol elegible que conceda todos los permisos del servidor.

La cuenta local de desarrollo no es una sesión QA. El docente local declara solo `CONSULTAR_CASO` y `GESTIONAR_SESION` para poder abrir esas pantallas; no lleva Bearer y no crea datos.

## 6. Operaciones conectadas

Ningún endpoint nuevo. Las pantallas que ya existían se abren. Donde no hay contrato, se muestra el vacío o el control deshabilitado. No se añadieron mocks de listados, altas ni convocatorias.

## 7. Operaciones pendientes

- M1 / D-05: alta y activación de docentes, sin contraseña predeterminada.
- Estudiantes: listado y `GET /v1/estudiantes/convocatorias` mientras DD-02 esté apagado.
- M3: consulta real condicionada al permiso; crear, editar y publicar no se habilitan por entrar a la pantalla.
- M4: listado real de sesiones y convocatorias.
- M5 y M6: intentos, evaluación y resultados.
- Indicadores de inicio: siguen en «Información no disponible» hasta que exista un contrato de resumen.
- Simulador académico: FE-58, sin cambios en Phaser, Unreal ni SIM-01.

## 8. Pruebas

| Comprobación | Resultado |
|---|---|
| `usuarios-demo-locales`, `fe59-navegacion`, `experiencias-navegacion`, `fe58-resolucion`, `m1-mapeo-rutas` | 63 SUCCESS |
| Navegador, administrador | Menú sin «No disponible». `/dashboard/usuarios-docentes` abre la pantalla y deja Registrar/Editar deshabilitados. `/dashboard/mi-perfil` muestra Administrador demo, correo y rol. |
| Navegador, docente | Menú de casos, rúbricas, sesiones y convocatorias. `/dashboard/casos-academicos` abre «Casos académicos». |

No se ejecutó la suite Angular completa ni un build de producción en este incremento. No se probó contra el backend de QA (`localhost:18094`): no estaba en marcha.

## 9. Errores y correcciones

- El menú habilitado seguía cayendo en «No disponible» o no mostraba la tarjeta. Ahora el enlace usa la ruta y la tarjeta dice «Abrir».
- La cuenta local rebotaba siempre a `habilitacion-pendiente`. Ahora el guard decide con rol y permisos, igual que en QA.
- El aviso general de Dirección Central ya no aparece en las secciones cuya navegación está habilitada. Se conserva para permiso o rol insuficiente.

## 10. Dependencias

- Backend (Ingrid): contrato por pantalla antes de conectar listados, altas o consultas. Sin eso no se inventa el endpoint.
- Simulador (Cristian y Nicolás): la modalidad académica no se habilita con esta orden.

## 11. Estado Git

- Rama `feature/fe-59-habilitacion-funcional`.
- Sin commits, push, PR ni merge.
- El árbol incluye el trabajo previo de FE-59 todavía sin commit y este incremento.

## 12. Recomendaciones

1. Conectar con Ingrid cada operación que ya tenga endpoint, método, permiso y respuesta reales.
2. Repetir la navegación con `ng serve --configuration qa` y el backend de personal en el puerto que declare `environment.qa.ts`.
3. No tratar la cuenta `*.demo@prisaly.local` como identidad de QA.
