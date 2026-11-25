# 06 — Auditoría de seguridad FE-58 (rutas, guards, permisos)

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Solo lectura.

## Rutas de nivel raíz (`app.routes.ts`)

| Ruta | Guard | Entorno |
|---|---|---|
| `/login` | — | público |
| `/dashboard` | `loadChildren` (guards internos) | según guard |
| `/simulador*` (3 rutas) | `requiereEntornoDemostracion` | solo `demo` |
| `**` | redirige a `login` | — |

## Guards de personal (verificados)

- `requiereSesionPersonalQa`: exige sesión de personal (opt-in `M1_PERSONAL_LOCAL`); fuera de QA conserva la demo solo en entorno `demo`; en producción redirige a `/login`.
- `requiereMapeoPersonalQa`: decide por `MAPEO_RUTAS_PERSONAL_OFICIAL` (ruta → requisito aprobado → `habilitada` → sesión vigente → `/me` → permisos/rol).
- `requiereEntornoDemostracion`: bloquea simulador/demo fuera del entorno `demo`.
- `VigilanciaAccesoPersonal`: revoca el acceso si se pierde con la pantalla abierta.

## Matriz de rutas de personal (`m1-mapeo-rutas.ts`)

9 rutas aprobadas con `habilitada: true` (DC-FE-59) y `verificacionQa: 'verificada'`:

| Ruta | Requisito |
|---|---|
| `usuarios-docentes` | rol `ADMINISTRADOR` |
| `estudiantes` | rol `ADMINISTRADOR` |
| `vista-general` | rol `ADMINISTRADOR` |
| `configuracion` | sesión autenticada |
| `mi-perfil` | sesión autenticada |
| `casos-academicos` | permiso `CONSULTAR_CASO` |
| `rubricas` | permiso `CONSULTAR_CASO` |
| `sesiones` | permiso `GESTIONAR_SESION` |
| `convocatorias` | permiso `GESTIONAR_SESION` |

## Seguridad backend (verificada)

- `anyRequest().authenticated()`: todo salvo health/login/acceso-estudiante exige Bearer.
- `/v1/estudiantes/**`: acceso por cookie de estudiante (DD-02), actualmente **deshabilitado** (`prisaly.m1.student-access.enabled=false`).
- No hay administrador "con permisos automáticos": el rol ADMINISTRADOR se valida contra `/me`.

## Hallazgos de seguridad

1. **Acceso por URL directa**: las rutas del dashboard usan guards; el acceso directo a una ruta de personal exige sesión + permiso/rol. Las rutas del simulador exigen entorno `demo`.
2. **Divergencia de entorno QA**: `environment.qa.ts` apunta a `localhost:18094`; no se verificó que ese backend esté disponible o que sus contratos coincidan.
3. **`PersonalContrasenaController` (`PUT /v1/personal/contrasena`) y `GET /v1/personal/autorizacion/crear-caso`**: endpoints M1 sin consumidor frontend confirmado (potencial huérfano).
4. **FE-59**: habilitó navegación por rol en QA; no concede operaciones (la autorización final es del backend).

## Nota de ramas

Checkout auditado: ambos repositorios en `fix/integracion` (front `00a2fa2`, backend `5d61972`). El mapa oficial tiene `habilitada: false`. Solo el build `qa-navegacion` pone `habilitada: true` en las rutas de `RUTAS_AUTORIZADAS_QA_NAVEGACION`, y solo si `production === false` y `personalQaHabilitado === true` (`habilitacion-qa-navegacion.ts`). Desarrollo, QA ordinario, demo y producción conservan el mapa apagado.
