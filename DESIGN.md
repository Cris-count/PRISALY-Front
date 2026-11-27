# DESIGN — PRISALY

Sistema visual **existente** de PRISALY, documentado desde el código (26/11/2026, DC-FE-IMP-01). Mejora progresiva: este archivo describe la identidad que se conserva. Las referencias visuales de Mariana (administrador, docente, estudiante; informe FE-UX-01) se incorporarán aquí cuando estén en la carpeta Entregables › FE-UX › referencias de la raíz de PRISALY (fuera de este repositorio); sus logotipos alternativos no se adoptan.

## Identidad
- **Logotipo oficial:** `public/images/prisaly-logo.png` (triángulo azul/naranja). No se redibuja ni se sustituye.
- **Azul institucional + naranja de acento.** El naranja marca lo activo (navegación) y la acción principal; el azul lleva la estructura (barra lateral, banner).

## Colors (color, valores reales)
| Rol | Token | Valor | Dónde |
|---|---|---|---|
| Azul profundo (barra lateral, banner) | — | `#052650` → `#073575` / `#0755b8` | `dashboard-menu.css`, `dashboard-inicio.css` |
| Azul de marca | `--p-azul` | `#0755b8` | `dashboard-identidad.css` |
| Azul interactivo | `--p-azul-electrico`, `--color-primario` | `#0755d9` | idem, `styles.css` |
| Naranja de acción | `--p-naranja` / `--p-accion` | `#ff861b` (hover `#ff9b36`, texto `#201000`) | `dashboard-identidad.css` |
| Acento del banner | — | `#ffad35` | `dashboard-inicio.css` |
| Activo (fondo / texto) | `--p-activo-fondo` / `--p-activo-texto` | `#ffead4` / `#713600` | idem |
| Texto / secundario | `--p-texto` / `--p-sec` | `#172b4d` / `#344968` | idem |
| Borde / superficie suave | `--p-borde` / `--p-suave` | `#c7d5e8` / `#edf4ff` | idem |
| Fondo de trabajo / superficie | `--color-fondo` / `--color-superficie` | `#f4f6fa` / `#fff` | `styles.css` |
| Foco | `--color-foco` | `#b45309` (contorno 3px, desfase 3px) | `styles.css` |
| Semánticos | `--color-error`, `--color-aviso`, `--color-exito` (+ `-fondo`) | `#b42318`, `#8a5a00`, `#1d6b45` | `styles.css` |

**Deuda conocida:** `styles.css` declara `:root` dos veces (`--color-primario` `#2f5d8a` y luego `#0755d9`); `--p-*` y `--color-*` conviven. Consolidar en FE-UX-01, coordinado con Mariana.

## Typography (tipografía)
Pila del sistema (`--fuente-base`: system-ui, Segoe UI, Roboto…). Escala (`dashboard-tipografia.css`): `--t-xs` 0.75 · `--t-sm` 0.875 · `--t-base` 0.9375 · `--t-card` 1.125 · `--t-seccion` 1.375 · `--t-titulo` clamp(1.75–2rem). Interlínea 1.55.
**Riesgo:** el `:host` tipográfico aplica `overflow-wrap: anywhere`, que parte palabras en columnas estrechas (I-01). Revisar en FE-UX-01 antes de tocarlo (es compartido).

## Espaciado y forma
Escala de referencia 4 · 8 · 12 · 16 · 24 · 32 · 48 px. `--vista-gap` 1rem; radios: panel `1.25rem`, banner `1.5rem` (Inicio usa `1rem`), tarjeta `--inicio-radio`, controles `0.5rem`. Sombras suaves (`0 2px 8px #17314f08`); sin sombras pesadas.

## Components (componentes en uso)
- **Barra lateral:** azul profundo, ítem activo en naranja con texto oscuro, se contrae a iconos.
- **Encabezado:** migas + título, perfil a la derecha.
- **Banner de bienvenida:** degradado azul, texto blanco, borde inferior naranja (contraste mínimo medido 5,08:1).
- **Tarjeta de acceso:** icono de la sección en cuadro suave + título + descripción + «Consultar →»; rejilla de 1 a 3 columnas según el ancho.
- **Pestañas (`.pestanas` / `.pestana`, Gestión de usuarios):** barra horizontal con borde; la activa con `--p-activo-fondo` / `--p-activo-texto`, peso 700 y subrayado completo (no solo color; contraste 8,06:1); `aria-pressed` y `aria-current`. Se abren por enlace con `?vista=`.
- **Banner de sección (Configuración):** misma familia que el banner de Inicio, sin ilustraciones.
- **Paneles, tablas, formularios, botones:** superficies blancas con borde `#dbe2ec`; botones de 2.65rem de alto mínimo.

## Reglas
Operate primero: claridad, jerarquía, consistencia. Estados que no dependan solo del color. Contraste WCAG 2.2 AA como objetivo, medido. Sin degradados decorativos nuevos, sin animación sin propósito, sin datos inventados, sin funciones simuladas como reales. Respetar `prefers-reduced-motion`.

## Excepciones justificadas a reglas genéricas (Impeccable)
| Regla genérica | Decisión en PRISALY | Motivo |
|---|---|---|
| Prohibida la «ceja» sobre el título | Se conserva «PRISALY · PSICOLOGÍA SOCIAL» y «ADMINISTRACIÓN» | Texto institucional presente en la referencia de Dirección; DC-FE-IMP-01 §6 exige no retirar elementos institucionales por una regla genérica |
| Glifos Unicode en lugar de iconos | Se conserva «Consultar →» | Aparece en la referencia de Dirección; los iconos de sección sí son SVG de trazo uniforme |
| Tarjetas iguales como estructura | Accesos del Inicio en tarjetas | Lo pide la referencia administrativa; son navegación, no contenido |
| Fuente propia para la voz de display | Pila del sistema | Identidad vigente; un cambio de tipografía es global y se coordina con Mariana (FE-UX-01) |
