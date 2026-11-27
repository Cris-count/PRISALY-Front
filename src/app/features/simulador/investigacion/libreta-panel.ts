import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LibretaStore } from './libreta.store';
import type { PistaInvestigacion } from './investigacion.models';
import { ContextoAcademicoUnreal, VistaPreviaDocenteUnreal } from '../unreal/acceso-simulador';
import { HospitalUnreal } from '../unreal/hospital-unreal';

type Seccion = 'libreta-pistas' | 'libreta-conversaciones' | 'libreta-notas';

@Component({
  selector: 'app-libreta-panel',
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #panel aria-labelledby="libreta-titulo" aria-describedby="libreta-aviso" (cancel)="cancelarDialogo($event)">
      <header>
        <h2 id="libreta-titulo">Libreta de investigación @if (!academico) { <span class="modo">Demostración</span> }</h2>
        <button type="button" autofocus aria-label="Cerrar libreta" (click)="cerrar.emit()">Cerrar</button>
      </header>
      <div class="cuerpo">
      <p id="libreta-aviso" class="aviso" data-prueba="aviso-libreta">{{ academico
        ? 'Tus pistas y notas se conservan mientras sigas en esta página y se pierden al recargar o salir del simulador. Todavía no se guardan en el servidor ni se envían a tu docente.'
        : 'Solo durante esta demostración. Las pistas y notas se perderán al recargar o salir del simulador.' }}</p>
      <nav aria-label="Secciones de la libreta">
        <button type="button" (click)="irASeccion('libreta-pistas')">Pistas ({{ store.estado().pistas.length }})</button>
        @if (hospital) { <button type="button" (click)="irASeccion('libreta-conversaciones')">Conversaciones ({{ conversaciones().length }})</button> }
        <button type="button" (click)="irASeccion('libreta-notas')">Mis notas ({{ store.estado().notas.length }})</button>
      </nav>

      <section aria-labelledby="libreta-pistas">
        <h3 id="libreta-pistas" tabindex="-1">Pistas obtenidas</h3>
        <p class="ayuda">Lo que te revelaron los personajes del caso, agrupado por lugar.</p>
        @for (grupo of pistasPorLugar(); track grupo.lugar) {
          <h4 class="lugar">{{ grupo.lugar }}</h4>
          <ul class="lista" [attr.aria-label]="'Pistas de ' + grupo.lugar">
            @for (pista of grupo.pistas; track pista.id) {
              <li class="pista"><p class="tipo">Pista</p><h5>{{ pista.titulo }}</h5><p>{{ pista.descripcion }}</p>
                <small>Obtenida: {{ pista.obtenidaEn | date:'short' }}</small></li>
            }
          </ul>
        } @empty { <p class="vacio">Todavía no has obtenido pistas. Aparecen aquí cuando un personaje te entrega información durante una conversación.</p> }
        @if (!academico) {
        <details><summary>Probar una pista de demostración</summary><p>Este ejemplo no pertenece a un caso ni responde una pregunta académica.</p>
          <button type="button" [disabled]="tieneEjemplo()" (click)="recopilarEjemplo()">Recopilar pista de ejemplo</button></details>
        }
      </section>

      @if (hospital) {
        <section aria-labelledby="libreta-conversaciones">
          <h3 id="libreta-conversaciones" tabindex="-1">Conversaciones</h3>
          @for (c of conversaciones(); track c.id) {
            <p class="conversacion" data-prueba="libreta-conversacion"><strong>{{ c.nombre }}</strong> · {{ c.lugar }}
              <span class="estado" [class.terminada]="c.terminada">{{ c.terminada ? 'Terminada' : 'En curso' }}</span></p>
          } @empty { <p class="vacio">Aún no has conversado con nadie. Entra en un edificio y pulsa <kbd>E</kbd> junto a un personaje.</p> }
        </section>
      }

      <section aria-labelledby="libreta-notas"><h3 id="libreta-notas" tabindex="-1">Mis notas</h3>
        <form (ngSubmit)="aplicarNota()"><label for="texto-nota">{{ editando() ? 'Editar nota personal' : 'Nueva nota personal' }}</label>
          <textarea #editor id="texto-nota" name="texto" rows="4" maxlength="4000" aria-describedby="limite-nota" [ngModel]="texto()" (ngModelChange)="texto.set($event)" placeholder="Escribe tus observaciones…"></textarea>
          <small id="limite-nota" class="limite">{{ texto().length }} de 4000 caracteres</small>
          <div class="acciones"><button type="submit" class="primario" [disabled]="!texto().trim()">{{ editando() ? 'Aplicar cambios' : 'Añadir nota' }}</button>
            @if (editando()) { <button type="button" (click)="cancelarEdicion()">Cancelar edición</button> }</div>
        </form>
        <p role="status" aria-live="polite">{{ mensaje() }}</p>
        @for (nota of store.estado().notas; track nota.id) {
          <article class="nota"><p class="tipo">Nota personal</p><p class="contenido">{{ nota.texto }}</p>
            <small>Creada: {{ nota.creadaEn | date:'short' }}@if (nota.modificadaEn !== nota.creadaEn) { · Modificada: {{ nota.modificadaEn | date:'short' }} }</small>
            <div class="acciones">
              @if (confirmando() === nota.id) {
                <span class="confirmar" [id]="'confirmar-' + nota.id">¿Eliminar esta nota? No se puede deshacer.</span>
                <button type="button" class="peligro" [attr.aria-describedby]="'confirmar-' + nota.id" (click)="eliminar(nota.id)">Confirmar eliminación</button>
                <button type="button" (click)="confirmando.set(null)">Conservar</button>
              } @else {
                <button type="button" [attr.aria-label]="'Editar nota: ' + nota.texto.slice(0, 45)" (click)="editar(nota.id)">Editar</button>
                <button type="button" [attr.aria-label]="'Eliminar nota: ' + nota.texto.slice(0, 45)" (click)="confirmando.set(nota.id)">Eliminar</button>
              }
            </div>
          </article>
        } @empty { <p class="vacio">Tus anotaciones personales aparecerán aquí. Úsalas para relacionar lo que te cuenta cada personaje.</p> }
      </section>
      </div>
    </dialog>
  `,
  styles: `
    dialog { box-sizing: border-box; width: min(680px, calc(100vw - 2rem)); max-height: 88dvh; padding: 0; overflow: hidden; border: 1px solid #c7d5e8; border-radius: 1.25rem; background: #f4f6fa; color: #172b4d; box-shadow: 0 20px 60px #17314f40; }
    dialog::backdrop { background: #05265080; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.4rem; background: #fff; border-bottom: 1px solid #dbe2ec; }
    .cuerpo { max-height: calc(88dvh - 80px); overflow-y: auto; padding: 0 1.4rem 1.2rem; }
    h2 { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin: 0; font-size: 1.375rem; }
    h3 { margin: 1.5rem 0 .25rem; font-size: 1.125rem; scroll-margin-top: 1rem; } h4, h5 { margin: 0; } h5 { font-size: 1rem; }
    .modo { padding: .125rem .5rem; border: 1px solid #8a5a00; border-radius: 999px; background: #fff4d6; color: #4a2c05; font-size: .75rem; font-weight: 700; }
    .aviso { margin: 1rem 0 0; padding: .75rem; border: 1px solid #e8c77a; border-radius: .5rem; background: #fff4d6; color: #4a2c05; font-size: .875rem; }
    .ayuda { margin: 0 0 .5rem; color: #344968; font-size: .875rem; }
    nav, .acciones { display: flex; gap: .6rem; flex-wrap: wrap; align-items: center; } nav { padding: .75rem 0; border-bottom: 1px solid #dbe2ec; }
    button { padding: .55rem .8rem; border: 1px solid #92adbf; border-radius: .5rem; background: white; color: #172b4d; cursor: pointer; } button:disabled { opacity: .55; cursor: default; }
    .primario { background: #ff861b; color: #201000; border-color: #ff861b; font-weight: 700; } .primario:hover:not(:disabled) { background: #ff9b36; }
    .peligro { border-color: #b42318; color: #b42318; font-weight: 700; } .confirmar { color: #b42318; font-size: .875rem; font-weight: 600; }
    textarea { display: block; width: 100%; box-sizing: border-box; margin: .5rem 0 .25rem; padding: .7rem; border: 1px solid #92adbf; border-radius: .5rem; font: inherit; resize: vertical; } label { font-weight: 600; }
    .limite { display: block; margin-bottom: .5rem; }
    :focus-visible { outline: 3px solid #b45309; outline-offset: 3px; }
    .lugar { margin: .75rem 0 .25rem; font-size: .9375rem; color: #0755b8; }
    .lista { margin: 0; padding: 0; list-style: none; }
    .pista, article { background: white; border: 1px solid #dbe2ec; border-radius: .75rem; padding: .875rem 1rem; margin: .5rem 0; overflow-wrap: break-word; }
    .pista p { margin: .25rem 0; }
    .tipo { margin: 0 0 .25rem; font-size: .75rem; font-weight: 700; color: #344968; }
    .nota .tipo { color: #713600; }
    .contenido { white-space: pre-wrap; margin-top: 0; } small, .vacio { color: #52606d; } .vacio { max-width: 60ch; }
    .conversacion { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .5rem; margin: .5rem 0; padding: .625rem .875rem; border: 1px solid #dbe2ec; border-radius: .5rem; background: #fff; }
    .estado { margin-left: auto; padding: .125rem .5rem; border: 1px solid #c7d5e8; border-radius: 999px; font-size: .8125rem; font-weight: 700; }
    .estado.terminada { border-color: #1d6b45; color: #1d6b45; background: #e6f4ec; }
    kbd { padding: 0 .3rem; border: 1px solid #c7d5e8; border-bottom-width: 2px; border-radius: .375rem; background: #fff; font: inherit; font-weight: 700; }
    summary { cursor: pointer; margin-top: .75rem; } [role=status] { font-size: .875rem; min-height: 1.2em; }
    @media(max-width: 600px) { dialog { width: calc(100vw - 1rem); max-height: 92dvh; } header { padding: 1rem; } .cuerpo { padding: 0 1rem 1rem; max-height: calc(92dvh - 80px); } h2 { font-size: 1.15rem; } .estado { margin-left: 0; } }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
  `,
})
export class LibretaPanel {
  readonly store = inject(LibretaStore);
  /** FE-UX-09 (DC-MVP-09-R07-IMP): en el intento académico la libreta no se presenta como demostración ni ofrece pistas de ejemplo. */
  readonly academico = inject(ContextoAcademicoUnreal).actual() !== null && inject(VistaPreviaDocenteUnreal).actual() === null;
  /** Recorrido del visor, si la libreta se abre desde él: fuente de las conversaciones. */
  readonly hospital = inject(HospitalUnreal, { optional: true });
  readonly cerrar = output<void>();
  readonly texto = signal('');
  readonly editando = signal<string | null>(null);
  readonly confirmando = signal<string | null>(null);
  readonly mensaje = signal('');
  /** Pistas agrupadas por lugar en el orden en que se obtuvieron (el almacén ya descarta repetidas por id). */
  readonly pistasPorLugar = computed(() => {
    const grupos = new Map<string, PistaInvestigacion[]>();
    for (const pista of this.store.estado().pistas) {
      const lugar = pista.origen.lugar;
      grupos.set(lugar, [...(grupos.get(lugar) ?? []), pista]);
    }
    return [...grupos].map(([lugar, pistas]) => ({ lugar, pistas }));
  });
  /** Conversaciones iniciadas en este recorrido, con el nombre que les da el caso. */
  readonly conversaciones = computed(() => (this.hospital?.recorridoVisible() ?? []).flatMap((e) =>
    e.npcs.filter((n) => n.estado !== 'pendiente')
      .map((n) => ({ id: n.espacialId, nombre: n.nombre, lugar: e.nombre, terminada: n.estado === 'completado' }))));
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');
  private readonly editor = viewChild.required<ElementRef<HTMLTextAreaElement>>('editor');
  constructor() {
    const origen = document.activeElement as HTMLElement | null;
    afterNextRender(() => this.panel().nativeElement.showModal());
    inject(DestroyRef).onDestroy(() => { this.panel().nativeElement.close(); if (origen?.isConnected) origen.focus(); });
  }
  cancelarDialogo(evento: Event): void { evento.preventDefault(); this.cerrar.emit(); }
  irASeccion(id: Seccion): void {
    const seccion = this.panel().nativeElement.querySelector<HTMLElement>('#' + id);
    seccion?.scrollIntoView({ block: 'nearest' }); seccion?.focus({ preventScroll: true });
  }
  aplicarNota(): void {
    const id = this.editando();
    const resultado = id ? this.store.actualizarNota(id, this.texto()) : this.store.crearNota(this.texto());
    if (!resultado) { this.mensaje.set('Escribe una nota de hasta 4000 caracteres.'); return; }
    this.cancelarEdicion(); this.mensaje.set(id ? 'Nota actualizada.' : 'Nota añadida.'); this.editor().nativeElement.focus();
  }
  editar(id: string): void {
    const nota = this.store.estado().notas.find(n => n.id === id);
    if (!nota) return;
    this.confirmando.set(null);
    this.editando.set(id); this.texto.set(nota.texto); this.editor().nativeElement.focus();
  }
  cancelarEdicion(): void { this.editando.set(null); this.texto.set(''); }
  eliminar(id: string): void {
    this.confirmando.set(null);
    if (!this.store.eliminarNota(id)) return;
    if (this.editando() === id) this.cancelarEdicion();
    this.mensaje.set('Nota eliminada.'); this.editor().nativeElement.focus();
  }
  tieneEjemplo(): boolean { return this.store.estado().pistas.some(p => p.id === 'demo-orientacion-hospital'); }
  recopilarEjemplo(): void {
    this.store.registrarPista({ tipo: 'pista-obtenida', contexto: this.store.estado().contexto, pista: {
      id: 'demo-orientacion-hospital', titulo: 'Orientación en el hospital (ejemplo)', descripcion: 'Las pistas tienen un origen identificable y se distinguen de tus notas personales.',
      origen: { espacioId: 'hospital-prueba', interaccionId: 'ejemplo-explicito-libreta', lugar: 'Hospital · demostración' },
    } });
  }
}
