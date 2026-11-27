import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, output, signal,
  untracked, viewChild,
} from '@angular/core';
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
      <section class="interior" aria-labelledby="hospital-titulo">
        <h2 id="hospital-titulo">{{ hospital.edificioActivo()?.nombre }}</h2>
        @if (!hospital.modal()) { <p class="indicacion">{{ hospital.edificioActivo()?.indicaciones }}</p> }
        @if (hospital.modal()) {
          <section class="conversacion" [class.completada]="hospital.vista()?.terminado" aria-labelledby="conversacion-titulo"
            data-prueba="panel-conversacion" (keydown.escape)="cerrarConTeclado($event)">
            <header class="conversacion-cabecera">
              <div>
                <p class="lugar">Conversación en {{ hospital.edificioActivo()?.nombre }}</p>
                <h3 id="conversacion-titulo" tabindex="-1" #tituloConversacion>{{ hospital.npcActivo().nombre }}</h3>
              </div>
              <p class="estado-conversacion" data-prueba="estado-conversacion">{{ estadoConversacion() }}</p>
            </header>
            @if (hospital.conversacion() === 'abriendo') {
              <p class="espera" role="status">Preparando la conversación con {{ hospital.npcActivo().nombre }}…</p>
            }
            @if (hospital.conversacion() === 'error') {
              <p class="recuperacion">Cierra la conversación y vuelve a pulsar <kbd>E</kbd> junto al personaje. Tu progreso se conserva.</p>
            }
            @if (hospital.vista(); as vista) {
              <div class="dialogo" aria-live="polite" data-prueba="dialogo">
                @if (vista.dialogo; as dialogo) {
                  <p class="hablante">{{ nombre(dialogo.personajeId) }}</p>
                  <p class="texto">{{ dialogo.texto }}</p>
                }
                @if (vista.estado.transicion; as transicion) { <p class="texto">{{ transicion.texto }}</p> }
                @if (vista.terminado) { <p class="cierre">Conversación completada. Puedes consultar tus pistas o continuar explorando.</p> }
              </div>
              @if (pistasDeEstaConversacion().length) {
                <p class="pista-nueva" role="status" data-prueba="pista-nueva">
                  Guardado en tu libreta: {{ titulosPistasNuevas() }}
                </p>
              }
              @if (vista.dialogo || vista.decisiones.length || vista.estado.transicion) {
                <fieldset class="opciones" [disabled]="!hospital.puedeDialogar()">
                  <legend>{{ vista.decisiones.length ? '¿Qué quieres hacer?' : 'Continúa la conversación' }}</legend>
                  @if (vista.dialogo) { <button type="button" class="principal" (click)="hospital.avanzarDialogo()">Siguiente diálogo</button> }
                  @for (decision of vista.decisiones; track decision.id) {
                    <button type="button" class="decision" (click)="hospital.elegir(decision.id)">{{ decision.texto }}</button>
                  }
                  @if (vista.estado.transicion) { <button type="button" class="principal" (click)="hospital.completarTransicion()">Continuar conversación</button> }
                </fieldset>
              }
            }
            <footer class="conversacion-pie">
              <button type="button" class="cerrar" [disabled]="hospital.conversacion() === 'abriendo' || hospital.conversacion() === 'cerrando'"
                (click)="hospital.cerrarConversacion()">Cerrar conversación</button>
              <p class="atajos" id="atajos-conversacion"><kbd>Tab</kbd> recorre las opciones · <kbd>Esc</kbd> cierra la conversación</p>
            </footer>
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
    :host { display:block; color:#172b4d; }
    section { margin-block:1rem; padding:1rem; border:1px solid #c7d5e8; border-radius:.75rem; background:#fff; }
    button { margin:.3rem; padding:.65rem; cursor:pointer; }
    fieldset { border:0; padding:0; } article { border:1px solid #dbe2ec; border-radius:.5rem; padding:.75rem 1rem; margin-block:.5rem; }
    :focus-visible { outline:3px solid #b45309; outline-offset:3px; }
    kbd { display:inline-grid; place-items:center; min-width:1.5rem; padding:0 .375rem; border:1px solid #c7d5e8;
      border-bottom-width:2px; border-radius:.375rem; background:#fff; font:inherit; font-size:.8125rem; font-weight:700; }
    .interior { padding:0; border:0; background:transparent; }
    .interior > h2 { margin:0; font-size:1.375rem; }
    .indicacion { margin:.25rem 0 0; color:#344968; max-width:65ch; }

    /* FE-UX-09 · conversación: personaje identificado, diálogo legible, estado en texto (no solo color). */
    .conversacion { margin-block:.75rem 0; padding:0; overflow:hidden; border-color:#c7d5e8; }
    .conversacion.completada { border-color:#1d6b45; }
    .conversacion-cabecera { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:.5rem 1rem;
      padding:.875rem 1rem; background:#edf4ff; border-bottom:1px solid #c7d5e8; }
    .conversacion.completada .conversacion-cabecera { background:#e6f4ec; border-bottom-color:#b9dcc8; }
    .lugar { margin:0; font-size:.875rem; color:#344968; }
    .conversacion-cabecera h3 { margin:.125rem 0 0; font-size:1.25rem; line-height:1.25; overflow-wrap:break-word; }
    .conversacion-cabecera h3:focus { outline:none; }
    .conversacion-cabecera h3:focus-visible { outline:3px solid #b45309; outline-offset:2px; }
    .estado-conversacion { margin:0; padding:.25rem .625rem; border:1px solid #c7d5e8; border-radius:999px; background:#fff;
      font-size:.875rem; font-weight:700; white-space:nowrap; }
    .conversacion.completada .estado-conversacion { border-color:#1d6b45; color:#1d6b45; }
    .espera, .recuperacion, .dialogo, .pista-nueva, .opciones { margin:0; padding:.875rem 1rem 0; }
    .recuperacion { color:#4a2c05; }
    .dialogo { max-width:68ch; }
    .hablante { margin:0 0 .25rem; font-size:.875rem; font-weight:700; color:#0755b8; }
    .texto { margin:0 0 .5rem; font-size:1.0625rem; line-height:1.6; overflow-wrap:break-word; }
    .cierre { margin:.5rem 0 0; color:#1d6b45; font-weight:600; }
    .pista-nueva { margin:.75rem 1rem 0; padding:.5rem .75rem; border:1px solid #c7d5e8; border-radius:.5rem; background:#fff4d6; color:#4a2c05; }
    .opciones { display:flex; flex-wrap:wrap; gap:.5rem; }
    .opciones legend { float:left; width:100%; margin-bottom:.25rem; padding:0; font-size:.875rem; font-weight:700; color:#344968; }
    .opciones button { margin:0; min-height:2.65rem; border:1px solid #92adbf; border-radius:.5rem; background:#fff; color:#172b4d; text-align:left; }
    .opciones button.principal { background:#ff861b; border-color:#ff861b; color:#201000; font-weight:700; }
    .opciones button:hover:not(:disabled) { border-color:#0755b8; }
    .opciones button.principal:hover:not(:disabled) { background:#ff9b36; }
    .opciones:disabled button { opacity:.55; cursor:default; }
    .conversacion-pie { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.5rem 1rem;
      margin-top:.875rem; padding:.75rem 1rem; border-top:1px solid #dbe2ec; }
    .conversacion-pie .cerrar { margin:0; border:1px solid #92adbf; border-radius:.5rem; background:#fff; color:#172b4d; }
    .atajos { margin:0; font-size:.875rem; color:#52606d; }
    @media (max-width: 640px) {
      .opciones button { flex:1 1 100%; }
      .atajos { display:none; }
    }
  `,
})
export class HospitalNarrativoUnreal {
  readonly hospital = inject(HospitalUnreal);
  readonly libreta = inject(LibretaStore);
  /** Al cerrar una conversación el foco vuelve al visor para seguir caminando (lo resuelve la página). */
  readonly conversacionCerrada = output<void>();
  private readonly tituloConversacion = viewChild<ElementRef<HTMLElement>>('tituloConversacion');
  private readonly injector = inject(Injector);
  /** Pistas que había en la libreta al abrir la conversación actual. */
  private readonly pistasAlAbrir = signal(0);
  readonly pistasDeEstaConversacion = computed(() => this.libreta.estado().pistas.slice(this.pistasAlAbrir()));
  readonly titulosPistasNuevas = computed(() => this.pistasDeEstaConversacion().map((p) => p.titulo).join(' · '));
  readonly estadoConversacion = computed(() => {
    switch (this.hospital.conversacion()) {
      case 'abriendo': return 'Preparando…';
      case 'cerrando': return 'Cerrando…';
      case 'error': return 'Sin confirmar';
      default: return this.hospital.vista()?.terminado ? 'Completada' : 'En curso';
    }
  });
  private anterior = this.hospital.conversacion();

  constructor() {
    effect(() => {
      const actual = this.hospital.conversacion();
      const previo = this.anterior;
      this.anterior = actual;
      // Los efectos se agrupan: pueden saltarse estados intermedios (p. ej. 'abriendo'), así que se reacciona al destino.
      if (previo === 'cerrada' && actual !== 'cerrada') this.pistasAlAbrir.set(untracked(() => this.libreta.estado().pistas.length));
      // Foco al personaje cuando la conversación queda lista: las teclas del juego ya están bloqueadas.
      if (actual === 'abierta' && previo !== 'abierta')
        afterNextRender(() => this.tituloConversacion()?.nativeElement.focus(), { injector: this.injector });
      if (actual === 'cerrada' && previo !== 'cerrada') untracked(() => this.conversacionCerrada.emit());
    });
  }

  cerrarConTeclado(evento: Event): void {
    if (this.hospital.libretaAbierta()) return; // la libreta gestiona su propio Esc
    evento.preventDefault();
    void this.hospital.cerrarConversacion();
  }

  nombre(id: string): string { return this.hospital.vista()?.estado.personajes.find(p => p.id === id)?.nombre ?? id; }
}
