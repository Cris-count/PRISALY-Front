# Simulador — Preparación del ensayo QA

Fecha: 14 de noviembre de 2026. Alcance: preparar el ensayo; no ejecutarlo ni habilitar acceso.

## Referencias

- Frontend publicado: `6651b84238972077ec52550904e1ddfe7dc40a7b`, rama `feature/simulador-integracion-nicolas`.
- PR Frontend #5 hacia develop: preparado con CI aprobada; último estado comprobado abierto, sin merge autorizado ejecutado.
- Backend contrastado: `bf47bdd3de51e800e340b4847b7b050b70bda3bc`.
- El despliegue QA deberá declarar su SHA exacto. Si difiere, se cotejará únicamente el contrato afectado.

## Información requerida de Backend

| Dato o condición | Estado al preparar este documento |
| --- | --- |
| Responsable del ensayo y autorización del entorno | Pendiente de confirmar. |
| URL real de QA y origen permitido del Frontend | Pendiente; localhost:8080/api y localhost:4200 son valores de desarrollo, no evidencia de QA disponible. |
| SHA desplegado y base desechable o dedicada de pruebas | Pendiente. |
| DD-02 habilitado exclusivamente en QA y esquema compatible verificado por Backend | Pendiente; la configuración base conserva student-access.enabled=false. |
| Flujo de acceso M1 y sesión estudiantil válida | Pendiente; no solicitar ni registrar cookies, tokens, contraseñas o códigos de acceso en Git. |
| Estudiante A titular y estudiante B no titular de su intento | Pendiente; datos exclusivos de QA, sin información personal real. |
| IDs de intento/sesión/caso reales de QA y relaciones comprobadas por Backend | Pendiente; no crear IDs en Angular para suplirlos. |
| Caso publicado y activo con contenido visible/listo para lectura | Pendiente. |
| Casos negativos controlados: UUID inexistente y contenido no disponible | Pendiente; los prepara Backend en su entorno, no mediante cambios desde Angular. |
| Medio de cargar el contexto de lectura y registro HTTP opt-in solo en QA | Pendiente de acordar; no se modifica la ruta productiva ni el proveedor global en esta preparación. |

La fixture Backend `ContenidoIntentoEstudianteHttpIT` en bf47bdd3 demuestra cómo se ensaya en PostgreSQL desechable mediante Testcontainers y sesiones reales de M1. No demuestra que haya un servidor QA persistente levantado ni que un navegador Angular pueda usar esa sesión. No se copian su SQL, claves ni mecanismos de acceso al Frontend.

## Ensayo inicial: solo lectura

No incluye PUT, inicio, finalización ni evaluación. Las escrituras pertenecen a una etapa posterior expresamente acordada.

| Caso | Comprobación esperada |
| --- | --- |
| Sesión A válida, GET /api/v1/estudiantes/intentos/{idIntentoA} | 200; ID, estado, tiempos, respuestas y revisiones coherentes. |
| Sesión A válida, GET /api/v1/estudiantes/intentos/{idIntentoA}/contenido | 200; intento/sesión/caso correctos, campos y nulos válidos, orden por orden y UUID, Cache-Control: no-store. |
| Sin sesión, mismas consultas | 401; sin contenido reservado. |
| Sesión B sobre intento A | 403 según contrato integrado; sin contenido ni identidad ajena. |
| UUID inexistente de QA, con sesión válida | 404; sin contenido del caso. |
| UUID malformado, con sesión válida | 400; sin contenido. |
| Contenido restringido preparado por Backend | 409 con CONTENIDO_INTENTO_NO_DISPONIBLE; sin contenido parcial ni soluciones. |
| Navegador Angular | Cookie emitida por M1 viaja mediante withCredentials; no se lee HttpOnly ni se inyecta identidad; origen/CORS funcionan con la configuración autorizada. |
| Vista de contenido | Se presenta como lectura académica sin vínculo narrativo; no ofrece guardar ni inferir escenas SIM-01. |
| Salir o cambiar contexto | Se cancela la suscripción y se elimina el contenido anterior de la vista. |
| Demostración | Conserva el recorrido sin solicitudes académicas. |

503 de M4, fallos de red y persistencia se mantienen cubiertos por las pruebas Angular; cualquier inyección de fallos reales requerirá un mecanismo QA acordado, sin alterar servicios compartidos.

## Evidencias a recoger

- Fecha, responsables, autorización, URLs/orígenes y SHAs de Frontend/Backend ensayados.
- Matriz de casos con resultado observado y códigos HTTP reales.
- Forma y cabeceras permitidas de las respuestas, sin Set-Cookie ni valores de credenciales.
- Confirmación Backend de ausencia de escrituras en este ensayo de lectura.
- Identificación de pruebas de navegador Angular frente a pruebas HTTP del Backend: ninguna sustituye a la otra.
- Resultado final y bloqueos, sin declarar recorrido completo ni autenticación productiva.

No guardar HAR sin depurar: puede contener sesiones o datos privados. No persistir contenido académico en storage del navegador ni añadir credenciales a archivos de entorno.

## Solicitud preparada para Backend / Dirección Central

> Solicitamos preparar un ensayo QA de solo lectura del simulador contra Backend bf47bdd3 o su versión compatible confirmada. Indiquen responsable, autorización, URL y SHA desplegado, origen de Frontend permitido, flujo real M1/DD-02 y datos de prueba de dos estudiantes con intentos existentes. Necesitamos un caso publicado/activo con preguntas/opciones visibles/listas, un intento ajeno para verificar 403, un UUID inexistente controlado y contenido restringido para verificar 409. Confirmen que la base es desechable o dedicada a pruebas y acuerden el acceso opt-in de Angular. No se habilitarán escrituras, inicio/finalización ni M6. Las credenciales deben gestionarse por el mecanismo autorizado, sin compartirlas en Git ni en este documento.

## Estado y siguiente acción

Preparación documental completada. La ejecución espera confirmación de entorno y datos por Backend. Este documento no autoriza configurar DD-02, activar el proveedor HTTP, ejecutar fixtures ni hacer merge del PR #5.

No se modificó código ni Backend, no se repitieron pruebas y no se ejecutaron llamadas al entorno QA. La solicitud anterior no se envió a otras personas.
