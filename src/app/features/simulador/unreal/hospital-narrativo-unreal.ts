import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { LibretaPanel } from '../investigacion/libreta-panel';
import { LibretaStore } from '../investigacion/libreta.store';
import { HospitalUnreal } from './hospital-unreal';

/** Composición Angular del Hospital: usa el motor y la libreta existentes. */
@Component({
  selector: 'app-hospital-narrativo-unreal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LibretaPanel],
  template: `
    @if (hospital.error()) { <p role="alert">{{ hospital.error() }}</p> }
    @if (hospital.enInterior()) {
      <section aria-labelledby="hospital-titulo">
        <h2 id="hospital-titulo">Hospital Central</h2>
        <p>Acércate al doctor o al costado de la camilla del paciente y pulsa E para conversar. Para salir, camina hasta las puertas de vidrio.</p>
        @if (hospital.modal()) {
          <section [attr.aria-label]="'Conversación con ' + hospital.npcActivo().nombre" aria-live="polite">
            <h3>{{ hospital.npcActivo().nombre }}</h3>
            @if (hospital.vista(); as vista) {
              @if (vista.dialogo; as dialogo) {
                <p><strong>{{ nombre(dialogo.personajeId) }}:</strong> {{ dialogo.texto }}</p>
              }
              @if (vista.estado.transicion; as transicion) { <p>{{ transicion.texto }}</p> }
              @if (vista.terminado) { <p>Conversación completada. Puedes consultar tus pistas o continuar explorando.</p> }
              <fieldset [disabled]="!hospital.puedeDialogar()">
                <legend>Conversación</legend>
                @if (vista.dialogo) { <button type="button" (click)="hospital.avanzarDialogo()">Siguiente diálogo</button> }
                @for (decision of vista.decisiones; track decision.id) {
                  <button type="button" (click)="hospital.elegir(decision.id)">{{ decision.texto }}</button>
                }
                @if (vista.estado.transicion) { <button type="button" (click)="hospital.completarTransicion()">Continuar conversación</button> }
                <button type="button" (click)="libretaAbierta.set(true)">Libreta ({{ libreta.estado().pistas.length }})</button>
              </fieldset>
            }
            <button type="button" [disabled]="hospital.conversacion() === 'abriendo' || hospital.conversacion() === 'cerrando'"
              (click)="hospital.cerrarConversacion()">Cerrar conversación</button>
          </section>
        }
      </section>
    }
    @if (hospital.vista()) {
      <section aria-labelledby="pistas-hospital">
        <h2 id="pistas-hospital">Pistas de tu libreta ({{ libreta.estado().pistas.length }})</h2>
        @for (pista of libreta.estado().pistas; track pista.id) {
          <article><h3>{{ pista.titulo }}</h3><p>{{ pista.descripcion }}</p><p>Origen: {{ pista.origen.lugar }}</p></article>
        } @empty { <p>Todavía no has obtenido pistas.</p> }
        <p>El progreso se conserva al salir y reingresar durante esta sesión demostrativa. Se pierde al recargar la página.</p>
      </section>
    }
    @if (mostrarLibreta()) { <app-libreta-panel (cerrar)="libretaAbierta.set(false)" /> }
  `,
  styles: `
    section { margin-block:1rem; padding:1rem; border:1px solid #bed2df; border-radius:.7rem; }
    button { margin:.3rem; padding:.65rem; cursor:pointer; }
    fieldset { border:0; padding:0; } article { border-left:3px solid #3189b0; padding-left:1rem; }
    :focus-visible { outline:3px solid #cc7200; outline-offset:3px; }
  `,
})
export class HospitalNarrativoUnreal {
  readonly hospital = inject(HospitalUnreal);
  readonly libreta = inject(LibretaStore);
  readonly libretaAbierta = signal(false);
  readonly mostrarLibreta = computed(() => this.libretaAbierta() && this.hospital.puedeDialogar());
  constructor() {
    effect(() => { if (!this.hospital.puedeDialogar()) this.libretaAbierta.set(false); });
  }
  nombre(id: string): string { return this.hospital.vista()?.estado.personajes.find(p => p.id === id)?.nombre ?? id; }
}
