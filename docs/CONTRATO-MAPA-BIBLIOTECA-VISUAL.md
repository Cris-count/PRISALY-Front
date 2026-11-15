# PRISALY — Contrato de integración Nicolás / Cristian

Estado: aceptación conceptual comunicada por Cristian; puntos de extensión implementados localmente. Integración funcional con sus componentes reales pendiente. No es contrato Backend ni autoriza modificar archivos ajenos.

## Responsabilidades

- Nicolás: único mapa, posiciones, selección, visitas, entrada/salida, confirmación y preguntas demostrativas. Conserva N9 y el coordinador académico.
- Cristian: biblioteca de edificios, exteriores/interiores, personajes, expresiones, accesorios, conversaciones e integración con SIM-01.
- Mariana: login, dashboards y navegación general; no se modifican para esta integración.
- Backend: contenido, identidad, titularidad, fases académicas y persistencia. Este contrato no las reemplaza.

## Archivos que debe consumir Cristian

Rutas relativas al repositorio Frontend:

- `src/app/features/simulador/exploracion/mapa.models.ts`: fuente de los tipos compartidos. Importarlos; no crear una segunda definición.
- `src/app/features/simulador/exploracion/recorrido-mapa.ts`: anfitrión `RecorridoMapa`, selector `app-recorrido-mapa`.
- `src/app/features/simulador/exploracion/mapa-interactivo.ts`: mapa de Nicolás; no duplicarlo.

El código está local en la rama `feature/simulador-integracion-nicolas`, basado inicialmente en `6e4f5ee` y actualizado a `87d55f2`. Consultar la rama del PR para acceder a los archivos; no asumir que ya existen en `develop`.

## 1. Identificación de la plantilla

Cada espacio demostrativo tiene esta forma:

```ts
interface EspacioDemostrativo {
  readonly id: string;
  readonly nombre: string;
  readonly plantillaVisual: string;
  readonly posicion: { readonly x: number; readonly y: number };
  readonly disponible: boolean;
}
```

Claves visuales iniciales: `hospital`, `comisaria`, `oficinas`.

IDs del mapa inicial: `demo-hospital`, `demo-comisaria`, `demo-oficinas`. Son locales, no UUID M3/M5. No inferir relaciones académicas a partir de estos IDs, nombres o posiciones.

Cristian elige su componente según `plantillaVisual`. Nicolás controla la posición y disponibilidad. El espacio no contiene datos internos de personajes ni guion: esos datos siguen siendo responsabilidad de la biblioteca y de sus futuros contratos autorizados.

## 2. Entrada al anfitrión

```ts
interface PlantillasEspacio {
  readonly exterior?: TemplateRef<ContextoExterior>;
  readonly interior?: TemplateRef<ContextoInterior>;
}
```

`RecorridoMapa` recibe `[plantillas]` y `[configuracion]`. Una pareja de plantillas atiende los tres tipos de espacio, seleccionando por clave; no se exige un componente específico ni un registro nuevo del motor narrativo.

Ejemplo Angular válido de conexión, con contenido presentacional de ejemplo:

```html
<ng-template #exterior let-espacio let-seleccionado="seleccionado" let-visitas="visitas">
  <!-- Sustituir este contenido por los componentes reales de Cristian. -->
  <span>{{ espacio.nombre }} · {{ visitas }} visitas</span>
</ng-template>

<ng-template #interior let-espacio let-activa="interaccionActiva" let-emitir="emitir">
  <!-- Aquí se compone el interior, los personajes y los diálogos de Cristian. -->
  <p>{{ espacio.nombre }} · {{ activa ? 'Interacción activa' : 'Disponible' }}</p>
  <button type="button"
    (click)="emitir({ tipo: 'interaccion-iniciada', espacioId: espacio.id })">
    Iniciar interacción demostrativa
  </button>
  <button type="button"
    (click)="emitir({ tipo: 'interaccion-finalizada', espacioId: espacio.id })">
    Terminar interacción
  </button>
</ng-template>

<app-recorrido-mapa [plantillas]="{ exterior, interior }" />
```

El ejemplo no crea personajes, edificios o diálogos oficiales. Sirve para mostrar el cableado y no debe convertirse en una segunda biblioteca.

## 3. Exterior

```ts
interface ContextoExterior {
  readonly $implicit: EspacioDemostrativo;
  readonly seleccionado: boolean;
  readonly visitas: number;
}
```

- Se renderiza en el mapa, dentro del botón accesible que controla Nicolás.
- Debe ser presentacional: sin botones, enlaces, formularios ni otro mapa anidado.
- No emite navegación propia: el botón del anfitrión selecciona; luego el usuario pulsa entrar.
- No necesita repetir el nombre ni el contador: el anfitrión ya los presenta.
- Conservar un tamaño adaptable al contenedor actual; no fijar tamaño de pantalla ni coordenadas globales. La escala/huella definitiva se debe acordar al recibir el primer exterior real.
- Las imágenes decorativas deben usar alt vacío; cualquier información visual relevante necesita equivalente textual.

## 4. Interior, personajes y conversaciones

```ts
interface ContextoInterior {
  readonly $implicit: EspacioDemostrativo;
  readonly interaccionActiva: boolean;
  readonly emitir: (evento: EventoEspacioVisual) => void;
}
```

- Cristian renderiza interior y personajes mediante sus componentes.
- Sus componentes pueden tener controles propios de conversación, expresiones y accesorios.
- Puede reutilizar SIM-01 internamente; el mapa no lee sus marcas, escenas, historial ni reglas de diálogo.
- No modificar el coordinador M5 para iniciar una conversación.
- No llamar al gateway por seleccionar un personaje o terminar un diálogo.
- El anfitrión conserva el botón de regreso al mapa. No exigir terminar una conversación para salir durante exploración.
- Por ahora el interior se desmonta al salir y se crea de nuevo al entrar. Solo se conservan selección y visitas en el anfitrión. Si se necesita retener progreso narrativo por espacio, acordar un contrato separado de instantánea/restauración antes de implementarlo; no prometer esa persistencia actualmente.

## 5. Eventos compartidos

```ts
type EventoEspacioVisual =
  | { readonly tipo: 'interaccion-iniciada'; readonly espacioId: string }
  | { readonly tipo: 'interaccion-finalizada'; readonly espacioId: string }
  | { readonly tipo: 'salida-solicitada'; readonly espacioId: string };
```

- `interaccion-iniciada`: indica que comenzó una interacción visual del espacio abierto.
- `interaccion-finalizada`: indica que terminó; no significa respuesta guardada, escena evaluada ni intento finalizado.
- `salida-solicitada`: solicita regresar al mapa. El anfitrión valida que el espacio corresponda al abierto y que continúe la exploración.

No enviar revisiones, notas, identidad del estudiante, IDs académicos o respuestas por estos eventos. Los eventos de otro espacio o fuera de exploración se ignoran.

## 6. Recorrido y cuestionario: responsabilidad de Nicolás

El estudiante puede visitar, repetir u omitir espacios. El punto central PRISALY abre una confirmación; cancelarla conserva la exploración. Confirmarla abre únicamente preguntas demostrativas y bloquea visualmente el regreso a espacios durante el bloque.

Por indicación de Nicolás, el cuestionario del mapa ya no ofrece «Pregunta anterior». En esta demostración se selecciona una opción antes de avanzar, para no dejar una pregunta pendiente sin posibilidad de retorno. Esta secuencia no modifica contratos ni políticas académicas Backend y no debe implementarse dentro de los componentes de Cristian.

## 7. Límites y coordinación de archivos

- No duplicar mapa, gateway, coordinador o biblioteca visual.
- No crear rutas globales, login o dashboards.
- No modificar el motor de Cristian para gestionar selección de edificios.
- No crear estados oficiales M5 ni persistencia de coordenadas.
- No inferir guiones o correspondencias académicas desde las plantillas.
- No registrar llamadas académicas desde los componentes demostrativos.
- Cada integrante trabaja en sus archivos. Cualquier ajuste en `mapa.models.ts`, `recorrido-mapa.ts`, `mapa-interactivo.ts` o la página del simulador se coordina antes de editarlo.

## 8. Entrega solicitada a Cristian

1. Aceptación conceptual recibida. Coordinar cualquier ajuste concreto antes de integrar y entregar rama y SHA de la biblioteca real.
2. Indicar nombres, rutas, inputs, outputs y dependencias de sus componentes reales.
3. Entregar primero un exterior e interior de hospital para comprobar escala e interacción.
4. Incluir los dos personajes base y cómo configurar accesorios/expresiones, cuando estén disponibles, sin trasladar su representación interna al mapa.
5. Mostrar cómo iniciar y terminar una conversación utilizando los eventos del contrato.
6. Verificar montaje, salida y nueva entrada sin efectos residuales ni llamadas académicas.
7. Después aplicar el mismo contrato a comisaría y oficinas.

La prueba con plantillas externas ya pasa en el mapa de Nicolás, pero la integración final solo se declarará completa después de incorporar y probar los componentes reales de Cristian. No se autoriza commit, push o merge mediante este documento.

## 9. Preparación de la integración conjunta — 15 de noviembre de 2026

Cristian aceptó conceptualmente las responsabilidades y los tipos compartidos. Propuso validar primero hospital exterior e interior con dos personajes configurables. Esta aceptación no acredita una integración funcional ni la disponibilidad remota de estos archivos.

- Disponibilidad: Nicolás prepara un paquete de 13 archivos en su rama existente. El SHA exacto se comunicará al publicar la rama. No sobrescribir ramas de trabajo.
- Proporciones: el botón exterior actual mide 155 px de ancho y deja aproximadamente 125 px interiores. Son medidas provisionales del anfitrión, no una restricción definitiva para los recursos de Cristian. Acordar la huella y escala con el primer hospital real; mantener adaptación al contenedor.
- Ciclo de vida: el anfitrión monta el interior al entrar y lo desmonta al salir. Los componentes deben liberar temporizadores y suscripciones al destruirse. Verificarlo conjuntamente con el hospital real.
- Eventos: utilizar exclusivamente los tres eventos de la sección 5, con el identificador del espacio abierto. Validar inicio, finalización y solicitud de salida con los componentes reales.
- Progreso al reingresar: la propuesta inicial es reiniciar la conversación demostrativa y conservar las visitas del mapa. Esto requiere confirmación de Cristian; actualmente no existe un contrato de instantánea ni una garantía de restauración narrativa.
- Entrega de Cristian pendiente: rutas, inputs, outputs, dependencias, rama y SHA de los componentes. Después se comprobarán escala, entrada, salida, reingreso y eventos antes de extender a comisaría y oficinas.

No se cambia código ni se autoriza publicación mediante esta actualización de coordinación.