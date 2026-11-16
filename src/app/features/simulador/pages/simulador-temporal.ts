import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, NgZone, signal, viewChild } from '@angular/core';
import { EventoEspacioVisual, PlantillasEspacio } from '../exploracion/mapa.models';
import { contextoInteriorTecnico } from '../mundo-tecnico/adaptador-interior';
import { MUNDO_PRUEBA } from '../mundo-tecnico/mundo-tecnico.fixture';
import { EdificioTecnico, EventoMundo, EventoTransicion } from '../mundo-tecnico/mundo-tecnico.models';
import type { ControlMundo } from '../mundo-tecnico/phaser-mundo';
import { FABRICA_MUNDO } from '../mundo-tecnico/puerto-mundo';
import { EstadoExploracion, MotivoSuspension } from '../mundo-tecnico/estado-exploracion';
import { LibretaPanel } from '../investigacion/libreta-panel';
import { LibretaStore } from '../investigacion/libreta.store';

@Component({
  selector: 'app-simulador-temporal',
  imports: [NgTemplateOutlet, LibretaPanel],
  providers: [LibretaStore, EstadoExploracion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section #envoltura class="simulador" aria-labelledby="simulador-titulo">
      <header class="barra">
        <h1 id="simulador-titulo">Ciudad PRISALY</h1>
        <button type="button" (click)="abrirLibreta()" aria-haspopup="dialog" [attr.aria-expanded]="libretaAbierta()">Libreta</button>
        <button type="button" (click)="alternarPantalla()" [attr.aria-pressed]="pantallaCompleta()">{{ pantallaCompleta() ? 'Salir de pantalla completa' : 'Pantalla completa' }}</button>
      </header>
      <div [hidden]="interior() !== null">
        <div #escenario class="escenario" role="application"
          aria-label="Recorrido técnico. Selecciona un edificio o punto transitable."></div>
        <nav class="acciones" aria-label="Destinos del simulador">
          <details>
            <summary>Lugares</summary>
            <div class="destinos">
              @for (edificio of edificios; track edificio.id) {
                <button type="button" [disabled]="!listo()" (click)="irA(edificio.entrada)">Caminar a {{ edificio.nombre }}</button>
              }
              <button type="button" [disabled]="!listo()" (click)="irA(inicio)">Caminar al inicio</button>
            </div>
          </details>
          @if (entradaActual(); as edificio) { <button type="button" (click)="solicitarEntrada(edificio)">Entrar a {{ edificio.nombre }}</button> }
          <span class="indicacion">Selecciona un lugar o camino.</span>
        </nav>
        <p role="status" aria-live="polite">{{ mensaje() }}</p>
      </div>
      @if (interior(); as edificio) {
        <section aria-labelledby="interior-titulo">
          <h2 id="interior-titulo">Interior técnico: {{ edificio.nombre }}</h2>
          @if (plantillas().interior; as plantilla) {
            <ng-container [ngTemplateOutlet]="plantilla" [ngTemplateOutletContext]="contexto(edificio)"></ng-container>
          } @else {
            <p>Interior provisional de demostración. La plantilla visual y narrativa está pendiente de integración.</p>
          }
          <button type="button" (click)="salir(edificio)">Volver al mapa</button>
        </section>
      }
      @if (libretaAbierta()) { <app-libreta-panel (cerrar)="cerrarLibreta()" /> }
    </section>
  `,
  styles: `
    :host { display: block; }
    .simulador { width: 100%; margin: auto; background: #f6fafb; padding: .35rem; box-sizing: border-box; }
    .barra { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .6rem; min-height: 2.5rem; }
    h1 { margin: 0; font-size: 1.1rem; flex: 1; }
    .escenario { width: 100%; height: 80dvh; overflow: hidden; background: #d8e9da; }
    .simulador:fullscreen { width: 100%; height: 100%; padding: .5rem; overflow-y: auto; }
    .simulador:fullscreen .escenario { height: calc(100dvh - 8.5rem); }
    .escenario:focus-visible { outline: 3px solid #125b9c; outline-offset: 4px; }
    .acciones { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: .35rem; }
    .destinos { display: flex; flex-wrap: wrap; gap: .4rem; padding-top: .3rem; }
    summary { cursor: pointer; padding: .4rem .6rem; }
    button { padding: .4rem .6rem; cursor: pointer; }
    button:disabled { cursor: not-allowed; }
    [role="status"] { margin: .3rem 0; font-size: .85rem; }
    @media (max-width: 600px) { .escenario { height: auto; aspect-ratio: 5 / 3; } .indicacion { font-size: .8rem; } }
  `,
})
export class SimuladorTemporal {
  readonly plantillas = input<PlantillasEspacio>({});
  private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
  private readonly envoltura = viewChild.required<ElementRef<HTMLElement>>('envoltura');
  private readonly zona = inject(NgZone);
  private readonly destruccion = inject(DestroyRef);
  private readonly crearMundo = inject(FABRICA_MUNDO);
  private control: ControlMundo | null = null;
  private observador: ResizeObserver | null = null;
  protected readonly edificios = MUNDO_PRUEBA.edificios;
  protected readonly inicio = MUNDO_PRUEBA.inicio;
  protected readonly listo = signal(false);
  protected readonly mensaje = signal('Cargando la escena técnica…');
  protected readonly entradaActual = signal<EdificioTecnico | null>(null);
  protected readonly interior = signal<EdificioTecnico | null>(null);
  protected readonly interaccionActiva = signal(false);
  protected readonly pantallaCompleta = signal(false);
  protected readonly libretaAbierta = signal(false);
  readonly investigacion = inject(LibretaStore);
  readonly estadoExploracion = inject(EstadoExploracion);
  /** Historial técnico local para coordinar la transición, no autorización académica. */
  readonly transiciones = signal<readonly EventoTransicion[]>([]);

  constructor() {
    const cambioPantalla = () => this.zona.run(() => this.pantallaCompleta.set(document.fullscreenElement === this.envoltura().nativeElement));
    document.addEventListener('fullscreenchange', cambioPantalla);
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => {
        const contenedor = this.escenario().nativeElement;
        void this.crearMundo(contenedor, evento => this.zona.run(() => this.recibir(evento))).then(control => {
          if (this.destruccion.destroyed) { control.destruir(); return; }
          this.control = control;
          control.suspenderInteraccion(this.estadoExploracion.suspendido());
          if (typeof ResizeObserver !== 'undefined') {
            this.observador = new ResizeObserver(() => this.control?.actualizarTamano());
            this.observador.observe(contenedor);
          }
        }).catch(() => { if (!this.destruccion.destroyed) this.zona.run(() => this.mensaje.set('No se pudo iniciar la escena técnica: revisa la configuración del mundo.')); });
      });
    });
    this.destruccion.onDestroy(() => {
      document.removeEventListener('fullscreenchange', cambioPantalla);
      this.observador?.disconnect(); this.observador = null;
      this.control?.destruir(); this.control = null;
    });
  }
  protected irA(id: string): void { if (!this.estadoExploracion.suspendido()) this.control?.irA(id); }
  /** Motivos visuales locales; no cambia ninguna fase académica de Backend. */
  establecerSuspension(motivo: MotivoSuspension, activa: boolean): void {
    this.estadoExploracion.establecer(motivo, activa);
    this.control?.suspenderInteraccion(this.estadoExploracion.suspendido());
  }
  protected abrirLibreta(): void {
    this.establecerSuspension('libreta', true);
    this.libretaAbierta.set(true);
  }
  protected cerrarLibreta(): void {
    this.libretaAbierta.set(false);
    this.establecerSuspension('libreta', false);
  }
  protected async alternarPantalla(): Promise<void> {
    try {
      if (document.fullscreenElement === this.envoltura().nativeElement) await document.exitFullscreen();
      else if (!document.fullscreenElement && this.envoltura().nativeElement.requestFullscreen) await this.envoltura().nativeElement.requestFullscreen();
      else this.mensaje.set('La pantalla completa no está disponible en este navegador.');
    } catch { this.mensaje.set('No se pudo cambiar el modo de pantalla completa.'); }
  }
  protected solicitarEntrada(edificio: EdificioTecnico): void {
    if (this.estadoExploracion.suspendido() || this.interior() || this.entradaActual()?.id !== edificio.id) return;
    this.establecerSuspension('interior', true);
    this.registrar('entrada-solicitada', edificio.id);
    this.registrar('entrada-autorizada', edificio.id); // Autorización local de la demostración.
    this.interior.set(edificio);
    this.registrar('interior-abierto', edificio.id);
  }
  protected salir(edificio: EdificioTecnico): void {
    if (this.interior()?.id !== edificio.id) return;
    this.registrar('salida-solicitada', edificio.id);
    this.interaccionActiva.set(false);
    this.interior.set(null);
    this.establecerSuspension('interior', false);
    this.registrar('regreso-mapa', edificio.id);
    if (edificio.salida !== edificio.entrada) this.control?.irA(edificio.salida);
    else this.mensaje.set(`Regresaste al mapa desde ${edificio.nombre}.`);
    requestAnimationFrame(() => { if (!this.destruccion.destroyed) this.control?.actualizarTamano(); });
  }
  protected contexto(edificio: EdificioTecnico) {
    return contextoInteriorTecnico(edificio, this.interaccionActiva(), evento => this.recibirEventoVisual(evento));
  }
  private recibirEventoVisual(evento: EventoEspacioVisual): void {
    const edificio = this.interior();
    if (edificio?.id !== evento.espacioId) return;
    if (evento.tipo === 'interaccion-iniciada') this.interaccionActiva.set(true);
    else if (evento.tipo === 'interaccion-finalizada') this.interaccionActiva.set(false);
    else this.salir(edificio);
  }
  private registrar(tipo: EventoTransicion['tipo'], edificioId: string): void {
    this.transiciones.update(eventos => [...eventos, { tipo, edificioId }]);
  }
  private recibir(evento: EventoMundo): void {
    if (this.destruccion.destroyed) return;
    switch (evento.tipo) {
      case 'listo': this.listo.set(true); this.mensaje.set('Escena lista. El personaje está en el inicio.'); break;
      case 'moviendo': this.entradaActual.set(null); this.mensaje.set('El personaje está caminando.'); break;
      case 'llegada': {
        const edificio = this.edificios.find(e => e.id === evento.entradaId) ?? null;
        this.entradaActual.set(edificio);
        this.mensaje.set(edificio ? `Llegaste a la entrada de ${edificio.nombre}.` : 'El personaje llegó al punto seleccionado.');
        break;
      }
      case 'rechazado': this.mensaje.set(evento.motivo === 'en-movimiento' ? 'Espera a que termine el movimiento actual.' : 'Ese destino no está disponible en el camino.'); break;
    }
  }
}
