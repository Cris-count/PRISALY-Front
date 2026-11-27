import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LibretaPanel } from '../investigacion/libreta-panel';
import { LibretaStore } from '../investigacion/libreta.store';
import { HospitalUnreal } from './hospital-unreal';

/** Panel de los tres interiores: conserva el selector de la integración inicial. */
@Component({
  selector: 'app-hospital-narrativo-unreal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LibretaPanel],
  template: `
    <section aria-labelledby="recorrido-titulo">
      <h2 id="recorrido-titulo">Tu investigación</h2>
      <button type="button" [disabled]="!hospital.puedeAbrirLibreta()" (click)="hospital.abrirLibreta()">Libreta ({{ libreta.estado().pistas.length }})</button>
      <p>Conversaciones terminadas: {{ hospital.conversacionesTerminadas() }} de {{ hospital.totalConversaciones() }}</p>
      @for (edificio of hospital.recorridoVisible(); track edificio.edificioId) {
        <article><h3>{{ edificio.nombre }}</h3><p>{{ edificio.visitado ? 'Interior visitado' : 'Interior por visitar' }}</p>
          @for (npc of edificio.npcs; track npc.espacialId) {
            <p>{{ npc.nombre }}: {{ npc.estado === 'completado' ? 'Conversación terminada' : npc.estado === 'en_curso' ? 'Conversación en curso' : 'Por conversar' }}</p>
          }
        </article>
      }
    </section>
    @if (hospital.error()) { <p role="alert">{{ hospital.error() }}</p> }
    @if (hospital.enInterior()) {
      <section aria-labelledby="hospital-titulo">
        <h2 id="hospital-titulo">{{ hospital.edificioActivo()?.nombre }}</h2>
        <p>{{ hospital.edificioActivo()?.indicaciones }}</p>
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
              </fieldset>
            }
            <button type="button" [disabled]="hospital.conversacion() === 'abriendo' || hospital.conversacion() === 'cerrando'"
              (click)="hospital.cerrarConversacion()">Cerrar conversación</button>
          </section>
        }
      </section>
    }
    @if (hospital.vista() || libreta.estado().pistas.length || libreta.estado().notas.length) {
      <section aria-labelledby="pistas-hospital">
        <h2 id="pistas-hospital">Pistas de tu libreta ({{ libreta.estado().pistas.length }})</h2>
        @for (pista of libreta.estado().pistas; track pista.id) {
          <article><h3>{{ pista.titulo }}</h3><p>{{ pista.descripcion }}</p><p>Origen: {{ pista.origen.lugar }}</p></article>
        } @empty { <p>Todavía no has obtenido pistas.</p> }
        <p>El progreso se conserva al salir y reingresar mientras sigas en esta página. Se pierde al recargar la página.</p>
      </section>
    }
    @if (hospital.libretaAbierta()) { <app-libreta-panel (cerrar)="hospital.cerrarLibreta()" /> }
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
  nombre(id: string): string { return this.hospital.vista()?.estado.personajes.find(p => p.id === id)?.nombre ?? id; }
}
