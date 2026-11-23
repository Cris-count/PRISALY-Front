# DC-FE-57: entrega para la revisión independiente de Codex

- **Fecha:** 2026-11-22.
- **Worktree:** `C:\Users\57316\OneDrive\Escritorio\PRISALY\PRISALY-Front-57`.
- **Rama:** `feature/fe-57-integracion-e2e`.
- **Base:** `0b341c0`.
- **Backend:** `773818c`, sin modificar.
- **Publicación:** sin commits, push, PR ni merge.

## Inventario de cambios

| Archivo                                                            | Cambio                                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `src/app/features/academico/panel-sesiones-m4.ts`                  | +4 líneas: entrada `'M4-OPERACION-NO-PERMITIDA'` en `MENSAJES_M4` (DEF-57-01)               |
| `src/app/features/academico/mensajes-m4.spec.ts`                   | Nuevo, 2 pruebas: traduce el código; los códigos desconocidos conservan el mensaje genérico |
| `docs/integracion-57/DC-BE-FE-MARIANA-INTEGRACION-57-RESULTADO.md` | Resultado (22 secciones)                                                                    |
| `docs/integracion-57/DC-FE-57-MATRIZ-RUTAS-ENDPOINTS-PERMISOS.csv` | Matriz de 26 filas                                                                          |
| `docs/integracion-57/DC-FE-57-PREPARACION-M5-M6.md`                | Correspondencias M5 y M6, banderas y discrepancias documentales                             |
| `docs/integracion-57/DC-FE-57-ENTREGA-PARA-CODEX.md`               | Este documento                                                                              |

## Contratos usados

Todos existen en `773818c`. No se añadió ninguno y la lista cerrada del interceptor no cambió.

| Módulo  | Contratos                                                                                                                                                                                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1      | `POST /v1/personal/autenticar`, `GET /v1/personal/me`, `POST /v1/personal/cerrar-sesion`, `POST /v1/admin/docentes`, `GET /v1/admin/roles`, `GET /v1/admin/permisos`, `GET /v1/admin/usuarios/{id}/permisos`, `PUT` y `DELETE /v1/admin/usuarios/{id}/permisos/{idPermiso}` |
| M3      | `POST /v1/casos`, `GET` y `PATCH /v1/casos/{id}`, `GET …/contenido`, los `POST` de escenarios, preguntas y opciones, `POST …/publicar`, `GET` y `PUT …/rubrica`                                                                                                             |
| M4      | `POST` y `GET /m4/sesiones`, `GET` y `PUT /m4/sesiones/{id}`, `PATCH …/estado`, `POST` y `GET …/convocatorias`                                                                                                                                                              |
| M5 y M6 | Solo inventario documental. No se consumió nada                                                                                                                                                                                                                             |

## Pruebas ejecutadas

Comandos y salidas, todos de uno en uno. Los registros están en `PRISALY/INTEGRACION-57-EVIDENCIAS/`.

| Comando                                                                                                                            | Salida                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ng test --include src/app/*.spec.ts --include src/app/core --include …/academico --include …/autenticacion --include …/dashboard` | 356/356, exit 0                                                                                                |
| `ng test --include src/app/features/simulador`                                                                                     | 306/306, exit 0                                                                                                |
| Dirigidas M1, guards e interceptores                                                                                               | 163/163, exit 0                                                                                                |
| Dirigidas M3 y concurrencia                                                                                                        | 52/52, exit 0                                                                                                  |
| Dirigidas M4, FE-55 y FE-57                                                                                                        | 44/44, exit 0                                                                                                  |
| `ng build`                                                                                                                         | exit 0; solo las advertencias previas del simulador                                                            |
| `ng build --configuration qa`                                                                                                      | exit 0                                                                                                         |
| `tsc` de la aplicación y de las pruebas                                                                                            | exit 0 y exit 0                                                                                                |
| `prettier --check`, `npm run check:urls`, `git diff --check`                                                                       | exit 0                                                                                                         |
| Real `administracion-real-fe57.spec.ts` (temporal)                                                                                 | 1/1, exit 0. El primer intento falló por un selector de la prueba                                              |
| Real `recorrido-real-fe57.spec.ts` (temporal)                                                                                      | 1/1, exit 0                                                                                                    |
| Real `m3-m4-real-fe57.spec.ts` (temporal)                                                                                          | 1/1, exit 0                                                                                                    |
| Navegador integrado (docente QA)                                                                                                   | Inicio de sesión 200; `/me` 200; 6 rutas redirigidas; cierre de sesión 204; sin almacenamiento en el navegador |

Las pruebas reales temporales se eliminaron de `src/qa-int/` y quedaron archivadas como `*.spec.ts.txt` en las evidencias.

## Evidencias de QA

- **Trazas:** `traza-prueba-real-admin-2.txt`, `traza-prueba-real-docente.txt` y `traza-prueba-real-m3-m4.txt`. Contienen método, ruta, estado y código, sin tokens.
- **Base de datos:** `relectura-bd-admin.txt`. Los docentes ficticios tienen rol `DOCENTE` y `passwordHash` nulo, y el permiso revocado queda con `habilitado=false`.
- **Identificadores creados:**
  - docente `2e478227-…`;
  - caso `ec24b3bc-…`;
  - sesiones `65e5fd8f-…` y `f40d9198-…`.

## Auditoría de seguridad

- **Lo que no se modificó:** guards, mapeo (`aprobado: null`), interceptores, credenciales, Backend, M5, el simulador y la narrativa.
- **Cuenta administrativa:** cuenta QA preexistente. Su contraseña se leyó desde el archivo QA local, fuera del repositorio, directamente hacia un archivo temporal que ya se eliminó, sin mostrarla. Además, se denegó leerla para el navegador, así que no se usó ahí.
- **Cuenta docente:** solo se usó para comprobar la denegación de M1 (403).
- **Modificaciones de permisos:** solo sobre el docente ficticio creado en la prueba, que acabó revocado. La cuenta administrativa y las cuentas de la semilla no cambiaron.
- **Secretos** (`revision-secretos.log`): sin coincidencias en el diff, los documentos ni las evidencias, excluidas las especificaciones archivadas, que importan las claves en lugar de contenerlas.

## Archivos excluidos

- `node_modules`, `dist/`, `.angular/`.
- `PRISALY/INTEGRACION-57-EVIDENCIAS/`.
- `C:\Users\57316\.prisaly-qa-int50\` (credenciales QA).
- `PRISALY/.claude/launch.json`.
- Cualquier `src/qa-int/` o `credenciales.local.ts`.

## Diferencias con la línea base

Solo DEF-57-01 en el código. La suite pasa de 660 a 662 pruebas. Los builds conservan las mismas advertencias del simulador.

## Riesgos

- **Datos en la base QA compartida `prisaly_int50`:** las pruebas reales dejaron datos ficticios. No se eliminaron, porque no se borran registros.
- **Memoria del equipo:** limitada. La suite se dividió en dos bloques.
- **Documentos Backend:** la orden se apoya en documentos que no existen (DOC-57-01). La verificación se hizo contra el código.

## Propuesta de commits (no ejecutados)

1. `fix(academico): mensaje para M4-OPERACION-NO-PERMITIDA en sesiones`, con `panel-sesiones-m4.ts` y `mensajes-m4.spec.ts`.
2. `docs(integracion-57): resultado, matriz rutas-endpoints-permisos y preparacion M5-M6`, con `docs/integracion-57/`.

## Puntos críticos de revisión

1. Que `MENSAJES_M4` solo añade una entrada y no altera los mensajes por defecto (`mensajeM4`).
2. Que la matriz distingue correctamente CONFIRMADO, APROBADO, PROPUESTO y PENDIENTE. Ninguna asociación aparece como aprobada.
3. La correspondencia M5 frente al código: banderas y controladores condicionales.
4. Repetir `git fetch` antes de publicar. Confirmar con Ingrid dónde están los documentos citados por la orden.
