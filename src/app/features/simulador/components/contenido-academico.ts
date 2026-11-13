import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContenidoIntentoM5 } from '../models/contenido-intento.models';

/** Presentación de lectura: no genera escenas, decisiones ni operaciones de respuesta. */
@Component({
  selector: 'app-contenido-academico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Contenido académico">
      <h1>{{ contenido().caso.titulo }}</h1>
      <p role="status">Contenido académico disponible. Experiencia narrativa no vinculada.</p>
      @if (contenido().caso.historia !== null) {
        <h2>Historia</h2>
        <p class="texto">{{ contenido().caso.historia }}</p>
      }
      @if (contenido().caso.desarrolloSituacional !== null) {
        <h2>Desarrollo situacional</h2>
        <p class="texto">{{ contenido().caso.desarrolloSituacional }}</p>
      }
      @for (escenario of contenido().caso.escenarios; track escenario.idEscenario) {
        <section aria-label="Escenario académico">
          @if (escenario.titulo !== null) {
            <h2>{{ escenario.titulo }}</h2>
          }
          @if (escenario.contexto !== null) {
            <p class="texto">{{ escenario.contexto }}</p>
          }
          @if (escenario.instrucciones !== null) {
            <h3>Instrucciones</h3>
            <p class="texto">{{ escenario.instrucciones }}</p>
          }
          @for (pregunta of escenario.preguntas; track pregunta.idPregunta) {
            <section aria-label="Pregunta académica">
              <h3>{{ pregunta.enunciado }}</h3>
              <ul>
                @for (opcion of pregunta.opciones; track opcion.idOpcion) {
                  <li>{{ opcion.texto }}</li>
                }
              </ul>
            </section>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .texto {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class ContenidoAcademico {
  readonly contenido = input.required<ContenidoIntentoM5>();
}
