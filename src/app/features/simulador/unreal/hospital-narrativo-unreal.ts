import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, output, signal,
  untracked, viewChild,
} from '@angular/core';
import { LibretaPanel } from '../investigacion/libreta-panel';
import { LibretaStore } from '../investigacion/libreta.store';
import { ContextoAcademicoUnreal, VistaPreviaDocenteUnreal } from './acceso-simulador';
import { HospitalUnreal } from './hospital-unreal';
import { INTERIORES_NARRATIVOS_UNREAL } from './interiores-narrativos-unreal';

/** Panel de los tres interiores: conserva el selector de la integración inicial. */
@Component({
  selector: 'app-hospital-narrativo-unreal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LibretaPanel],
  template: `
    <section class="investigacion" aria-labelledby="recorrido-titulo" data-prueba="panel-investigacion">
      <header class="investigacion-cabecera">
        <div>
          <h2 id="recorrido-titulo">Tu investigación</h2>
          <p class="caso" data-prueba="caso-investigacion">{{ identificacionCaso() }}</p>
        </div>
        <button type="button" class="libreta" [disabled]="!hospital.puedeAbrirLibreta()" (click)="hospital.abrirLibreta()">Libreta ({{ libreta.estado().pistas.length }})</button>
      </header>
      <p class="objetivo" data-prueba="objetivo">{{ objetivo() }}</p>
      <p class="progreso" data-prueba="progreso">
        <strong>{{ conversacionesTerminadas() }} de {{ totalConversaciones() }}</strong> conversaciones terminadas
        · <strong>{{ libreta.estado().pistas.length }}</strong> {{ libreta.estado().pistas.length === 1 ? 'pista' : 'pistas' }} en tu libreta
      </p>
      @if (hospital.recuperando()) {
        <p class="recuperando" role="status">Recuperando tu recorrido en la ciudad 3D…</p>
      } @else if (siguientePaso(); as paso) {
        <p class="siguiente" data-prueba="siguiente-paso">{{ paso }}</p>
      }
      <ul class="edificios" aria-label="Edificios de tu investigación">
        @for (edificio of recorrido(); track edificio.edificioId) {
          <li class="edificio" [class.actual]="estaAqui(edificio.edificioId)">
            <div class="edificio-cabecera">
              <h3>{{ edificio.nombre }}</h3>
              @if (estaAqui(edificio.edificioId)) { <span class="marca aqui">Estás aquí</span> }
              @else { <span class="marca">{{ edificio.visitado ? 'Visitado' : 'Por visitar' }}</span> }
            </div>
            <ul class="personajes">
              @for (npc of edificio.npcs; track npc.espacialId) {
                <li><span>{{ npc.nombre }}</span>
                  <span class="estado-npc" [class.terminada]="npc.estado === 'completado'">{{ npc.estado === 'completado' ? 'Conversación terminada' : npc.estado === 'en_curso' ? 'Conversación en curso' : 'Por conversar' }}</span></li>
              }
            </ul>
          </li>
        } @empty { <li class="vacio">Los edificios del caso aparecerán cuando la ciudad 3D lo aplique.</li> }
      </ul>
      @if (edificiosFueraDelCaso().length) {
        <p class="restriccion" data-prueba="fuera-del-caso">Fuera de tu investigación: {{ edificiosFueraDelCaso().join(', ') }}. Sus puertas no se abren en este caso.</p>
      }
      <p class="conservacion">Tu progreso se conserva al salir y volver a entrar en los edificios mientras sigas en esta página; se pierde al recargarla.</p>
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
    /* FE-UX-09 · panel de investigación: caso, objetivo, progreso, orientación y restricciones. */
    .investigacion { padding:0; border:0; background:transparent; }
    .investigacion-cabecera { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:.5rem 1rem; }
    .investigacion-cabecera h2 { margin:0; font-size:1.375rem; }
    .caso { margin:.125rem 0 0; color:#344968; font-weight:600; overflow-wrap:break-word; }
    .investigacion-cabecera .libreta { margin:0; min-height:2.65rem; border:1px solid #ff861b; border-radius:.5rem; background:#ff861b; color:#201000; font-weight:700; }
    .investigacion-cabecera .libreta:hover:not(:disabled) { background:#ff9b36; }
    .investigacion-cabecera .libreta:disabled { opacity:.55; cursor:default; }
    .objetivo { margin:.75rem 0 0; max-width:65ch; }
    .progreso { margin:.375rem 0 0; color:#344968; }
    .siguiente, .recuperando { margin:.75rem 0 0; padding:.5rem .75rem; border:1px solid #c7d5e8; border-radius:.5rem; background:#edf4ff; max-width:65ch; }
    .edificios { display:grid; grid-template-columns:repeat(auto-fit, minmax(14rem, 1fr)); gap:.75rem; margin:1rem 0 0; padding:0; list-style:none; }
    .edificio { min-width:0; padding:.75rem 1rem; border:1px solid #dbe2ec; border-radius:.75rem; background:#fff; }
    .edificio.actual { border-color:#0755b8; background:#edf4ff; }
    .edificio-cabecera { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.25rem .5rem; }
    .edificio h3 { margin:0; font-size:1.0625rem; }
    .marca { padding:.125rem .5rem; border:1px solid #c7d5e8; border-radius:999px; font-size:.8125rem; font-weight:700; color:#344968; }
    .marca.aqui { border-color:#0755b8; color:#0755b8; background:#fff; }
    .personajes { margin:.5rem 0 0; padding:0; list-style:none; }
    .personajes li { display:flex; flex-wrap:wrap; justify-content:space-between; gap:.125rem .5rem; padding:.25rem 0; border-top:1px solid #edf0f5; }
    .personajes li:first-child { border-top:0; }
    .estado-npc { font-size:.875rem; color:#52606d; }
    .estado-npc.terminada { color:#1d6b45; font-weight:600; }
    .vacio { color:#52606d; }
    .restriccion { margin:.75rem 0 0; padding:.5rem .75rem; border:1px solid #e8c77a; border-radius:.5rem; background:#fff4d6; color:#4a2c05; max-width:65ch; }
    .conservacion { margin:.75rem 0 0; font-size:.875rem; color:#52606d; max-width:65ch; }
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

  // FE-UX-09 · panel de investigación: caso, objetivo, progreso, orientación y restricciones, solo con datos reales.
  private readonly contextoAcademico = inject(ContextoAcademicoUnreal);
  private readonly vistaPrevia = inject(VistaPreviaDocenteUnreal);
  private readonly modo = computed<'previa' | 'academico' | 'demostracion'>(() =>
    this.vistaPrevia.actual() ? 'previa' : this.contextoAcademico.actual() ? 'academico' : 'demostracion');
  /**
   * Recorrido que se puede mostrar. Con un caso (vista previa o intento), hasta que la ciudad lo aplica no se conocen
   * sus edificios: no se enseñan los de la demostración en su lugar.
   */
  readonly recorrido = computed(() =>
    this.modo() !== 'demostracion' && this.hospital.zonasHabilitadas() === null ? [] : this.hospital.recorridoVisible());
  readonly totalConversaciones = computed(() => this.recorrido().flatMap((e) => e.npcs).length);
  readonly conversacionesTerminadas = computed(() => this.recorrido().flatMap((e) => e.npcs).filter((n) => n.estado === 'completado').length);
  readonly identificacionCaso = computed(() => {
    switch (this.modo()) {
      case 'previa': return 'Vista previa docente del caso guardado';
      case 'academico': return `Caso: ${this.contextoAcademico.actual()!.tituloCaso}`;
      default: return 'Recorrido demostrativo';
    }
  });
  readonly objetivo = computed(() => {
    const total = this.recorrido().flatMap((e) => e.npcs).length;
    if (!total) return 'Conecta la ciudad 3D para conocer los edificios y personajes de tu investigación.';
    const quienes = total === 1 ? 'el personaje' : `los ${total} personajes`;
    return `Objetivo: conversa con ${quienes} ${this.modo() === 'demostracion' ? 'de la demostración' : 'del caso'} y anota en tu libreta lo que descubras.`;
  });
  readonly siguientePaso = computed(() => {
    const filas = this.recorrido().flatMap((e) => e.npcs.map((n) => ({ edificio: e, npc: n })));
    if (!filas.length) return null;
    const pendiente = filas.find((f) => f.npc.estado === 'en_curso') ?? filas.find((f) => f.npc.estado !== 'completado');
    if (!pendiente) {
      switch (this.modo()) {
        case 'academico': return 'Ya conversaste con todos los personajes. Revisa tu libreta y vuelve al portal para responder el cuestionario.';
        case 'previa': return 'Recorriste todas las conversaciones del caso.';
        default: return 'Terminaste las conversaciones de la demostración. Revisa tu libreta.';
      }
    }
    const verbo = pendiente.npc.estado === 'en_curso' ? 'retoma la conversación con' : 'conversa con';
    return this.estaAqui(pendiente.edificio.edificioId)
      ? `Siguiente: ${verbo} ${pendiente.npc.nombre}; acércate y pulsa E.`
      : `Siguiente: ve a ${pendiente.edificio.nombre} y ${verbo} ${pendiente.npc.nombre}.`;
  });
  /** Edificios que el caso aplicado deja fuera (sus puertas responden EDIFICIO_RESTRINGIDO). */
  readonly edificiosFueraDelCaso = computed(() => {
    const habilitadas = this.hospital.zonasHabilitadas();
    if (!habilitadas?.size) return [];
    return INTERIORES_NARRATIVOS_UNREAL.filter((e) => !habilitadas.has(e.zonaId)).map((e) => e.nombre);
  });
  estaAqui(edificioId: string): boolean {
    return this.hospital.enInterior() && this.hospital.edificioActivo()?.edificioId === edificioId;
  }

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
