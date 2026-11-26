import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { URL_SENALIZACION_LOCAL } from '../../../environments/senalizacion-unreal';
import { ContenidoIntentoM5 } from '../simulador/models/contenido-intento.models';
import {
  ConvocatoriaEstudiante,
  FalloPortal,
  IntentoEstudiante,
  PortalEstudianteApi,
  ResultadoEstudiante,
} from './portal-estudiante.api';

type Vista = 'convocatorias' | 'intento' | 'finalizado' | 'resultado';
/** Estado REAL del simulador 3D (Unreal Pixel Streaming); nunca se simula una conexión. */
type EstadoSimulador = 'comprobando' | 'no-disponible' | 'servidor-sin-habilitar' | 'disponible';
type Aviso = { tipo: 'error' | 'exito' | 'info'; texto: string } | null;

const CLAVE_INTENTOS = 'prisaly.portal.intentos';

const ESTADO_SESION: Readonly<Record<string, string>> = {
  SinIniciar: 'Programada',
  EnCurso: 'Abierta',
  Finalizado: 'Cerrada',
  Finalizada: 'Cerrada',
};

/** Mensaje claro para cada código tipado del servidor; el resto, mensaje genérico sin detalles técnicos. */
export function mensajePortal(e: unknown): string {
  const f = e instanceof FalloPortal ? e : null;
  if (f?.estado === 401) return 'Tu sesión estudiantil terminó. Vuelve a ingresar con un nuevo código.';
  switch (f?.codigo) {
    case 'INICIO_NO_AUTORIZADO':
      return 'La sesión todavía no está abierta por tu docente. Inténtalo cuando la sesión esté en curso.';
    case 'REVISION_OBSOLETA':
      return 'Tu respuesta cambió en otra ventana. Recargamos el intento para que continúes.';
    case 'INTENTO_NO_ENCONTRADO':
      return 'No encontramos ese intento entre los tuyos.';
    case 'TIEMPO_VENCIDO':
      return 'El tiempo máximo del intento terminó.';
  }
  if (f?.estado === 403) return 'No tienes acceso a esta sesión.';
  if (f?.estado === 409) return 'La operación no es posible en el estado actual del intento.';
  return 'El servicio no está disponible en este momento. Inténtalo de nuevo.';
}

/**
 * DC-DEMO-112 · Portal del estudiante (tras validar el código DD-02 B): sus convocatorias, el intento M5
 * (iniciar o reanudar, responder, finalizar) y el resultado publicado por el docente (N2).
 */
@Component({
  selector: 'app-portal-estudiante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portal-estudiante.html',
  styleUrl: './portal-estudiante.css',
})
export class PortalEstudiante implements OnInit {
  private readonly api = inject(PortalEstudianteApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vista = signal<Vista>('convocatorias');
  protected readonly cargando = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  protected readonly convocatorias = signal<readonly ConvocatoriaEstudiante[] | null>(null);
  protected readonly sesionActual = signal<ConvocatoriaEstudiante | null>(null);
  protected readonly intento = signal<IntentoEstudiante | null>(null);
  protected readonly contenido = signal<ContenidoIntentoM5 | null>(null);
  protected readonly guardando = signal<string | null>(null);
  protected readonly resultado = signal<ResultadoEstudiante | null>(null);
  protected readonly simulador = signal<EstadoSimulador>('comprobando');
  private readonly seleccion = signal<Readonly<Record<string, { opcion: string; revision: number }>>>({});

  protected readonly totalPreguntas = computed(
    () => this.contenido()?.caso.escenarios.reduce((n, e) => n + e.preguntas.length, 0) ?? 0,
  );
  protected readonly respondidas = computed(() => Object.keys(this.seleccion()).length);
  protected readonly progreso = computed(() =>
    this.totalPreguntas() === 0 ? 0 : Math.round((100 * this.respondidas()) / this.totalPreguntas()),
  );

  ngOnInit(): void {
    this.cargarConvocatorias();
  }

  protected estadoSesion(c: ConvocatoriaEstudiante): string {
    return ESTADO_SESION[c.estadoSesion] ?? c.estadoSesion;
  }

  protected intentoGuardado(c: ConvocatoriaEstudiante): string | null {
    return this.leerIntentos()[c.idSesion] ?? null;
  }

  protected fecha(instante: string | null): string {
    if (!instante) return '—';
    const f = new Date(instante);
    return Number.isNaN(f.getTime())
      ? instante
      : f.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected minutos(segundos: number): string {
    return segundos > 0 ? `${Math.round(segundos / 60)} min` : '—';
  }

  protected opcionElegida(idPregunta: string): string | null {
    return this.seleccion()[idPregunta]?.opcion ?? null;
  }

  protected cargarConvocatorias(): void {
    this.cargando.set(true);
    this.aviso.set(null);
    this.api
      .convocatorias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.convocatorias.set(lista);
          this.cargando.set(false);
        },
        error: (e: unknown) => this.fallo(e),
      });
  }

  protected entrar(c: ConvocatoriaEstudiante): void {
    this.cargando.set(true);
    this.aviso.set(null);
    this.sesionActual.set(c);
    this.api
      .iniciarOReanudar(c.idSesion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (intento) => this.abrirIntento(c, intento),
        error: (e: unknown) => this.fallo(e),
      });
  }

  private abrirIntento(c: ConvocatoriaEstudiante, intento: IntentoEstudiante): void {
    this.guardarIntento(c.idSesion, intento.idIntento);
    this.intento.set(intento);
    this.seleccion.set(
      Object.fromEntries(intento.respuestas.map((r) => [r.idPregunta, { opcion: r.idOpcionSeleccionada, revision: r.revision }])),
    );
    if (intento.estado === 'Finalizado') {
      this.cargando.set(false);
      this.vista.set('finalizado');
      return;
    }
    this.api
      .contenido(intento.idIntento)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contenido) => {
          this.contenido.set(contenido);
          this.cargando.set(false);
          this.vista.set('intento');
          this.comprobarSimulador();
        },
        error: (e: unknown) => this.fallo(e),
      });
  }

  protected elegir(idPregunta: string, idOpcion: string): void {
    const intento = this.intento();
    if (!intento || this.guardando()) return;
    const actual = this.seleccion()[idPregunta];
    if (actual?.opcion === idOpcion) return;
    this.guardando.set(idPregunta);
    this.aviso.set(null);
    this.api
      .responder(intento.idIntento, idPregunta, idOpcion, actual?.revision ?? 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.seleccion.update((s) => ({ ...s, [idPregunta]: { opcion: r.idOpcionSeleccionada, revision: r.revision } }));
          this.guardando.set(null);
        },
        error: (e: unknown) => {
          this.guardando.set(null);
          this.aviso.set({ tipo: 'error', texto: mensajePortal(e) });
          if (e instanceof FalloPortal && e.codigo === 'REVISION_OBSOLETA') this.recargarIntento();
        },
      });
  }

  private recargarIntento(): void {
    const intento = this.intento();
    if (!intento) return;
    this.api.intento(intento.idIntento).subscribe({
      next: (i) =>
        this.seleccion.set(
          Object.fromEntries(i.respuestas.map((r) => [r.idPregunta, { opcion: r.idOpcionSeleccionada, revision: r.revision }])),
        ),
    });
  }

  protected finalizar(): void {
    const intento = this.intento();
    if (!intento || this.cargando()) return;
    this.cargando.set(true);
    this.aviso.set(null);
    this.api
      .finalizar(intento.idIntento)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.vista.set('finalizado');
          this.aviso.set({ tipo: 'exito', texto: 'Tu intento quedó registrado. Gracias por participar.' });
        },
        error: (e: unknown) => this.fallo(e),
      });
  }

  protected verResultado(idIntento?: string | null): void {
    const id = idIntento ?? this.intento()?.idIntento;
    if (!id) return;
    this.cargando.set(true);
    this.aviso.set(null);
    this.api
      .resultado(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.cargando.set(false);
          this.resultado.set(r);
          if (r) {
            this.vista.set('resultado');
          } else {
            this.aviso.set({
              tipo: 'info',
              texto: 'Tu docente todavía no ha publicado la calificación. Vuelve a consultar más tarde.',
            });
          }
        },
        error: (e: unknown) => this.fallo(e),
      });
  }

  protected volver(): void {
    this.vista.set('convocatorias');
    this.intento.set(null);
    this.contenido.set(null);
    this.resultado.set(null);
    this.aviso.set(null);
    this.cargarConvocatorias();
  }

  protected salir(): void {
    this.api.cerrarSesion().subscribe(() => {
      sessionStorage.removeItem(CLAVE_INTENTOS);
      void this.router.navigate(['/acceso']);
    });
  }

  /**
   * Punto de entrada al simulador 3D desde el intento activo. Comprueba de verdad la señalización de Pixel
   * Streaming (laboratorio local PS2-LAB-03). La vista 3D solo se abre en el entorno autorizado
   * (`simuladorUnrealLocal` y ruta de demostración); en otro caso se informa el estado real y el recorrido
   * académico sigue en esta pantalla.
   */
  protected comprobarSimulador(): void {
    this.simulador.set('comprobando');
    let ws: WebSocket | null = null;
    const fin = (estado: EstadoSimulador) => {
      clearTimeout(limite);
      try { ws?.close(); } catch { /* sin efecto */ }
      this.simulador.set(estado);
    };
    const limite = setTimeout(() => fin('no-disponible'), 2500);
    try {
      ws = new WebSocket(URL_SENALIZACION_LOCAL);
      ws.onopen = () => fin(environment.simuladorUnrealLocal ? 'disponible' : 'servidor-sin-habilitar');
      ws.onerror = () => fin('no-disponible');
    } catch {
      fin('no-disponible');
    }
  }

  protected abrirSimulador(): void {
    if (this.simulador() === 'disponible') void this.router.navigate(['/simulador-unreal']);
  }

  private fallo(e: unknown): void {
    this.cargando.set(false);
    this.aviso.set({ tipo: 'error', texto: mensajePortal(e) });
  }

  private leerIntentos(): Record<string, string> {
    try {
      return JSON.parse(sessionStorage.getItem(CLAVE_INTENTOS) ?? '{}') as Record<string, string>;
    } catch {
      return {};
    }
  }

  private guardarIntento(idSesion: string, idIntento: string): void {
    sessionStorage.setItem(CLAVE_INTENTOS, JSON.stringify({ ...this.leerIntentos(), [idSesion]: idIntento }));
  }
}
