# Configuración de la API del frontend

## Dónde vive la URL

La URL base del backend se define **solo** en `src/environments/`:

| Archivo | Se usa en | `apiBaseUrl` |
| --- | --- | --- |
| `environment.development.ts` | `ng serve`, `ng build --configuration development` | `http://localhost:8080/api` |
| `environment.ts` | `ng build` (producción / despliegue) | `/api` |

`angular.json` reemplaza `environment.ts` por `environment.development.ts` en la configuración `development`.

El valor de desarrollo coincide con los valores por defecto del backend (`PRISALY-Backen/app/src/main/resources/application.yml`): `APP_PORT=8080`, `server.servlet.context-path=/api` y CORS para `http://localhost:4200`.

Los servicios no leen el entorno directamente: inyectan `API_CONFIG` (`src/app/core/config/api.config.ts`) y construyen rutas con `construirUrlApi(config, 'recurso')`, que rechaza rutas absolutas y la repetición del segmento base.

`npm run check:urls` falla si aparece una URL de backend (`http://`, `https://`, `localhost`, `127.0.0.1`) en `src/app`.

No se colocan credenciales en el frontend: los archivos de entorno terminan en el bundle público.

## Docker (pendiente de decisión del Integrante 1)

El navegador **no** puede resolver nombres internos de Compose como `backend:8080`; esa dirección solo existe dentro de la red de Docker. Opciones para el despliegue:

1. **Proxy inverso en el mismo origen (valor actual de `environment.ts`).** El contenedor del frontend (por ejemplo nginx) sirve la aplicación y reenvía `/api` al servicio del backend dentro de la red de Compose. El navegador solo ve `/api`, no hay CORS y la imagen no depende del entorno.
2. **URL pública del backend.** Si el backend se publica en otro origen, cambiar `apiBaseUrl` en `environment.ts` (requiere reconstruir la imagen) y añadir ese origen a `CORS_ORIGINS` del backend.

Ninguna opción está aprobada todavía. Este repositorio no incluye Dockerfile ni cambios en Compose: los coordina el Integrante 1.

## Estado de la integración con M5

`ParticipacionGateway` (`src/app/features/simulador/services/participacion.gateway.ts`) define las operaciones conceptuales del recorrido estudiantil. La implementación actual (`ParticipacionPendienteGateway`) **falla en todas ellas** con `ContratoPendienteError` porque no existen endpoints REST ni OpenAPI aprobados. No simula respuestas del servidor.

| Operación | Estado | Bloqueada por |
| --- | --- | --- |
| consultarSesionesAutorizadas | bloqueada | contrato REST de M5 y elegibilidad de M4 |
| iniciarIntento | bloqueada | contrato REST de M5 |
| consultarIntento | bloqueada | contrato REST de M5 |
| registrarRespuesta | bloqueada | contrato REST de M5; formato de pregunta/opción de M3 |
| consultarProgreso | bloqueada | contrato REST de M5 |
| reanudarIntento | bloqueada | contrato REST de M5 |
| finalizarIntento | bloqueada | contrato REST de M5 |

Además, el backend exige autenticación para todo excepto `/health`. M1 implementa por ahora solo la autenticación de personal (provisional); el acceso estudiantil (DD-02) no existe, así que una llamada real del estudiante recibiría 401.

## Errores de la API en el simulador

`clasificarErrorApi` (`src/app/core/http/clasificar-error-api.ts`) traduce un `HttpErrorResponse` a un mensaje para el estudiante. Solo usa semántica ya establecida:

| Estado | Presentación | ¿Reintentar? |
| --- | --- | --- |
| 0 (sin conexión) | Revisar la red | Sí |
| 401 | La sesión no es válida o venció: volver a ingresar | No |
| 403 | Sin acceso al recurso | No |
| 404 | El recurso no existe | No |
| 409 | Conflicto con el estado actual | No |
| 5xx | Error del servidor | Sí |

401 y 403 siguen el contrato vigente de la cadena de seguridad (`{code, message}` de M1). No se muestran los mensajes del servidor y no se depende de los códigos propuestos para M5, que ARQ-008.3 aún no ratifica. Reintentar repite la misma consulta; nunca inicia un intento.

## Pendiente de contratos

- **Reanudación visual de un intento real:** requiere la consulta de intento de M5, con identidad del estudiante (DD-02) y titularidad (M4).
- **Persistencia de respuestas:** las selecciones solo existen en la vista hasta que exista `registrarRespuesta` en ARQ-008.3. La demostración nunca se presenta como persistida.
- **Acceso del estudiante:** M1 responde 501 en su ruta de estudiante (DD-02).
