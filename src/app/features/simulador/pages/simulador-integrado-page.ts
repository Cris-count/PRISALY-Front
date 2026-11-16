import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
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
import { GuionNarrativo } from '../narrativa/narrativa.models';
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

/**
 * Coordinador de la experiencia unificada del simulador PRISALY (Fase 7).
 * Integra el visor axonométrico 2.5D (Phaser 3) con el flujo académico,
 * temporizador, panel de preguntas y la libreta en memoria sin alterar contratos.
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
  readonly contextoAcademico = input<ContextoNarrativoAcademico | null>(null);
  readonly idIntentoContenido = input<string | null>(null);

  protected readonly store = inject(SimuladorStore);
  protected readonly participacion = inject(ParticipacionCoordinador);
  protected readonly adaptador = inject(AdaptadorMundoSimulador);
  protected readonly libreta = inject(LibretaStore);
  protected readonly exploracion = inject(EstadoExploracion);

  protected readonly libretaAbierta = signal(false);
  protected readonly enlace = signal<EnlaceNarrativo | null>(null);
  protected readonly errorContenido = signal(false);
  protected readonly suspendido = signal(false);

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

    // Interior, libreta y confirmación conservan motivos independientes.
    effect(() => {
      const enConfirmacion = this.store.fase() === 'confirmando';
      const enInterior = this.adaptador.interiorActivo() !== null;
      const enLibreta = this.libretaAbierta();
      untracked(() => {
        this.exploracion.establecer('interior', enInterior);
        this.exploracion.establecer('libreta', enLibreta);
        this.exploracion.establecer('confirmacion-modal', enConfirmacion);
        this.adaptador.suspender(this.exploracion.suspendido());
      });
    });
  }

  protected abrirLibreta(): void {
    this.libretaAbierta.set(true);
    this.exploracion.establecer('libreta', true);
    this.adaptador.suspender(true);
  }

  protected cerrarLibreta(): void {
    this.libretaAbierta.set(false);
    this.exploracion.establecer('libreta', false);
    if (!this.exploracion.suspendido()) {
      this.adaptador.suspender(false);
    }
  }

  protected salirDeInterior(): void {
    this.adaptador.salirDeInterior();
    this.exploracion.establecer('interior', false);
    this.adaptador.suspender(this.exploracion.suspendido());
  }

  protected iniciarDemostracion(): void {
    this.libreta.reiniciarDemostracion();
    this.store.explorarDemostracion();
  }

  protected volverAlInicio(): void {
    this.libretaAbierta.set(false);
    this.libreta.reiniciarDemostracion();
    this.store.volverAlInicio();
  }

  protected salirParticipacion(): void {
    this.enlace()?.cerrar();
    this.participacion.cerrar();
    this.enlace.set(null);
    this.suspendido.set(true);
  }
}
