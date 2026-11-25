# DC-FE-61-FASE2-DD09-01 — Consulta de participaciones (DD-09) y reporte CSV (DD-11): resultado

- Ejecutor: Claude. Responsable Frontend: Mariana. Responsable Backend: Ingrid.
- Fecha: 2026-11-25 (hora local Colombia).
- Rama: `integration/fe-61-backend-dc99`. Backend de referencia: `32922bb8773aae796822185c63a421755f793e4b`.

No hubo commits, push, PR ni merge. No se modificó `develop`, el Backend, el simulador, otros repositorios ni otros worktrees. No se aplicaron migraciones (V019, V021–V023) ni se activó ningún interruptor.

> **No hay Backend DC-99 QA con DD-09/DD-11 activos ni con el esquema DC-92.** Todas las pruebas usan **dobles HTTP** (`HttpTestingController`), y así se identifican en el archivo `.spec`. **No son pruebas E2E.**

## 1. Estado Git

- Rama `integration/fe-61-backend-dc99`, HEAD `00a2fa25ff11a4972d42f4f5738687ddfc2d1772`, sin commits nuevos.
- **Protección inicial:**
  - Se confirmaron los 8 archivos modificados y los sin seguimiento de la Fase 1: son **9**. Los informes anteriores decían 10 por un error de conteo, verificado con `git status` el 2026-11-25.
  - Antes de editar se guardó un respaldo de solo lectura (`git diff` y un `tar` de los archivos nuevos) en la carpeta temporal de la sesión.
  - No se ejecutó ninguna acción destructiva de Git.
- **Estado final:**
  - 10 archivos modificados (+294/−11): los 8 de la Fase 1 más `panel-sesiones-m4.ts` y `.html`.
  - **14** sin seguimiento: los 9 de la Fase 1 más 4 de código y pruebas de la Fase 2 y este documento. La versión anterior de este documento decía 15 por el mismo error.
  - Nada preparado para commit.

## 2. Archivos

- **Nuevos (Fase 2):**
  - `src/app/features/academico/participaciones-dc92.api.ts`: DTO, servicio, mensajes y lectura de errores del CSV.
  - `src/app/features/academico/panel-participaciones-dc92.ts` y `.html`: sección contextual.
  - `src/app/features/academico/fe61-participaciones-dc92.spec.ts`: 29 pruebas (28 iniciales + 1 añadida en el seguimiento DD-11, sección 14).
  - `docs/integracion-fullstack/DC-FE-61-FASE2-DD09-RESULTADO.md`.
- **Modificados (Fase 2):**
  - `src/app/features/academico/panel-sesiones-m4.ts` (+import) y `.html` (+3 líneas): la sección se inserta en el detalle de la sesión.
  - `src/app/features/academico/capacidades-dc99.ts` (Fase 1, sin seguimiento): se añaden dos capacidades, sin cambiar las existentes.
  - `src/app/features/academico/fe61-administracion-estudiantes.spec.ts` (Fase 1, sin seguimiento): las aserciones de capacidades por defecto incluyen ahora las dos claves nuevas.

## 3. Contratos utilizados (leídos en el código de `32922bb`)

| Contrato | Fuente | Detalle |
|---|---|---|
| DD-09 `GET /v1/docente/sesiones/{idSesion}/participaciones` | `ParticipacionesDocenteController`, `ParticipacionesDocenteDc92`, `VistaParticipacionDc92`, `ErroresDc92` | 200 `{items: Fila[]}`, `no-store`. Regla M4 `consultarSesionAutorizada`: `GESTIONAR_SESION` y ser quien programó la sesión. Solo los convocados de esa sesión. Nota solo si está publicada. Interruptor `PRISALY_M4_CONSULTA_PARTICIPACIONES_ENABLED` (sin él, 404 sin código) y esquema DC-92: si falta, el Backend no arranca (`DC92-REQUIERE-ESQUEMA`) |
| Errores DD-09 | `ErroresDc92` | 401 `UNAUTHENTICATED`/`M4-NO-AUTENTICADO`; 403 `M4-SIN-PERMISO`/`M4-SESION-AJENA`; 404 `M4-SESION-NO-ENCONTRADA`; 400 `VALIDACION`; 503 `M4-PROVEEDOR-NO-DISPONIBLE` |
| DD-11 `GET /v1/docente/sesiones/{idSesion}/reporte-participacion` | `ReporteParticipacionController`, `ReporteParticipacionService`, `ReporteParticipacionCsv`, `CsvRfc4180` | Misma regla de propietario. 200 `text/csv; charset=UTF-8`, `Content-Disposition: attachment; filename=participacion-sesion-{idSesion}.csv`, `no-store`. BOM y 10 columnas DC-90 sin correo; nota solo si está publicada; fórmulas neutralizadas. Errores JSON `{code,message}`: los mismos códigos M4 y 400 `M4-SOLICITUD-INVALIDA` |
| Interruptor DD-11 | `ReporteParticipacionController.PROPIEDAD` y `application.yml` | **`prisaly.m7.reportes.participacion.enabled`**. El OpenAPI candidato dice `prisaly.reportes.participacion.enabled`, pero el código y el yml lo definen bajo `m7`. Discrepancia documental a confirmar con Backend |
| CORS | `HttpApiConfig` | `exposedHeaders` = `ETag`, `Retry-After`. **`Content-Disposition` no está expuesta**: entre orígenes distintos Angular no puede leer el nombre del archivo |

## 4. DTO

`FilaParticipacion` reproduce `VistaParticipacionDc92.Fila` campo por campo, sin campos añadidos:

- Identificadores: `idConvocatoria` y `idEstudiante` (UUID obligatorios); `idParticipacion` e `idIntentoConsiderado` (UUID o `null`).
- Datos descriptivos: `nombreEstudiante`, `caso`, `sesion`, `fechaSesion`, `estadoConvocatoria`, `fechaRetiro`, `fechaIngreso`, `inicioIntento`, `finIntento`, `fechaPublicacion` (texto ISO o `null`).
- Conteo: `numeroIntentos` (entero ≥ 0).
- Estados: `estadoParticipacion` y `estadoEvaluacion` (texto obligatorio).
- Nota: `calificacionPublicada` (número o `null`).

Reglas defensivas:

- Una nota distinta de `null` con `estadoEvaluacion` distinto de `PUBLICADA` invalida la respuesta, porque nunca debe mostrarse una nota no publicada.
- Los catálogos de etiquetas reproducen los valores literales de `VistaParticipacionDc92`:
  - participación: `CONVOCADO`, `AUSENTE_PENDIENTE_REVISION`, `AUSENCIA_JUSTIFICADA`, `AUSENCIA_NO_JUSTIFICADA`, `PARTICIPACION_INICIADA`, `PARTICIPACION_FINALIZADA`, `RETIRADO`;
  - evaluación: `SIN_INTENTOS`, `SELECCION_PENDIENTE`, `SIN_EVALUAR`, `EVALUADA_NO_PUBLICADA`, `PUBLICADA`.
- Un valor no catalogado se muestra tal cual, sin inventar otro.

`ReporteDescargado {nombreArchivo, contenido: Blob}` contiene el cuerpo exacto de la respuesta. El Front no genera ni altera ningún CSV.

## 5. Servicios

`ParticipacionesDc92Api`:

- **`participaciones(idSesion)`:** solo acepta un UUID y lee el envoltorio `{items}`.
- **`reporte(idSesion)`:**
  - Pide `responseType: 'blob'` y solo acepta un 200 `text/csv`.
  - Toma el nombre de `Content-Disposition` si es legible y es un nombre simple `.csv`. Si no, usa `participacion-sesion-{idSesion}.csv`, idéntico al del Backend.
  - Los errores llegan como Blob: se leen como JSON para conservar `{code}`.
- **Credencial:** ambos usan el contexto académico. Las dos rutas ya estaban en la lista cerrada de la Fase 1, así que llevan Bearer de personal y nunca cookies.

## 6. Pantallas

- **Flujo:** Inicio → Sesiones → detalle de una sesión → **Participaciones de la sesión** (`PanelParticipacionesDc92`). No se creó una sección nueva ni se tocaron la navegación, los guards ni el mapeo de rutas.
- **Origen del identificador:** el `idSesion` es el del detalle ya consultado en M4. No se escribe a mano.
- **Consulta:**
  - No se ejecuta al montarse: requiere pulsar «Consultar participaciones», y después «Actualizar participaciones».
  - Estados: carga (mensaje y botón deshabilitado), lista vacía («no tiene estudiantes convocados según el servidor»), tabla y error comprensible por código.
  - La tabla muestra estudiante (nombre o «Sin nombre registrado» e `idEstudiante`), convocatoria y retiro, participación, ingreso, intentos, intento considerado (`idIntentoConsiderado` e intervalo), evaluación y nota publicada con su fecha.
- **Reporte:** el botón «Descargar CSV» («Generando CSV…» mientras espera) guarda el Blob del servidor **solo tras la acción del usuario**. Ante un error no guarda nada y muestra el motivo.
- **Cambio de sesión:** se cancelan las solicitudes en curso y se descartan los datos de la sesión anterior.

## 7. Controles de acceso

- **En el entorno:** `capacidadesBackend.consultaParticipaciones` y `capacidadesBackend.reporteParticipacion` no están declaradas en ningún entorno, así que valen `false`. La sección solo muestra «no habilitados», sin botones ni solicitudes. DD-09 y DD-11 no se habilitan de forma global.
- **En la sesión de personal:** sin una sesión válida no se ofrecen acciones.
- **En el servidor:** el Backend decide la titularidad (`M4-SESION-AJENA`) y el permiso (`M4-SIN-PERMISO`); un 404 sin código significa interruptor apagado.
- **Se conserva sin cambios:**
  - Bearer solo en rutas de personal autorizadas y cookies en rutas estudiantiles.
  - Limpieza de la credencial ante 401 y revalidación de `/me` ante 403 (H-58-02).
  - Guards y autorización FE-58.
  - Separación de entornos: no se modificó ningún `environment*.ts` ni `app.config.ts`.

## 8. Pruebas ejecutadas

Todas con dobles HTTP; ninguna es E2E.

| Verificación | Comando | Resultado |
|---|---|---|
| Suite completa | `ng test --watch=false --browsers=ChromeHeadless` | **849/849** (820 previas + 29 nuevas; 848/848 antes de la prueba añadida en la sección 14) |
| FE-61 (Fase 1 + Fase 2) | `ng test … --include=**/fe61-*.spec.ts --include=…/activacion-docente.spec.ts` | **73/73** (44 de la Fase 1 + 29) |
| Regresión FE-58, FE-60 y navegación por roles (`fe58-*`, `m1-*`, `dashboard/**`, `acceso-estudiante-real`, `login-*`, `habilitacion-qa-navegacion`, `app.routes`, `academico-*`, `paneles-academicos`, `recorrido-docente`, `mensajes-m4`) | `ng test … --include=…` | **393/393** |
| TypeScript | `tsc -p tsconfig.app.json` y `tsc -p tsconfig.spec.json` (`--noEmit`) | sin errores |
| URLs codificadas | `npm run check:urls` | «Sin URLs de backend codificadas en src/app» |
| Formato | `prettier --check` sobre los archivos de la Fase 2 | conforme |

Cobertura de `fe61-participaciones-dc92.spec.ts`:

- **DTO:** campos exactos, nulos permitidos, UUID y conteos inválidos rechazados, nota no publicada rechazada y nombre de archivo seguro.
- **Servicio DD-09:** sesión válida, sesión sin participaciones, respuesta sin `items`, 401, 403 (`M4-SESION-AJENA` y `M4-SIN-PERMISO`), 404 de sesión inexistente y UUID inválido sin HTTP.
- **DD-11:** devuelve el Blob intacto, usa el nombre por defecto o el de la cabecera, rechaza un 200 que no es CSV y conserva el código de un error JSON recibido como Blob.
- **Transporte:** Bearer en ambas rutas, sin cookies, y un 401 limpia la credencial.
- **Pantalla:**
  - restricciones por entorno (ninguna capacidad o solo DD-09) y sin sesión válida;
  - no consulta al montarse; estados de carga y vacío; «Actualizar»;
  - errores 404, 403 y 401, y el 404 sin código del interruptor;
  - estado no catalogado mostrado tal cual;
  - descarga solo al pulsar y error en descarga sin guardar nada;
  - cambio de sesión.
- **Integración:** la sección aparece solo dentro del detalle de una sesión de M4 y, con el entorno real, queda deshabilitada y sin solicitudes `/v1/docente/`.

Durante la ejecución, la prueba de error en descarga falló en el primer intento: `Blob.text()` es asíncrono y la prueba no lo esperaba. Se corrigió la espera en la prueba; el código no cambió.

No se verificó en navegador contra un servidor: no hay `.claude/launch.json` y no se añadieron configuraciones locales. Los componentes se renderizaron en Chrome headless durante las pruebas unitarias.

## 9. Builds

`ng build --configuration production / qa / qa-navegacion / demo / development`: **5/5 correctos**, sin errores. `production` mantiene 4 avisos previos ajenos a FE-61 (presupuesto CSS de `simulador-integrado-page.css`; `phaser`, `sdp` y `ws` no ESM). El resto de builds no tiene avisos.

## 10. Dependencias Backend

1. DD-09: `PRISALY_M4_CONSULTA_PARTICIPACIONES_ENABLED=true` y el esquema DC-92 (V019, V021–V023; contrato `bd0052-v013-integral-dc92`), sujetos a D-ESQ-1 y D-SIM.
2. DD-11: `prisaly.m7.reportes.participacion.enabled=true` (en el yml no existe una variable de entorno para este interruptor) y la misma vista DC-92. Hay que confirmar con Backend el nombre del interruptor, porque el OpenAPI y el código no coinciden.
3. Para usar el nombre de archivo de la cabecera entre orígenes, el Backend debería añadir `Content-Disposition` a `exposedHeaders`. Mientras tanto, Angular usa el mismo nombre que fija `ReporteParticipacionService`.
4. Una sesión con convocatorias y participaciones reales en un QA con `32922bb`.

## 11. Funcionalidades deshabilitadas

| Funcionalidad | Estado en el Front | Cómo se habilitaría (con autorización de Dirección Central) |
|---|---|---|
| Consulta de participaciones DD-09 | Implementada; `consultaParticipaciones` ausente → deshabilitada | `capacidadesBackend: { consultaParticipaciones: true }` en el entorno QA autorizado + interruptor y esquema en el Backend |
| Reporte CSV DD-11 | Implementado; `reporteParticipacion` ausente → deshabilitado | `capacidadesBackend: { reporteParticipacion: true }` + interruptor en el Backend |
| P-78 y D-05 (Fase 1) | Sin cambios: deshabilitados | Igual que en la Fase 1 |
| DD-13, RF-21, DD-04, DD-12, M6/N2 | Solo las rutas en la lista del interceptor (Fase 1); sin servicios ni pantallas | Próximos incrementos. Podrán usar `idConvocatoria`, `idParticipacion` e `idIntentoConsiderado` de DD-09 |

## 12. Compatibilidad con la Fase 1

- `git apply -R --check` del diff de respaldo de la Fase 1 sobre el árbol actual se aplica limpio. Las líneas de esos 8 archivos son **idénticas** a las de la Fase 1.
- En los archivos nuevos de la Fase 1 solo hubo cambios aditivos:
  - `capacidades-dc99.ts`: dos claves nuevas y su documentación.
  - `fe61-administracion-estudiantes.spec.ts`: aserciones ampliadas a las dos claves.
- Las 44 pruebas de la Fase 1 siguen pasando.
- La lista cerrada del interceptor no se modificó: DD-09 y DD-11 ya figuraban en ella desde la Fase 1.

## 13. Pendientes de integración E2E

- Levantar un QA aislado con el Backend `32922bb`, el esquema DC-92 y los dos interruptores, con autorización.
- Desde la interfaz Angular:
  - comprobar la consulta de una sesión propia con convocados en varios estados (convocado, ausente, finalizado, retirado), con y sin nota publicada;
  - comprobar el 403 `M4-SESION-AJENA` con la sesión de otro docente y el 404 de una sesión inexistente;
  - descargar el CSV real y verificar su nombre, columnas y BOM.
- Verificar CORS: el comportamiento de `Content-Disposition` y que el Bearer se acepte en ambas rutas.
- Registrar evidencias (respuesta HTTP y consulta PostgreSQL) como en FE-60.

## 14. Seguimiento DD-11 (respuesta de Dirección Backend), 2026-11-25

### 14.1 Observaciones

- **OBS-01:** no se cambió el interruptor DD-11 en el Frontend ni en ningún otro lugar. Ingrid unificará la propiedad entre código, configuración y OpenAPI. La documentación del Front sigue citando la propiedad tal como está hoy en el código (`prisaly.m7.reportes.participacion.enabled`) y la discrepancia con el OpenAPI, sin elegir ninguna.
- **OBS-02:** no bloquea. Se conserva el nombre de archivo del contrato, `participacion-sesion-{idSesion}.csv`, que se usa cuando `Content-Disposition` no es legible. La implementación no se modificó.

### 14.2 Disponibilidad de un QA DC-99 con DD-11: NO EXISTE (bloqueo)

Comprobación de solo lectura en este equipo, 2026-11-25 ~13:30 hora local:

| Verificación | Resultado observado |
|---|---|
| Procesos `java`/`javaw` | 0 |
| Puertos en escucha 8080, 18094, 5432–5434, 4200, 4300 | ninguno (solo servicios ajenos: MySQL 3306/33060, MongoDB 27017 y servicios del sistema) |
| `GET http://localhost:18094/api/health` y `http://localhost:8080/api/health` | sin conexión (`curl` código 000) |
| Docker | cliente instalado; el motor no está en ejecución (`dockerDesktopLinuxEngine` no disponible) |

No hay ningún Backend en ejecución, y mucho menos uno `32922bb` con `prisaly.m7.reportes.participacion.enabled=true` y el esquema DC-92. Siguiendo la instrucción, **no se levantó ningún servicio, no se activaron interruptores ni se aplicaron migraciones**. **Las 10 pruebas reales de descarga quedan PENDIENTES (bloqueadas).**

### 14.3 Guion E2E preparado (pendiente de ejecución)

Precondiciones, que debe proveer Backend o Dirección Central:

- QA aislado con Backend `32922bb`, esquema DC-92 y DD-11 activo.
- Un docente autorizado (`GESTIONAR_SESION`) con una sesión propia que tenga convocados en varios estados, al menos una nota publicada y una evaluada no publicada.
- Un segundo docente sin titularidad sobre esa sesión.
- Una sesión sin convocatorias.
- Build Angular QA con `capacidadesBackend.reporteParticipacion: true`, solo en ese QA autorizado.

Las credenciales no se registran en el repositorio.

| # | Prueba | Procedimiento | Resultado esperado | Estado |
|---|---|---|---|---|
| 1 | Docente autorizado | Login en Angular → Sesiones → detalle de la sesión propia | Sección visible con «Descargar CSV» | Pendiente |
| 2 | Descarga efectiva | Pulsar «Descargar CSV» | 200 `text/csv; charset=UTF-8`; archivo `participacion-sesion-{idSesion}.csv` guardado | Pendiente |
| 3 | Diez columnas | Abrir el archivo | BOM UTF-8 y cabecera `id_estudiante,nombre_estudiante,caso,sesion,fecha_sesion,estado_convocatoria,estado_participacion,numero_intentos,estado_evaluacion,calificacion_publicada`; CRLF | Pendiente |
| 4 | Sin correo | Buscar `@` y los correos de los convocados en el archivo | Ningún correo de estudiante | Pendiente |
| 5 | Nota solo publicada | Comparar las filas PUBLICADA y EVALUADA_NO_PUBLICADA con PostgreSQL (`LiberacionCalificacion`) | `calificacion_publicada` con valor solo en la fila publicada | Pendiente |
| 6 | 401 | `GET …/reporte-participacion` sin `Authorization` | 401 `UNAUTHENTICATED` | Pendiente |
| 7 | 403 | Mismo GET con el token del segundo docente; y uno sin `GESTIONAR_SESION` | 403 `M4-SESION-AJENA` / `M4-SIN-PERMISO`; en Angular, mensaje sin archivo guardado | Pendiente |
| 8 | Errores HTTP | Sesión inexistente (UUID aleatorio) y UUID mal formado | 404 `M4-SESION-NO-ENCONTRADA`; 400 `M4-SOLICITUD-INVALIDA`; en Angular, mensaje y ningún archivo | Pendiente |
| 9 | Respuesta vacía | Descargar el reporte de la sesión sin convocatorias | 200 con BOM y cabecera solamente; Angular lo guarda tal cual | Pendiente |
| 10 | Sin datos ficticios | Comparar el SHA-256 del archivo guardado con el del cuerpo HTTP (pestaña de red o `curl`) | Idénticos | Pendiente (evidencia estática en 14.4) |

Comprobación HTTP directa para los puntos 6–8, a ejecutar solo en el QA autorizado y con el token fuera del historial de la terminal:

```text
curl -s -o /dev/null -w "%{http_code}\n" "<QA>/api/v1/docente/sesiones/<idSesion>/reporte-participacion"
curl -s -D - -H "Authorization: Bearer <token docente>" -o reporte.csv "<QA>/api/v1/docente/sesiones/<idSesion>/reporte-participacion"
```

### 14.4 Evidencia obtenida sin Backend (no E2E)

- **Punto 10, evidencia estática del código:**
  - En el código de producción de `src/app` (sin los `.spec`) no hay ningún `new Blob`, ni nombres de columnas del CSV, ni armado de filas. Se comprobó con `grep -rnE "new Blob|text/csv|id_estudiante|nombre_estudiante|calificacion_publicada|\.join\(','\)" src/app --include=*.ts | grep -v .spec.ts`: solo aparecen dos comentarios de `participaciones-dc92.api.ts`.
  - El único consumidor de `reporte()` es `panel-participaciones-dc92.ts:129`.
  - Lo único que se guarda es `r.contenido`, el cuerpo de la respuesta (`panel-participaciones-dc92.ts:134`).
- **Punto 9, prueba unitaria nueva con doble HTTP:**
  - El reporte de una sesión sin convocatorias (BOM, cabecera de 10 columnas y CRLF, según `ReporteParticipacionCsv`) se entrega como el mismo objeto Blob y es idéntico byte a byte.
  - El primer intento de la prueba falló porque comparaba con `Blob.text()`, que descarta el BOM al decodificar. Se corrigió la prueba para comparar bytes; el código no cambió.
- **Puntos 6–8:** siguen cubiertos solo por las pruebas unitarias con dobles HTTP de la sección 8 (401, 403 `M4-SESION-AJENA`, 404 sin código, error JSON recibido como Blob). **No hay evidencia real.**
- **Resultados tras el seguimiento:**
  - Suite completa: **849/849**.
  - FE-61: **73/73**.
  - TypeScript (app y specs) sin errores; Prettier conforme en el `.spec` modificado.
  - El cambio afecta solo a un archivo `.spec`, así que los builds no se repitieron: los resultados de la sección 9 siguen vigentes.
- **Implementación:** sin cambios. Solo se tocaron `fe61-participaciones-dc92.spec.ts` (una prueba añadida y dos secuencias de escape normalizadas: BOM y CRLF), este documento y la corrección del conteo de archivos en el documento de la Fase 1.

## 15. Auditoría local Codex: corrección D-05 y estabilización de la prueba DD-11, 2026-11-25

### 15.1 Corrección de seguridad D-05 (`credentials: 'omit'`)

- **Observación de Codex:** con `withFetch()`, `withCredentials: false` no fija ningún modo de credenciales. Angular 22 (`FetchBackend`) solo fuerza `'include'` cuando `withCredentials` es verdadero, y si no, deja `req.credentials`. Sin ese valor, `fetch` aplica `same-origin` y enviaría las cookies del mismo origen.
- **Corrección:** `ActivacionDocenteApi.activar` declara `credentials: 'omit'` y conserva `withCredentials: false` (`activacion-docente.ts:108`). Es el único cambio de producción.
- **Pruebas nuevas** (`activacion-docente.spec.ts`):
  - Con doble HTTP: la petición lleva `credentials: 'omit'` y `withCredentials: false`.
  - Con el `FetchBackend` real de Angular, los interceptores de QA y un token de personal en memoria, y `fetch` simulado (respuesta 204, sin servidor): `fetch` recibe `POST`, `credentials: 'omit'` y ninguna cabecera `Authorization`.
- **Mutación:** sin `credentials: 'omit'`, las dos pruebas nuevas fallan (`2 FAILED, 13 SUCCESS`). Después se restauró el archivo, idéntico.

### 15.2 Prueba intermitente «error en descarga» (DD-11)

**Fallos registrados antes de la corrección:**

- Fase 2, primera ejecución: la prueba falló porque no esperaba la lectura asíncrona. Se corrigió con una espera de 5 ciclos `setTimeout(0)`.
- Tras la corrección D-05, primera suite completa: `1 FAILED, 850 SUCCESS`. El aviso no estaba presente (`Expected undefined to contain 'otro docente'`). En tres repeticiones inmediatas: 851/851 cada una.

**Causa:** el servicio lee el cuerpo de error (Blob) con `Blob.text()`, que el navegador resuelve asíncronamente y sin plazo fijo. Una espera de un número fijo de ciclos no garantiza que la lectura haya terminado: bajo la carga de la suite completa no siempre alcanzaba. **No es un defecto de producción:** el código de DD-11 no se modificó (SHA-256 de `participaciones-dc92.api.ts` y `panel-participaciones-dc92.ts` idéntico antes y después).

**Corrección, solo en la prueba:**

- Se eliminó `esperarLecturaBlob()`, la espera de 5 ciclos.
- El nuevo `errorJsonObservado()` crea el Blob de error, espía su `text()` y devuelve la promesa real de lectura.
- `TestRequest.flush` entrega ese mismo Blob (`_toBlob` devuelve la instancia recibida). El servicio se suscribe a la promesa durante `flush`, antes de que la prueba la espere. Por eso, cuando la prueba retoma tras `await lectura()`, el manejador del servicio ya llevó el error al componente.
- No hay temporizadores ni plazos.
- **Aserciones:** se conservan todas (ningún archivo guardado; mensaje de sesión ajena; mensaje de reporte no habilitado). Se añadieron: el botón vuelve a estar habilitado y el mensaje incluye `HTTP 403 · M4-SESION-AJENA` y `HTTP 404`.

**Resultados reales tras la corrección:**

| Verificación | Resultado |
|---|---|
| Robustez: retraso inyectado temporalmente de 200 ms en la lectura del Blob (después se restauró el archivo, idéntico) | 29/29 |
| `fe61-participaciones-dc92.spec.ts` repetido 10 veces | 10 de 10 corridas con 29/29 |
| FE-61 (Fases 1 y 2, D-05) | 75/75 |
| Suite Angular completa, 3 corridas | 851/851 en las 3 |
| TypeScript (`tsconfig.app.json`, `tsconfig.spec.json`) | sin errores |
| Prettier (`.spec` DD-11 y archivos D-05) | conforme |

La espera anterior de 5 ciclos no se ejecutó con el retraso de 200 ms. Que fallaría se deduce de que 5 × `setTimeout(0)` es mucho menor que 200 ms; no se midió.

Builds repetidos tras la corrección D-05: `production`, `qa`, `qa-navegacion`, `demo` y `development` **5/5 correctos**, sin errores. `production` mantiene los mismos 4 avisos previos, ajenos a FE-61. `npm run check:urls`: sin URLs de backend codificadas.
