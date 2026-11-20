# Guía manual de Nicolás — Hospital con doctor y paciente

**Estado inicial de todos los pasos: PENDIENTE DE PRUEBA MANUAL.** Todo lo descrito como resultado esperado debe observarlo Nicolás. Codex no ejecutó los comandos ni las pruebas de esta versión.

## Preparación

Necesitas la entrega de Claude con el paciente 3D interactivo `hosp-npc-paciente-01`. Si no está, puedes preparar Angular y revisar al doctor, pero deja las pruebas del paciente como **BLOQUEADAS POR RECURSO 3D PENDIENTE**.

Usa el proyecto principal `C:/PRISALY/prisaly-sim2-f1/unreal/PrisalyPrototipo/PrisalyPrototipo.uproject`, no las otras copias antiguas. No uses `PrisalyPruebaInterior`, `PrisalyPruebaProtocoloInterior`, `PrisalyRecorridoAuto` ni el controlador `recorrer.mjs`: activan validaciones/recorridos automatizados.

### 1. Compilar Angular tú mismo

En PowerShell:

```powershell
Set-Location 'C:\Users\NICOLAS\OneDrive\Desktop\Prisaly\PRISALY-Front'
& 'C:\Program Files\nodejs\node.exe' -r ./scripts/patch-node.cjs ./node_modules/@angular/cli/bin/ng.js build --configuration development --browser scripts/f3-hospital-lab/main.ts --ts-config scripts/f3-hospital-lab/tsconfig.json --output-path '../Entregables/Simulador2/F3-PACIENTE-PRUEBAS-32-20261119/manual-build'
```

Esperado: la compilación finaliza sin errores. Si falla, comparte el mensaje completo y deja los demás pasos pendientes. Este directorio contiene un build generado; los informes históricos usan otras carpetas.

### 2. Iniciar el relé local

Cierra el cliente de consola antiguo con `q` si está conectado (`cliente-interior-manual` o `prototipo:angular`). Solo Angular debe ocupar el rol `/angular` de la sesión. No uses `b` para cerrar ese cliente: bloquea la exploración.

Si ya tienes el relé escuchando en 8890, reutilízalo. Si no, en otra PowerShell:

```powershell
Set-Location 'C:\PRISALY\prisaly-sim2-f1'
$env:PRISALY_RELE_PUERTO = '8890'
& 'C:\Program Files\nodejs\node.exe' ./node_modules/tsx/dist/cli.mjs ./herramientas/rele-ws/servidor.ts
```

Esperado: escucha en `127.0.0.1:8890`. Si indica puerto ocupado, no inicies otra instancia.

### 3. Servir el laboratorio manual

En otra PowerShell, deja este proceso abierto:

```powershell
Set-Location 'C:\Users\NICOLAS\OneDrive\Desktop\Prisaly\PRISALY-Front'
& 'C:\Program Files\nodejs\node.exe' ./scripts/f3-hospital-lab/servidor.mjs '../Entregables/Simulador2/F3-PACIENTE-PRUEBAS-32-20261119/manual-build/browser'
```

Abre **http://127.0.0.1:4318/?modo=manual**. Esperado: aparece «Modo manual» y no aparecen botones de estímulos simulados. Este modo utiliza la sesión `ses-prototipo-0001` y el relé 8890, iguales a la configuración actual del proyecto Unreal.

### 4. Abrir Unreal y conectar

Abre el `.uproject` principal y utiliza la compilación del paciente que entregue Claude. Si necesitas compilar C++ antes, hazlo tú con el editor cerrado:

```powershell
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Build\BatchFiles\Build.bat' PrisalyPrototipoEditor Win64 Development 'C:\PRISALY\prisaly-sim2-f1\unreal\PrisalyPrototipo\PrisalyPrototipo.uproject' -WaitMutex
```

Después abre el proyecto y pulsa **Play**. En el navegador pulsa **Conectar laboratorio**. Esperado: «Sesión real confirmada por Unreal». El juego se ve en Unreal y el diálogo en el navegador; no se espera video del motor en esta página.

No necesitas instalar nuevas dependencias para estos comandos. Si falta alguna, detente y comunica cuál; no marques una compilación o conexión como aprobada.

## Recorrido que debes ejecutar

No pulses «Recopilar pista de ejemplo» en la libreta: añadiría otra pista ajena al recorrido. No recargues el navegador hasta terminar las pruebas de continuidad.

| Paso | Acción de Nicolás | Resultado esperado |
|---|---|---|
| P-01 | Conectar Angular con Unreal en Play | Sesión confirmada; sin errores de conexión. |
| P-02 | Caminar a la puerta del Hospital y pulsar E | Entras al interior; Angular muestra Hospital Central. |
| P-03 | Acercarte al doctor, pulsar E y avanzar solo un diálogo. Intentar caminar, cerrar conversación y caminar de nuevo | Aparece el guion del Dr. Mendoza; el movimiento se bloquea durante la conversación y se libera al cerrarla. El doctor queda a mitad del guion. |
| P-04 | Rodear la camilla y observar al paciente | Paciente acostado o semisentado, reposo/respiración discreta. Se puede acceder al costado y recorrer la sala sin atravesar los sólidos ni quedar atrapado. |
| P-05 | Desde el costado, pulsar E junto al paciente | Cámara dirigida al paciente; Angular muestra «Paciente (demostración)» y su presentación, sin abrir el guion del doctor. El movimiento queda bloqueado. |
| P-06 | Avanzar sus dos diálogos y elegir «Registrar conversación de demostración con el paciente» | Aparece una sola pista «Entrevista al paciente (demostración)». En Libreta su origen es Hospital Central/camilla, `hosp-npc-paciente-01` y `paciente-01`. |
| P-07 | Abrir y cerrar Libreta, continuar la conversación del paciente, avanzar el último diálogo y cerrar conversación | La pista permanece; el paciente termina su guion. El estado visual de completado corresponde al paciente, no al doctor. Puedes volver a caminar. |
| P-08 | Volver al doctor y pulsar E | Se reanuda donde lo dejaste en P-03. No se reinició por hablar con el paciente. Termina sus diálogos, elige «Solicitar informe de ingreso del paciente», continúa y cierra la conversación. Debe añadirse la pista del doctor: dos pistas del recorrido en total. |
| P-09 | Volver a activar el paciente | Conserva la conversación completada y su propia identidad. Las pistas siguen siendo dos; no se repite la pista del paciente. |
| P-10 | Cerrar la conversación, salir por las puertas de vidrio y reingresar con E | Regresas al exterior y puedes entrar otra vez. Ambos NPC conservan su progreso; ninguna pista se duplica. |
| P-11 | Estando fuera y con los diálogos cerrados, pulsar «Reconectar misma sesión» sin recargar. Volver a entrar y hablar con ambos | Conserva decisiones, conversaciones terminadas y las dos pistas dentro de la misma página/sesión. |
| P-12 | Crear una nota en Libreta, cerrar el diálogo, salir y reingresar | La nota sigue en Libreta. No se mezcla el progreso de los NPC. |

Al final puedes pulsar **Descargar registro de la sesión**. Descarga mensajes y estado narrativo; el archivo no aprueba las pruebas por sí mismo. Conserva capturas o video de lo que falle y comparte el resultado observado.

La pérdida de datos tras F5/cerrar página es una limitación conocida de la demostración en memoria. No se presenta como persistencia académica implementada. Si luego se solicita una corrección, repite únicamente las pruebas afectadas que se indiquen.

## Cómo reportar

```text
Compilación Angular: pasó / falló (mensaje)
Versión Unreal con paciente: disponible / pendiente
P-01: pasó / falló / bloqueado
P-02: ...
...
P-12: ...
Observación: qué hice, qué apareció y qué esperaba.
Registro descargado: nombre del archivo, si lo tienes.
```

Ninguna fila de esta guía representa un resultado obtenido. No hay pruebas nuevas aprobadas hasta que Nicolás informe sus observaciones.
