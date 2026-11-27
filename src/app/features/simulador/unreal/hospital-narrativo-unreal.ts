import { ChangeDetectionStrategy, Component, computed, effect, inject, output, untracked } from '@angular/core';
import { LibretaPanel } from '../investigacion/libreta-panel';
import { ConversacionUnreal } from './conversacion-unreal';
import { LibretaStore } from '../investigacion/libreta.store';
import { ContextoAcademicoUnreal, VistaPreviaDocenteUnreal } from './acceso-simulador';
import { HospitalUnreal } from './hospital-unreal';
import { INTERIORES_NARRATIVOS_UNREAL } from './interiores-narrativos-unreal';

/** Panel de los tres interiores: conserva el selector de la integración inicial. */
@Component({
  selector: 'app-hospital-narrativo-unreal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LibretaPanel, ConversacionUnreal],
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
        @if (hospital.modal()) { <app-conversacion-unreal /> }
      </section>
    }
    @if (hospital.libretaAbierta()) { <app-libreta-panel (cerrar)="hospital.cerrarLibreta()" /> }
  `,
  styles: `
    :host { display:block; color:#172b4d; }
    section { margin-block:1rem; padding:1rem; border:1px solid #c7d5e8; border-radius:.75rem; background:#fff; }
    button { margin:.3rem; padding:.65rem; cursor:pointer; }
    :focus-visible { outline:3px solid #b45309; outline-offset:3px; }
    .interior { padding:0; border:0; background:transparent; }
    .interior > h2 { margin:0; font-size:1.375rem; }
    .indicacion { margin:.25rem 0 0; color:#344968; max-width:65ch; }

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
  `,
})
export class HospitalNarrativoUnreal {
  readonly hospital = inject(HospitalUnreal);
  readonly libreta = inject(LibretaStore);
  /** Al cerrar una conversación el foco vuelve al visor para seguir caminando (lo resuelve la página). */
  readonly conversacionCerrada = output<void>();
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
    // Al cerrarse la conversación (por cualquier camino) la página devuelve el foco al visor.
    effect(() => {
      const actual = this.hospital.conversacion();
      const previo = this.anterior;
      this.anterior = actual;
      if (actual === 'cerrada' && previo !== 'cerrada') untracked(() => this.conversacionCerrada.emit());
    });
  }
}
