import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  InjectionToken,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DEMOSTRACIONES_HABILITADAS } from './entorno-demostracion';

/** Configuración de la entrada estudiantil demostrativa; solo existe en `environment.demo.ts`. */
interface EstudianteDemoConfig {
  readonly correo: string;
  /** SHA-256 (hex) de la clave de prueba. La clave en claro no se incluye en ningún bundle. */
  readonly hashClave: string;
}

export function leerEstudianteDemo(entorno: unknown): EstudianteDemoConfig | null {
  const c = (entorno as { estudianteDemo?: Partial<EstudianteDemoConfig> } | null)?.estudianteDemo;
  return typeof c?.correo === 'string' && typeof c?.hashClave === 'string'
    ? { correo: c.correo, hashClave: c.hashClave }
    : null;
}

/** Configuración efectiva, fijada al compilar. Fuera de `demo` es `null`. */
export const ESTUDIANTE_DEMO_CONFIG = new InjectionToken<EstudianteDemoConfig | null>(
  'ESTUDIANTE_DEMO_CONFIG',
  { providedIn: 'root', factory: () => leerEstudianteDemo(environment) },
);

async function sha256Hex(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * DC-FULLSTACK-DEMO-ESTUDIANTE-04. Sesión **demostrativa** del estudiante, solo en memoria y solo
 * en el entorno `demo`. No es una sesión M1: no envía credenciales al Backend, no crea JWT, no
 * consulta `/me` ni escribe en PostgreSQL. No concede ningún permiso académico.
 */
@Injectable({ providedIn: 'root' })
export class SesionEstudianteDemo {
  private readonly habilitada = inject(DEMOSTRACIONES_HABILITADAS) === true;
  private readonly config = inject(ESTUDIANTE_DEMO_CONFIG);
  private readonly interno = signal<{ readonly correo: string } | null>(null);
  readonly activa = this.interno.asReadonly();

  /** Verificación local contra la configuración del entorno demo. Fuera de demo, siempre `false`. */
  async iniciar(correo: string, clave: string): Promise<boolean> {
    const config = this.config;
    if (!this.habilitada || !config) return false;
    const correoNormalizado = correo.trim().toLowerCase();
    const coincide =
      correoNormalizado === config.correo.toLowerCase() &&
      (await sha256Hex(clave)) === config.hashClave;
    this.interno.set(coincide ? { correo: config.correo } : null);
    return coincide;
  }

  cerrar(): void {
    this.interno.set(null);
  }
}

@Component({
  selector: 'app-acceso-estudiante-demo',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="acceso">
      <section class="tarjeta" aria-labelledby="titulo-acceso-estudiante">
        <p class="distintivo" data-prueba="distintivo-demo">
          Demostración · Datos ficticios · Sin cuenta estudiantil real
        </p>
        <h1 id="titulo-acceso-estudiante">Entrar como estudiante</h1>
        <p class="descripcion">
          Acceso de demostración al espacio de aprendizaje. La verificación es local y no se envía
          al servidor. El registro estudiantil real está pendiente de DD-02.
        </p>
        <form [formGroup]="formulario" (ngSubmit)="entrar()" novalidate>
          <label for="correo-estudiante">Correo electrónico</label>
          <input
            id="correo-estudiante"
            type="email"
            formControlName="correo"
            autocomplete="username"
          />
          <label for="clave-estudiante">Contraseña</label>
          <input
            id="clave-estudiante"
            type="password"
            formControlName="clave"
            autocomplete="current-password"
          />
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <button type="submit" [disabled]="verificando()">
            {{ verificando() ? 'Verificando…' : 'Entrar al espacio de aprendizaje' }}
          </button>
        </form>
        <a routerLink="/login" class="volver">← Volver al inicio de sesión</a>
      </section>
    </main>
  `,
  styles: `
    .acceso {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: linear-gradient(135deg, #0b2a6b, #1557d6 60%, #ffb347);
    }
    .tarjeta {
      width: min(100%, 26rem);
      padding: 2rem;
      border-radius: 1.25rem;
      background: #fff;
      box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 0.25);
      color: #13213d;
    }
    .distintivo {
      display: inline-block;
      margin: 0 0 1rem;
      padding: 0.3rem 0.75rem;
      border-radius: 999px;
      background: #fff3db;
      color: #6b3e00;
      font-size: 0.8rem;
      font-weight: 600;
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.6rem;
    }
    .descripcion {
      margin: 0 0 1.25rem;
      font-size: 0.9rem;
      color: #44516b;
    }
    form {
      display: grid;
      gap: 0.5rem;
    }
    label {
      font-weight: 600;
      font-size: 0.9rem;
    }
    input {
      padding: 0.7rem 0.9rem;
      border: 1px solid #b9c5da;
      border-radius: 0.7rem;
      font: inherit;
    }
    button {
      margin-top: 0.75rem;
      padding: 0.8rem;
      border: 0;
      border-radius: 0.8rem;
      background: #1557d6;
      color: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    button[disabled] {
      opacity: 0.7;
    }
    .error {
      margin: 0.25rem 0 0;
      color: #a11a1a;
      font-size: 0.9rem;
    }
    .volver {
      display: inline-block;
      margin-top: 1rem;
      font-size: 0.9rem;
    }
  `,
})
export class AccesoEstudianteDemo {
  private readonly sesion = inject(SesionEstudianteDemo);
  private readonly router = inject(Router);
  protected readonly verificando = signal(false);
  protected readonly error = signal('');
  protected readonly formulario = new FormGroup({
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    clave: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected async entrar(): Promise<void> {
    if (this.verificando()) return;
    this.error.set('');
    const { correo, clave } = this.formulario.getRawValue();
    if (!correo.trim() || !clave) {
      this.error.set('Introduce el correo y la contraseña de demostración.');
      return;
    }
    this.verificando.set(true);
    const ok = await this.sesion.iniciar(correo, clave);
    this.verificando.set(false);
    if (!ok) {
      this.formulario.controls.clave.reset('');
      this.error.set('Correo o contraseña de demostración incorrectos.');
      return;
    }
    await this.router.navigateByUrl('/dashboard/estudiante');
  }
}
