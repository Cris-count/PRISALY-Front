# 08 — Pruebas y evidencias

Auditoría forense PRISALY-AUDIT-INTEGRACIONES-001 · 2026-11-24 · Solo lectura.

Checkout: front `fix/integracion` `00a2fa25ff11a4972d42f4f5738687ddfc2d1772`; backend `fix/integracion` `5d61972d2f5e54758ab67e1dad4e6a2e74d1c2a6`.

## Ejecutado en esta auditoría

| ID | Comando | Entorno | Resultado | Evidencia | Interpretación |
|---|---|---|---|---|---|
| T-00 | `git rev-parse` / `git status` en ambos repos | local | leído | SHAs de arriba; árbol limpio salvo `docs/auditorias/` | El informe anterior que citaba `feature/fe-59-habilitacion-funcional` en `56b4ed9` no describe este checkout. |
| T-00b | Lectura de `application.yml`, `app.config.ts`, `environment*.ts`, controladores y clientes HTTP | local | leído | rutas y flags citados en `04` y `07` | Contratos presentes en código. Ninguna llamada HTTP real. |

No hay fila `VERIFICADO` en esta pasada: no se compiló, no se lanzó Karma, no se lanzó Maven y no se llamó a `/api/health`.

## No ejecutado

| ID | Comando | Motivo |
|---|---|---|
| T-01 | `npm run check:urls` y `tsc` en `PRISALY-Front` | Pendiente de autorización. Compilar no altera datos, pero esta pasada se limitó a inspección. |
| T-02 | `npm test -- --watch=false --browsers=ChromeHeadless` | Misma razón. Un conteo de otra rama (incluido un 765 de una sesión anterior) no es evidencia de `00a2fa2`. |
| T-03 | `npm run build` | Misma razón. |
| T-04 | `.\mvnw.cmd -B -pl app -am package -DskipTests` | Misma razón. |
| T-05 | `.\mvnw.cmd -B -pl app -am -Pdocker-it verify` | Escribe en Postgres de Testcontainers y exige Docker. No autorizado. |
| T-06 | `GET /api/health`, login y un caso real | Exige levantar backend y base. No se arrancaron contenedores ni el servidor. |
| T-07 | Recorrido en navegador de `/dashboard` y `/simulador*` | Exige `ng serve`. No se reinició el servidor de desarrollo. |

## Qué sí demuestran los archivos de prueba (sin haberlos corrido)

Existen specs de contrato con `HttpTestingController` para `CasosM3Api`, `SesionesM4Api`, `AdministracionM1Api` y `M1PersonalApi`. Si se ejecutan, prueban que el cliente arma la petición. No prueban que el servidor de `5d61972` responda, ni que Postgres persista.

El proveedor raíz del simulador es `ParticipacionPendienteGateway` (`participacion.gateway.ts`). Su spec comprueba que la operación falla. No es una prueba de M5.
