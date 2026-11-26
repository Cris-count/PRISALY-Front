# Línea compartida de cierre — 26 de noviembre de 2026

## Operación local

- Portal de presentación: http://localhost:18175/acceso (configuración dc106-qa).
- Visor QA optativo: http://localhost:4200/acceso (dc106-qa-sim), proxy de la API QA existente. Comparte datos ficticios de DC-105; no es una nueva base.
- QA con visor desactiva los accesos rápidos; utiliza login oficial de personal y código estudiantil por Mailpit. No compartir contraseñas, cookies ni tokens.
- El origen 4200 ya pertenece a la lista autorizada de Backend. No se amplió CORS. La señalización de MUNDO-24 deberá admitir ese Origin cuando se reciba.

## Simulador

El commit de Nicolás 2adff17367dbadc18e13e48dd5d12e03680d3c00 se incorporó conservando autoría. Su laboratorio PS2 es independiente de MUNDO-24 y nunca es una asignación académica automática.

`environment.dc106-qa-sim.ts` contiene `simuladorUnreal.origenVisor` y `asignacion:null`. Cuando se reciba la entrega verificada, configurar la asignación visual ya existente (`urlSenalizacion`, `streamerId`, `sesion`, `casoId`) usando exclusivamente sus valores reales y reconstruir el QA optativo. No obtener configuración de query strings, fragmentos, almacenamiento ni entradas del usuario. WSS obligatorio fuera de loopback; no se admiten credenciales ni parámetros en la URL de señalización.

Desde una participación: abrir/reanudar intento, consultar contenido y pulsar Abrir simulación 3D en QA optativo. El guard consulta nuevamente el contenido M5, que valida autenticación y titularidad, y contrasta intento, sesión y caso. Se muestra el título confirmado por Backend. Los identificadores académicos viajan solo en el estado de navegación, nunca hacia Unreal ni por URL. Una recarga directa del visor exige volver al portal y abrir de nuevo el intento.

Sin asignación aparece indisponibilidad y Volver al portal académico. Ese botón destruye el reproductor y el puente. Tras volver, reanudar mediante el flujo oficial existente. Una respuesta WebSocket solo indica señalización; conexión establecida exige mundo.listo, sesion.iniciar con ACK y reproducción de vídeo. Reconexión siempre manual. La libreta permanece en memoria.

No se cambiaron esquemas del protocolo, persistencia de investigación, migraciones, fases ni contratos académicos. MUNDO-24 y la grabación de contingencia no se encuentran disponibles: no existe certificación E2E Unreal.

## Comandos de comprobación

```powershell
npx ng build --configuration=dc106-qa
npx ng build --configuration=dc106-qa-sim
npx ng test --watch=false --browsers=ChromeHeadless
```

En este equipo el Compose del visor está en PRISALY-ENTREGA/CIERRE-EXTRAORDINARIO-20261126/qa-sim/compose.yaml. Solo contiene Nginx, se publica en loopback y reutiliza la API interna. No ejecuta migraciones. Detener únicamente ese visor: `docker compose -p prisaly-cierre-sim -f <ruta-del-compose> stop visor`. No usar down -v.

## Validación

Suite Angular completa: 934/934 aprobadas. Pruebas específicas de visor/configuración: 30; matriz de guards: 37 (subconjuntos de la suite, no sumar). Los dobles Unreal verifican cliente, nunca ejecución real. Recorrido HTTP académico independiente: 81/81. El registro de pruebas y despliegue está en el directorio de evidencias local; no contiene credenciales.

Las pruebas de la interfaz se actualizaron a la selección de usuarios, eliminación de decoraciones y ausencia de controles ficticios, conservando aislamiento, separación de funciones, autorización, contraste y desbordamiento. Dos expectativas antiguas se conciliaron con DC-114 (token de sesión por pestaña, nunca contraseña) y DC-115 (inicio /acceso), sin cambiar autenticación.

## Control obligatorio antes de publicar

Aplicar [Control de salida de accesos QA](CONTROL-SALIDA-ACCESOS-QA.md) al artefacto exacto que se empaquetará y verificar los tres roles en el navegador antes de publicar ramas compartidas.



## Reproducir el visor QA sin archivos privados

La infraestructura ya probada se conserva en `ops/qa-simulador`. Requiere que exista el QA DC-105 y su red interna; no crea Backend ni base de datos y no modifica sus contenedores. El puerto 4200 debe estar libre. Desde la raíz del Frontend:

```powershell
npx ng build --configuration=dc106-qa-sim --output-path=dist/qa-sim
# Copiar solo el resultado público de Angular. Si browser-cierre ya existe, conservarlo y comprobar su contenido antes de actualizar.
Copy-Item -Recurse dist/qa-sim/browser ops/qa-simulador/browser-cierre
$env:SOURCE_REV = git rev-parse HEAD
docker compose -p prisaly-cierre-sim -f ops/qa-simulador/compose.yaml config --quiet
docker compose -p prisaly-cierre-sim -f ops/qa-simulador/compose.yaml up -d --build --wait
# Consulta y apagado exclusivos del visor:
docker compose -p prisaly-cierre-sim -f ops/qa-simulador/compose.yaml ps
docker compose -p prisaly-cierre-sim -f ops/qa-simulador/compose.yaml stop visor
```

El contexto Docker excluye todos los archivos excepto Dockerfile, configuración Nginx y el resultado público de Angular. `browser-cierre` está ignorado por Git. No copiar .env, .private, node_modules, claves o evidencias a ese directorio.

Corrección de proxy reproducida: `/simulador-unreal` comparte nombre con una carpeta pública del protocolo. `try_files $uri $uri/ /index.html` provocaba redirección al puerto 80. El proxy versionado usa `try_files $uri /index.html`, sirve la ruta Angular sin redirección y conserva las rutas de archivos del protocolo. Verificado por HTTP real en ambos QA.
