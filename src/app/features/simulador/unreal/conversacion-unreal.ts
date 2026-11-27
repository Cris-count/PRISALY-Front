import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, untracked, viewChild,
} from '@angular/core';
import { LibretaStore } from '../investigacion/libreta.store';
import { HospitalUnreal } from './hospital-unreal';

/**
 * FE-UX-09 · panel de una conversación con un personaje del interior. Existe solo mientras la conversación está abierta
 * (lo monta HospitalNarrativoUnreal). Personaje identificado, diálogo legible, estado en texto (no solo color), pista
 * anunciada, foco al personaje cuando la conversación queda lista y Esc para cerrarla.
 */
@Component({
  selector: 'app-conversacion-unreal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="conversacion" [class.completada]="hospital.vista()?.terminado" aria-labelledby="conversacion-titulo"
      data-prueba="panel-conversacion" (keydown.escape)="cerrarConTeclado($event)">
      <header class="cabecera">
        <div>
          <p class="lugar">Conversación en {{ hospital.edificioActivo()?.nombre }}</p>
          <h3 id="conversacion-titulo" tabindex="-1" #tituloConversacion>{{ hospital.npcActivo().nombre }}</h3>
        </div>
        <p class="estado" data-prueba="estado-conversacion">{{ estadoConversacion() }}</p>
      </header>
      @if (hospital.conversacion() === 'abriendo') {
        <p class="bloque espera" role="status">Preparando la conversación con {{ hospital.npcActivo().nombre }}…</p>
      }
      @if (hospital.conversacion() === 'error') {
        <p class="bloque recuperacion">Cierra la conversación y vuelve a pulsar <kbd>E</kbd> junto al personaje. Tu progreso se conserva.</p>
      }
      @if (hospital.vista(); as vista) {
        <div class="bloque dialogo" aria-live="polite" data-prueba="dialogo">
          @if (vista.dialogo; as dialogo) {
            <p class="hablante">{{ nombre(dialogo.personajeId) }}</p>
            <p class="texto">{{ dialogo.texto }}</p>
          }
          @if (vista.estado.transicion; as transicion) { <p class="texto">{{ transicion.texto }}</p> }
          @if (vista.terminado) { <p class="cierre">Conversación completada. Puedes consultar tus pistas o continuar explorando.</p> }
        </div>
        @if (pistasDeEstaConversacion().length) {
          <p class="pista-nueva" role="status" data-prueba="pista-nueva">Guardado en tu libreta: {{ titulosPistasNuevas() }}</p>
        }
        @if (vista.dialogo || vista.decisiones.length || vista.estado.transicion) {
          <fieldset class="bloque opciones" [disabled]="!hospital.puedeDialogar()">
            <legend>{{ vista.decisiones.length ? '¿Qué quieres hacer?' : 'Continúa la conversación' }}</legend>
            @if (vista.dialogo) { <button type="button" class="principal" (click)="hospital.avanzarDialogo()">Siguiente diálogo</button> }
            @for (decision of vista.decisiones; track decision.id) {
              <button type="button" (click)="hospital.elegir(decision.id)">{{ decision.texto }}</button>
            }
            @if (vista.estado.transicion) { <button type="button" class="principal" (click)="hospital.completarTransicion()">Continuar conversación</button> }
          </fieldset>
        }
      }
      <footer class="pie">
        <button type="button" [disabled]="hospital.conversacion() === 'abriendo' || hospital.conversacion() === 'cerrando'"
          (click)="hospital.cerrarConversacion()">Cerrar conversación</button>
        <p class="atajos"><kbd>Tab</kbd> recorre las opciones · <kbd>Esc</kbd> cierra la conversación</p>
      </footer>
    </section>
  `,
  styles: `
    :host { display:block; margin-top:.75rem; color:#172b4d; }
    .conversacion { overflow:hidden; border:1px solid #c7d5e8; border-radius:.75rem; background:#fff; }
    .conversacion.completada { border-color:#1d6b45; }
    .cabecera { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:.5rem 1rem;
      padding:.875rem 1rem; background:#edf4ff; border-bottom:1px solid #c7d5e8; }
    .completada .cabecera { background:#e6f4ec; border-bottom-color:#b9dcc8; }
    .lugar { margin:0; font-size:.875rem; color:#344968; }
    h3 { margin:.125rem 0 0; font-size:1.25rem; line-height:1.25; overflow-wrap:break-word; }
    h3:focus { outline:none; }
    :focus-visible, h3:focus-visible { outline:3px solid #b45309; outline-offset:2px; }
    .estado { margin:0; padding:.25rem .625rem; border:1px solid #c7d5e8; border-radius:999px; background:#fff;
      font-size:.875rem; font-weight:700; white-space:nowrap; }
    .completada .estado { border-color:#1d6b45; color:#1d6b45; }
    .bloque { margin:0; padding:.875rem 1rem 0; }
    .recuperacion { color:#4a2c05; }
    .dialogo { max-width:68ch; }
    .hablante { margin:0 0 .25rem; font-size:.875rem; font-weight:700; color:#0755b8; }
    .texto { margin:0 0 .5rem; font-size:1.0625rem; line-height:1.6; overflow-wrap:break-word; }
    .cierre { margin:.5rem 0 0; color:#1d6b45; font-weight:600; }
    .pista-nueva { margin:.75rem 1rem 0; padding:.5rem .75rem; border:1px solid #c7d5e8; border-radius:.5rem; background:#fff4d6; color:#4a2c05; }
    .opciones { display:flex; flex-wrap:wrap; gap:.5rem; border:0; }
    legend { float:left; width:100%; margin-bottom:.25rem; padding:0; font-size:.875rem; font-weight:700; color:#344968; }
    button { min-height:2.65rem; padding:.65rem; border:1px solid #92adbf; border-radius:.5rem; background:#fff; color:#172b4d; text-align:left; cursor:pointer; }
    button:hover:not(:disabled) { border-color:#0755b8; }
    button.principal { background:#ff861b; border-color:#ff861b; color:#201000; font-weight:700; }
    button.principal:hover:not(:disabled) { background:#ff9b36; }
    button:disabled { opacity:.55; cursor:default; }
    .pie { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.5rem 1rem;
      margin-top:.875rem; padding:.75rem 1rem; border-top:1px solid #dbe2ec; }
    .atajos { margin:0; font-size:.875rem; color:#52606d; }
    kbd { padding:0 .375rem; border:1px solid #c7d5e8; border-bottom-width:2px; border-radius:.375rem; background:#fff; font:inherit; font-size:.8125rem; font-weight:700; }
    @media (max-width: 640px) { .opciones button { flex:1 1 100%; } .atajos { display:none; } }
  `,
})
export class ConversacionUnreal {
  readonly hospital = inject(HospitalUnreal);
  private readonly libreta = inject(LibretaStore);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('tituloConversacion');
  private readonly injector = inject(Injector);
  /** Pistas que había en la libreta al abrirse esta conversación. */
  private readonly pistasAlAbrir = this.libreta.estado().pistas.length;
  readonly pistasDeEstaConversacion = computed(() => this.libreta.estado().pistas.slice(this.pistasAlAbrir));
  readonly titulosPistasNuevas = computed(() => this.pistasDeEstaConversacion().map((p) => p.titulo).join(' · '));
  readonly estadoConversacion = computed(() => {
    switch (this.hospital.conversacion()) {
      case 'abriendo': return 'Preparando…';
      case 'cerrando': return 'Cerrando…';
      case 'error': return 'Sin confirmar';
      default: return this.hospital.vista()?.terminado ? 'Completada' : 'En curso';
    }
  });

  constructor() {
    let enfocado = false;
    // Foco al personaje cuando la conversación queda lista: las teclas del juego ya están bloqueadas.
    effect(() => {
      if (this.hospital.conversacion() !== 'abierta' || enfocado) return;
      enfocado = true;
      untracked(() => afterNextRender(() => this.titulo()?.nativeElement.focus(), { injector: this.injector }));
    });
  }

  cerrarConTeclado(evento: Event): void {
    if (this.hospital.libretaAbierta()) return; // la libreta gestiona su propio Esc
    evento.preventDefault();
    void this.hospital.cerrarConversacion();
  }

  nombre(id: string): string { return this.hospital.vista()?.estado.personajes.find((p) => p.id === id)?.nombre ?? id; }
}
