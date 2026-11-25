# F4-01 — referencias para compartir el incremento

Versión compartible del resultado de alineación de 22/11/2026. Los respaldos y registros completos de las copias locales se conservan fuera del repositorio y no se publican.

| Línea | Referencia |
|---|---|
| Frontend base | 0b341c029407ca871183e6346bc6e730e9778f34 — develop con FE-53/54/55 |
| Backend de contratos | 773818caf62758d66019a71dac6508d13148abad — develop con DC-45 |
| Rama de este incremento | integration/simulador2-controlado-20261122 |

Los fetch se ejecutaron sobre los repositorios oficiales. Las ramas funcionales originales conservan sus archivos y commits. Se preparó una copia aislada de develop y se trasladaron los cambios locales del simulador, sin merge a develop ni cambios Backend. La publicación depende de confirmación de Nicolás y no abre un PR.

Los 16 archivos de código/configuración se dividen en diez de narrativa/recorrido/puente, cinco de configuración paralela conservada y un archivo nuevo de entorno. La configuración paralela no tiene autoría atribuida por este informe; forma parte del alcance que Nicolás debe confirmar antes de compartir. Sus constantes se centralizaron solo en la copia de integración, manteniendo los valores y exportaciones.

No se trasladaron los cambios locales Backend de workflow, pruebas, documentación o eliminación de compose. Tampoco se modificaron las pantallas administrativas/docentes de Mariana, los guiones/componentes de Cristian, SIM-01 ni las migraciones. Los contratos académicos se documentan por código real en la [matriz F4-02](DC-SIM-F4-02-MATRIZ-CONTRATOS-ACADEMICOS.md).

La asignación local continúa apuntando al streamer del laboratorio. Antes del recorrido integrado debe identificarse qué copia Unreal se ejecuta: principal, PS2-LAB-03 y MUNDO-24 tienen el mismo nombre de proyecto. Los interiores nuevos están en MUNDO-24; el modo diseño no abre por sí mismo Angular ni Pixel Streaming.

Los permisos DD-02/M5 y los datos académicos no se activan mediante esta rama. La coordinación de Origin/cookie/CORS y la publicación de contratos condicionados requiere el entorno/decisión correspondientes. No se introducen claves ni credenciales.

La verificación de esta entrega se documenta en [DC-SIM-GIT-SINCRONIZACION-10-RESULTADO](DC-SIM-GIT-SINCRONIZACION-10-RESULTADO.md). Ningún resultado histórico se presenta como prueba nueva.
