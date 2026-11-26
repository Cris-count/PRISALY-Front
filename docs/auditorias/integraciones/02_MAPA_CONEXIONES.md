# 02 — Mapa de conexiones

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · Solo lectura.

```mermaid
flowchart LR
  subgraph Frontend["PRISALY-Front (Angular 22)"]
    Login["login / autenticacion M1"]
    Dash["dashboard (menús por rol)"]
    Acad["academico (CasosM3Api, AdministracionM1Api, sesiones M4)"]
    Sim["simulador (Phaser + SIM-01 + Unreal)"]
    GW["ParticipacionGateway (pendiente)"]
  end

  subgraph Backend["PRISALY-Backend (Spring Boot)"]
    M1["m1 identidad/acceso"]
    M3["m3 casos + narrativa"]
    M4["m4 sesiones/convocatorias"]
    M5["m5 intentos/respuestas"]
    M6["m6 evaluación"]
    M7["m7 notificaciones"]
  end

  DB[("PostgreSQL 16.15")]

  Login -- "POST /v1/personal/autenticar · GET /me · cerrar-sesion (Bearer)" --> M1
  Dash -- "GET /v1/personal/me (rol/permisos)" --> M1
  Acad -- "v1/admin/** · v1/casos/** · m4/sesiones/**" --> M3
  Acad --> M4
  Acad --> M1
  Sim -. "gateway pendiente (sin HTTP real)" .-> GW
  GW -. "GET/PUT intentos/respuestas (opt-in)" .-> M5
  M3 --> DB
  M4 --> DB
  M5 --> DB
  M6 --> DB
  M7 --> DB
  M1 --> DB
```

```mermaid
flowchart LR
  subgraph Simulador["Simulador (demo)"]
    Phaser["Phaser mundo-tecnico (2.5D)"]
    SIM["MotorNarrativo SIM-01"]
    Unreal["Unreal Pixel Streaming"]
    Explo["exploracion (mapa/recorrido)"]
  end
  Phaser -- "contrato PaqueteVisual" --> SIM
  Explo -- "PlantillasEspacio / TemplateRef" --> SIM
  Unreal -. "transporte pixel-streaming (visual)" .-> Unreal
```

## Leyenda

- Flecha continua `-->`: conexión con evidencia de código (endpoint consumido por un servicio frontend real).
- Flecha punteada `-.->`: conexión pendiente, opt-in no activado, o simulada.
- Los flujos académicos reales verificados son: **M1 (login/admin)**, **M3 (casos)**, **M4 (sesiones/convocatorias)**.
- El **gateway de participación M5** sigue siendo el stub `ParticipacionPendienteGateway` (ninguna operación académica de intento sale al backend en la modalidad por defecto).
