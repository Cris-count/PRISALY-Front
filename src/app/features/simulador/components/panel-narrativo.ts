import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { GUION_DEMOSTRACION } from '../demo/guion-demostracion';
import { MotorNarrativo } from '../narrativa/motor-narrativo';
import { Escenario2d } from './escenario-2d';
import { PanelContexto } from './panel-contexto';

@Component({
  selector: 'app-panel-narrativo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Escenario2d, PanelContexto],
  template: `
    <section aria-label="Historia demostrativa" class="narrativa">
      <h2>Historia demostrativa · sin evaluación académica</h2>
      <app-escenario-2d [escenario]="escena().escenario" />
      <app-panel-contexto [escenario]="escena().escenario" />
      <p role="status">Escenas visitadas: {{ estado().visitadas.length }} de {{ motor.totalEscenas }}.
        El total incluye rutas alternativas; no es una calificación.</p>
      <ul aria-label="Estados de los personajes">
        @for (personaje of estado().personajes; track personaje.id) {
          <li><strong>{{ personaje.nombre }}</strong>: {{ personaje.estado }} ·
            expresión {{ personaje.expresion }}
            <span aria-hidden="true">{{ personaje.expresion === 'alegre' ? '☺' : personaje.expresion === 'atenta' ? '◉' : '○' }}</span>
          </li>
        }
      </ul>
      <div class="tarjeta" aria-live="polite" aria-atomic="true">
        @if (dialogo(); as linea) {
          <p><strong>{{ nombre(linea.personajeId) }}:</strong> {{ linea.texto }}</p>
        }
        @if (estado().transicion; as transicion) {
          <p>{{ transicion.texto }}</p>
        }
        @if (terminado()) {
          <p>Historia demostrativa terminada. Las preguntas de ejemplo conservan sus selecciones.</p>
        }
      </div>
      <fieldset [disabled]="pausado()">
        <legend>Controles de la historia</legend>
        <div class="narrativa__acciones">
          @if (dialogo()) {
            <button type="button" class="boton" (click)="actuar('dialogo')">Siguiente diálogo</button>
          }
          @for (decision of decisiones(); track decision.id) {
            <button type="button" class="boton" (click)="elegir(decision.id)">{{ decision.texto }}</button>
          }
          @if (estado().transicion) {
            <button type="button" class="boton" (click)="actuar('transicion')">Entrar a la escena</button>
          }
          <button type="button" class="boton" [disabled]="!puedeVolver()" (click)="actuar('volver')">Atrás en la historia</button>
          <button type="button" class="boton" (click)="actuar('reiniciar')">Reiniciar historia</button>
        </div>
      </fieldset>
    </section>
  `,
  styles: `
    .narrativa { display: grid; gap: var(--espacio-2); }
    .narrativa__acciones { display: flex; flex-wrap: wrap; gap: var(--espacio-2); }
    fieldset { border: 1px solid currentColor; border-radius: .5rem; min-width: 0; }
    h2 { font-size: 1.2rem; }
  `,
})
export class PanelNarrativo {
  readonly pausado = input(false);
  protected readonly motor = new MotorNarrativo(GUION_DEMOSTRACION);
  protected readonly estado = signal(this.motor.estado);
  protected readonly escena = computed(() => { this.estado(); return this.motor.escena; });
  protected readonly dialogo = computed(() => { this.estado(); return this.motor.dialogoActual; });
  protected readonly decisiones = computed(() => { this.estado(); return this.motor.decisionesDisponibles; });
  protected readonly terminado = computed(() => { this.estado(); return this.motor.terminado; });
  protected readonly puedeVolver = computed(() => { this.estado(); return this.motor.puedeVolver; });
  protected nombre(id: string): string { return this.estado().personajes.find(p => p.id === id)!.nombre; }

  protected elegir(id: string): void {
    if (this.pausado()) return;
    this.motor.elegir(id);
    this.estado.set(this.motor.estado);
  }

  protected actuar(accion: 'dialogo' | 'transicion' | 'volver' | 'reiniciar'): void {
    if (this.pausado()) return;
    switch (accion) {
      case 'dialogo': this.motor.avanzarDialogo(); break;
      case 'transicion': this.motor.completarTransicion(); break;
      case 'volver': this.motor.volver(); break;
      case 'reiniciar': this.motor.reiniciar(); break;
    }
    this.estado.set(this.motor.estado);
  }
}
