import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { CasosSesionStore } from './casos-sesion.store';
import { PARAM_CASO, PARAM_SESION, uuidDeParametro } from './contexto-recorrido';

export type EtapaRecorrido = 'casos' | 'rubrica' | 'publicacion' | 'sesiones' | 'convocatorias';

interface PasoRecorrido {
  readonly titulo: string;
  readonly etapa: EtapaRecorrido;
  readonly ruta: string;
  readonly detalle: string;
}

/** Pantallas existentes (FE-53/FE-54) en el orden del recorrido docente. No se crean operaciones. */
export const PASOS_RECORRIDO: readonly PasoRecorrido[] = [
  {
    titulo: 'Caso y contenido',
    etapa: 'casos',
    ruta: '/dashboard/casos-academicos',
    detalle: 'Crear o consultar el caso y añadir escenarios, preguntas y opciones.',
  },
  {
    titulo: 'Rúbrica',
    etapa: 'rubrica',
    ruta: '/dashboard/rubricas',
    detalle: 'Configurar la rúbrica del caso en borrador.',
  },
  {
    titulo: 'Publicación',
    etapa: 'publicacion',
    ruta: '/dashboard/casos-academicos',
    detalle:
      'Solicitar la publicación desde el detalle del caso; el servidor valida los requisitos.',
  },
  {
    titulo: 'Sesión',
    etapa: 'sesiones',
    ruta: '/dashboard/sesiones',
    detalle: 'Programar una sesión con un caso publicado.',
  },
  {
    titulo: 'Convocatoria',
    etapa: 'convocatorias',
    ruta: '/dashboard/convocatorias',
    detalle: 'Convocar estudiantes a la sesión y consultar los convocados.',
  },
];

/**
 * FE-55. Orientación del recorrido docente entre pantallas existentes. Los enlaces solo
 * conservan identificadores (`?caso=`, `?sesion=`): cada pantalla los vuelve a consultar en el
 * servidor y su ruta mantiene el guard `requiereMapeoPersonalQa` (BLQ-53-01 sigue vigente).
 * No muestra nada sin sesión de personal válida.
 */
@Component({
  selector: 'app-recorrido-docente',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sesionValida()) {
      <nav class="recorrido" aria-label="Recorrido docente">
        <p class="titulo">Recorrido docente</p>
        <ol>
          @for (paso of pasos; track paso.titulo; let i = $index) {
            <li>
              <a
                [routerLink]="paso.ruta"
                [queryParams]="parametros()"
                [attr.aria-current]="paso.etapa === etapa() ? 'step' : null"
                [title]="paso.detalle"
                >{{ i + 1 }}. {{ paso.titulo }}</a
              >
            </li>
          }
        </ol>
        <p class="contexto" data-prueba="contexto-recorrido">
          @if (caso(); as c) {
            Caso activo: {{ c.titulo }} · {{ c.estado }} (última lectura del servidor).
          } @else if (idCaso(); as id) {
            Caso activo: <code>{{ id }}</code> (pendiente de consulta).
          } @else {
            Sin caso activo.
          }
          @if (idSesion(); as s) {
            Sesión activa: <code>{{ s }}</code
            >.
          }
        </p>
        <p class="nota">
          Los enlaces solo conservan identificadores; cada pantalla los vuelve a consultar en el
          servidor y aplica su propio control de acceso.
        </p>
      </nav>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .recorrido {
      margin: 0 0 1rem;
      padding: 0.75rem 1rem;
      border: 1px solid #c9d4e5;
      border-radius: 0.5rem;
      background: #f5f8fc;
    }
    .titulo {
      margin: 0 0 0.25rem;
      font-weight: 600;
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      margin: 0;
      padding-left: 1.25rem;
    }
    a[aria-current] {
      font-weight: 700;
    }
    .contexto,
    .nota {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
    }
    code {
      word-break: break-all;
    }
  `,
})
export class RecorridoDocente {
  readonly etapa = input.required<EtapaRecorrido>();

  private readonly sesion = inject(SesionPersonalM1);
  private readonly store = inject(CasosSesionStore);
  private readonly consulta = toSignal(inject(ActivatedRoute).queryParamMap, {
    requireSync: true,
  });

  protected readonly pasos = PASOS_RECORRIDO;
  protected readonly sesionValida = computed(() => this.sesion.estado().tipo === 'valida');
  protected readonly idCaso = computed(() => uuidDeParametro(this.consulta().get(PARAM_CASO)));
  protected readonly idSesion = computed(() => uuidDeParametro(this.consulta().get(PARAM_SESION)));
  protected readonly caso = computed(() => {
    const id = this.idCaso();
    return id ? (this.store.casos().find((c) => c.idCaso.toLowerCase() === id) ?? null) : null;
  });
  /** Solo identificadores válidos; cualquier otro parámetro de la URL se descarta. */
  protected readonly parametros = computed(() => {
    const q: Record<string, string> = {};
    const caso = this.idCaso();
    const sesion = this.idSesion();
    if (caso) q[PARAM_CASO] = caso;
    if (sesion) q[PARAM_SESION] = sesion;
    return q;
  });
}
