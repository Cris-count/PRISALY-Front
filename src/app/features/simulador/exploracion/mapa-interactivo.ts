import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, TemplateRef } from '@angular/core';
import { ConfiguracionMapa, ContextoExterior } from './mapa.models';

/** Adaptador funcional sin escena gráfica; la ruta pública usa la pantalla temporal. */
@Component({
  selector: 'app-mapa-interactivo',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Selección de espacios">
      @for (espacio of configuracion().espacios; track espacio.id) {
        <div>
          <button type="button" [disabled]="!espacio.disponible"
            [attr.aria-pressed]="seleccionado() === espacio.id"
            [attr.aria-label]="espacio.nombre + (espacio.disponible ? ', seleccionar espacio' : ', no disponible')"
            (click)="seleccionar.emit(espacio.id)">
            @if (exterior(); as plantilla) {
              <ng-container [ngTemplateOutlet]="plantilla" [ngTemplateOutletContext]="{
                $implicit: espacio, seleccionado: seleccionado() === espacio.id,
                visitas: visitas().get(espacio.id) ?? 0
              }" />
            } @else {
              <span>Plantilla pendiente</span>
            }
            <strong>{{ espacio.nombre }}</strong>
            <span>{{ visitas().get(espacio.id) ? 'Visitado · ' + visitas().get(espacio.id) : 'Sin visitar' }}</span>
          </button>
          @if (seleccionado() === espacio.id && espacio.disponible) {
            <button type="button" (click)="entrar.emit()">Entrar a {{ espacio.nombre }}</button>
          }
        </div>
      }
      <button type="button" (click)="preguntas.emit()" aria-label="PRISALY, comenzar preguntas demostrativas">
        <strong>Preguntas</strong><span>Puedes entrar sin visitar espacios</span>
      </button>
    </section>
  `,
})
export class MapaInteractivo {
  readonly configuracion = input.required<ConfiguracionMapa>();
  readonly seleccionado = input<string | null>(null);
  readonly visitas = input<ReadonlyMap<string, number>>(new Map());
  readonly exterior = input<TemplateRef<ContextoExterior> | undefined>();
  readonly seleccionar = output<string>();
  readonly entrar = output<void>();
  readonly preguntas = output<void>();
}
