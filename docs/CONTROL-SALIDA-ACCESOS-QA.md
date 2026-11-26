# Control de salida: accesos rápidos QA

Antes de publicar una rama compartida o actualizar el portal de presentación:

1. Compilar el portal con `npx ng build --configuration=dc106-qa --output-path=dist/qa-demo`.
2. Ejecutar `node scripts/verificar-accesos-qa.mjs dc106-qa dist/qa-demo/browser` sobre **el mismo directorio** que copiará Docker. No empaquetar el último `dist` genérico después de compilar otros perfiles.
3. Comprobar también el artefacto de producción con el perfil `production` y el visor opcional con `dc106-qa-sim`. Ambos deben mantener los accesos rápidos deshabilitados. El control comprueba el indicador del bundle, no sustituye las comprobaciones de autorización del servidor.
4. Confirmar en Compose `prisaly-dc105-local`: puerto 18175 en loopback, `PRISALY_QA_ACCESO_RAPIDO_ENABLED=true`, origen exacto `http://localhost:18175` y secretos existentes montados. No imprimir configuración completa, secretos ni respuestas con tokens. Nunca trasladar ese override a producción.
5. En una sesión limpia abrir `/acceso`; pulsar cada botón por separado, cerrar sesión entre roles y comprobar administrador/docente en `/dashboard` con identidad verificada, estudiante en `/estudiante/portal`. Probar recarga y navegación académica afectada. Si falla, detener la publicación.
6. Registrar SHA, perfil de compilación, imagen desplegada y resultado de los tres roles. Publicar únicamente con la autorización correspondiente; este control no publica ramas.

El script es de solo lectura y no inicia sesiones. Su reconocimiento del indicador depende del formato actual de los bundles Angular; un cambio de compilador exige revisar el control.

## Diagnóstico P0 del 26 de noviembre de 2026

Durante esta intervención el portal 18175 ya mostraba los tres botones. Los tres iniciaron sesión correctamente en el navegador: Administrador QA DC106 (Administrador · Identidad verificada), Docente Demostración (Docente · Identidad verificada), y estudiante con Mis convocatorias. Se cerraron las tres sesiones de prueba. No se reconstruyeron imágenes ni se reiniciaron servicios.

El código desplegado procede de `PRISALY-REVISION-DEVELOP/PRISALY-Front`, rama `trabajo/cierre-integral-20261126`, HEAD previo `50008275c57cdca60f1b6dd4a34457ff1ba2e4ac`. La copia `PRISALY-ENTREGA/PRISALY-Front` es otra línea y conserva cambios anteriores sin tocar.

La condición exacta que oculta el bloque es `accesoRapidoQa !== true` en `acceso-roles.ts`. `environment.dc106-qa.ts` lo habilita; `environment.dc106-qa-sim.ts` lo sobrescribe a false; producción no lo habilita. El backend observado mantiene el indicador QA activado. El artefacto de presentación inspeccionado contiene `accesoRapidoQa:!0`. Por tanto no se reprodujo la desaparición y no se puede afirmar qué compilación o caché la produjo anteriormente. Empaquetar producción o el visor en 18175 reproduciría esa condición; el control añadido detecta esa confusión antes de desplegar.

Historia: `3387301` incorporó el bloque DC-115; el registro DC-117 muestra recreación del backend. `fec3f337` (DC-121) es antecesor del HEAD revisado y su evidencia ya registra los tres accesos existentes. La corrección preventiva no cambia componentes, rutas, estilos, autenticación ni DC-121.

`DC-DEMO-112/PREPARAR-ACCESO-RAPIDO-QA.ps1` prepara solo la credencial administrativa mediante DPAPI y recrea el backend con una lista histórica de overrides. No controla la compilación Angular ni restaura por sí mismo los tres botones. No se ejecutó: los accesos funcionan y su lista omite los overrides recientes DC-118/cierre; no conviene aplicarla ciegamente sobre este despliegue.

Limitación: no hay evidencia del navegador ni del bundle del momento original del fallo. Las verificaciones actuales certifican acceso y dashboard, no repiten todas las operaciones funcionales DC-121 ni la integración Unreal.

## Resultado de verificación de esta intervención

- Navegador: administrador, docente y estudiante aprobados con cierre de sesión entre roles.
- Angular: acceso-roles.spec.ts y m1-personal-rutas-qa.spec.ts, 6/6 aprobadas en ChromeHeadless.
- Control de artefactos: presentación, producción y visor aprobados; dos casos negativos rechazados (visor como presentación y QA como producción).
- Durante la revisión apareció el commit ajeno 0f6997a; se preservó. El estado inicial de la aplicación ya era funcional, por lo que no se realizó un despliegue correctivo.

