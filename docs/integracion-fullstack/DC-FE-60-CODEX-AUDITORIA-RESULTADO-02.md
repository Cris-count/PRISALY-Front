# DC-FE-60 — Auditoría independiente: resultado 02

Fecha: 2026-11-23/24, hora local. Dictamen: **BLOQUEADO POR DEPENDENCIA BACKEND** para la compatibilidad integral y el recorrido estudiantil; también existe una **decisión académica pendiente** sobre el modelo de acceso DD-02. Los resultados locales de Frontend son favorables, pero no se ha reproducido el recorrido docente completo contra el Backend actualizado. No se solicita aún publicación como si esa compatibilidad estuviera demostrada.

## 1. Git, protección y alcance

- Frontend: `C:\Users\57316\OneDrive\Escritorio\PRISALY\PRISALY-Front-FULLSTACK-01`; rama `integration/fe-60-plataforma-funcional`, HEAD `c87045a92500adafe5b78742f35d8ffbb7c80dec`. Tras fetch, `origin/develop` está en el mismo SHA; no hay commits locales FE-60 y no se detectó avance remoto respecto a la base.
- Estado original: 16 archivos modificados y siete nuevos. Respaldo anterior al fetch: `C:\Users\57316\OneDrive\Escritorio\PRISALY\FE-60-respaldo-auditoria-02.zip`, con archivos afectados, diff binario y estado. No se realizó reset, clean, merge, commit, push ni PR. Este informe es un archivo nuevo adicional sin commit.
- Modificados: `src/app/app.routes.ts`; `features/autenticacion/habilitacion-qa-navegacion.{ts,spec.ts}`, `login-page.{ts,html,css}`; `features/dashboard/dashboard-administracion.{ts,html}`, `dashboard-layout.{ts,html}`, `dashboard.routes.ts`, `dashboard.spec.ts`, `navegacion-rol.{ts,spec.ts}`; `environments/environment.demo.ts`, `environment.qa-navegacion.ts`.
- Nuevos originales: `docs/integracion-fullstack/DC-FE-60-INTEGRACION-FUNCIONAL-RESULTADO.md`; `features/autenticacion/acceso-estudiante-demo.{ts,spec.ts}`, `acceso-estudiante-real.{ts,spec.ts}`; `features/dashboard/dashboard-perfil.{ts,spec.ts}` (rutas de código bajo `src/app`).
- `git diff --check`: sin errores. Los guards, interceptor de personal, sesión, vigilancia `/me` y mapa oficial FE-58 no se modificaron directamente. La lista de QA sí se amplía a seis rutas, incluidas las dos administrativas; su autorización requiere aún guard y permisos/rol.

## 2. Backend y diferencia de versiones

- Backend probado por Claude: `d8171e0f1c2ba8ae534fc33ca078217d1ac9bdf9`, worktree `PRISALY-Backen-QA`; se conserva un dump no rastreado existente. El servicio local en 18094 estaba escuchando, pero no se confirmó de forma independiente la identidad del proceso que lo sirve.
- Tras fetch en Backend, `origin/develop`: `5d61972d2f5e54758ab67e1dad4e6a2e74d1c2a6`; QA local está 10 commits detrás. Diff: 88 archivos; incorpora M4 (retiro de lectura de convocatorias sin autorización), listado M3 apagado por defecto, evaluación M6 protegida y apagada, cambios de políticas/cierre M5 y paquete de operaciones locales. El cambio M4 es relevante para el flujo docente.
- No se levantó ni probó una instancia aislada de `5d61972`: los puertos Frontend documentados y PostgreSQL 5434 no estaban disponibles, y el servicio existente no demuestra ser una instalación aislada de ese SHA. No se alteró Backend ni su base, ni se declaró compatibilidad definitiva. Repetir el flujo en un QA aislado, con configuración y datos autorizados, es condición pendiente.

## 3. Recorrido docente y persistencia

El informe de Claude afirma que los formularios Angular ejecutaron login → caso → escenario → pregunta → opciones → rúbrica → publicación → sesión → convocatoria contra `d8171e0`. Se revisó su evidencia local `INTEGRACION-FULLSTACK-EVIDENCIAS/fe60-postgresql.txt`: contiene nueve filas y los identificadores completos del caso `a955daa0-ed3c-499d-ba7e-22234103a6a4` y la sesión `b1ff62ea-413f-4ca5-b7da-c67d9b134a0e`. Es una evidencia guardada, no una nueva consulta a PostgreSQL ni una repetición de interfaz por Codex. El informe de Claude identifica la acción de interfaz como origen; el archivo de filas por sí solo no demuestra el origen de cada escritura. Existen trazas de recorridos anteriores, que no deben confundirse con estos identificadores.

En `fe60-negativas.txt`, Claude registró 401 sin token e identidad inválida/inactiva; 403 con DTO válido para creación sin permiso, administrador sin permiso docente y docente en endpoint administrativo. Se observan intentos iniciales con DTO inválido que dieron 400, seguidos de reintentos válidos 403. La evidencia no equivale a una nueva prueba de revocación real.

Pruebas HTTP propias limitadas al servicio existente: `/v1/personal/me` con token inválido → 401; sin sesión → timeout inicial y repetición 401; solicitud DD-02 con correo ficticio no existente → 501. No se utilizaron credenciales reales ni se crearon cuentas. Cuenta inactiva, ausencia de permisos, administrador en operación docente, acceso administrativo directo, revocación y recorrido real no fueron repetidos independientemente. Los tests Angular cubren escenarios simulados; las decisiones de operaciones corresponden al Backend.

## 4. Paneles, entornos y estudiante

- Administrador: el código y tests incorporan opciones administrativas sujetas al mapeo/guard y perfil; se revisó el informe de validación previa de Claude. Gestión real de estudiantes y métricas dependen de contratos Backend.
- Docente: menú basado en identidad y permisos, perfil `/me`, sin enlace estudiantil para personal. El acceso directo administrativo depende del guard FE-58. La ruta QA de administración está habilitada en el mapeo QA, no para el docente sin rol administrador.
- Demo: estudiante ficticio con sesión local y distintivo expreso; el hash y el verificador están en el cliente y no son protección ni credencial de producción. No demuestra identidad estudiantil real.
- Estudiante real: el código prepara `/estudiante/acceso` y maneja 501 como DD-02 pendiente. El controlador Backend `5d61972` confirma `solicitar` por correo y `validar` con challenge y código de 8 dígitos, con cookie al éxito y flag desactivado por defecto. La pantalla preparada no implica cuenta, registro o navegación estudiantil funcionales.
- Ingrid/Dirección Central: decidir código temporal frente a requisito de correo/contraseña; aprobar flags y V014–V016; definir correo, alta y vínculo de cuentas; resolver CORS con credenciales o proxy mismo origen y probar la cookie; comprobar revocación y provisión sin cuentas inventadas. Los cinco minutos y cinco intentos constan en el informe previo y requieren prueba integrada cuando se habilite el servicio.
- En producción, desarrollo, QA ordinario y demo la matriz oficial mantiene seis rutas deshabilitadas. `qa-navegacion` requiere ambiente no productivo, personal QA y lista explícita, y habilita seis. El build productivo inspeccionado no contiene `localhost:18094` ni el identificador de configuración de estudiante demo. QA ordinario contiene la URL local configurada para QA; no implica por sí misma habilitación de rutas. No se activaron DD-02, M5 ni rutas de producción.

## 5. Verificaciones propias

- Suite Angular completa, `ng test --watch=false --browsers=ChromeHeadless`, dos trabajadores de compilación: **776/776 SUCCESS**, salida 0. No se aumentaron timeouts ni eliminaron tests. El informe anterior de Claude registró **775/776** por timeout de 5 segundos a 2560 px y 38/38 en aislado; una ejecución completa posterior favorable no demuestra ausencia de intermitencia. Al iniciar se observaron procesos de Chrome, Node y Java existentes; no se detuvieron servicios ajenos ni se midió el consumo histórico de CPU de la falla.
- Builds `production`, `qa`, `demo`, `qa-navegacion`: salida 0. `tsc` aplicación y spec: salida 0. `npm run check:urls`: salida 0.
- Dependencias compartidas con `PRISALY-Front-58`; no se hizo instalación limpia. Búsqueda por patrones en diff y archivos nuevos de claves privadas, tokens GitHub, claves AWS y asignaciones literales comunes: cero coincidencias; no garantiza ausencia de todos los secretos.
- No se cambió código funcional durante la auditoría. No se verificó en vivo la persistencia, ni la revocación real, ni el recorrido del Backend actualizado. Riesgo adicional: una respuesta 204 futura de validación no prueba por sí sola que una cookie cruzada quede utilizable; validar CORS, cookie e identidad de extremo a extremo antes de activar DD-02.

## 6. Preparación para autorización posterior

Propuesta de commits lógicos, sujetos a revisión de la división de archivos compartidos: (1) navegación por roles, perfil y configuración QA con tests; (2) acceso estudiantil real preparado y demo claramente separada con tests; (3) documentación y auditoría. No se preparó índice parcial ni se hicieron commits.

Propuesta de PR: «Preparar navegación funcional y acceso estudiantil pendiente en FE-60». Describir que QA habilita seis rutas bajo guards, que DD-02 no está habilitado, que 776 pruebas y cuatro builds pasaron localmente, y que el recorrido docente previo se hizo en `d8171e0`, no en `5d61972`. Adjuntar matriz de entornos, la diferencia M4, resultados negativos, evidencia de persistencia y pendientes. Revisar exclusión de información sensible antes de publicar.

Antes de solicitar publicación integral: repetir caso → escenario → pregunta → rúbrica → sesión → convocatoria en QA aislado contra `5d61972` o el SHA vigente, comprobar persistencia y autorizaciones/revocación; obtener decisión DD-02 y plan de CORS y migraciones. Si se propone publicación solo del alcance docente, Dirección Central debe decidir ese alcance expresamente con las limitaciones anteriores. Esta orden exige autorización específica posterior para commits, push y PR.
