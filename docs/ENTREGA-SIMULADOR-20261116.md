> **OBSOLETO (DC-SIM-LIMPIEZA-01, 26/11/2026):** documento histórico del simulador 2D/2.5D, ya retirado. El único simulador oficial es MUNDO-24 (ver `docs/SIMULADOR-2D5-RETIRADO.md`).

# Entrega compartida del simulador — 16/11/2026

Rama de trabajo: `feature/simulador-integracion-nicolas`, basada en develop `2ce06e07c75d36b092f93dd03363bb3f1b7842d9`. Este documento prepara la publicación autorizada de los cambios locales. El SHA definitivo de la entrega se obtiene del commit que contiene este archivo.

## Contenido para el equipo

- Phaser, proyección provisional de 40°, conversión de clics, rutas y colisiones lógicas separadas del renderizado.
- Tres edificios configurables e interiores provisionales; conservación del mundo, pausa reanudable y bloqueo de comandos mientras hay interfaces superpuestas.
- Libreta Angular demostrativa: pistas explícitas y notas personales solo en memoria, sin persistencia académica ni endpoints nuevos.
- Contrato `PaqueteVisual`, adaptador, especificación de recursos y referencia artística para coordinar con Cristian.
- Ruta técnica `/simulador` y experiencia local `/simulador-integrado`, conservando el flujo de demostración y los contratos académicos existentes.
- Adaptador local M3, documentación y pruebas de integración; las figuras del mundo siguen siendo provisionales.

## Archivos que necesita Cristian

Todos se consultan desde **el mismo commit de esta entrega**, sin mezclar versiones de otras ramas:

| Recurso | Ruta en el repositorio |
|---|---|
| Referencia artística original, bajo el nombre local del proyecto | `public/images/prisaly-perspectiva-02-referencia.png` |
| Contrato y definición real de `PaqueteVisual` | `src/app/features/simulador/mundo-tecnico/contrato-visual.ts` |
| Adaptador gráfico | `src/app/features/simulador/mundo-tecnico/adaptador-visual.ts` |
| Puerto Angular y provider del paquete | `src/app/features/simulador/mundo-tecnico/puerto-mundo.ts` |
| Convenciones de proyección | `src/app/features/simulador/mundo-tecnico/proyeccion-tecnica.ts` |
| `PlantillasEspacio` y eventos | `src/app/features/simulador/exploracion/mapa.models.ts` |
| Anfitrión del recorrido | `src/app/features/simulador/exploracion/recorrido-mapa.ts` |
| Especificación gráfica de prueba | `docs/SIM-FASE4C-INTEGRACION-VISUAL.md` |

La referencia incluida coincide byte a byte con el original `PRISALY_perspectiva_02.png`; SHA-256 `ea602f9d5196b581bbdcd9dc495309392989e9b4f95af6b9fc5685332901977d`. Su nombre local no implica una nueva generación ni se usa como fondo de la ciudad.

Cada integrante debe consultar o comparar los archivos en una carpeta aparte antes de incorporarlos a su checkout. No reemplazar cambios locales de Cristian o Mariana ni hacer un merge automático por el solo hecho de acceder a esta rama.

## Verificación de la base publicada

- Suite completa: **456 pruebas aprobadas** en Chrome Headless.
- Compilación de producción y configuración QA: correctas.
- Advertencia conocida: dependencia Phaser/CommonJS en producción.
- El acceso QA de personal de develop se mantiene opt-in. No se activó identidad estudiantil ni escritura académica por compartir esta rama.
- Detalle de las correcciones y límites de la verificación: [ALINEACION-DEVELOP-20261116.md](ALINEACION-DEVELOP-20261116.md).

```text
npm ci
npm test -- --watch=false --browsers=ChromeHeadless --progress=false
npm run build -- --progress=false
```

Usar una versión de Node compatible con el CLI y Chrome para las pruebas. La verificación local utilizó Node 24.22.1; el helper `scripts/ng-run.js` ya no falsifica su versión.

## Pendientes y documentos históricos

Siguen pendientes los recursos artísticos compatibles de Cristian, su interior real, la persistencia de la libreta y los contratos/autorizaciones necesarios para una participación académica definitiva. La integración artística no se considera terminada por esta publicación.

Los informes de fases 4B, 4C y 5 y la preparación QA registran el estado de sus respectivas intervenciones. Las referencias allí a archivos locales o a falta de publicación describen ese momento. Para consultar los contratos compartidos ahora, usar las rutas y el commit de esta entrega. El ZIP VISUAL-23/25 anterior continúa siendo una copia histórica y no se sobrescribe.
