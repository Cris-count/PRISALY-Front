# Laboratorio Hospital Angular–Unreal

Aplicación aislada que importa los servicios y el panel reales de `src/app/features/simulador/unreal`. No se añade ninguna ruta productiva. No instala dependencias, no llama al Backend y no transporta video.

El relé transmite órdenes y confirmaciones reales. Dos botones de laboratorio simulan el hecho de activar E junto a la puerta y el doctor, sin afirmar que Unreal lo haya emitido. El modo nativo `PrisalyPruebaProtocoloInterior` camina automáticamente al vestíbulo de salida después de ocho segundos y cuando se libera la cámara.

## Reproducir

Desde PRISALY-Front, con Node y las dependencias ya instaladas:

1. Compilar el laboratorio con una carpeta de salida nueva:

   ```powershell
   node -r ./scripts/patch-node.cjs ./node_modules/@angular/cli/bin/ng.js build --configuration development --browser scripts/f3-hospital-lab/main.ts --ts-config scripts/f3-hospital-lab/tsconfig.json --output-path RUTA_SALIDA
   ```

2. Iniciar el relé existente de `C:/PRISALY/prisaly-sim2-f1/herramientas/rele-ws/servidor.ts` con su `tsx` instalado y `PRISALY_RELE_PUERTO=8898`. No usar el puerto de otra sesión manual.
3. Servir `RUTA_SALIDA/browser` con `node scripts/f3-hospital-lab/servidor.mjs RUTA_SALIDA/browser`. Solo escucha en `127.0.0.1:4318`.
4. Abrir el proyecto Unreal principal con:

   ```text
   -game -RenderOffscreen -windowed -ResX=1280 -ResY=720 -unattended -nosplash
   -PrisalySesion=ses-f3-codex28-0001
   -PrisalyPuenteUrl=ws://127.0.0.1:8898/unreal
   -PrisalyPruebaProtocoloInterior
   -ExecCmds="scalability 1,r.ScreenPercentage 100,r.DynamicRes.OperationMode 0"
   ```

5. Iniciar un ChromeHeadless con perfil temporal propio, `--remote-debugging-port=9328`, `--window-size=1280,1000` y página `about:blank`. Ese puerto corresponde exclusivamente al navegador local de pruebas.
6. Ejecutar `node scripts/f3-hospital-lab/recorrer.mjs RUTA_EVIDENCIAS_NUEVA`. Produce capturas reales del DOM, JSON con resultados y registro de consola. Usa una carpeta nueva por ejecución para conservar la anterior.
7. Al terminar, cerrar únicamente los cuatro procesos propios del laboratorio. No cerrar el editor, navegador o relé de otra persona.

La sesión de prueba puede reutilizarse en el mismo mundo para otra ejecución: cada carga de esta aplicación de laboratorio obtiene una instancia nueva de su estado demostrativo. El controlador comprueba el reingreso y una reconexión dentro de esa misma carga. La recarga de la página no está cubierta como persistencia.

Las pruebas unitarias de `hospital-unreal.spec.ts` y la prueba de DOM de `simulador-unreal-page.spec.ts` simulan el transporte. Este laboratorio usa Unreal real. Ninguno equivale a una aceptación del producto con Pixel Streaming ni sustituye la pulsación E manual en la integración final.
