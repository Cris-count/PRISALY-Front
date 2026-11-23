# Auditoría Codex — Integración Fullstack 01

Fecha: 2026-11-23. Repositorio: `Cris-count/PRISALY-Front`. Alcance: Frontend, diff `b0f6236eacb78dac10b0b3963c27618175714056..f69e1b6d1ca533cae9f0a3d92aa6dc4062bb737b`.

## Resultado

No se encontró un fallo bloqueante que justifique revertir el merge. La suite completa y los cuatro builds solicitados pasaron localmente. **El merge no tiene CI de GitHub Actions asociado**: el workflow `frontend-ci.yml` solo se activa por pull requests a `develop`, y este merge se publicó directamente. Es una limitación de trazabilidad que debe corregirse en el proceso de integración; los resultados locales no son un check remoto aprobado.

## Git y alcance

- Tras `git fetch origin`, `origin/develop` era `f69e1b6d1ca533cae9f0a3d92aa6dc4062bb737b`, con padres `b0f6236eacb78dac10b0b3963c27618175714056` y `ada9874d2e332483d7cf167f00f0f0c36c4aa6ae`. No había otro commit posterior en la referencia consultada.
- El diff incluye 29 archivos: configuración QA, navegación, componentes y pruebas, ajustes visuales y tres documentos. No cambia Backend ni motores del simulador. `git diff --check` no informó errores.
- Tres plantillas de dashboard presentan reindentado amplio asociado a bloques condicionales del modo operativo. Al ignorar espacios, el diff es sustancialmente menor; no se identificó reformateo de archivos ajenos al alcance.
- Verificación en worktree separado, HEAD inicial `f69e1b6`, usando enlace a las dependencias ya instaladas de `PRISALY-Front-58`; no se efectuó instalación limpia.

## Seguridad y comportamiento

- El guard FE-58, sesión de personal, interceptor HTTP y vigilancia de acceso `/me` no cambiaron directamente en este diff. La factoría del mapa efectivo sí cambió y, por diseño, altera las decisiones del guard en `qa-navegacion`; el Backend sigue siendo responsable de autorizar operaciones. Los tests cubren comportamientos de sesión, 401/403 y revocación simulados. No se repitió una revocación contra Backend real.
- `mapeoConHabilitacionQa` exige `production === false`, `personalQaHabilitado === true` y un array explícito; filtra por cuatro rutas autorizadas existentes con requisito aprobado. Solo cambia `habilitada`, sin sustituir requisitos de permisos o rol. Producción, desarrollo, QA ordinario y demo conservan el mapa oficial con sus seis rutas deshabilitadas; las cuatro se habilitan exclusivamente en la configuración `qa-navegacion` auditada.
- Navegación QA de personal: la identidad válida y los permisos deciden las opciones; un rol distinto de `ADMINISTRADOR`, incluido `DocenteBruno`, usa las opciones docentes sujetas a `decidirRuta`. Identidad inválida o logout deja solo Inicio en el menú de personal. El modo de presentación demo conserva navegación demostrativa, distinta de una sesión QA de personal.
- Búsqueda en las líneas añadidas del diff de claves privadas, tokens GitHub, claves AWS y asignaciones típicas de contraseña, secreto o token: sin coincidencias. Es una búsqueda por patrones, no una garantía exhaustiva.
- No se activaron DD-02 ni M5 por esta auditoría. El build local `qa-navegacion` apunta a `localhost:18094`; no debe tratarse como configuración de producción.

## Verificaciones propias

Ejecutadas en Windows sobre `f69e1b6`, ChromeHeadless y dependencias existentes:

| Verificación | Resultado |
| --- | --- |
| `ng test --watch=false --browsers=ChromeHeadless` | 762/762 SUCCESS, salida 0 |
| Build `production` | salida 0 |
| Build `qa` | salida 0 |
| Build `demo` | salida 0 |
| Build `qa-navegacion` | salida 0 |
| TypeScript aplicación y tests, sin emisión | salida 0 en ambos |

Karma informó advertencias al cerrar Chrome tras completar las pruebas. Claude reportó previamente un recorrido de navegador con Backend QA real; esta auditoría no lo repitió y no lo presenta como resultado propio. Las comprobaciones locales no confirman revocaciones reales, integración E2E completa ni el estado de un despliegue.

## CI y recomendaciones

La API de GitHub no reportó check runs, estados ni ejecuciones de Actions para el merge de `develop`; el estado combinado aparece `pending` sin estados. Configurar un proceso que valide también las actualizaciones directas de `develop` o exigir PR para garantizar un check remoto, de acuerdo con las políticas del repositorio. El CI del PR de este documento, si se ejecuta, corresponderá al PR de auditoría, no al merge histórico.

Mantener pendiente la comprobación real de contratos, revocación y QA aislado con Ingrid, además de las confirmaciones de integración de Nicolás y Cristian ya solicitadas en el PR FE-58. No desplegar ni habilitar funcionalidades restringidas sin su autorización y validaciones correspondientes.
