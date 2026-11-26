> **OBSOLETO (DC-SIM-LIMPIEZA-01, 26/11/2026):** documento histórico del simulador 2D/2.5D, ya retirado. El único simulador oficial es MUNDO-24 (ver `docs/SIMULADOR-2D5-RETIRADO.md`).

# 05 — Auditoría del simulador (Phaser, 2.5D, SIM-01, Unreal)

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Solo lectura.

## Rutas del simulador (verificadas en `app.routes.ts`)

| Ruta | Componente | Guard | Clasificación FE-58 |
|---|---|---|---|
| `/simulador` | redirige a `simulador-unreal` | (redirección) | A |
| `/simulador-tecnico-2d5` | `SimuladorTemporal` | `requiereEntornoDemostracion` | A (demo) |
| `/simulador-integrado` | `SimuladorIntegradoPage` | `requiereEntornoDemostracion` | A/B (solo demo activa) |
| `/simulador-unreal` | `SimuladorUnrealPage` | `requiereEntornoDemostracion` | A (demo) |

Todas las rutas del simulador exigen el entorno `demo` (`DEMOSTRACIONES_HABILITADAS === true`). Fuera de `demo`, el guard redirige (login o aviso). **No hay recorrido académico autenticado del simulador activo.**

## Phaser 2.5D (`mundo-tecnico/`)

| Componente | Rol | Estado |
|---|---|---|
| `contrato-visual.ts` | `PaqueteVisual`, `RecursoVisual`, `CapaVisual`, `AnimacionVisual`, `validarPaqueteVisual` | IMPLEMENTADO_NO_PROBADO (tipos + validación) |
| `adaptador-visual.ts` | precarga de sprites, `InstanciaVisual` | IMPLEMENTADO_NO_PROBADO |
| `phaser-mundo.ts` | escena Phaser | IMPLEMENTADO_NO_PROBADO |
| `paquete-visual.ts` | manifiesto de recursos (hospital/explorador/árbol) | IMPLEMENTADO_NO_PROBADO (validarPaqueteVisual OK) |
| `navegacion-tecnica.ts` / `movimiento-tecnico.ts` / `proyeccion-tecnica.ts` / `volumen-calibracion.ts` / `personaje-tecnico.ts` | geometría y movimiento | IMPLEMENTADO_NO_PROBADO (specs) |

Persistencia: el mundo Phaser conserva estado **en memoria** (visitas, posición). No persiste en backend ni se recupera tras recargar.

## SIM-01 (`narrativa/`)

| Componente | Rol | Estado |
|---|---|---|
| `motor-narrativo.ts` | motor puro (escenas, decisiones, consecuencias, transiciones, retroceso) | IMPLEMENTADO_NO_PROBADO (specs) |
| `adaptador-guion-m3.ts` | adapta contenido M3 a `GuionNarrativo` | PARCIAL (existe; consumo real no confirmado) |
| `enlace-narrativo.ts` | vincula decisión narrativa ↔ respuesta académica | IMPLEMENTADO_NO_PROBADO (specs) |

Separación de responsabilidades: SIM-01 controla narrativa; **no** guarda respuestas ni intentos. La persistencia académica es de M5.

## Unreal (`unreal/`)

| Componente | Rol | Estado |
|---|---|---|
| `reproductor-unreal.ts` | Pixel Streaming (`@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`) | IMPLEMENTADO_NO_PROBADO |
| `transporte-pixel-streaming.ts` | transporte de mensajes | IMPLEMENTADO_NO_PROBADO |
| `puente-unreal.ts` + `protocolo/` | puente y validación de mensajes | IMPLEMENTADO_NO_PROBADO |
| `hospital-unreal.ts` / `hospital-narrativo-unreal.ts` / `correspondencia-mundo.ts` | correspondencia escena/mundo | PARCIAL (visual) |

Estado Unreal: integración técnica (Pixel Streaming) presente con protocolo de mensajes, pero **no hay evidencia de ejecución real** contra un servidor Unreal. Clasificado como visual/interactivo pendiente de prueba conjunta.

## Participación (M5) en el simulador

`ParticipacionGateway` (default) = `ParticipacionPendienteGateway`: **todas** las operaciones lanzan `ContratoPendienteError`. El simulador **no registra intentos ni respuestas** en la modalidad por defecto. `ParticipacionHttpGateway` (opt-in, no registrado) solo implementa 3 operaciones (GET intento, GET contenido, PUT respuesta).

## Conclusión del simulador

- El simulador es **demostración técnica** (categoría A): Phaser, SIM-01 y Unreal funcionan como presentación/interacción local.
- **No hay flujo académico completo** (estudiante autenticado → intento real → persistencia M5) activo.
- La narrativa SIM-01 está separada de M5 (correcto), pero el puente `EnlaceNarrativo → ParticipacionGateway → M5` está en modo pendiente.
