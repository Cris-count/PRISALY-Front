import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ContextoAcademicoUnreal, VistaPreviaDocenteUnreal } from './acceso-simulador';
import { CasosM3Api } from '../../academico/casos-m3.api';
import { PortalEstudianteApi } from '../../estudiante/portal-estudiante.api';
import type { GuionM3 } from '../narrativa/adaptador-guion-m3';
import type { GuionNarrativo } from '../narrativa/narrativa.models';
import { cargarCatalogoVisual, derivarCasoConfigurar, guionMotorParaPuesto, nuevoContextoVisual } from './caso-visual';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { SESION_VISUAL_UNREAL, validarSesionVisual } from './configuracion-unreal';
import {
  CORRESPONDENCIA_MUNDO_UNREAL,
  PLAZA_UNREAL,
  edificioPorZonaUnreal,
} from './correspondencia-mundo';
import { CARGAR_ESQUEMAS_UNREAL } from './protocolo/cargar-esquemas-browser';
import { Mensaje } from './protocolo/validador-mensaje';
import { PuenteUnreal } from './puente/puente-unreal';
import { FABRICA_REPRODUCTOR_UNREAL, ReproductorUnreal } from './reproductor-unreal';
import { LibretaStore } from '../investigacion/libreta.store';
import { AdaptadorPistasNarrativas } from '../services/adaptador-pistas-narrativas';
import { CoordinadorNarrativoInteriores } from '../services/coordinador-narrativo-interiores';
import { HospitalUnreal } from './hospital-unreal';
import { HospitalNarrativoUnreal } from './hospital-narrativo-unreal';
import { avisoConexion } from './aviso-interaccion';
import { AvisosVisorMundo } from './avisos-visor-mundo';

/** Acceso de integración visual. No crea intentos, pistas ni evaluaciones académicas. */
@Component({
  selector: 'app-simulador-unreal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HospitalNarrativoUnreal, AvisosVisorMundo],
  providers: [
    LibretaStore,
    AdaptadorPistasNarrativas,
    CoordinadorNarrativoInteriores,
    HospitalUnreal,
  ],
  template: `
    <main class="pagina-unreal">
      <header>
        <p class="etiqueta">PRISALY · SIMULADOR 2.0</p>
        <h1>{{ tituloAcademico || 'Ciudad 3D en PRISALY' }}</h1>
        <p>Juega desde el navegador, sin instalar el simulador en tu computador.</p>
      </header>
      @if (!asignacion) {
        <section class="aviso" aria-labelledby="titulo-disponibilidad">
          <h2 id="titulo-disponibilidad">Ciudad 3D pendiente de habilitación</h2>
          <p>
            Unreal todavía no puede conectarse desde PRISALY: falta habilitar el servidor Pixel
            Streaming y conectar el puente del juego. Abrir un caso de demostración no inicia una
            conexión 3D.
          </p>
          <p>Puedes volver al portal y continuar el cuestionario sin el simulador.</p>
        </section>
      } @else {
        @if (esVistaPrevia) {
          <p class="aviso" data-prueba="aviso-vista-previa">
            Vista previa docente del caso guardado. No crea intentos ni evaluaciones. Solo se
            habilitan los edificios y personajes del caso.
            @if (personajesCaso().length) {
              Personajes: {{ personajesCaso().join(', ') }}.
            }
          </p>
        } @else {
          <p class="aviso">
            Recorrido demostrativo por Hospital, Comisaría y Fiscalía. Las conversaciones y la libreta
            se conservan mientras permanezcas en esta página.
          </p>
        }
        <div class="acciones">
          <button type="button" (click)="conectar()" [disabled]="ocupado() || conectado()">
            {{ hospital.ultimaZona() ? 'Reconectar y recuperar recorrido' : 'Conectar ciudad 3D' }}
          </button>
          <button type="button" (click)="desconectar()" [disabled]="!ocupado() && !conectado()">
            Desconectar
          </button>
          @if (requiereReproduccion()) {
            <button type="button" (click)="reproducir()">Reproducir ciudad</button>
          }
        </div>
      }
      <p role="status" aria-live="polite">{{ estado() }}</p>
      @if (hospital.ultimaZona() && !conectado()) {
        <p>
          Al reconectar regresarás al último acceso o zona confirmada. Tus conversaciones, pistas y
          notas continúan en esta página.
        </p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      <div class="escena" [hidden]="!asignacion">
        <div
          #visor
          class="visor"
          tabindex="0"
          role="region"
          aria-label="Visor de la ciudad 3D"
          (focusin)="foco.set(true)"
          (focusout)="foco.set(false)"
        ></div>
        <app-avisos-visor-mundo [aviso]="avisoInteraccion()" [conexion]="avisoConexion()" />
      </div>
      @if (asignacion) {
        <ul class="controles" aria-label="Controles de la ciudad 3D">
          <li><span class="teclas"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span> Caminar</li>
          <li><kbd>E</kbd> Interactuar</li>
          <li><span class="teclas"><kbd>Clic</kbd></span> Ir al punto</li>
          <li><span class="teclas"><kbd>Clic der.</kbd></span> + ratón: girar la vista</li>
          <li><kbd>R</kbd> Vista general</li>
          <li><kbd>M</kbd> Reducir movimiento</li>
          @if (hospital.enInterior()) {
            <li>Para salir, camina hasta la puerta del vestíbulo</li>
          }
        </ul>
        <p>
          Activa el visor para usar los controles del juego. Presiona Tab para volver a los
          controles de PRISALY.
        </p>
        <nav class="acciones" aria-label="Destinos de la ciudad 3D">
          @for (destino of destinos; track destino.zonaId) {
            <button
              type="button"
              [disabled]="!conectado() || hospital.ocupado() || hospital.enInterior()"
              (click)="caminarA(destino.zonaId)"
            >
              {{ destino.nombre }}
            </button>
          }
        </nav>
        <p>Ubicación: {{ ubicacion() }}</p>
      }
      <app-hospital-narrativo-unreal />
      <footer>
        <button type="button" (click)="volverAlPortal()">
          {{ esVistaPrevia ? 'Volver al panel docente' : 'Volver al portal académico' }}
        </button>
      </footer>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .pagina-unreal {
      max-width: 1200px;
      margin: auto;
      padding: clamp(1rem, 3vw, 2rem);
      color: #19384b;
    }
    h1 {
      font-size: clamp(1.7rem, 4vw, 2.5rem);
      margin: 0.4rem 0;
    }
    .etiqueta {
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .aviso {
      padding: 1rem;
      border: 1px solid #bed2df;
      border-radius: 0.7rem;
      background: #f2f7fb;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
      margin: 1rem 0;
    }
    button {
      padding: 0.65rem 1rem;
      border: 1px solid #92adbf;
      border-radius: 0.4rem;
      color: #19384b;
      background: white;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .escena {
      position: relative;
    }
    .escena[hidden] {
      display: none;
    }
    .controles {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      margin: 0.75rem 0 0;
      padding: 0.625rem 0.875rem;
      border: 1px solid #c7d5e8;
      border-radius: 0.5rem;
      background: #edf4ff;
      list-style: none;
      font-size: 0.9375rem;
    }
    .controles li {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
    .teclas {
      display: inline-flex;
      gap: 0.1875rem;
    }
    .controles kbd {
      display: inline-grid;
      place-items: center;
      min-width: 1.5rem;
      height: 1.5rem;
      padding: 0 0.375rem;
      border: 1px solid #c7d5e8;
      border-bottom: 2px solid #52606d;
      border-radius: 0.5rem;
      background: #fff;
      color: #172b4d;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 700;
    }
    .visor {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      min-height: 480px;
      height: 580px;
      max-height: 720px;
      overflow: hidden;
      background: #142b3a;
    }
    .visor video,
    .visor #streamingVideo,
    .visor > * {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain;
      display: block;
    }
    .visor:focus-visible,
    button:focus-visible,
    a:focus-visible {
      outline: 3px solid #cc7200;
      outline-offset: 3px;
    }
    footer {
      margin-top: 1.5rem;
    }
  `,
})
export class SimuladorUnrealPage {
  private readonly router = inject(Router);
  readonly contextoAcademico = inject(ContextoAcademicoUnreal);
  readonly tituloAcademico = this.contextoAcademico.actual()?.tituloCaso;
  /** CB-05A: vista previa docente de un caso guardado en M3 (sin intento académico). */
  private readonly vistaPrevia = inject(VistaPreviaDocenteUnreal);
  private readonly casosApi = inject(CasosM3Api);
  /** CB-07: narrativa fijada en el intento del estudiante (M5, cookie DD-02 B). */
  private readonly portalApi = inject(PortalEstudianteApi);
  readonly esVistaPrevia = this.vistaPrevia.actual() !== null;
  /** Personajes del caso tal como los devolvió M3 en esta conexión. */
  readonly personajesCaso = signal<readonly string[]>([]);
  volverAlPortal(): void {
    this.limpiar();
    this.contextoAcademico.actual.set(null);
    if (this.esVistaPrevia) {
      this.vistaPrevia.actual.set(null);
      this.vistaPrevia.aplicado = null;
      void this.router.navigate(['/dashboard']);
      return;
    }
    void this.router.navigate(['/estudiante/portal']);
  }

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
  /** G4-V11 / FE-UX-09: avisos del visor (sustituyen a los mensajes de depuración de Unreal). */
  readonly avisoInteraccion = computed(() => this.hospital.aviso(this.conectado()));
  readonly avisoConexion = computed(() => avisoConexion({
    conectado: this.conectado(),
    conectando: this.ocupado(),
    reconectando: this.hospital.ultimaZona() !== null,
    fallo: this.error() !== null,
  }));
  readonly destinos = [
    ...CORRESPONDENCIA_MUNDO_UNREAL.map((entrada) => ({
      zonaId: entrada.zonaId,
      nombre: `Caminar a ${entrada.narrativa === 'policia' ? 'Policía' : entrada.narrativa === 'fiscalia' ? 'Fiscalía' : 'Hospital'}`,
    })),
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
    effect(() => {
      // Leer las señales también antes de crear el reproductor: el encadenamiento
      // opcional omite sus argumentos cuando todavía no existe y pierde la suscripción.
      const permitir = this.conectado() && this.foco() && !this.hospital.ocupado();
      this.reproductor?.permitirEntrada(permitir);
    });
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
    const cancelacion = (this.cancelacion = new AbortController());
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
            this.estado.set(
              'Se perdió la conexión. Vuelve a conectar para continuar la prueba visual.',
            );
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
      if (!vigente()) {
        reproductor.cerrar();
        return;
      }
      this.reproductor = reproductor;
      this.puente = new PuenteUnreal(reproductor.transporte, esquemas, {
        sesion: this.asignacion.sesion,
      });
      // CB-05A: Unreal etiqueta todos sus mensajes (mundo.listo y acks incluidos) con el contexto vigente. Al
      // reconectar la vista previa, el puente nuevo arranca en ese contexto para no descartarlos como ajenos.
      const aplicado = this.fuenteDelCaso()?.aplicado();
      if (aplicado) this.puente.fijarContexto(aplicado.contexto);
      this.hospital.vincular(this.puente, this.asignacion);
      this.puente.suscribir((mensaje) => {
        if (vigente())
          this.zona.run(() => {
            void this.procesar(mensaje, generacion);
          });
      });
      this.espera = setTimeout(() => {
        if (!vigente() || this.conectado()) return;
        this.zona.run(() => {
          this.limpiar();
          this.error.set(
            'No se pudo confirmar la ciudad y su conexión. Intenta conectar de nuevo.',
          );
          this.estado.set('Conexión no confirmada.');
        });
      }, 20000);
      reproductor.conectar();
    } catch {
      if (!vigente()) return;
      this.limpiar();
      this.error.set(
        'No fue posible abrir el simulador. Revisa la asignación del servidor y vuelve a intentar.',
      );
      this.estado.set('Conexión no confirmada.');
    }
  }

  async caminarA(zonaId: string): Promise<void> {
    if (
      !this.conectado() ||
      !this.puente ||
      this.hospital.ocupado() ||
      this.hospital.enInterior() ||
      !this.destinos.some((destino) => destino.zonaId === zonaId)
    )
      return;
    const generacion = this.generacion;
    try {
      await this.puente.enviar('avatar.irA', { zoneId: zonaId });
      if (generacion === this.generacion)
        this.estado.set('Destino aceptado. Esperando confirmación de ubicación.');
    } catch {
      if (generacion === this.generacion)
        this.error.set('El mundo no confirmó la solicitud de movimiento.');
    }
  }

  reproducir(): void {
    this.reproductor?.reproducir();
  }

  desconectar(): void {
    this.limpiar();
    this.estado.set('Desconectado del simulador 3D.');
  }

  private async procesar(mensaje: Mensaje, generacion: number): Promise<void> {
    if (mensaje.tipo === 'mundo.listo' && !this.iniciandoSesion && !this.sesionIniciada()) {
      this.iniciandoSesion = true;
      try {
        await this.puente!.enviar('sesion.iniciar', {
          casoId: this.asignacion!.casoId,
          preferencias: {
            reducirMovimiento: matchMedia('(prefers-reduced-motion: reduce)').matches,
            invertirCamara: false,
          },
        });
        if (generacion !== this.generacion) return;
        let restaurar = true;
        if (this.fuenteDelCaso()) {
          const configuracion = await this.configurarCaso(generacion);
          if (configuracion === null) return;
          restaurar = configuracion === 'mismo-contexto';
        }
        if (restaurar && this.hospital.ultimaZona())
          this.estado.set('Recuperando el recorrido en el último acceso confirmado…');
        const zonaRestaurada = restaurar ? await this.hospital.restaurarEstadoVisual() : null;
        if (generacion !== this.generacion) return;
        if (zonaRestaurada) {
          const edificio = edificioPorZonaUnreal(zonaRestaurada);
          this.ubicacion.set(
            edificio
              ? `Acceso recuperado: ${edificio.narrativa === 'policia' ? 'Comisaría' : edificio.narrativa === 'fiscalia' ? 'Fiscalía' : 'Hospital'}`
              : 'Plaza Central recuperada',
          );
        }
        this.sesionIniciada.set(true);
        this.actualizarEstado();
      } catch {
        if (generacion !== this.generacion) return;
        this.limpiar();
        this.estado.set('La sesión visual no fue confirmada.');
        this.error.set(
          'El mundo no confirmó el inicio o la recuperación del recorrido. El progreso de esta página se conserva; vuelve a conectar.',
        );
      }
      return;
    }
    if (!this.sesionIniciada()) return;
    if (mensaje.tipo === 'zona.entro' && this.hospital.espacio() === 'exterior') {
      const zonaId = mensaje.datos['zoneId'] as string;
      const edificio = edificioPorZonaUnreal(zonaId);
      if (edificio)
        this.ubicacion.set(
          edificio.narrativa === 'policia'
            ? 'Entrada de Policía'
            : edificio.narrativa === 'fiscalia'
              ? 'Entrada de Fiscalía'
              : 'Entrada de Hospital',
        );
      else if (zonaId === PLAZA_UNREAL.zonaId) this.ubicacion.set('Plaza Central');
    } else if (mensaje.tipo === 'zona.salio' && this.hospital.espacio() === 'exterior') {
      this.ubicacion.set('En recorrido');
    }
    const interiorAnterior = this.hospital.edificioActivo();
    const estabaEnInterior = this.hospital.enInterior();
    await this.hospital.procesar(mensaje);
    if (generacion !== this.generacion) return;
    const interiorActual = this.hospital.edificioActivo();
    if (
      mensaje.tipo === 'edificio.entro' &&
      interiorActual &&
      this.hospital.enInterior() &&
      mensaje.datos['zoneId'] === interiorActual.zonaId
    ) {
      this.ubicacion.set(`Interior: ${interiorActual.nombre}`);
    } else if (
      mensaje.tipo === 'edificio.salio' &&
      interiorAnterior &&
      estabaEnInterior &&
      !this.hospital.enInterior() &&
      mensaje.datos['zoneId'] === interiorAnterior.zonaId
    ) {
      this.ubicacion.set(`Exterior: ${interiorAnterior.nombre}`);
    }
  }

  /**
   * De dónde sale el caso de esta conexión (CB-05A y CB-07). Docente: el borrador de M3 con su sesión de personal
   * (vista previa, sin intento). Estudiante: la narrativa **fijada en su intento** por M5, con su cookie. Fuera de esos
   * dos contextos no hay caso que aplicar. Nunca se recurre a los guiones de demostración.
   */
  private fuenteDelCaso(): {
    cargar: () => Promise<GuionM3>;
    aplicado: () => { huella: string; contexto: string } | null;
    recordar: (huella: string, contexto: string) => void;
  } | null {
    const previa = this.vistaPrevia.actual();
    if (previa) {
      const idCaso = previa.idCaso;
      return {
        cargar: async () => {
          const narrativa = await firstValueFrom(this.casosApi.narrativa(idCaso));
          const guardado = narrativa.borrador ?? narrativa.publicado;
          if (!guardado) throw new Error('El caso no tiene narrativa');
          return guardado.definicion as unknown as GuionM3;
        },
        aplicado: () => (this.vistaPrevia.aplicado?.idCaso === idCaso ? this.vistaPrevia.aplicado : null),
        recordar: (huella, contexto) => (this.vistaPrevia.aplicado = { idCaso, huella, contexto }),
      };
    }
    const academico = this.contextoAcademico.actual();
    if (academico) {
      const idIntento = academico.idIntento;
      return {
        cargar: async () => (await firstValueFrom(this.portalApi.narrativa(idIntento))).definicion,
        aplicado: () => (this.contextoAcademico.aplicado?.idIntento === idIntento ? this.contextoAcademico.aplicado : null),
        recordar: (huella, contexto) => (this.contextoAcademico.aplicado = { idIntento, huella, contexto }),
      };
    }
    return null;
  }

  /**
   * CB-05A/CB-07 (PROPUESTA-CASO-CONFIGURAR §6): en cada conexión vuelve a pedir la narrativa al servidor, deriva
   * `caso.configurar` y lo envía con su contexto visual. Los diálogos son los del servidor; si algo falla no se usan
   * guiones de demostración. Devuelve si Unreal conserva el contexto anterior (reconexión: hay que restaurar) o abre
   * uno nuevo, o null si la configuración no se aplicó.
   */
  private async configurarCaso(generacion: number): Promise<'mismo-contexto' | 'contexto-nuevo' | null> {
    const fuente = this.fuenteDelCaso();
    const puente = this.puente;
    this.hospital.usarGuionesDelCaso(new Map()); // nada conversa hasta tener el caso del servidor
    this.hospital.zonasHabilitadas.set(new Set()); // ni se ofrece ninguna entrada
    try {
      if (!fuente || !puente) throw new Error('Sin caso');
      this.estado.set('Cargando el caso guardado en el servidor…');
      const [guion, catalogo] = await Promise.all([fuente.cargar(), cargarCatalogoVisual()]);
      if (generacion !== this.generacion) return null;
      const previo = fuente.aplicado();
      let datos = await derivarCasoConfigurar(guion, catalogo, previo?.contexto ?? nuevoContextoVisual());
      if (previo && previo.huella !== datos.huella) datos = { ...datos, idContextoVisual: nuevoContextoVisual() };
      const guiones = new Map<string, GuionNarrativo>();
      for (const puesto of catalogo.catalogo.puestos) {
        const g = guionMotorParaPuesto(guion, puesto.clave, puesto.edificio);
        if (g) guiones.set(puesto.npcId, g);
      }
      this.estado.set('Aplicando el caso en la ciudad 3D…');
      puente.fijarContexto(datos.idContextoVisual);
      await puente.enviar('caso.configurar', { ...datos });
      if (generacion !== this.generacion) return null;
      const mismo = previo?.contexto === datos.idContextoVisual;
      fuente.recordar(datos.huella, datos.idContextoVisual);
      this.hospital.usarGuionesDelCaso(guiones);
      this.hospital.zonasHabilitadas.set(new Set(datos.edificiosHabilitados));
      this.personajesCaso.set((guion.personajes ?? []).filter((p) => p.recursoVisual).map((p) => p.nombre));
      return mismo ? 'mismo-contexto' : 'contexto-nuevo';
    } catch {
      if (generacion !== this.generacion) return null;
      this.limpiar();
      this.estado.set('El caso no se aplicó en la ciudad 3D.');
      this.error.set(
        this.esVistaPrevia
          ? 'No se pudo cargar o aplicar el caso guardado. Comprueba que el caso tenga edificios y personajes guardados y vuelve a conectar.'
          : 'La narrativa de tu intento no está disponible o no es compatible con la ciudad 3D. Vuelve al portal; tu progreso académico lo conserva el servidor.',
      );
      return null;
    }
  }

  private actualizarEstado(): void {
    if (this.conectado()) {
      this.ocupado.set(false);
      this.requiereReproduccion.set(false);
      if (this.espera) clearTimeout(this.espera);
      this.espera = null;
      this.estado.set('Ciudad 3D conectada. Sesión visual confirmada.');
    } else if (this.sesionIniciada())
      this.estado.set('Sesión visual confirmada. Esperando reproducción de la ciudad…');
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
