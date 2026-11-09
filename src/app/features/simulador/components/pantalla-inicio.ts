import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/** Pantalla inicial del simulador. No inicia ningún intento por sí sola. */
@Component({
  selector: 'app-pantalla-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tarjeta inicio" aria-labelledby="inicio-titulo">
      <h1 id="inicio-titulo">Simulador de casos situacionales</h1>
      <p>
        Desarrolla el caso asignado observando el escenario y respondiendo sus preguntas dentro del
        tiempo disponible.
      </p>
      <div class="inicio__acciones">
        <button type="button" class="boton boton--primario" (click)="consultarSesiones.emit()">
          Consultar sesiones disponibles
        </button>
        <button type="button" class="boton" (click)="explorarDemostracion.emit()">
          Ver demostración con datos simulados
        </button>
      </div>
      <p class="inicio__nota">
        La demostración no registra intentos ni respuestas: solo muestra cómo funciona la
        interfaz.
      </p>
    </section>
  `,
  styles: `
    .inicio {
      margin: 0 auto;
      max-width: 40rem;
    }
    .inicio__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--espacio-2);
      margin: var(--espacio-3) 0;
    }
    .inicio__nota {
      color: var(--color-texto-suave);
      font-size: 0.875rem;
    }
  `,
})
export class PantallaInicio {
  readonly consultarSesiones = output<void>();
  readonly explorarDemostracion = output<void>();
}
