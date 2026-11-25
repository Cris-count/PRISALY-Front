# Tipado y coordinador de participación

Implementación del incremento aislado de la etapa 3, 2026-11-13.

## Cambios

- `models/participacion.models.ts`: DTO existentes extraídos de N9, sin cambiar su forma REST.
- `services/participacion.gateway.ts`: GET y PUT ahora retornan `IntentoM5` y `RespuestaGuardadaM5`; las operaciones pendientes mantienen `unknown`.
- `services/participacion-http.gateway.ts`: usa los modelos compartidos y los reexporta para conservar imports existentes. Rutas, credenciales y validaciones se mantienen.
- `services/participacion.coordinador.ts`: consumidor inyectable del gateway con carga de intento, selección pendiente, confirmaciones, revisión esperada, exclusión de escrituras simultáneas y reconciliación explícita por GET.
- `services/participacion.coordinador.spec.ts`: pruebas del coordinador junto a N9 mediante `HttpTestingController`.

Las rutas de código anteriores son relativas a `src/app/features/simulador/`.

## Uso previsto

El servicio no se registra globalmente ni se conecta aún al store o panel. Un consumidor futuro lo proveerá en el ciclo de vida de la página, le entregará el ID obtenido por una fuente autorizada mediante `cargar`, y resolverá la decisión a pregunta/opción antes de llamar a `guardar`.

`guardar` acepta un callback opcional para continuar después de una confirmación PUT válida. Si la opción ya está confirmada en la instantánea actual, no repite HTTP. El consumidor debe validar que la decisión narrativa sigue disponible antes de aplicar efectos; el coordinador no conoce ni modifica el motor.

Después de un guardado incierto o conflicto se debe llamar a `verificar`. Esta consulta no reenvía la escritura ni ejecuta callbacks antiguos. Si M5 confirma otra opción, la intención permanece pendiente; un nuevo `guardar` requiere una acción explícita del consumidor. Si coincide, el estado pasa a guardado y el consumidor puede decidir explícitamente cómo continuar.

Cambiar de carga, cerrar o destruir el servicio cancela suscripciones e invalida el contexto anterior. Esto no revierte escrituras que pudieran haber llegado al servidor.

## Alcance pendiente

No implementa todavía el vínculo de contenido autorizado, eventos del panel, selección narrativa en dos pasos ni mensajes visuales del store. Estos requieren coordinación de archivos con Cristian y el contrato de contenido estudiantil. No implementa inicio, finalización ni evaluación. El proveedor HTTP continúa desactivado por defecto.

No hay reglas académicas nuevas sobre edición, retroceso, tiempo o repetición. La posibilidad de enviar una nueva opción en el servicio no autoriza a mostrar esa acción en la interfaz sin las reglas aprobadas.

## Validación

- Node incluido con la aplicación: 24.22.1, compatible con el lockfile; no se cambió Node global.
- Dependencias instaladas con `npm ci`, sin modificar manifiestos ni lockfile.
- Compilación de producción y tipos de aplicación/pruebas: correctos.
- Suite completa en Chrome Headless: 124 pruebas correctas, incluidas 14 del coordinador con N9 y HTTP interceptado, sin Backend real.
- Verificación de URLs de API y espacios del diff: correctas.

La compilación y suite iniciales también verifican la base previamente pendiente en la etapa 2. Esto no acredita autenticación estudiantil real, permisos en QA ni E2E con persistencia.
