# SIM-01 — Motor narrativo de presentación

Implementación de DC-SIM-RAT-01, 8 de noviembre de 2026 (America/Bogota).
Rama: `sim-01/narrativa-desacoplada`.
Base verificada localmente y con `git ls-remote origin refs/heads/feature/simulador-2d`:
`0331392372cee28be226ffa131e66c89f8716099`.

## Uso y comportamiento

Ejecutar `npm start`, abrir `/simulador` y elegir **Ver demostración**.
Avanzar los dos diálogos, elegir conversar u observar, entrar a la escena,
avanzar el diálogo, reunir al grupo, entrar, avanzar y despedirse.
Entrar al cierre y avanzar el último diálogo para terminar la historia.
Las dos rutas visitan cuatro de seis escenas; no es necesario visitar rutas alternativas.
No hay elección correcta o incorrecta ni contenido académico aprobado.

El panel muestra estado y expresión de cada personaje, reutiliza el SVG 2D y el
panel de contexto existentes y cambia la escena al confirmar una transición.
Atrás restaura el estado anterior completo (incluidos efectos y escenas visitadas).
Reiniciar historia solo reinicia la narrativa. Las preguntas mantienen sus selecciones.
Los controles narrativos se pausan durante la confirmación de finalización.
Salir de la demostración destruye el panel; volver crea una historia nueva.
No hay persistencia ni recuperación tras recargar.

## Separación académica

`MotorNarrativo` es una clase TypeScript sin inyección, HTTP, almacenamiento ni
dependencias de `SimuladorStore` o `ParticipacionGateway`. Recibe un guion estático,
protege una copia y expone instantáneas congeladas. Solo admite dos tipos de efecto:
marca narrativa booleana y cambio de estado/expresión de personaje. Las rutas son
declarativas, con condiciones sobre marcas y una alternativa final obligatoria.
No evalúa código externo ni admite callbacks de consecuencias.

El panel posee su propio motor y estado Angular. Solo recibe una señal de pausa
de la página; no emite decisiones hacia el flujo de preguntas. Cerrar la historia
no finaliza la demostración ni un intento. La demostración tampoco registra un intento.
No se agregaron campos ni operaciones de respuestas correctas, puntajes, rúbricas,
intentos oficiales o calificaciones. BD-005.2, OpenAPI y backend no se modificaron.
PC-001 continúa siendo una ampliación independiente: no se integró IA conversacional.

## Comprobación del modelo y matriz de impacto/trazabilidad

Se inspeccionaron `simulador.models.ts`, `caso-demostracion.ts`, `SimuladorStore`,
`ParticipacionGateway`, la página y los componentes existentes.
`EscenarioVista`/`ElementoEscena` ya representan el espacio 2D; `CasoVista` contiene
un escenario y preguntas, pero no un grafo narrativo, diálogos o estados de personaje.
Se reutilizan esos modelos visuales mediante composición, sin ampliar `CasoVista`
ni las firmas del gateway. `narrativa.models.ts` es exclusivamente un modelo local
de presentación, no un contrato de persistencia o transporte.

| Necesidad autorizada | Reutilización y cambio local | Evidencia | Impacto BD/API |
| --- | --- | --- | --- |
| Escenas y personajes (DC §1–2, §7) | EscenarioVista, Escenario2d y PanelContexto; estados/expresiones en el panel | pruebas de ambas rutas y de efectos | Ninguno |
| Diálogos (DC §1, §7) | Guion estático y avance secuencial; diálogo condicionado por marcas | pruebas de ambos recorridos | Ninguno |
| Decisiones y ramificaciones (DC §3, §7) | IDs de decisión, rutas ordenadas, condición y alternativa | pruebas de rutas, IDs y referencias inválidas | Ninguno |
| Consecuencias narrativas (DC §4) | Lista cerrada de marcas y cambios de personaje | efectos, retroceso, reinicio y rechazo de efecto ajeno | Ninguno |
| Transiciones/progreso (DC §7) | Confirmación explícita, escenas visitadas e historial de presentación | pruebas de transición, límites y cierre | Ninguno |
| Separación académica (restricción fundamental) | Motor aislado; preguntas y gateway existentes sin cambios | integración conserva caso, selecciones, índice y fase; todos los spies M5 sin llamadas | Ninguno |
| V27 y casos de uso (DC §6) | No se inventaron identificadores ni requisitos | Trazabilidad a la resolución suministrada | Pendiente contrastar documentos oficiales |

BD-005.2, V27 y los casos de uso oficiales no estaban disponibles entre las referencias
locales consultadas. No se afirma compatibilidad de persistencia con BD-005.2.
Antes de conectar contenido narrativo real habrá que contrastar esos documentos,
comprobar si el esquema vigente puede representarlo y justificar cualquier ampliación
con una matriz de impacto aprobada. Esta entrega no solicita ni presupone ampliaciones.

## Archivos

- `narrativa/narrativa.models.ts`: modelos locales de guion y estado.
- `narrativa/motor-narrativo.ts`: motor, validación y restauración de instantáneas.
- `narrativa/motor-narrativo.spec.ts`: 11 pruebas del motor, incluyendo ambas rutas.
- `demo/guion-demostracion.ts`: seis escenas, dos ramas y dos cierres ficticios.
- `components/panel-narrativo.ts`: presentación y controles con pausa.
- `pages/simulador-page.ts` y `.html`: integración exclusivamente en modo demostración.
- `pages/simulador-page.spec.ts`: tres pruebas funcionales nuevas.

Las rutas anteriores son relativas a `src/app/features/simulador/`.

## Validación ejecutada

Entorno: Windows, Angular instalado 22.2.3, Chrome Headless 146.

| Comprobación | Resultado |
| --- | --- |
| `npm run build` (producción) | OK; paquete inicial 246.48 kB, transferencia estimada 69.34 kB; sin errores de presupuesto |
| `npm test -- --watch=false --browsers=ChromeHeadless` | 84 SUCCESS; 14 pruebas nuevas, 70 preexistentes |
| `npm run check:urls` | OK; sin URLs de backend codificadas en src/app |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | OK |
| `node node_modules/typescript/bin/tsc -p tsconfig.spec.json --noEmit` | OK |
| `git diff --check` | OK; avisos normales de conversión LF/CRLF |

Compilación generada en `dist/PRISALY-Front/` (no versionada).
Pruebas funcionales de componentes ejecutadas en navegador real sin interfaz;
no se realizó revisión visual manual ni prueba contra un backend real.

## Protección del estado inicial

Se inspeccionaron rama, HEAD, estado, diff completo y diff preparado de angular.json,
archivo sin seguimiento y origen remoto antes de editar. El índice estaba vacío.
Se creó una rama independiente desde la base solicitada conservando el árbol local.
No se utilizó stash, reset, clean, descarte ni sobrescritura de cambios preexistentes.

Se guardó una copia externa al repositorio en la carpeta `sim-01-resguardo` del
espacio de trabajo de esta conversación, junto con el parche y el estado protegido.
Los archivos preexistentes permanecen fuera del commit de SIM-01.

SHA-256 antes y después:

| Archivo preexistente | Hash sin variación |
| --- | --- |
| angular.json (analítica local) | 55EEA06AEC46CE1778D209EED09E2C462837A72BA78BAC9A190F491B89A7F4BC |
| ersHeinerDesktopPRISALYPRISALY-Backen (historial sin seguimiento) | D258ED0E20CD1F92F3759C01601FD363A66540D80D7A456E7D9340158454334A |

La rama base y su referencia remota no se modificaron. No se hizo push, PR ni merge.
