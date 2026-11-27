---
name: PRISALY
description: Plataforma académica de Psicología Social — identidad azul institucional con naranja de acento
colors:
  azul-profundo: "#052650"
  azul-banner: "#073575"
  azul-marca: "#0755b8"
  azul-interactivo: "#0755d9"
  celeste: "#10d9f4"
  naranja-accion: "#ff861b"
  naranja-accion-hover: "#ff9b36"
  texto-sobre-naranja: "#201000"
  acento-banner: "#ffad35"
  activo-fondo: "#ffead4"
  activo-texto: "#713600"
  texto: "#172b4d"
  texto-secundario: "#344968"
  borde: "#c7d5e8"
  borde-panel: "#dbe2ec"
  superficie-suave: "#edf4ff"
  fondo: "#f4f6fa"
  superficie: "#ffffff"
  foco: "#b45309"
  error: "#b42318"
  error-fondo: "#fdecea"
  aviso: "#8a5a00"
  aviso-fondo: "#fff4d6"
  exito: "#1d6b45"
  exito-fondo: "#e6f4ec"
typography:
  base:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.9375rem"
    lineHeight: 1.55
  titulo:
    fontSize: "clamp(1.75rem, 2.3vw, 2rem)"
    fontWeight: 700
  seccion:
    fontSize: "1.375rem"
    fontWeight: 700
  tarjeta:
    fontSize: "1.125rem"
    fontWeight: 700
  pequena:
    fontSize: "0.875rem"
  minima:
    fontSize: "0.75rem"
rounded:
  control: "0.5rem"
  inicio: "1rem"
  panel: "1.25rem"
  banner: "1.5rem"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.naranja-accion}"
    textColor: "{colors.texto-sobre-naranja}"
    rounded: "{rounded.control}"
    height: "2.65rem"
  button-primary-hover:
    backgroundColor: "{colors.naranja-accion-hover}"
  nav-item-active:
    backgroundColor: "{colors.activo-fondo}"
    textColor: "{colors.activo-texto}"
  banner:
    backgroundColor: "{colors.azul-marca}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.banner}"
  panel:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.panel}"
    padding: "1rem"
  aviso:
    backgroundColor: "{colors.aviso-fondo}"
    textColor: "#4a2c05"
    rounded: "{rounded.control}"
---

# DESIGN — PRISALY

## Overview
Sistema visual existente, documentado desde el código; mejora progresiva. Compactado el 26/11/2026 (DC-FE-IMP-03); la versión anterior está respaldada en la carpeta FE-UX › impeccable de Entregables.
- **Logotipo oficial** `public/images/prisaly-logo.png` (triángulo azul/naranja): no se redibuja ni se sustituye.
- **Azul institucional y naranja de acento:** el naranja marca lo activo y la acción principal; el azul lleva la estructura.
- **Aceptación visual:** propuestas de Mariana (administrador, docente, estudiante; FE-UX-01), aún no entregadas. Sus logotipos alternativos no se adoptan; los cambios globales se coordinan con ella.

## Colors
Tokens en `src/app/features/dashboard/dashboard-identidad.css` (`--p-*`) y `src/styles.css` (`--color-*`). Degradado del banner y la barra lateral: `azul-profundo` → `azul-banner` / `azul-marca`. Deuda (FE-UX-01): `src/styles.css` declara `:root` dos veces (gana `--color-primario` `#0755d9` y `--color-foco` `#b45309`) y conviven `--p-*` y `--color-*`.

## Typography
Pila del sistema (`--fuente-base`). Escala en `src/app/features/dashboard/dashboard-tipografia.css` (`--t-xs` … `--t-titulo`). Riesgo I-01: `overflow-wrap: anywhere` en el `:host` parte palabras en columnas estrechas.

## Layout
`--vista-gap` 1rem. Tarjetas de acceso de 1 a 3 columnas según el ancho; la barra lateral se contrae a iconos. Se valida a 1920, 1600, 1366, 1024, 768 y 390 px.

## Elevation & Depth
Sombras suaves (`0 2px 8px #17314f08`); sin sombras pesadas.

## Shapes
Radios `rounded.*`: controles 0.5rem, panel 1.25rem, banner 1.5rem (Inicio 1rem).

## Components
- **Barra lateral:** azul profundo; activo en `nav-item-active`.
- **Encabezado:** migas, título y perfil.
- **Banner de bienvenida y de sección:** degradado azul, texto blanco, franja inferior naranja (contraste mínimo 5,08:1), sin ilustraciones.
- **Tarjeta de acceso:** icono SVG en cuadro suave, título, descripción y «Consultar →».
- **Pestañas** (`.pestana`): la activa con `nav-item-active`, peso 700 y subrayado completo (8,06:1); `aria-pressed` / `aria-current`; se abren con `?vista=`.
- **Avisos y estados:** `aviso` (o `error`, `exito`) con borde completo de 1px; nunca una barra lateral sola.
- **Paneles, tablas, formularios y botones:** `panel`, borde `borde-panel`; `button-primary`.

## Do's and Don'ts
- Primero operar. Estados que no dependan solo del color. WCAG 2.2 AA medido. `prefers-reduced-motion`.
- Sin degradados decorativos nuevos ni animación sin propósito. Sin datos inventados ni funciones simuladas.
- **Excepciones justificadas a reglas genéricas de Impeccable:** «ceja» institucional («PRISALY · PSICOLOGÍA SOCIAL», «ADMINISTRACIÓN»; DC-FE-IMP-01 §6) · «Consultar →» (referencia de Dirección) · accesos del Inicio en tarjetas iguales (navegación) · pila del sistema en lugar de fuente propia (cambio global con Mariana) · franja naranja del banner sobre superficie redondeada (E-1, acento institucional).
