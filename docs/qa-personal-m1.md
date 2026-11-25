# QA de personal M1 — I5

## Activación explícita

Producción y desarrollo normal conservan M1 deshabilitado. Se prepara `npx ng serve --configuration qa --port 4200` para el entorno autorizado, con API centralizada `http://localhost:18094/api` y referencia Backend `bda71ca2f5f354edf36e830bc0efdfbddbbd5b05`.

No se creó ni sustituyó un proxy. Si hace falta el proxy externo, QA debe proporcionar su ubicación y procedimiento verificados. La configuración no contiene credenciales.

El login existente conserva su presentación de 6,8 segundos. Solo en QA usa `SesionPersonalM1`: POST autenticar, token opaco en memoria y GET me antes de navegar. El campo de contraseña se limpia al enviar. No hay restauración, renovación ni almacenamiento persistente de sesión.

El cierre espera POST cerrar-sesion con 204. Durante el cierre y ante fallo se bloquea el contenido local; el fallo no afirma revocación y permite reintento manual. Un 401 protegido invalida la identidad. Un 403 no dispara logout automático. La autorización definitiva corresponde al Backend.

## Permisos por ruta pendientes

No se recibió el mapeo oficial de permisos para administración, docencia o configuración. En QA esas rutas quedan bloqueadas y redirigen al inicio con aviso. No se infieren permisos del rol. El inicio exige identidad verificada.

La presentación estudiantil permanece independiente: no autentica estudiantes, no activa DD-02 ni participación M5. Fuera de QA se conserva la navegación demostrativa anterior.

## Dependencias formales de Dirección Central e Ingrid QA

- Proxy externo y procedimiento verificados, si corresponde.
- Entrega segura al operador de cuentas desechables de administrador y docente; sin código ni chat.
- Mapeo oficial de permisos efectivos por ruta.
- Disponibilidad de localhost:18094 y confirmación del SHA Backend autorizado.
- Coordinación del reinicio Backend para comprobar invalidación; no reiniciar sin autorización.

La comprobación de conexión a `/api/health` obtuvo `ECONNREFUSED`. No es una prueba de autenticación ni demuestra que el endpoint no exista: no se estableció conexión TCP. No se buscaron secretos. La revisión focalizada de archivos versionados Frontend no encontró configuración proxy/QA previa.

## Validación pendiente

Las pruebas con `HttpTestingController` son aisladas con mocks; no equivalen a HTTP real ni E2E.

Pendientes: login de ambas cuentas reales, permisos permitidos/denegados según mapeo, me real, cierre y comprobación de revocación, recarga, credenciales incorrectas, 429 y reinicio coordinado. No se declara cumplida la aceptación QA. No generar intentos artificiales ni reiniciar servicios para completar estos casos sin el procedimiento autorizado.

I5 parte del commit local I4 `4e5ccf5c4a7821318afdc0ae6a3d8049195a3eb2`. Mientras I4 no esté fusionado, el Draft PR incluye explícitamente esta dependencia.
