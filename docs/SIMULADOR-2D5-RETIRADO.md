# Simulador 2D/2.5D: RETIRADO (DC-SIM-LIMPIEZA-01, 26/11/2026)

**MUNDO-24 (Unreal Engine 5.8, Pixel Streaming 2) es el único simulador oficial de PRISALY.** El visor está en `/simulador-unreal`, protegido por `requiereAccesoSimulador`.

## Qué se retiró

El prototipo Phaser («CALIBRACIÓN 2.5D», retícula de 40 × 40, plaza central esquemática, edificios provisionales, caminos dibujados, personajes y árboles simplificados) con todo lo que solo él usaba:

- Páginas: `simulador-temporal` (`/simulador-tecnico-2d5`), `simulador-integrado-page` (`/simulador-integrado`) y `simulador-page` (sin ruta).
- `features/simulador/mundo-tecnico/` (Phaser, proyección y calibración 2.5D, movimiento, navegación, contrato y paquete visual, personajes, fixture del mundo).
- `features/simulador/exploracion/` (mapa, recorridos, confirmación de entrada) y `features/simulador/components/` (escenario 2D, visor 2.5D y la interfaz del cuestionario de esas páginas).
- `services/simulador.store.ts` (estado de las páginas antiguas con el caso de demostración).
- La dependencia `phaser`.

`/simulador`, `/simulador-tecnico-2d5` y `/simulador-integrado` **redirigen al visor de MUNDO-24**. Si MUNDO-24 no está disponible, el visor y el portal muestran su estado de indisponibilidad. No hay ninguna alternativa 2.5D.

## Qué se conservó (compartido con MUNDO-24 o con la gestión académica)

Motor narrativo, adaptador de guion M3, libreta e investigación, coordinador narrativo de interiores, adaptador de pistas, guiones de los interiores de MUNDO-24, modelos, gateways de participación y contenido M5, coordinador de participación y restauración M5 (DC-114), enlace narrativo-académico, puente y protocolo Unreal v1/v1.1 (`caso.configurar`, ACK, contexto visual, restauración y reconexión) y los identificadores canónicos de edificios y zonas (`correspondencia-mundo.ts`, sin los nodos del mundo 2.5D). El guion y el caso de demostración pasaron a `features/simulador/testing/` como fixtures de pruebas.

## Trazabilidad

El código retirado sigue en el historial de Git. La etiqueta local `historico/simulador-2d5-20261126` (`da3d4a2`) marca el último commit que lo contiene. Los documentos de `docs/` anteriores a esta fecha que describen `/simulador-tecnico-2d5`, `/simulador-integrado`, Phaser o el mundo 2.5D son **históricos y obsoletos**.
