# Product

<!-- impeccable:product-schema 1 -->

Registro de producto de PRISALY para el trabajo de diseño (Impeccable). Ampliado el 26/11/2026 (DC-FE-IMP-03) a partir del Plan Maestro Case Builder v3.1, `CLAUDE.md`, los contratos de los módulos y el código. Complementa esos documentos; no los sustituye. Lo que no está respaldado aparece como **pendiente** o **decisión abierta**.

## Platform

web

## Users

| Rol | Situación | Trabajo | Éxito |
|---|---|---|---|
| **Administrador** | Personal institucional; entra con correo y contraseña (M1) | Dar de alta y activar docentes, registrar estudiantes, asignar roles y permisos, consultar cuentas | Encuentra a la persona correcta y ve con claridad qué puede hacer cada cuenta y en qué estado está |
| **Docente** | Profesor de Psicología Social; activa su cuenta por invitación (D-05) y entra con contraseña | Crear casos situacionales, su contenido evaluativo y su rúbrica; construir el caso en la ciudad 3D (Case Builder); publicar; programar sesiones y convocatorias; evaluar | Completa casos → contenido → rúbrica → caso 3D → publicación → programación sin instrucciones técnicas externas |
| **Estudiante** | Alumno convocado; entra con correo y un código de un solo uso (DD-02 B, cookie HttpOnly) | Atender convocatorias, iniciar o retomar su intento, explorar MUNDO-24, investigar, responder y ver su resultado cuando se libera | Sabe qué tiene que hacer ahora y retoma sin perder progreso |

## Product Purpose

PRISALY es una plataforma académica de **Psicología Social** para trabajar **casos situacionales**: el estudiante investiga una situación social conversando con personajes en una ciudad 3D (hospital, comisaría y fiscalía), registra lo que descubre y responde un cuestionario que el docente evalúa con una rúbrica. El docente crea cada caso sin programar: elige edificios y personajes y escribe sus diálogos, y el mismo mundo 3D adopta esa configuración.

## Positioning

- **Un solo mundo 3D configurable por el docente.** MUNDO-24 (Unreal Engine 5.8 por Pixel Streaming 2) es el único simulador. El Case Builder define qué edificios y personajes participan y qué dicen. El ejecutable no cambia entre casos (demostrado con los casos A, B y C en CB-05B/CB-06). El simulador 2D/2.5D anterior se retiró (DC-SIM-LIMPIEZA-01).
- **La narrativa es académica y está persistida.** Los diálogos viven en el Backend (M3, `prisaly-guion-1`) y viajan al mundo solo como identificadores visuales; ningún dato académico llega a Unreal.
- **Investigación con rastro.** El modelo A1 (M5) registra lo que el estudiante explora como evidencia del intento, no como un juego.

## Operating Context

- **Módulos del Backend (Spring Boot):** M1 identidad y permisos · M3 casos y narrativa · M4 sesiones y convocatorias · M5 intentos, fases e investigación (A1) · M6 evaluación y liberación de calificaciones · M7 correo y códigos.
- **Recorrido docente:** caso → contenido (escenarios, preguntas, opciones) → rúbrica → constructor 3D y vista previa → publicación → sesión → convocatoria → evaluación.
- **Recorrido estudiantil:** acceso por código → portal (convocatorias) → intento (iniciar o retomar) → fases: exploración en MUNDO-24 y cuestionario → resultado cuando el docente lo libera.
- **Entornos:**
  - Académico original: protegido. No se modifica su volumen.
  - QA desechable: pruebas funcionales con datos sintéticos.
  - **Demostración persistente** (DC-OPS-85, en preparación): pruebas manuales y exposiciones con usuarios finales ficticios que se conservan entre reinicios.
- La etiqueta «QA de personal» y el recuadro «Entorno local de pruebas» son reales en desarrollo y no se ocultan.
- **Arranque integral:** `npm start` (orquestador) levanta PostgreSQL, Backend, señalización, MUNDO-24 y Angular.

## Capabilities and Constraints

**Implementado y probado (local):**
- Autenticación real de personal (M1, con detección de sesión vencida, I-08) y de estudiante por código en QA (DC-OPS-81).
- Gestión administrativa: docentes, estudiantes, roles y permisos, consulta de usuarios.
- Casos, contenido y rúbrica (M3).
- **Case Builder** con vista previa en MUNDO-24 (CB-05A, CB-05B/CB-06), con criterios A01–A24 en 24/24.
- Sesiones y convocatorias (M4).
- Portal estudiantil con intento M5 (iniciar, retomar, responder, finalizar, calificación liberada).
- Clientes Front de narrativa, fase y cuestionario M5 (CB-07).
- Retirada del simulador 2.5D.

**Candidato (escrito, sin integrar en la línea oficial):**
- Núcleo de investigación A1 (CB-02B).
- Modo académico del visor (CB-07).
- Contrato de esquema combinado para la demostración persistente.

**Pendiente o en decisión:**
- Persistencia de la investigación A1 (D-ESQ-1).
- Publicación coherente del caso interactivo (D-CB-3, D-CB-13).
- Recorrido académico completo en MUNDO-24 (CB-07).
- Visor QA oficial.
- Configuración de la plataforma (solo maqueta declarada «Implementación pendiente»).

**Restricciones:**
- No se cambian contratos, autenticación, guardas ni permisos por motivos visuales.
- La interfaz muestra solo capacidades reales del entorno (p. ej. `CAPACIDADES_DC99`).
- Unreal y G4-H3 no se tocan desde la web.
- Un caso admite hasta los puestos del catálogo visual canónico `catalogo-visual-1` (3 edificios, 4 puestos); no se amplía unilateralmente.

**Terminología:** caso situacional, intento, fase, convocatoria, sesión, rúbrica, liberación, vista previa docente, contexto visual, MUNDO-24.

## Brand Commitments

- Nombre **PRISALY** y lema «Aprender · Comprender · Transformar».
- **Logotipo oficial** `public/images/prisaly-logo.png`, sin redibujar.
- Identidad azul institucional con naranja de acento: detalle en `DESIGN.md`.
- Textos institucionales de la referencia de Dirección: «PRISALY · PSICOLOGÍA SOCIAL», «Consultar →».
- Las propuestas visuales de Mariana (administrador, docente, estudiante; informe FE-UX-01) son la referencia de aceptación visual. Sus logotipos alternativos no se adoptan.
- Voz en español, clara y directa, sin jerga técnica para docentes ni estudiantes.

## Evidence on Hand

- **Casos reales del Case Builder:**
  - Casos A, B y C con sus diálogos: `Entregables/CB-05B-CB-06/` en la raíz de PRISALY.
  - Primer recorrido CB-05A: `Entregables/CB-05A/`.
- **Capturas y auditoría del administrador:** `Entregables/FE-UX/` (capturas antes y después, triaje del detector).
- **Mundo 3D:** paquete `MUNDO-24-Win64-20261126-cc66a63` y evidencias en `C:/PRISALY/mundo-24/evidencias/`.
- **Ausencias que no se inventan:**
  - No hay estadísticas de uso, testimonios, notas ni porcentajes de progreso reales.
  - Las referencias de Mariana (`Entregables/FE-UX/referencias/`) **todavía no están en el equipo**.
  - Sin datos del Backend, la interfaz muestra estados vacíos o de error, nunca datos de demostración.

## Product Principles

1. **Lo que se ve es lo que existe.** Ninguna pantalla presenta como disponible algo pendiente, simulado o bloqueado. Los estados vacío, bloqueado y de error son explícitos.
2. **El docente diseña la situación; la plataforma no la reinterpreta.** El caso, la narrativa y la evaluación son del docente y se guardan tal cual.
3. **Un único mundo, muchas situaciones.** Variedad por configuración, nunca por copias del simulador.
4. **La seguridad no se negocia por la experiencia.** Sesiones, permisos y separación entre roles se respetan siempre; ante la duda, se informa y se vuelve al acceso.
5. **Operar antes que impresionar.** En las superficies de trabajo manda la claridad; la ambición visual se reserva para la experiencia del mundo 3D.

## Accessibility & Inclusion

Objetivo WCAG 2.2 AA, **medido**: contraste, teclado, foco visible, etiquetas accesibles, tablas legibles y estados que no dependen solo del color. Se respeta `prefers-reduced-motion`. Se valida a 1920, 1600, 1366, 1024, 768 y 390 px; la compatibilidad móvil del simulador 3D no se declara sin pruebas específicas.

## Decisiones abiertas

- Institución y fecha de la exposición con usuarios finales: no documentadas.
- Contrato de esquema combinado y autorización sobre `prisaly_pg_data`: pendientes de Ingrid (DC-OPS-85).
