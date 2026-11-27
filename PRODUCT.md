# PRODUCT — PRISALY

Contexto de producto para el trabajo de diseño (Impeccable, DC-FE-IMP-01). Complementa `CLAUDE.md` y el Plan Maestro Case Builder v3.1; no los sustituye. Escrito desde el código y el plan (26/11/2026); lo que no está respaldado aparece como pendiente.

## Qué es
PRISALY es una plataforma académica de **Psicología Social**. Los estudiantes resuelven **casos situacionales**: exploran una ciudad 3D (MUNDO-24, Unreal Engine 5.8 por Pixel Streaming 2), conversan con personajes en un hospital, una comisaría y una fiscalía, registran lo que investigan y responden un cuestionario que el docente evalúa con una rúbrica.

## Usuarios y qué es éxito para cada uno
| Rol | Acceso | Qué hace | Éxito |
|---|---|---|---|
| Administrador | correo y contraseña (M1) | da de alta y activa docentes, gestiona estudiantes y permisos | encuentra a la persona correcta y ve con claridad qué puede hacer cada cuenta |
| Docente | correo y contraseña (activación D-05) | crea casos, contenido evaluativo y rúbricas; construye el caso 3D (Case Builder); publica; programa sesiones y convocatorias; evalúa | completa el recorrido casos → contenido → rúbrica → publicación → programación sin instrucciones técnicas externas |
| Estudiante | correo y código de un solo uso (DD-02 B, cookie HttpOnly) | atiende convocatorias, inicia o retoma su intento, explora MUNDO-24, responde y ve su resultado cuando se libera | sabe qué debe hacer ahora y retoma sin perder progreso |

## Módulos (Backend Spring Boot)
M1 identidad y permisos · M3 casos y narrativa (prisaly-guion-1) · M4 sesiones y convocatorias · M5 intentos, fases e investigación (A1) · M6 evaluación y liberación de calificaciones · M7 correo y códigos.

## Estado real (no presentar lo pendiente como disponible)
- **Hecho y probado en local:** login de personal; constructor docente y vista previa 3D (CB-05A/B, CB-06); envío de `caso.configurar`; login estudiantil en QA (DC-OPS-81); clientes de narrativa, fase y cuestionario de M5 (CB-07 Front).
- **Pendiente de decisión o de integración:** persistencia de la investigación A1 (D-ESQ-1), publicación coherente del caso interactivo (D-CB-3, D-CB-13), recorrido académico completo (CB-07), visor QA oficial, contrato de esquema combinado para la demostración persistente (DC-OPS-85).
- **Configuración de la plataforma:** solo maqueta declarada («Implementación pendiente»).

## Entornos
Académico original (protegido) · demostración persistente (DC-OPS-85, en preparación) · QA desechable. La etiqueta «QA de personal» y el recuadro «Entorno local de pruebas» son reales en desarrollo y no se ocultan con CSS.

## Restricciones para el diseño
Sin estadísticas, porcentajes ni notas inventadas. Sin funciones simuladas como reales. No cambiar contratos, autenticación, guardas ni permisos por motivos visuales. MUNDO-24 es el único simulador; Unreal no se toca desde la web.

## Modo por superficie
- **Operate:** dashboards de los tres roles, administración, gestión de casos, Case Builder, formularios, tablas, programación.
- **Read:** instrucciones, diálogos, cuestionarios, resultados, ayuda.
- **Experience:** interfaz web de MUNDO-24, vista previa docente, conversación, libreta de investigación.
- **Persuade:** solo páginas públicas o institucionales, si las hay.
