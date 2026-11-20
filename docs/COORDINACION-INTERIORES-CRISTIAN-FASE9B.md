# PRISALY — Coordinación Técnica para la Integración de Interiores Artísticos (Fase 9B)
## Coordinación Técnica: Nicolás (Simulación / Estado) & Cristian (Biblioteca Visual / Arte 40°)

---

### 1. OBJETIVO Y ALCANCE

Este documento formaliza la arquitectura de integración para conectar los interiores artísticos definitivos de Cristian (proyección axonométrica oblicua a 40°, personajes y salas de VISUAL-25) con la infraestructura de continuidad narrativa y exploración 2.5D desarrollada por Nicolás.

**Principio rector:** La biblioteca visual de Cristian controla la estética, sprites, planos y representaciones de recintos; el anfitrión de Nicolás gestiona la física del exterior Phaser, colisiones, eventos de entrada/salida, snapshots inmutables y la comunicación desacoplada con la libreta de investigación.

---

### 2. CONTRATOS COMPARTIDOS Y TIPOS INVOLUCRADOS

Los siguientes contratos en TypeScript residen en `PRISALY-Front` y deben ser importados directamente sin duplicar definiciones:

#### A. Contratos de Espacio e Interiores (`src/app/features/simulador/exploracion/mapa.models.ts`)
```typescript
export interface PlantillasEspacio {
  readonly exterior?: TemplateRef<ContextoExterior>;
  readonly interior?: TemplateRef<ContextoInterior>;
}

export interface ContextoInterior {
  readonly $implicit: EspacioDemostrativo;
  readonly interaccionActiva: boolean;
  readonly emitir: (evento: EventoEspacioVisual) => void;
}

export type EventoEspacioVisual =
  | 'interaccion-iniciada'
  | 'interaccion-finalizada'
  | 'salida-solicitada';
```

#### B. Contratos Narrativos (`src/app/features/simulador/narrativa/narrativa.models.ts`)
* `GuionNarrativo`: Especificación estructurada del árbol de diálogos y decisiones por recinto.
* `PersonajeNarrativo`: `{ id, nombre, estado, expresion: 'serena' | 'atenta' | 'alegre' }`.
* `EstadoNarrativo`: Estado inmutable con `escenaId`, `dialogo`, `marcas`, `personajes`, `visitadas` y `transicion`.
* `ConsecuenciaNarrativa`: `{ tipo: 'marca', ... } | { tipo: 'personaje', ... }`. Conservada sin modificaciones.

---

### 3. FLUJO BIDIRECCIONAL DE DATOS Y EVENTOS

```
      NICOLÁS (Anfitrión / Coordinador)                  CRISTIAN (Plantilla Interior 40°)
 ┌──────────────────────────────────────────┐          ┌───────────────────────────────────┐
 │                                          │          │                                   │
 │ 1. Al detectar llegada a puerta edificio │          │                                   │
 │    - Suspende Phaser (canvas exterior)   │          │                                   │
 │    - Inicia o reanuda MotorNarrativo     │─────────▶│ Renderiza <ng-template #interior> │
 │    - Pasa ContextoInterior + Datos       │          │ - Sala axonométrica a 40°         │
 │                                          │          │ - Sprites / Retratos de personajes│
 │                                          │          │ - Cuadro de diálogo y opciones    │
 │                                          │          │                                   │
 │ 2. Acciones del usuario dentro de la sala│          │                                   │
 │    - Avanzar línea                       │◀─────────│ Emite avance o selección          │
 │    - Elegir decisión                     │          │                                   │
 │    - Salir a la ciudad                   │◀─────────│ emitir('salida-solicitada')       │
 │                                          │          │                                   │
 │ 3. Al recibir 'salida-solicitada':       │          │                                   │
 │    - Captura SnapshotNarrativoEdificio   │          │                                   │
 │    - Oculta plantilla interior           │          │                                   │
 │    - Reanuda Phaser en la puerta         │          │                                   │
 └──────────────────────────────────────────┘          └───────────────────────────────────┘
```

#### A. Datos que entrega Angular al Interior Visual
El componente anfitrión provee a la plantilla de Cristian:
1. **Identificador del espacio:** `$implicit.id` (`hospital-prueba`, `policia-prueba`, `fiscalia-prueba`).
2. **Plantilla visual solicitada:** `$implicit.plantillaVisual` (`hospital`, `policia`, `fiscalia`).
3. **Personajes presentes:** Arreglo con expresiones actuales (`serena`, `atenta`, `alegre`) para alternar sprites o retratos.
4. **Diálogo actual:** Texto y personaje hablante para proyección tipográfica o globos de texto.
5. **Decisiones disponibles:** Opciones que el alumno puede pulsar cuando el personaje espera respuesta.
6. **Estado de terminación:** Indicador si el recinto ya completó su investigación para mostrar el personaje en estado de despedida.

#### B. Eventos que emite el Interior Visual hacia el Anfitrión
1. **`emitir('salida-solicitada')`:** Indica que el usuario pulsó la puerta de salida o botón de retorno. El anfitrión congela el snapshot narrativo del recinto y reanuda el movimiento en la ciudad exterior.
2. **`emitir('interaccion-iniciada')` / `emitir('interaccion-finalizada')`:** Permite coordinar transiciones de cámara o animaciones visuales locales dentro de la sala.

---

### 4. INVENTARIO DE ARCHIVOS PARA INTEGRACIÓN POSTERIOR

Cuando Cristian entregue los componentes finales de la biblioteca visual:

| Archivo en `PRISALY-Front` | Acción de Integración |
| :--- | :--- |
| `src/app/features/simulador/exploracion/mapa.models.ts` | Conservar sin cambios (contrato base compartido). |
| `src/app/features/simulador/components/visor-ciudad-2d5.ts` | Inyectar `[plantillas]` de Cristian si se proyectan en el canvas o DOM. |
| `src/app/features/simulador/pages/simulador-integrado-page.html` | Conectar `<ng-container *ngTemplateOutlet="plantillaInterior; context: ...">`. |
| `src/app/features/simulador/services/coordinador-narrativo-interiores.ts` | Mapear guiones oficiales M3 de Cristian cuando sustituyan a los fixtures demo. |
| `src/app/features/simulador/investigacion/libreta.store.ts` | Mantener intacto: el adaptador de pistas sigue desacoplado de las vistas. |

---

### 5. MENSAJE DE ENLACE RECOMENDADO PARA CRISTIAN

```text
Cristian, Nicolás ya completó en modo demostrativo la continuidad de conversaciones y
la infraestructura de snapshots independientes para Hospital, Policía y Fiscalía.

El simulador ya conserva el progreso narrativo por edificio: el estudiante puede salir,
visitar otro lugar, regresar y retomar exactamente donde dejó la conversación sin reiniciarla.

Para integrar tus salas e interiores definitivos en 40° de VISUAL-25, hemos preparado
el documento formal en docs/COORDINACION-INTERIORES-CRISTIAN-FASE9B.md.

Por favor, indícanos qué componentes interiores y plantillas tienes disponibles y en qué rama
o entrega podemos revisarlos para realizar la conexión sin alterar tus archivos.
```
