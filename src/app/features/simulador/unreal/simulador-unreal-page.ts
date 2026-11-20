import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, computed, effect, inject, signal, viewChild } from '@angular/core';
import { SESION_VISUAL_UNREAL, validarSesionVisual } from './configuracion-unreal';
import { CORRESPONDENCIA_MUNDO_UNREAL, PLAZA_UNREAL, edificioPorZonaUnreal } from './correspondencia-mundo';
import { CARGAR_ESQUEMAS_UNREAL } from './protocolo/cargar-esquemas-browser';
import { Mensaje } from './protocolo/validador-mensaje';
import { PuenteUnreal } from './puente/puente-unreal';
import { FABRICA_REPRODUCTOR_UNREAL, ReproductorUnreal } from './reproductor-unreal';
import { LibretaStore } from '../investigacion/libreta.store';
import { AdaptadorPistasNarrativas } from '../services/adaptador-pistas-narrativas';
import { CoordinadorNarrativoInteriores } from '../services/coordinador-narrativo-interiores';
import { HospitalUnreal } from './hospital-unreal';
import { HospitalNarrativoUnreal } from './hospital-narrativo-unreal';

/** Acceso de integración visual. No crea intentos, pistas ni evaluaciones académicas. */
@Component({
  selector: 'app-simulador-unreal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HospitalNarrativoUnreal],
  providers: [LibretaStore, AdaptadorPistasNarrativas, CoordinadorNarrativoInteriores, HospitalUnreal],
  template: `
    <main class="pagina-unreal">
      <header>
        <p class="etiqueta">PRISALY · SIMULADOR 2.0</p>
        <h1>Ciudad 3D en PRISALY</h1>
        <p>Juega desde el navegador, sin instalar el simulador en tu computador.</p>
      </header>
      @if (!asignacion) {
        <section class="aviso" aria-labelledby="titulo-disponibilidad">
          <h2 id="titulo-disponibilidad">Ciudad 3D pendiente de habilitación</h2>
          <p>Unreal todavía no puede conectarse desde PRISALY: falta habilitar el servidor Pixel Streaming y conectar el puente del juego. Abrir un caso de demostración no inicia una conexión 3D.</p>
          <p>Si deseas probar el recorrido anterior, puedes elegir la demostración en Phaser 2.5D.</p>
          <a href="simulador-integrado">Ver opciones y demostración anterior (Phaser 2.5D)</a>
        </section>
      } @else {
        <p class="aviso">Integración demostrativa del Hospital. Esta pantalla no inicia un intento académico; las pistas y notas se conservan solo en esta página.</p>
        <div class="acciones">
          <button type="button" (click)="conectar()" [disabled]="ocupado() || conectado()">Conectar ciudad 3D</button>
          <button type="button" (click)="desconectar()" [disabled]="!ocupado() && !conectado()">Desconectar</button>
          @if (requiereReproduccion()) {
            <button type="button" (click)="reproducir()">Reproducir ciudad</button>
          }
        </div>
      }
      <p role="status" aria-live="polite">{{ estado() }}</p>
      @if (error()) { <p role="alert">{{ error() }}</p> }
      <div #visor class="visor" tabindex="0" role="region" aria-label="Visor de la ciudad 3D"
        [hidden]="!asignacion" (focusin)="foco.set(true)" (focusout)="foco.set(false)">
      </div>
      @if (asignacion) {
        <p>Activa el visor para usar los controles del juego. Presiona Tab para volver a los controles de PRISALY.</p>
        <nav class="acciones" aria-label="Destinos de la ciudad 3D">
          @for (destino of destinos; track destino.zonaId) {
            <button type="button" [disabled]="!conectado() || hospital.ocupado() || hospital.enInterior()" (click)="caminarA(destino.zonaId)">{{ destino.nombre }}</button>
          }
        </nav>
        <p>Ubicación: {{ ubicacion() }}</p>
      }
      <app-hospital-narrativo-unreal />
      <footer><a href="simulador-integrado">Volver a las opciones del simulador</a></footer>
    </main>
  `,
  styles: `
    :host { display:block; min-width:0; }
    .pagina-unreal { max-width:1200px; margin:auto; padding:clamp(1rem,3vw,2rem); color:#19384b; }
    h1 { font-size:clamp(1.7rem,4vw,2.5rem); margin:.4rem 0; }
    .etiqueta { font-size:.85rem; font-weight:700; letter-spacing:.08em; }
    .aviso { padding:1rem; border:1px solid #bed2df; border-radius:.7rem; background:#f2f7fb; }
    .acciones { display:flex; flex-wrap:wrap; gap:.7rem; margin:1rem 0; }
    button { padding:.65rem 1rem; border:1px solid #92adbf; border-radius:.4rem; color:#19384b; background:white; cursor:pointer; }
    button:disabled { opacity:.55; cursor:default; }
    .visor { position:relative; width:100%; height:clamp(300px,65dvh,720px); overflow:hidden; background:#142b3a; }
    .visor:focus-visible,button:focus-visible,a:focus-visible { outline:3px solid #cc7200; outline-offset:3px; }
    .visor[hidden] { display:none; }
    footer { margin-top:1.5rem; }
  `,
})
export class SimuladorUnrealPage {
  readonly hospital = inject(HospitalUnreal);
  readonly asignacion = inject(SESION_VISUAL_UNREAL);
  private readonly fabrica = inject(FABRICA_REPRODUCTOR_UNREAL);
  private readonly cargarEsquemas = inject(CARGAR_ESQUEMAS_UNREAL);
  private readonly zona = inject(NgZone);
  private readonly visor = viewChild.required<ElementRef<HTMLDivElement>>('visor');
  readonly estado = signal('Sin conexión al simulador 3D.');
  readonly error = signal<string | null>(null);
  readonly ocupado = signal(false);
  readonly sesionIniciada = signal(false);
  readonly videoReproduciendo = signal(false);
  readonly conectado = computed(() => this.sesionIniciada() && this.videoReproduciendo());
  readonly requiereReproduccion = signal(false);
  readonly foco = signal(false);
  readonly ubicacion = signal('Sin ubicación confirmada');
  readonly destinos = [
    ...CORRESPONDENCIA_MUNDO_UNREAL.map((entrada) => ({ zonaId: entrada.zonaId, nombre: `Caminar a ${entrada.narrativa === 'policia' ? 'Policía' : entrada.narrativa === 'fiscalia' ? 'Fiscalía' : 'Hospital'}` })),
    { zonaId: PLAZA_UNREAL.zonaId, nombre: 'Caminar a Plaza Central' },
  ];
  private reproductor: ReproductorUnreal | null = null;
  private puente: PuenteUnreal | null = null;
  private cancelacion: AbortController | null = null;
  private generacion = 0;
  private iniciandoSesion = false;
  private espera: ReturnType<typeof setTimeout> | null = null;
  private contenedorReproductor: HTMLDivElement | null = null;

  constructor() {
    effect(() => this.reproductor?.permitirEntrada(this.conectado() && this.foco() && !this.hospital.ocupado()));
    inject(DestroyRef).onDestroy(() => this.limpiar());
  }

  async conectar(): Promise<void> {
    if (!this.asignacion || this.ocupado() || this.conectado()) return;
    this.limpiar();
    const generacion = this.generacion;
    const vigente = () => generacion === this.generacion;
    this.error.set(null);
    this.ocupado.set(true);
    this.estado.set('Conectando con la ciudad 3D…');
    const cancelacion = this.cancelacion = new AbortController();
    try {
      validarSesionVisual(this.asignacion);
      const esquemas = await this.cargarEsquemas(cancelacion.signal);
      if (!vigente()) return;
      const contenedor = document.createElement('div');
      contenedor.style.width = '100%';
      contenedor.style.height = '100%';
      this.visor().nativeElement.replaceChildren(contenedor);
      this.contenedorReproductor = contenedor;
      const reproductor = await this.fabrica(contenedor, this.asignacion, (evento) => {
        if (!vigente()) return;
        this.zona.run(() => {
          if (evento === 'desconectado') {
            this.limpiar();
            this.estado.set('Se perdió la conexión. Vuelve a conectar para continuar la prueba visual.');
          } else if (evento === 'video-listo') {
            this.videoReproduciendo.set(true);
            this.actualizarEstado();
          } else if (evento === 'reproduccion-requerida') {
            this.requiereReproduccion.set(true);
          } else {
            this.estado.set('Canal abierto. Esperando que el mundo confirme su disponibilidad…');
          }
        });
      });
      if (!vigente()) { reproductor.cerrar(); return; }
      this.reproductor = reproductor;
      this.puente = new PuenteUnreal(reproductor.transporte, esquemas, { sesion: this.asignacion.sesion });
      this.hospital.vincular(this.puente, this.asignacion);
      this.puente.suscribir((mensaje) => {
        if (vigente()) this.zona.run(() => { void this.procesar(mensaje, generacion); });
      });
      this.espera = setTimeout(() => {
        if (!vigente() || this.conectado()) return;
        this.zona.run(() => {
          this.limpiar();
          this.error.set('No se pudo confirmar la ciudad y su conexión. Intenta conectar de nuevo.');
          this.estado.set('Conexión no confirmada.');
        });
      }, 20000);
      reproductor.conectar();
    } catch {
      if (!vigente()) return;
      this.limpiar();
      this.error.set('No fue posible abrir el simulador. Revisa la asignación del servidor y vuelve a intentar.');
      this.estado.set('Conexión no confirmada.');
    }
  }

  async caminarA(zonaId: string): Promise<void> {
    if (!this.conectado() || !this.puente || this.hospital.ocupado() || this.hospital.enInterior() || !this.destinos.some((destino) => destino.zonaId === zonaId)) return;
    const generacion = this.generacion;
    try {
      await this.puente.enviar('avatar.irA', { zoneId: zonaId });
      if (generacion === this.generacion) this.estado.set('Destino aceptado. Esperando confirmación de ubicación.');
    } catch {
      if (generacion === this.generacion) this.error.set('El mundo no confirmó la solicitud de movimiento.');
    }
  }

  reproducir(): void { this.reproductor?.reproducir(); }

  desconectar(): void { this.limpiar(); this.estado.set('Desconectado del simulador 3D.'); }

  private async procesar(mensaje: Mensaje, generacion: number): Promise<void> {
    if (mensaje.tipo === 'mundo.listo' && !this.iniciandoSesion && !this.sesionIniciada()) {
      this.iniciandoSesion = true;
      try {
        await this.puente!.enviar('sesion.iniciar', {
          casoId: this.asignacion!.casoId,
          preferencias: { reducirMovimiento: matchMedia('(prefers-reduced-motion: reduce)').matches, invertirCamara: false },
        });
        if (generacion !== this.generacion) return;
        this.sesionIniciada.set(true);
        this.actualizarEstado();
      } catch {
        if (generacion !== this.generacion) return;
        this.limpiar();
        this.estado.set('La sesión visual no fue confirmada.');
        this.error.set('El mundo no confirmó el inicio. La actividad académica no se ha iniciado.');
      }
      return;
    }
    if (!this.sesionIniciada()) return;
    if (mensaje.tipo === 'zona.entro') {
      const zonaId = mensaje.datos['zoneId'] as string;
      const edificio = edificioPorZonaUnreal(zonaId);
      if (edificio) this.ubicacion.set(edificio.narrativa === 'policia' ? 'Entrada de Policía' : edificio.narrativa === 'fiscalia' ? 'Entrada de Fiscalía' : 'Entrada de Hospital');
      else if (zonaId === PLAZA_UNREAL.zonaId) this.ubicacion.set('Plaza Central');
    } else if (mensaje.tipo === 'zona.salio') {
      this.ubicacion.set('En recorrido');
    }
    await this.hospital.procesar(mensaje);
    if (generacion !== this.generacion) return;
    if (mensaje.tipo === 'edificio.entro' && mensaje.datos['zoneId'] === 'hospital_entrada') this.ubicacion.set('Interior del Hospital');
    else if (mensaje.tipo === 'edificio.salio' && mensaje.datos['zoneId'] === 'hospital_entrada') this.ubicacion.set('Exterior del Hospital');
  }

  private actualizarEstado(): void {
    if (this.conectado()) {
      this.ocupado.set(false);
      this.requiereReproduccion.set(false);
      if (this.espera) clearTimeout(this.espera);
      this.espera = null;
      this.estado.set('Ciudad 3D conectada. Sesión visual confirmada.');
    } else if (this.sesionIniciada()) this.estado.set('Sesión visual confirmada. Esperando reproducción de la ciudad…');
  }

  private limpiar(): void {
    this.generacion++;
    this.hospital.desvincular();
    this.cancelacion?.abort();
    this.cancelacion = null;
    if (this.espera) clearTimeout(this.espera);
    this.espera = null;
    this.puente?.destruir();
    this.puente = null;
    this.reproductor?.cerrar();
    this.reproductor = null;
    this.contenedorReproductor?.remove();
    this.contenedorReproductor = null;
    this.ocupado.set(false);
    this.sesionIniciada.set(false);
    this.videoReproduciendo.set(false);
    this.requiereReproduccion.set(false);
    this.ubicacion.set('Sin ubicación confirmada');
    this.iniciandoSesion = false;
  }
}
