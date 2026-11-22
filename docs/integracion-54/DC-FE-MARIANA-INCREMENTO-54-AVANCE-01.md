# DC-FE-MARIANA-INCREMENTO-54 — Avance 01

Fecha: 2026-11-21. Responsable: Mariana (Angular 22). Ejecutor técnico: Claude.

Estado: **implementado y probado localmente.** No se hizo commit, push, PR ni merge.

## 1. Rama de trabajo

`feature/fe-54-navegacion-contenido-m3`

## 2. Worktree

`PRISALY-Front-54`

Es un worktree nuevo y exclusivo, creado con `git worktree add` desde el SHA aprobado. No se modificó ningún otro worktree.

## 3. SHA Frontend

- **Base y HEAD:** `15cf6ae017232b36bad7f9659075bc0254f422bf` (merge del PR #16).
- **`origin/develop`:** en el mismo SHA tras `git fetch origin`.
- **FE-53 integrado:** commits `2d48470` (código) y `515ea2d` (documentación).

## 4. SHA Backend

- **`origin/develop` del Backend:** `773818caf62758d66019a71dac6508d13148abad`. El `fetch` confirma que no ha avanzado desde FE-53.
- **Contratos:** leídos en `PRISALY-Backen-INT`, sin cambios en el Backend.
- **API QA:** ejecuta el `jar` de ese mismo SHA.

## 5. Estado Git

- **Modificados (7):** `academico-http.ts`, `casos-m3.api.ts`, `m1-personal-rutas-qa.ts`, `dashboard-docente.html/.ts` y `dashboard-inicio.html/.ts`.
- **Nuevos de código (6):** `m1-mapeo-rutas.ts`, `m1-mapeo-rutas.spec.ts`, `aviso-acceso-personal.ts`, `panel-contenido-m3.ts/.html` y `contenido-m3.spec.ts`.
- **Nuevos de documentación (4):** en `docs/integracion-54/`.
- **Archivos eliminados:** ninguno.
- **Temporales:** el archivo temporal `src/qa-int/` (prueba real y credencial de la semilla pública) se eliminó. Además está excluido en `.git/info/exclude`.

## 6. Línea base de pruebas

Suite completa sobre `15cf6ae` sin cambios: 576 pruebas, **574 aprobadas y 2 fallidas**, salida 1.

- **Las dos fallas** son timeouts de 5000 ms en pruebas de maquetación del dashboard público de demostración:
  - «distribuye el alto sobrante del panel estudiantil…»
  - «todas las vistas se adaptan a 1440px…»
- **Mismo patrón que en FE-53:** Codex registró en `DC-FE-53-CODEX-DESBLOQUEO-02.md` una falla idéntica por timeout en «1440px» que no se reprodujo al repetir.
- **Contexto de recursos:** el equipo tenía muy poca memoria libre (ver la sección 21).
- **Evidencia:** `INTEGRACION-54-EVIDENCIAS/linea-base-test.log`.

## 7. Matriz ruta–permiso

Está en `DC-FE-54-MATRIZ-RUTAS-PERMISOS.csv` (24 filas). Distingue entre «confirmado documentalmente», «confirmado en código Backend», «propuesto pendiente», «no definido» y «no aplicable».

Conclusiones:
- **Rol, no permiso:** la administración M1 exige el rol `ADMINISTRADOR`, no un permiso. Dirección Central debe decidir cómo se expresa esa ruta.
- **Casos y contenido:** usan `CREAR_CASO`, `CONSULTAR_CASO` (política `prisaly.m3.lectura`), `MODIFICAR_CASO` + `CONSULTAR_CASO` y `PUBLICAR_CASO`, siempre con la condición de propietario.
- **Rúbricas:** la lectura exige `CONSULTAR_CASO`. Para guardar, el código exige `MODIFICAR_CASO` + `CONSULTAR_CASO`, aunque el OpenAPI no lo nombra.
- **Sesiones y convocatorias:** `GESTIONAR_SESION`.
- **Configuración:** no tiene permiso definido.
- **Ninguna asociación ruta–permiso está aprobada.** La existencia de un código de permiso no se interpreta como aprobación.

## 8. Contratos M3 confirmados

Fuentes: `CasoContenidoConsultaController`, `CasoContenidoController`, `CasoContenidoRequest`, `CasoContenidoResponse`, `CasoContenidoService`, `CasoGestionExceptionHandler` y `docs/api/openapi-m3-casos.yaml`.

**Lectura** (exige `CONSULTAR_CASO` y ser propietario; el ETag es el *fingerprint* del agregado del caso):
- `GET /v1/casos/{id}/contenido`: caso completo con escenarios, preguntas y opciones, incluidas la corrección y la explicación.
- Lecturas parciales: `GET /escenarios`, `/escenarios/{id}`, `/preguntas/{id}` y `/preguntas/{id}/opciones`. Existen, pero no se consumen: leer por partes mezclaría versiones.

**Altas** (exigen `If-Match` y devuelven 201 `{ id }` con el ETag nuevo):
- `POST /escenarios`: `idEscenario`, `titulo`, `contexto`, `instrucciones`, `orden`.
- `POST /escenarios/{id}/preguntas`: `idPregunta`, `enunciado` (obligatorio), `textoAyuda`, `orden`.
- `POST /preguntas/{id}/opciones`: `idOpcion`, `texto` (obligatorio), `esCorrecta` (booleano obligatorio), `explicacion` (obligatoria), `orden`.

**Validación del cuerpo:** estricta. Rechaza campos desconocidos o repetidos con 400; `orden` es un entero obligatorio y el id es un UUID generado por el cliente.

**Errores:**
- 400 `INVALID_CASE_REQUEST`.
- 401 `UNAUTHENTICATED`.
- 403 `FORBIDDEN`.
- 404 `CASE_NOT_FOUND` y `ELEMENT_NOT_IN_CASE`.
- 409:
  - `*_ID_IN_USE`, `*_ORDER_IN_USE` y `CONTENT_CONFLICT`;
  - `*_ADD_REQUIRES_DRAFT`, `EVALUABLE_CONTENT_LOCKED` y `CASE_NOT_EDITABLE`;
  - `INVALID_QUESTION` e `INCONSISTENT_OPTIONS`.
- 412 `STALE_CASE`.
- 428 `IF_MATCH_REQUIRED`.
- 503 `PATCH_HTTP_CONTRACT_UNAVAILABLE`.

**Operaciones que no existen:** no hay edición ni eliminación de escenarios, preguntas u opciones, y no hay listado de casos. No se implementaron.

**Excluido:** la narrativa (`/narrativa`) está desactivada en el Backend y pertenece al alcance de Cristian.

## 9. Servicios implementados o adaptados

- **`CasosM3Api`** (se extendió; no se duplicó):
  - Lectura completa de opciones, `contexto`, `instrucciones`, `activo`, `textoAyuda`, `estadoEdicion` y `visible`. Los campos nuevos son opcionales en las interfaces, por compatibilidad con `PanelRubricaM3`.
  - Nuevos `agregarEscenario`, `agregarPregunta` y `agregarOpcion`: cuerpos cerrados, `If-Match` obligatorio, exigencia de 201 y comprobación de que el `id` devuelto coincide con el generado.
- **`personalAcademicoInterceptor`:** se añadieron solo las tres rutas `POST` de contenido a la lista cerrada.
- **Navegación:**
  - `m1-mapeo-rutas.ts`: estructura del mapeo oficial con `aprobado: null` en todas las rutas, decisión pura `decidirRuta` y token inyectable.
  - `requiereMapeoPersonalQa` consulta ese mapeo. El comportamiento no cambia mientras no haya aprobaciones.

## 10. Componentes desarrollados

- **`PanelContenidoM3`:** consulta por UUID o desde los casos recordados en la sesión. Muestra estado, historia y desarrollo; el árbol de escenarios, preguntas y opciones; y observaciones neutrales de contenido incompleto.
  - Los formularios de alta solo aparecen si el caso está en `BORRADOR`, hay ETag y no hay un conflicto pendiente.
- **`AvisoAccesoPersonal`:** muestra en `/dashboard` el motivo de la redirección (`permisos-pendientes` o `permiso-insuficiente`) y los permisos efectivos reales devueltos por `/me`.

## 11. Pantallas conectadas

- **`/dashboard/casos-academicos`:** `PanelContenidoM3` debajo de `PanelCasosM3`.
- **`/dashboard`:** el aviso de acceso.
- Las demás pantallas de FE-53 no se tocaron.

## 12. Funcionalidades disponibles

Verificadas a nivel de servicio y componente contra el QA real:
- Consultar el contenido completo.
- Añadir escenarios, preguntas y opciones, con confirmación solo tras releerlos del servidor.
- Detectar conflictos de versión y recargar.
- Mensajes por código de error.

## 13. Funcionalidades bloqueadas

- **Navegación real** a todas las secciones de personal: BLQ-53-01, falta el mapeo aprobado.
- **Edición y eliminación de contenido:** no existe el contrato.
- **Listados** de casos, usuarios y estudiantes: no existen.
- **Archivar caso:** el endpoint existe, pero queda fuera de este incremento.
- **D-05 y OBS-53-01:** siguen abiertos.

## 14. Pruebas unitarias

`m1-mapeo-rutas.spec.ts` y la parte de API e interceptor de `contenido-m3.spec.ts`. Cubren:
- Mapeo oficial vacío y `decidirRuta`.
- Lectura de opciones y rechazo de formatos inválidos.
- Cuerpos cerrados con `If-Match`.
- Escritura denegada sin versión o con UUID inválido.
- Rechazo de un 201 con otro `id`.
- Propagación de 412, 428 y 409.
- Lista cerrada del interceptor: no permite GET parciales, PUT, DELETE ni narrativa.
- Bearer con opt-in.

## 15. Pruebas de componentes

`PanelContenidoM3` (con dobles HTTP identificados como simulación). Cubre:
- Sin sesión, presentación del árbol, estado vacío y validación del formulario.
- Uso del ETag de la relectura y no del 201.
- No confirmar un alta si el elemento no aparece en la relectura.
- Bloqueo si la relectura falla después del alta.
- 412 y 428 con bloqueo, recarga y reintento con la versión vigente.
- 400, 401, 403, 404 y 409 en altas; 401, 403 y 404 en la consulta.
- Sin ETag, sin altas; caso publicado, sin altas.
- Asociación pregunta→escenario y opción→pregunta.

Guard (sesión y mapeo simulados; el mapeo aprobado es ficticio y está rotulado como simulación):
- Demostración pública fuera de QA y `/login` sin sesión.
- Todo pendiente con el mapeo oficial, incluso con rol `ADMINISTRADOR`.
- Ruta aprobada (simulada) autorizada con el permiso, denegada si es insuficiente y sin elevación por rol.
- Sesión expirada redirige a `/login`.

Aviso de acceso: texto y permisos efectivos; no muestra avisos desconocidos.

## 16. Pruebas HTTP reales

Una prueba temporal en Karma ejecutó los servicios, el guard y `PanelContenidoM3` renderizado en Chrome contra el QA aislado (`http://localhost:18094/api`, Backend `773818c`, PostgreSQL `prisaly-postgres-int50`). Resultado: **1/1 SUCCESS, salida 0.**

Cuentas: las de la semilla pública local del Backend (`docente.bruno`, con `CONSULTAR_CASO`, `MODIFICAR_CASO`, `CREAR_CASO`, `PUBLICAR_CASO` y `GESTIONAR_SESION`; y `sinperm.bruno`). No se modificaron cuentas, contraseñas ni permisos.

Traza:

| Operación | Resultado |
| --- | --- |
| Contenido sin sesión | 401 `UNAUTHENTICATED` |
| Login y `/me` | 200 |
| Guard real (`casos-academicos`) con sesión válida | Redirección a `/dashboard?aviso=permisos-pendientes` |
| Crear caso QA ficticio | 201 |
| Panel: consulta | 200, estado vacío |
| Panel: escenario, pregunta y opción | 201 con `If-Match` cada uno, seguido de una relectura 200 |
| Concurrencia: alta de otra «pestaña» | 201 |
| Panel con la versión anterior | **412 `STALE_CASE`**; recarga 200; reintento 201 |
| POST crudo sin `If-Match` | 428 `IF_MATCH_REQUIRED` |
| Cuerpo sin `orden` | 400 `INVALID_CASE_REQUEST` |
| Orden repetido | 409 `SCENARIO_ORDER_IN_USE` |
| Pregunta en un escenario ajeno | 404 `ELEMENT_NOT_IN_CASE` |
| Caso inexistente | 404 `CASE_NOT_FOUND` |
| `sinperm.bruno` consulta el caso | 403 `FORBIDDEN` |
| Rúbrica de un caso nuevo | 404 `RUBRIC_NOT_FOUND` |

Caso creado: `0ce6bcb8-5e2a-44aa-b821-4b1a0b8dc125` (dato QA ficticio en la base aislada).

Evidencias en `INTEGRACION-54-EVIDENCIAS/`, fuera del repositorio y sin credenciales:
- `integracion-real-fe54.spec.ts.txt`
- `prueba-real-karma-2.log`
- `prueba-real-karma.log`: primer intento fallido por el entorno (ver la sección 21).

## 17. Evidencias de persistencia

Cada alta hecha desde el panel se confirmó así:
- Primero, la relectura del propio panel.
- Después, una lectura independiente: la opción conservó `texto`, `esCorrecta=true` y `explicacion`.
- Tras el 412, el escenario enviado con la versión obsoleta no aparece en el servidor y el de la otra pestaña sí.

## 18. Validación de concurrencia

1. **Qué versión devuelve cada lectura:** `/contenido` y `/rubrica` devuelven el ETag del agregado completo del caso, porque ambos usan `consultarContenido` y `fingerprint`.
2. **ETag de cada operación:** cada alta, el PATCH, la publicación y el PUT de rúbrica comparan esa misma versión.
3. **Misma versión:** en el QA real, el ETag del 201 coincidió con el de la relectura inmediata y fue distinto del anterior.
4. **Edición:** el panel guarda `contenido` y `etag` siempre desde la misma respuesta.
5. **Otro usuario modifica:** el Backend responde 412. El panel no sobrescribe, bloquea las altas y pide recargar.
6. **If-Match:** se envía siempre en las escrituras. El servicio se niega a escribir sin versión.
7. **412:** mensaje, bloqueo y recarga obligatoria.
8. **428:** igual que el 412. Desde Angular solo se reproduce con una solicitud cruda, porque el servicio nunca omite la cabecera.
9. **Qué se recarga:** el contenido completo, con datos y ETag juntos.
10. **Asociaciones:** el panel nunca combina el ETag del 201 con datos anteriores. Las altas no reemplazan colecciones: solo añaden.

En rúbricas, la corrección de FE-53 de `PanelRubricaM3` se conserva intacta. Al ser la versión compartida, cualquier alta de contenido invalida un ETag de rúbrica abierto en otra pantalla, y ese panel responde con su propio bloqueo ante el 412.

## 19. Necesidades de listados

Ver `DC-FE-54-DEPENDENCIAS-LISTADOS.md`. Prioridades:
1. `GET /v1/casos`.
2. `GET /v1/admin/usuarios`.
3. Estudiantes convocables.

No existe paginación en ningún contrato.

## 20. Pendientes de Ingrid Backend

- **Mapeo ruta–permiso (BLQ-53-01):** junto con Dirección Central, incluida la forma de expresar el rol `ADMINISTRADOR`.
- **Listados** de la sección 19.
- **Edición y eliminación de contenido:** decidir si se publican.
- **D-05 y OBS-53-01.**
- **Cuenta `docente.pass`:** confirmar qué cuenta corresponde a esa credencial local de INT-50. Con `docente.bruno` funcionó la de la semilla pública. El 401 que obtuvo Codex en FE-53 no es atribuible a Angular.
- **Pool de conexiones:** el Backend no recupera bien las conexiones cerradas (sección 21).

## 21. Riesgos

- **Recursos del equipo:**
  - Durante la sesión hubo 137 MB libres de 7,9 GB.
  - PostgreSQL registró `canceling authentication due to timeout` y workers de autovacuum que no arrancaban.
  - La API devolvió 500 por conexiones cerradas en el pool de Hikari (`This connection has been closed`). Así falló el primer intento de prueba real; tras unos minutos el servicio se recuperó y el reintento pasó.
  - Es un riesgo del entorno, no del código. Las fallas por timeout de la suite tienen probablemente la misma causa, aunque no está demostrado.
- **Producción:** como en FE-53, el interceptor académico solo se registra con `personalQaHabilitado`. Fuera de QA, los paneles requieren sesión y no la obtienen.
- **Store en memoria:** se pierde al recargar el navegador.
- **Interfaz de alta:** el orden lo introduce el usuario, y los duplicados los rechaza el Backend con 409.

## 22. Próximo paso

1. Revisión independiente de Codex con `DC-FE-54-ENTREGA-PARA-CODEX.md`.
2. Cuando Ingrid y Dirección Central aprueben el mapeo, completar `aprobado` en `MAPEO_RUTAS_PERSONAL_OFICIAL` y repetir la prueba navegando.
3. FE-55, según los listados que publique el Backend.

---

## Anexo A — Resultados finales de verificación

Regresión secuencial final, después de corregir ERR-54-01 (`NODE_OPTIONS=--max-old-space-size=3072`, sin otros builds en paralelo):

| Verificación | Resultado |
| --- | --- |
| Prettier (archivos modificados y nuevos, `--end-of-line auto`) | Salida 0 |
| `tsc -p tsconfig.app.json --noEmit` | Salida 0 |
| `tsc -p tsconfig.spec.json --noEmit` | Salida 0 |
| `ng build` (producción) | Salida 0. Solo avisos previos del simulador: presupuesto CSS y módulos no ESM |
| `ng build --configuration qa` | Salida 0 |
| Suite Angular completa | **618/618 SUCCESS, salida 0**: las 576 previas más 42 nuevas |
| Pruebas dirigidas FE-54 (académico y autenticación) | 215/215, salida 0 |
| `dashboard.spec.ts` aislado tras la corrección | 38/38 en dos corridas |
| Prueba real contra QA | 1/1, salida 0 |
| `npm run check:urls` | Salida 0 |
| `git diff --check` | Salida 0 |
| Búsqueda de secretos en archivos modificados y nuevos | Sin coincidencias, salvo menciones documentales |

Al cerrar, Karma avisó que Chrome «no se cerró en 2000 ms». El proceso terminó con salida 0.

Logs en `INTEGRACION-54-EVIDENCIAS/`: `verificaciones-2.log`, `suite-completa-2.log`, `build-prod-2.log`, `build-qa-2.log` y `dashboard-aislado-*.log`.

## Anexo B — Errores encontrados

- **ERR-54-01, regresión propia corregida:**
  - **Síntoma:** el elemento anfitrión vacío de `<app-aviso-acceso-personal>` ocupaba una celda de la rejilla de `.pagina` en el inicio. La prueba de 1440 px fallaba siempre en FE-54: el banner medía 213,55 px con un máximo de 200.
  - **Comprobación:** en la base aislada, ese archivo pasaba 38/38.
  - **Corrección:** `:host { display: contents; }`.
  - **Después:** 38/38 dos veces y suite completa 618/618.
- **ERR-54-02, entorno:**
  - **Síntoma:** el primer intento de prueba real falló con 500 en el login.
  - **Causa:** las conexiones de Hikari estaban cerradas porque PostgreSQL estaba degradado por falta de memoria en el equipo.
  - **Resultado:** no se cambió código; el reintento pasó.
- **OBS-54-01:**
  - **Hecho:** la credencial local `docente.pass` dio 500 durante la degradación.
  - **Pendiente:** la cuenta de la semilla pública autentica. Ingrid debe confirmar a qué cuenta corresponde `docente.pass`.
