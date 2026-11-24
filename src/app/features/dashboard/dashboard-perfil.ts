import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SesionEstudianteDemo } from '../autenticacion/acceso-estudiante-demo';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';

/**
 * DC-FE-60. Capacidades legibles a partir de los permisos efectivos de `/v1/personal/me`.
 * Solo presentación: distingue lectura, creación, edición y publicación; no concede nada.
 */
export const CAPACIDADES_PERSONAL: readonly { readonly permiso: string; readonly texto: string }[] =
  [
    { permiso: 'CONSULTAR_CASO', texto: 'Lectura de casos académicos' },
    { permiso: 'CREAR_CASO', texto: 'Creación de casos académicos' },
    { permiso: 'MODIFICAR_CASO', texto: 'Edición de casos, contenido y rúbricas' },
    { permiso: 'PUBLICAR_CASO', texto: 'Publicación de casos' },
    { permiso: 'ARCHIVAR_CASO', texto: 'Archivo de casos' },
    { permiso: 'GESTIONAR_SESION', texto: 'Programación de sesiones y convocatorias' },
  ];

export function capacidadesDe(permisos: readonly string[]): readonly string[] {
  return CAPACIDADES_PERSONAL.filter((c) => permisos.includes(c.permiso)).map((c) => c.texto);
}

/** «Mi perfil»: identidad confirmada por el servidor, o perfil demostrativo claramente marcado. */
@Component({
  selector: 'app-dashboard-perfil',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="perfil-pagina">
      <a class="regreso" routerLink="/dashboard">← Volver al dashboard</a>
      <header class="cabecera">
        <h1>Mi perfil</h1>
        @if (identidad(); as id) {
          <p class="origen" data-prueba="perfil-servidor">Datos confirmados por el servidor</p>
        } @else if (estudianteDemo.activa()) {
          <p class="origen demo" data-prueba="perfil-demo">
            Demostración · Datos ficticios · Sin cuenta estudiantil real
          </p>
        } @else {
          <p class="origen demo">Perfil demostrativo · Sin sesión autenticada</p>
        }
      </header>

      @if (identidad(); as id) {
        <section class="tarjeta" aria-labelledby="perfil-datos">
          <h2 id="perfil-datos">Datos de la cuenta</h2>
          <dl>
            <dt>Nombre</dt>
            <dd data-prueba="perfil-nombre">{{ id.nombre }}</dd>
            <dt>Correo</dt>
            <dd>{{ id.correo }}</dd>
            <dt>Perfil</dt>
            <dd data-prueba="perfil-rol">
              {{ esAdministrador() ? 'Administración' : 'Personal académico' }}
            </dd>
          </dl>
        </section>
        <section class="tarjeta" aria-labelledby="perfil-capacidades">
          <h2 id="perfil-capacidades">Lo que puedes hacer</h2>
          @if (esAdministrador()) {
            <p>Gestión de docentes y consulta del catálogo de roles y permisos.</p>
          }
          <ul data-prueba="perfil-capacidades">
            @for (c of capacidades(); track c) {
              <li>{{ c }}</li>
            } @empty {
              @if (!esAdministrador()) {
                <li>Tu cuenta no tiene capacidades académicas asignadas.</li>
              }
            }
          </ul>
          <p class="nota">La autorización final de cada operación la decide el servidor.</p>
          <button type="button" (click)="actualizar()" [disabled]="actualizando()">
            {{ actualizando() ? 'Consultando…' : 'Actualizar desde el servidor' }}
          </button>
          @if (aviso()) {
            <p role="status" class="aviso">{{ aviso() }}</p>
          }
        </section>
      } @else if (estudianteDemo.activa(); as demo) {
        <section class="tarjeta" aria-labelledby="perfil-demo-datos">
          <h2 id="perfil-demo-datos">Perfil estudiantil de demostración</h2>
          <dl>
            <dt>Correo de demostración</dt>
            <dd>{{ demo.correo }}</dd>
            <dt>Estado</dt>
            <dd>Sin cuenta real: el registro estudiantil está pendiente de DD-02.</dd>
          </dl>
        </section>
      } @else {
        <section class="tarjeta">
          <p>Inicia sesión para ver los datos de tu cuenta.</p>
        </section>
      }
    </div>
  `,
  styles: `
    .perfil-pagina {
      display: grid;
      gap: 1rem;
      max-width: 52rem;
    }
    .cabecera h1 {
      margin: 0;
      font-size: 2rem;
      color: #0b2a6b;
    }
    .origen {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
      color: #1e6b3a;
    }
    .origen.demo {
      color: #6b3e00;
    }
    .tarjeta {
      padding: 1.25rem 1.5rem;
      border-radius: 1rem;
      background: rgb(255 255 255 / 0.92);
      box-shadow: 0 0.5rem 1.5rem rgb(11 42 107 / 0.1);
    }
    .tarjeta h2 {
      margin: 0 0 0.75rem;
      font-size: 1.15rem;
      color: #0b2a6b;
    }
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.4rem 1.25rem;
      margin: 0;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
      word-break: break-word;
    }
    ul {
      margin: 0 0 0.75rem;
      padding-left: 1.25rem;
    }
    .nota {
      font-size: 0.85rem;
      color: #44516b;
    }
    button {
      padding: 0.6rem 1rem;
      border: 1px solid #1557d6;
      border-radius: 0.6rem;
      background: #fff;
      color: #1557d6;
      font: inherit;
      cursor: pointer;
    }
    .aviso {
      margin: 0.5rem 0 0;
      font-size: 0.9rem;
    }
  `,
})
export class DashboardPerfil {
  private readonly sesion = inject(M1_PERSONAL_LOCAL) ? inject(SesionPersonalM1) : null;
  protected readonly estudianteDemo = inject(SesionEstudianteDemo);
  protected readonly actualizando = signal(false);
  protected readonly aviso = signal('');

  protected readonly identidad = computed(() => {
    const estado = this.sesion?.estado();
    return estado?.tipo === 'valida' ? estado.identidad : null;
  });
  protected readonly esAdministrador = computed(() => this.identidad()?.rol === 'ADMINISTRADOR');
  protected readonly capacidades = computed(() => capacidadesDe(this.identidad()?.permisos ?? []));

  protected actualizar(): void {
    if (!this.sesion || this.actualizando()) return;
    this.actualizando.set(true);
    this.aviso.set('');
    this.sesion.actualizarIdentidad().subscribe({
      next: (v) => {
        this.actualizando.set(false);
        this.aviso.set(
          v === 'vigente'
            ? 'Datos actualizados desde el servidor.'
            : 'No fue posible confirmar los datos con el servidor.',
        );
      },
      error: () => {
        this.actualizando.set(false);
        this.aviso.set('No fue posible confirmar los datos con el servidor.');
      },
    });
  }
}
