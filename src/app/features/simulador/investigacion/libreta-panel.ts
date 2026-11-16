import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LibretaStore } from './libreta.store';

@Component({
  selector: 'app-libreta-panel',
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #panel aria-labelledby="libreta-titulo" aria-describedby="libreta-aviso" (cancel)="cancelarDialogo($event)">
      <header><div><span class="etiqueta">INVESTIGACIÓN · DEMOSTRACIÓN</span><h2 id="libreta-titulo">Libreta de investigación</h2></div>
        <button type="button" autofocus aria-label="Cerrar libreta" (click)="cerrar.emit()">Cerrar</button></header>
      <div class="cuerpo">
      <p id="libreta-aviso" class="aviso">Solo durante esta demostración. Las pistas y notas se perderán al recargar o salir del simulador.</p>
      <nav aria-label="Secciones de la libreta"><button type="button" (click)="irASeccion('libreta-pistas')">Pistas ({{ store.estado().pistas.length }})</button><button type="button" (click)="irASeccion('libreta-notas')">Mis notas ({{ store.estado().notas.length }})</button></nav>
      <section aria-labelledby="libreta-pistas">
        <h3 id="libreta-pistas" tabindex="-1">Pistas obtenidas</h3>
        @for (pista of store.estado().pistas; track pista.id) {
          <article class="pista"><h4>{{ pista.titulo }}</h4><p>{{ pista.descripcion }}</p>
            <dl><dt>Identificador</dt><dd>{{ pista.id }}</dd><dt>Origen</dt><dd>{{ pista.origen.lugar }} · {{ pista.origen.espacioId }}</dd>
              <dt>Interacción</dt><dd>{{ pista.origen.interaccionId }}</dd>
              @if (pista.origen.personajeId) { <dt>Personaje</dt><dd>{{ pista.origen.personajeId }}</dd> }
              <dt>Obtenida</dt><dd>{{ pista.obtenidaEn | date:'short' }}</dd></dl>
          </article>
        } @empty { <p class="vacio">Todavía no has recopilado pistas.</p> }
        <details><summary>Probar una pista de demostración</summary><p>Este ejemplo no pertenece a un caso ni responde una pregunta académica.</p>
          <button type="button" [disabled]="tieneEjemplo()" (click)="recopilarEjemplo()">Recopilar pista de ejemplo</button></details>
      </section>
      <section aria-labelledby="libreta-notas"><h3 id="libreta-notas" tabindex="-1">Mis notas</h3>
        <form (ngSubmit)="aplicarNota()"><label for="texto-nota">{{ editando() ? 'Editar nota personal' : 'Nueva nota personal' }}</label>
          <textarea #editor id="texto-nota" name="texto" rows="4" maxlength="4000" [ngModel]="texto()" (ngModelChange)="texto.set($event)" placeholder="Escribe tus observaciones…"></textarea>
          <div class="acciones"><button type="submit" class="primario" [disabled]="!texto().trim()">{{ editando() ? 'Aplicar cambios' : 'Añadir nota' }}</button>
            @if (editando()) { <button type="button" (click)="cancelarEdicion()">Cancelar edición</button> }</div>
        </form>
        <p role="status" aria-live="polite">{{ mensaje() }}</p>
        @for (nota of store.estado().notas; track nota.id) {
          <article class="nota"><p class="contenido">{{ nota.texto }}</p>
            <small>Creada: {{ nota.creadaEn | date:'short' }} · Modificada: {{ nota.modificadaEn | date:'short' }}</small>
            <div class="acciones"><button type="button" [attr.aria-label]="'Editar nota: ' + nota.texto.slice(0, 45)" (click)="editar(nota.id)">Editar</button>
              <button type="button" [attr.aria-label]="'Eliminar nota: ' + nota.texto.slice(0, 45)" (click)="eliminar(nota.id)">Eliminar</button></div>
          </article>
        } @empty { <p class="vacio">Tus anotaciones personales aparecerán aquí.</p> }
      </section>
      </div>
    </dialog>
  `,
  styles: `
    dialog { box-sizing: border-box; width: min(660px, calc(100vw - 2rem)); max-height: 88dvh; padding: 0; overflow: hidden; border: 1px solid #c4d8e6; border-top: 5px solid #ed963e; border-radius: 16px; background: #f7fafc; color: #183d53; box-shadow: 0 20px 80px #12334c55; }
    dialog::backdrop { background: #0e2b4770; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1rem 1.4rem; background: #f7fafc; border-bottom: 1px solid #d5e2eb; } .cuerpo { max-height: calc(88dvh - 110px); overflow-y: auto; padding: 0 1.4rem 1.2rem; } h2 { margin: .3rem 0; font-size: 1.4rem; } h3 { margin-bottom: .65rem; scroll-margin-top: 1rem; } h4 { margin: 0; }
    .etiqueta { font-size: .7rem; font-weight: 700; letter-spacing: .07em; color: #386b91; } .aviso { padding: .7rem; background: #fff2df; border-radius: 8px; font-size: .88rem; }
    nav, .acciones { display: flex; gap: .6rem; flex-wrap: wrap; } nav { padding: .5rem 0; border-bottom: 1px solid #d5e2eb; } a { color: #1c5f91; padding: .4rem; }
    button { padding: .55rem .8rem; border: 1px solid #a8bfce; border-radius: 8px; background: white; color: #183d53; cursor: pointer; } button:disabled { opacity: .55; cursor: default; } .primario { background: #245f8a; color: white; border-color: #245f8a; }
    textarea { display: block; width: 100%; box-sizing: border-box; margin: .5rem 0; padding: .7rem; border: 1px solid #a8bfce; border-radius: 8px; font: inherit; resize: vertical; } label { font-weight: 600; }
    :focus-visible { outline: 3px solid #d77820; outline-offset: 3px; }
    article { background: white; border: 1px solid #d5e2eb; border-radius: 10px; padding: 1rem; margin: .7rem 0; overflow-wrap: anywhere; } .pista { border-left: 4px solid #3189b0; } .nota { border-left: 4px solid #e8a058; }
    .contenido { white-space: pre-wrap; margin-top: 0; } small, .vacio { color: #4c6679; } dl { font-size: .82rem; display: grid; grid-template-columns: auto 1fr; gap: .3rem .7rem; } dt { font-weight: 600; } dd { margin: 0; } summary { cursor: pointer; } [role=status] { font-size: .88rem; min-height: 1.2em; }
    @media(max-width: 600px) { dialog { width: calc(100vw - 1rem); max-height: 92dvh; } header { padding: 1rem; } .cuerpo { padding: 0 1rem 1rem; max-height: calc(92dvh - 110px); } h2 { font-size: 1.15rem; } }
  `,
})
export class LibretaPanel {
  readonly store = inject(LibretaStore);
  readonly cerrar = output<void>();
  readonly texto = signal('');
  readonly editando = signal<string | null>(null);
  readonly mensaje = signal('');
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');
  private readonly editor = viewChild.required<ElementRef<HTMLTextAreaElement>>('editor');
  constructor() {
    const origen = document.activeElement as HTMLElement | null;
    afterNextRender(() => this.panel().nativeElement.showModal());
    inject(DestroyRef).onDestroy(() => { this.panel().nativeElement.close(); if (origen?.isConnected) origen.focus(); });
  }
  cancelarDialogo(evento: Event): void { evento.preventDefault(); this.cerrar.emit(); }
  irASeccion(id: 'libreta-pistas' | 'libreta-notas'): void {
    const seccion = this.panel().nativeElement.querySelector<HTMLElement>('#' + id);
    seccion?.scrollIntoView({ block: 'nearest' }); seccion?.focus({ preventScroll: true });
  }
  aplicarNota(): void {
    const id = this.editando();
    const resultado = id ? this.store.actualizarNota(id, this.texto()) : this.store.crearNota(this.texto());
    if (!resultado) { this.mensaje.set('Escribe una nota de hasta 4000 caracteres.'); return; }
    this.cancelarEdicion(); this.mensaje.set(id ? 'Nota actualizada en esta demostración.' : 'Nota añadida en esta demostración.'); this.editor().nativeElement.focus();
  }
  editar(id: string): void {
    const nota = this.store.estado().notas.find(n => n.id === id);
    if (!nota) return;
    this.editando.set(id); this.texto.set(nota.texto); this.editor().nativeElement.focus();
  }
  cancelarEdicion(): void { this.editando.set(null); this.texto.set(''); }
  eliminar(id: string): void {
    if (!this.store.eliminarNota(id)) return;
    if (this.editando() === id) this.cancelarEdicion();
    this.mensaje.set('Nota eliminada de esta demostración.'); this.editor().nativeElement.focus();
  }
  tieneEjemplo(): boolean { return this.store.estado().pistas.some(p => p.id === 'demo-orientacion-hospital'); }
  recopilarEjemplo(): void {
    this.store.registrarPista({ tipo: 'pista-obtenida', contexto: this.store.estado().contexto, pista: {
      id: 'demo-orientacion-hospital', titulo: 'Orientación en el hospital (ejemplo)', descripcion: 'Las pistas tienen un origen identificable y se distinguen de tus notas personales.',
      origen: { espacioId: 'hospital-prueba', interaccionId: 'ejemplo-explicito-libreta', lugar: 'Hospital · demostración' },
    } });
  }
}
