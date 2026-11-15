import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, TemplateRef } from '@angular/core';
import { ConfiguracionMapa, ContextoExterior } from './mapa.models';

@Component({
  selector: 'app-mapa-interactivo',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Mapa de exploración" class="mapa">
      <div class="suelo" aria-hidden="true"></div>
      @for (espacio of configuracion().espacios; track espacio.id) {
        <button
          type="button"
          class="espacio"
          [class.seleccionado]="seleccionado() === espacio.id"
          [style.--mapa-x]="espacio.posicion.x + '%'"
          [style.--mapa-y]="espacio.posicion.y + '%'"
          [disabled]="!espacio.disponible"
          [attr.aria-pressed]="seleccionado() === espacio.id"
          [attr.aria-label]="
            espacio.nombre + (espacio.disponible ? ', seleccionar espacio' : ', no disponible')
          "
          (click)="seleccionar.emit(espacio.id)"
        >
          @if (exterior(); as plantilla) {
            <ng-container
              [ngTemplateOutlet]="plantilla"
              [ngTemplateOutletContext]="{
                $implicit: espacio,
                seleccionado: seleccionado() === espacio.id,
                visitas: visitas().get(espacio.id) ?? 0,
              }"
            />
          } @else {
            <span aria-hidden="true" class="pieza"></span
            ><span class="provisional">Plantilla pendiente</span>
          }
          <strong>{{ espacio.nombre }}</strong>
          <span>{{
            visitas().get(espacio.id) ? 'Visitado · ' + visitas().get(espacio.id) : 'Sin visitar'
          }}</span>
        </button>
      }
      <button
        type="button"
        class="central"
        (click)="preguntas.emit()"
        aria-label="PRISALY, comenzar preguntas demostrativas"
      >
        <img src="images/prisaly-logo.png" alt="" width="100" height="50" />
        <strong>Preguntas</strong><span>Puedes entrar sin visitar espacios</span>
      </button>
    </section>
  `,
  styleUrl: './mapa-interactivo.css',
})
export class MapaInteractivo {
  readonly configuracion = input.required<ConfiguracionMapa>();
  readonly seleccionado = input<string | null>(null);
  readonly visitas = input<ReadonlyMap<string, number>>(new Map());
  readonly exterior = input<TemplateRef<ContextoExterior> | undefined>();
  readonly seleccionar = output<string>();
  readonly preguntas = output<void>();
}
