# FE-58: auditoría independiente de autorización

## Estado y alcance

- Worktree: `PRISALY-Front-58`; rama: `feature/fe-58-preparacion-navegacion`.
- Base Frontend y `origin/develop` al inicio: `32ba32ab0189344e71e380a7f7a59cedbb8e7705`. Backend de referencia: `773818caf62758d66019a71dac6508d13148abad`.
- Revisados los cuatro archivos de autenticación modificados, la prueba de rol, la matriz de 23 filas, el resultado y la entrega de Claude. No se modificaron Backend, M5, M6 ni las aprobaciones oficiales.
- El trabajo permanece local, sin commits, push ni PR. No se recomienda aceptar técnicamente la afirmación de bloqueo global hasta resolver los hallazgos siguientes.

## Hallazgos y corrección

1. **Corregido: requisito disperso.** Un arreglo con un hueco y longitud positiva hacía que `every` omitiera el elemento. Una aprobación simulada con esa lista podía quedar autorizada aunque fuera malformada. Prueba independiente antes de corregir: 18/19, salida 1, `autorizada` en lugar de `pendiente`. Se materializan los huecos antes de validarlos; la repetición terminó 19/19, salida 0. El mapeo oficial sigue con seis `aprobado: null`.
2. **Bloqueo de publicación: demostración fuera de QA.** `requiereMapeoPersonalQa` devuelve `true` si `M1_PERSONAL_LOCAL` es falso. Las configuraciones de producción y desarrollo tienen `personalQaHabilitado=false` y conservan pantallas demostrativas públicas, comportamiento preexistente y cubierto por pruebas. En QA la asociación no aprobada bloquea la ruta; no puede afirmarse que las mismas rutas estén cerradas en todos los entornos. Esto no demuestra acceso no autorizado a datos del Backend: la integración real permanece desactivada en ese modo y el servidor aplica autorización propia. Hace falta resolver si las demostraciones deben permanecer públicas, separarse de las rutas protegidas o bloquearse. No se cambió esa política de producto por interpretación.
3. **Revocación posterior a `/me`.** El guard usa la identidad previamente guardada y no consulta `/me` en cada navegación. Un permiso revocado después puede permanecer en esa copia hasta actualizar la sesión. La prueba existente cambia el estado simulado y no demuestra actualización inmediata. Backend comprueba las operaciones, pero para futuras rutas aprobadas falta definir y verificar la actualización o invalidación de permisos antes de confiar en el guard como reflejo inmediato.

## Rol, permisos y matriz

`/me` entrega `roleName` y códigos habilitados. El servicio administrativo Backend exige cuenta activa, que no sea estudiante y `ADMINISTRADOR` exacto; `tieneRol` compara exactamente y no infiere el rol de permisos. En el contexto QA, sin sesión o aprobación no se concede; con rol y permisos se exigen ambos; sin comprobador de rol se deniega. Las pruebas cubren rol y permiso insuficientes, valores vacíos o malformados y comparación sensible a mayúsculas. Un permiso deshabilitado no aparece en la respuesta actual de `/me`; la salvedad sobre la copia previa figura arriba. Los parámetros de URL no determinan la autorización.

La matriz distingue navegación propuesta de operaciones Backend. M3 exige `CREAR_CASO` para crear; modificar caso, contenido y rúbrica exige `MODIFICAR_CASO` y `CONSULTAR_CASO`, con titularidad y estado verificados por el caso de uso. La lectura requiere `CONSULTAR_CASO` y propiedad; publicar exige `PUBLICAR_CASO`. M4 exige `GESTIONAR_SESION`, filtra sesiones propias y verifica titularidad y reglas académicas. Abrir una pantalla no concede todas sus operaciones. Exigir `CONSULTAR_CASO` para abrir casos excluiría a un usuario con solo `CREAR_CASO`, aunque el Backend le permita crear: queda pendiente de decisión.

## OBS-53-01, D-05 y listados

El código Backend permite autoasignar `CREAR_CASO`: la separación de funciones impide la autoasignación de `PUBLICAR_CASO` y `ARCHIVAR_CASO`. Una asignación o reactivación se devuelve con el estado persistido y la revocación deshabilita lógicamente. La evidencia local de QA muestra una fila deshabilitada con asignador igual al usuario. El archivo de prueba FE-53 contiene una limpieza condicional y una nota sobre una ejecución anterior, pero el registro definitivo inspeccionado muestra que no había permisos propios antes de esa limpieza; no prueba por sí solo el origen temporal de la fila ni la respuesta de aquella primera asignación. No se realizó una nueva consulta de base. La conveniencia de permitir autoasignación es una decisión pendiente de Ingrid y Dirección Central.

D-05: el alta de docente no genera credencial utilizable; el cambio de contraseña existente requiere sesión y contraseña actual y no resuelve el primer acceso. La documentación distingue los listados de casos, usuarios y estudiantes convocables, pendientes, del listado existente de sesiones propias. No se implementaron contratos ni mecanismos de credenciales.

M6: los contratos comunicados son candidatos locales; su ausencia en referencias remotas inspeccionadas no descarta una implementación local. No están aceptados ni autorizados para consumo. DOC-57-01 sigue pendiente de ubicación y confirmación.

## Pruebas independientes

| Verificación                                                    | Resultado         |
| --------------------------------------------------------------- | ----------------- |
| Rol y requisitos, incluidas las 18 pruebas de Claude y la nueva | 19/19, salida 0   |
| M1 y guards                                                     | 158/158, salida 0 |
| Regresión académica                                             | 120/120, salida 0 |
| Suite completa, bloque de aplicación y funciones                | 375/375, salida 0 |
| Suite completa, simulador                                       | 306/306, salida 0 |
| Build de producción y build QA                                  | salida 0 cada uno |
| TypeScript de aplicación y pruebas                              | salida 0 cada uno |

La suite se dividió en dos bloques por recursos: 681 pruebas. La primera comprobación de Prettier señaló formato documental tras las correcciones; después de formatear, Prettier, control de URLs y `git diff --check` terminaron con salida 0. La búsqueda de patrones comunes de secretos en los nueve archivos modificados o nuevos solo detectó una contraseña ficticia de prueba; el índice está vacío y no incluye evidencias QA. La revisión de patrones no garantiza ausencia absoluta de secretos.

## Decisión de publicación

No se cumple la condición de confirmar bloqueo global de rutas y falta resolver la vigencia de permisos al navegar. No se crearon commits ni PR y no se hizo merge. Se recomienda definir expresamente el tratamiento de las pantallas demostrativas y el mecanismo de actualización de permisos antes de aprobar rutas o publicar este incremento como cumplimiento integral de los criterios de seguridad.
