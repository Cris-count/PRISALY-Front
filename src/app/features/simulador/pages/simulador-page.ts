import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Aviso } from '../../../shared/ui/aviso';
import { EstadoCarga } from '../../../shared/ui/estado-carga';
import { BarraAcciones } from '../components/barra-acciones';
import { ConfirmacionFinalizacion } from '../components/confirmacion-finalizacion';
import { Escenario2d } from '../components/escenario-2d';
import { IndicadorProgreso } from '../components/indicador-progreso';
import { PanelContexto } from '../components/panel-contexto';
import { PanelPreguntas } from '../components/panel-preguntas';
import { PantallaInicio } from '../components/pantalla-inicio';
import { Temporizador } from '../components/temporizador';
import { SimuladorStore } from '../services/simulador.store';

/** Página del simulador: compone las vistas según la fase de presentación. */
@Component({
  selector: 'app-simulador-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SimuladorStore],
  imports: [
    Aviso,
    BarraAcciones,
    ConfirmacionFinalizacion,
    Escenario2d,
    EstadoCarga,
    IndicadorProgreso,
    PanelContexto,
    PanelPreguntas,
    PantallaInicio,
    Temporizador,
  ],
  templateUrl: './simulador-page.html',
  styleUrl: './simulador-page.css',
})
export class SimuladorPage {
  protected readonly store = inject(SimuladorStore);
}
