# 01 — Inventario real del sistema

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Fecha: 2026-11-24 · Solo lectura.

## Repositorios

| Repo | Ruta | Rama activa | HEAD | Estado |
|---|---|---|---|---|
| PRISALY-Front | `PRISALY-Front/` | `fix/integracion` | `00a2fa25ff11a4972d42f4f5738687ddfc2d1772` | limpio, salvo esta carpeta de auditoría sin seguimiento |
| PRISALY-Backend | `PRISALY-Backend/` | `fix/integracion` | `5d61972d2f5e54758ab67e1dad4e6a2e74d1c2a6` | limpio |

Ambos son repositorios Git independientes. La raíz (`PRISALY/`) no es un repo.

## Stack

- **Frontend**: Angular 22.2.3, TypeScript ~6.0, Karma/Jasmine. Dependencias clave: `phaser@^3.90.0`, `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`.
- **Backend**: Spring Boot 4.1.2, Java 21, Maven modular (`pom.xml`). JDBC por defecto `localhost:5432` (`application.yml`); el puerto real del host depende del entorno y no se leyó `.env`. Flyway aplica `V001`–`V013` (más `V010` en el módulo m4). Hibernate `ddl-auto=validate`.
- **Motor narrativo**: `MotorNarrativo` (TypeScript puro, en frontend) + narrativa M3 (backend).

## Módulos backend (Maven)

| Módulo | Responsabilidad |
|---|---|
| `app` | boot, seguridad (`HttpApiConfig`), Flyway, health |
| `m1` | identidad y acceso (personal + estudiante) |
| `m2` | gestión académica (sin alcance delimitado) |
| `m3` | casos (CRUD, contenido, rúbrica, **narrativa**) |
| `m4` | sesiones y convocatorias |
| `m5` | intentos y respuestas (estado académico) |
| `m6` | evaluación |
| `m7` | comunicaciones / notificaciones |

## Features frontend (`src/app/features/`)

| Feature | Contenido | Estado de conexión |
|---|---|---|
| `autenticacion/` | login personal M1 (sesión, guards, interceptores), acceso demo local, entorno demostración | conectado a M1 (autenticar/me/cerrar-sesion) |
| `dashboard/` | layout + menús por rol (admin/docente/estudiante) | navegación por rol |
| `academico/` | Clientes HTTP de M1/M3/M4 y paneles montados en el dashboard docente | IMPLEMENTADO_NO_PROBADO. En `ng serve` y producción el interceptor no se registra (`personalQaHabilitado: false`) |
| `simulador/` | `mundo-tecnico/` (Phaser), `exploracion/` (mapa/recorrido), `narrativa/` (SIM-01 + adaptador guion M3), `unreal/` (Pixel Streaming), `investigacion/` (libreta), `services/` (gateway de participación) | simulador demo; gateway M5 pendiente |

## Entornos frontend (`src/environments/`)

| Archivo | apiBaseUrl | personalQa | demo | uso |
|---|---|---|---|---|
| `environment.ts` | `/api` | false | false | producción |
| `environment.qa.ts` | `http://localhost:18094/api` | true | false | QA personal |
| `environment.qa-navegacion.ts` | `http://localhost:18094/api` | true | false | QA demo fullstack (+4 rutas docentes) |
| `environment.development.ts` | `http://localhost:8080/api` | false | false | desarrollo local |
| `environment.demo.ts` | `/api` | false | true | demostración |

⚠️ **Divergencia**: QA apunta a `localhost:18094`, desarrollo a `localhost:8080`. Son backends distintos.

## Observación

La base de evidencia de esta auditoría es el código actual inspeccionado (grep de controladores, rutas, entornos, servicios). No se levantaron servicios ni se ejecutaron flujos contra un backend real (todo estaba apagado al iniciar); las clasificaciones "de conexión" se basan en la correspondencia verificada de código (rutas + DTO + consumidores), no en ejecución E2E.
