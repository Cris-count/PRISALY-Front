import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { Aviso } from '../../../shared/ui/aviso';
import { EstadoCarga } from '../../../shared/ui/estado-carga';
import { BarraAcciones } from '../components/barra-acciones';
import { ConfirmacionFinalizacion } from '../components/confirmacion-finalizacion';
import { ContenidoAcademico } from '../components/contenido-academico';
import { IndicadorProgreso } from '../components/indicador-progreso';
import { PanelNarrativo } from '../components/panel-narrativo';
import { PanelPreguntas } from '../components/panel-preguntas';
import { PantallaInicio } from '../components/pantalla-inicio';
import { Temporizador } from '../components/temporizador';
import { VisorCiudad2d5 } from '../components/visor-ciudad-2d5';
import { LibretaPanel } from '../investigacion/libreta-panel';
import { LibretaStore } from '../investigacion/libreta.store';
import { PreguntaVista } from '../models/simulador.models';
import { AdaptadorMundoSimulador } from '../mundo-tecnico/adaptador-mundo-simulador';
import { EdificioTecnico } from '../mundo-tecnico/mundo-tecnico.models';
import { EstadoExploracion } from '../mundo-tecnico/estado-exploracion';
import { MotorNarrativo } from '../narrativa/motor-narrativo';
import { GuionNarrativo } from '../narrativa/narrativa.models';
import { AdaptadorPistasNarrativas } from '../services/adaptador-pistas-narrativas';
import { CoordinadorNarrativoInteriores } from '../services/coordinador-narrativo-interiores';
import { PAQUETE_VISUAL_V1 } from '../mundo-tecnico/paquete-visual';
import { EnlaceNarrativo, VinculoDecisionAcademica } from '../services/enlace-narrativo';
import { FalloParticipacionError } from '../services/participacion-http.gateway';
import { ContratoPendienteError } from '../services/participacion.gateway';
import { ParticipacionCoordinador } from '../services/participacion.coordinador';
import { SimuladorStore } from '../services/simulador.store';

/** Entrada local para pruebas o futura autorización estudiantil. */
export interface ContextoNarrativoAcademico {
  readonly idIntento: string;
  readonly guion: GuionNarrativo;
  readonly preguntas: readonly PreguntaVista[];
  readonly vinculos: readonly VinculoDecisionAcademica[];
}

/** Fases de la experiencia de usuario (Fase 8). */
export type FaseExperiencia =
  | 'preparado'
  | 'explorando'
  | 'confirmando-inicio'
  | 'en-cuestionario'
  | 'confirmando-finalizacion'
  | 'finalizado';

/**
 * Coordinador de la experiencia unificada del simulador PRISALY (Fase 8 y 9).
 * Integra el visor axonométrico 2.5D (Phaser 3) con la Plaza Central,
 * continuidad narrativa en interiores de edificios, libreta y cuestionario.
 */
@Component({
  selector: 'app-simulador-integrado-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    SimuladorStore,
    ParticipacionCoordinador,
    AdaptadorMundoSimulador,
    LibretaStore,
    EstadoExploracion,
    AdaptadorPistasNarrativas,
    CoordinadorNarrativoInteriores,
  ],
  imports: [
    Aviso,
    BarraAcciones,
    ConfirmacionFinalizacion,
    ContenidoAcademico,
    EstadoCarga,
    IndicadorProgreso,
    LibretaPanel,
    PanelNarrativo,
    PanelPreguntas,
    Temporizador,
    VisorCiudad2d5,
  ],
  templateUrl: './simulador-integrado-page.html',
  styleUrl: './simulador-integrado-page.css',
})
export class SimuladorIntegradoPage {
  readonly paqueteVisual = PAQUETE_VISUAL_V1;
  readonly contextoAcademico = input<ContextoNarrativoAcademico | null>(null);
  readonly idIntentoContenido = input<string | null>(null);

  protected readonly store = inject(SimuladorStore);
  protected readonly participacion = inject(ParticipacionCoordinador);
  protected readonly adaptador = inject(AdaptadorMundoSimulador);
  protected readonly libreta = inject(LibretaStore);
  protected readonly exploracion = inject(EstadoExploracion);
  protected readonly coordinadorNarrativo = inject(CoordinadorNarrativoInteriores);

  protected readonly libretaAbierta = signal(false);
  readonly faseExperiencia = signal<FaseExperiencia>('preparado');
  protected readonly enlace = signal<EnlaceNarrativo | null>(null);
  protected readonly errorContenido = signal(false);
  protected readonly suspendido = signal(false);
  readonly motorInterior = signal<MotorNarrativo | null>(null);
  protected readonly dialogoConfirmacion = viewChild<ElementRef<HTMLDialogElement>>('dialogoConfirmacion');
  private elementoDisparadorModal: HTMLElement | null = null;

  readonly advertenciaSinInvestigar = computed(
    () => this.coordinadorNarrativo.totalEdificiosVisitados() === 0 && this.libreta.estado().pistas.length === 0
  );

  protected readonly mensajeError = computed(() => {
    const error = this.participacion.error();
    if (error instanceof FalloParticipacionError) {
      if (error.codigo === 'CONTENIDO_INTENTO_NO_DISPONIBLE') {
        return 'El contenido académico de este intento no está disponible.';
      }
      return error.fallo.mensaje;
    }
    if (error instanceof ContratoPendienteError) {
      return 'El acceso académico aún no está habilitado.';
    }
    return error ? 'No se pudo verificar la participación. No se confirmó el guardado.' : null;
  });

  protected readonly confirmadas = computed(() => {
    const preguntas = this.contextoAcademico()?.preguntas ?? [];
    const respuestas = this.participacion.intento()?.respuestas ?? [];
    return preguntas.filter((p) =>
      respuestas.some(
        (r) => r.idPregunta === p.id && p.opciones.some((o) => o.id === r.idOpcionSeleccionada)
      )
    ).length;
  });

  protected readonly puedeVerificar = computed(() => {
    const estado = this.participacion.estado();
    const error = this.participacion.error();
    return (
      estado === 'por-verificar' ||
      estado === 'conflicto' ||
      (estado === 'error' && error instanceof FalloParticipacionError && error.fallo.reintentable)
    );
  });

  constructor() {
    effect((onCleanup) => {
      const contexto = this.contextoAcademico();
      const idContenido = this.idIntentoContenido();

      untracked(() => {
        this.enlace()?.cerrar();
        this.participacion.cerrar();
        this.enlace.set(null);
        this.errorContenido.set(false);
        this.suspendido.set(false);
        this.libretaAbierta.set(false);
        this.libreta.reiniciarDemostracion();

        if (!contexto && !idContenido) {
          return;
        }

        this.store.volverAlInicio();
        if (idContenido) {
          if (contexto) {
            this.errorContenido.set(true);
          } else {
            this.participacion.cargarContenido(idContenido);
          }
          return;
        }

        if (!contexto) return;
        try {
          const enlace = new EnlaceNarrativo(
            contexto.idIntento,
            contexto.guion,
            contexto.preguntas,
            contexto.vinculos,
            this.participacion
          );
          this.enlace.set(enlace);
          this.participacion.cargar(contexto.idIntento);
        } catch {
          this.errorContenido.set(true);
        }
      });

      onCleanup(() => {
        this.enlace()?.cerrar();
        this.participacion.cerrar();
      });
    });

    // Interior, libreta, confirmaciones y cuestionario conservan motivos independientes.
    effect(() => {
      const enConfirmacionFinal = this.store.fase() === 'confirmando';
      const enConfirmacionInicio = this.faseExperiencia() === 'confirmando-inicio';
      const enInterior = this.adaptador.interiorActivo() !== null;
      const enLibreta = this.libretaAbierta();
      const enCuestionario =
        this.faseExperiencia() === 'en-cuestionario' ||
        this.faseExperiencia() === 'confirmando-finalizacion';

      untracked(() => {
        this.exploracion.establecer('interior', enInterior);
        this.exploracion.establecer('libreta', enLibreta);
        this.exploracion.establecer('confirmacion-modal', enConfirmacionFinal || enConfirmacionInicio);
        this.exploracion.establecer('cuestionario', enCuestionario);
        if (enCuestionario) {
          this.adaptador.bloquearPorCuestionario();
        } else {
          this.adaptador.suspender(this.exploracion.suspendido());
        }
      });
    });

    // Continuidad narrativa de interiores (Fase 9)
    effect(() => {
      const interior = this.adaptador.interiorActivo();
      untracked(() => {
        if (interior) {
          try {
            const motor = this.coordinadorNarrativo.iniciarOReanudar(interior.id);
            this.motorInterior.set(motor);
          } catch {
            this.motorInterior.set(null);
          }
        } else {
          this.motorInterior.set(null);
        }
      });
    });

    // Control accesible de showModal() y foco para diálogo nativo
    effect(() => {
      const dialogRef = this.dialogoConfirmacion();
      if (this.faseExperiencia() === 'confirmando-inicio' && dialogRef?.nativeElement) {
        const dialog = dialogRef.nativeElement;
        if (!dialog.open) {
          if (typeof dialog.showModal === 'function') {
            try {
              dialog.showModal();
            } catch {
              dialog.setAttribute('open', '');
            }
          } else {
            dialog.setAttribute('open', '');
          }
        }
      }
    });

    inject(DestroyRef).onDestroy(() => {
      const dialog = this.dialogoConfirmacion()?.nativeElement;
      if (dialog?.open) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.removeAttribute('open');
        }
      }
      if (this.elementoDisparadorModal?.isConnected) {
        this.elementoDisparadorModal.focus();
      }
    });
  }

  nombrePersonaje(id: string): string {
    return this.motorInterior()?.estado.personajes.find((p) => p.id === id)?.nombre ?? id;
  }

  avanzarDialogoInterior(): void {
    const edificio = this.adaptador.interiorActivo();
    if (!edificio) return;
    this.coordinadorNarrativo.avanzarDialogo(edificio.id);
    this.motorInterior.set(this.coordinadorNarrativo.obtenerMotor(edificio.id));
  }

  elegirOpcionInterior(decisionId: string): void {
    const edificio = this.adaptador.interiorActivo();
    if (!edificio) return;
    this.coordinadorNarrativo.elegirOpcion(edificio.id, decisionId);
    this.motorInterior.set(this.coordinadorNarrativo.obtenerMotor(edificio.id));
  }

  completarTransicionInterior(): void {
    const edificio = this.adaptador.interiorActivo();
    if (!edificio) return;
    this.coordinadorNarrativo.completarTransicion(edificio.id);
    this.motorInterior.set(this.coordinadorNarrativo.obtenerMotor(edificio.id));
  }

  retrocederDialogoInterior(): void {
    const edificio = this.adaptador.interiorActivo();
    if (!edificio) return;
    this.coordinadorNarrativo.volver(edificio.id);
    this.motorInterior.set(this.coordinadorNarrativo.obtenerMotor(edificio.id));
  }

  protected abrirLibreta(): void {
    this.libretaAbierta.set(true);
    this.exploracion.establecer('libreta', true);
    this.adaptador.suspender(true);
  }

  protected cerrarLibreta(): void {
    this.libretaAbierta.set(false);
    this.exploracion.establecer('libreta', false);
    if (!this.exploracion.suspendido() && this.faseExperiencia() !== 'en-cuestionario') {
      this.adaptador.suspender(false);
    }
  }

  salirDeInterior(): void {
    const edificio = this.adaptador.interiorActivo();
    if (edificio) {
      this.coordinadorNarrativo.pausarYGuardar(edificio.id);
    }
    this.adaptador.salirDeInterior();
    this.exploracion.establecer('interior', false);
    this.adaptador.suspender(this.exploracion.suspendido());
  }

  protected iniciarDemostracion(): void {
    this.coordinadorNarrativo.reiniciarSesion();
    this.libreta.reiniciarDemostracion();
    this.adaptador.desbloquearCuestionario();
    this.store.explorarDemostracion();
    this.faseExperiencia.set('explorando');
  }

  solicitarInicioCuestionario(disparador?: EventTarget | null): void {
    const activo = document.activeElement as HTMLElement | null;
    this.elementoDisparadorModal = disparador instanceof HTMLElement ? disparador : (activo && activo !== document.body ? activo : null);
    this.faseExperiencia.set('confirmando-inicio');
  }

  cancelarInicioCuestionario(evento?: Event): void {
    if (evento) {
      evento.preventDefault();
    }
    const dialog = this.dialogoConfirmacion()?.nativeElement;
    if (dialog?.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
    const disparador = this.elementoDisparadorModal;
    this.elementoDisparadorModal = null;
    this.faseExperiencia.set('explorando');
    this.exploracion.establecer('confirmacion-modal', false);
    this.adaptador.suspender(this.exploracion.suspendido());
    if (disparador?.isConnected) {
      setTimeout(() => {
        if (disparador.isConnected) {
          disparador.focus();
        }
      }, 0);
    }
  }

  confirmarInicioCuestionario(): void {
    const dialog = this.dialogoConfirmacion()?.nativeElement;
    if (dialog?.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
    this.elementoDisparadorModal = null;
    this.faseExperiencia.set('en-cuestionario');
    this.adaptador.bloquearPorCuestionario();
  }

  solicitarFinalizacionCuestionario(): void {
    this.faseExperiencia.set('confirmando-finalizacion');
    this.store.solicitarFinalizacion();
  }

  cancelarFinalizacionCuestionario(): void {
    this.store.cancelarFinalizacion();
    this.faseExperiencia.set('en-cuestionario');
    // La exploración permanece bloqueada; no se reactiva el mapa
    this.adaptador.bloquearPorCuestionario();
  }

  confirmarFinalizacionCuestionario(): void {
    this.store.confirmarFinalizacion();
    this.faseExperiencia.set('finalizado');
  }

  protected volverAlInicio(): void {
    const dialog = this.dialogoConfirmacion()?.nativeElement;
    if (dialog?.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
    this.elementoDisparadorModal = null;
    this.libretaAbierta.set(false);
    this.libreta.reiniciarDemostracion();
    this.coordinadorNarrativo.reiniciarSesion();
    this.adaptador.desbloquearCuestionario();
    this.store.volverAlInicio();
    this.faseExperiencia.set('preparado');
  }

  protected salirParticipacion(): void {
    this.enlace()?.cerrar();
    this.participacion.cerrar();
    this.enlace.set(null);
    this.suspendido.set(true);
  }
}
