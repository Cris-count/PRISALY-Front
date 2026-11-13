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
import { Escenario2d } from '../components/escenario-2d';
import { IndicadorProgreso } from '../components/indicador-progreso';
import { PanelContexto } from '../components/panel-contexto';
import { PanelNarrativo } from '../components/panel-narrativo';
import { PanelPreguntas } from '../components/panel-preguntas';
import { PantallaInicio } from '../components/pantalla-inicio';
import { Temporizador } from '../components/temporizador';
import { SimuladorStore } from '../services/simulador.store';
import { EnlaceNarrativo, VinculoDecisionAcademica } from '../services/enlace-narrativo';
import { ParticipacionCoordinador } from '../services/participacion.coordinador';
import { FalloParticipacionError } from '../services/participacion-http.gateway';
import { ContratoPendienteError } from '../services/participacion.gateway';
import { GuionNarrativo } from '../narrativa/narrativa.models';
import { PreguntaVista } from '../models/simulador.models';
import { ContenidoAcademico } from '../components/contenido-academico';

/** Entrada local, no contrato REST ni fuente de autorización. */
export interface ContextoNarrativoAcademico {
  readonly idIntento: string;
  readonly guion: GuionNarrativo;
  readonly preguntas: readonly PreguntaVista[];
  readonly vinculos: readonly VinculoDecisionAcademica[];
}

/** Página del simulador: compone las vistas según la fase de presentación. */
@Component({
  selector: 'app-simulador-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SimuladorStore, ParticipacionCoordinador],
  imports: [
    ContenidoAcademico,
    Aviso,
    BarraAcciones,
    ConfirmacionFinalizacion,
    Escenario2d,
    EstadoCarga,
    IndicadorProgreso,
    PanelContexto,
    PanelPreguntas,
    PanelNarrativo,
    PantallaInicio,
    Temporizador,
  ],
  templateUrl: './simulador-page.html',
  styleUrl: './simulador-page.css',
})
export class SimuladorPage {
  /** El integrador debe obtenerlo mediante el futuro contrato estudiantil autorizado. */
  readonly contextoAcademico = input<ContextoNarrativoAcademico | null>(null);
  /** Opt-in local para lectura del PR #88. No se obtiene de parámetros URL. */
  readonly idIntentoContenido = input<string | null>(null);
  protected readonly store = inject(SimuladorStore);
  protected readonly participacion = inject(ParticipacionCoordinador);
  protected readonly enlace = signal<EnlaceNarrativo | null>(null);
  protected readonly errorContenido = signal(false);
  protected readonly suspendido = signal(false);
  protected readonly mensajeError = computed(() => {
    const error = this.participacion.error();
    if (error instanceof FalloParticipacionError) {
      if (error.codigo === 'CONTENIDO_INTENTO_NO_DISPONIBLE')
        return 'El contenido académico de este intento no está disponible.';
      return error.fallo.mensaje;
    }
    if (error instanceof ContratoPendienteError)
      return 'El acceso académico aún no está habilitado.';
    return error ? 'No se pudo verificar la participación. No se confirmó el guardado.' : null;
  });
  protected readonly confirmadas = computed(() => {
    const preguntas = this.contextoAcademico()?.preguntas ?? [];
    const respuestas = this.participacion.intento()?.respuestas ?? [];
    return preguntas.filter((p) =>
      respuestas.some(
        (r) => r.idPregunta === p.id && p.opciones.some((o) => o.id === r.idOpcionSeleccionada),
      ),
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
        if (!contexto && !idContenido) return;
        this.store.volverAlInicio();
        if (idContenido) {
          if (contexto) this.errorContenido.set(true);
          else this.participacion.cargarContenido(idContenido);
          return;
        }
        if (!contexto) return;
        try {
          const enlace = new EnlaceNarrativo(
            contexto.idIntento,
            contexto.guion,
            contexto.preguntas,
            contexto.vinculos,
            this.participacion,
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
  }

  protected salirParticipacion(): void {
    this.enlace()?.cerrar();
    this.participacion.cerrar();
    this.enlace.set(null);
    this.suspendido.set(true);
  }
}
