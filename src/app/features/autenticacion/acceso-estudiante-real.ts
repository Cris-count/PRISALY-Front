import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';

/**
 * DC-FE-60. Cliente del contrato DD-02 alternativa B (`EstudianteCuentaController`, Backend
 * `origin/develop` 5d61972; sin cambios de contrato en DC-99 32922bb, revisado en FE-61). Rutas
 * públicas/por cookie: el interceptor académico nunca les añade Bearer. `POST /v1/acceso-estudiante/solicitar` `{correo}` → 202
 * `{challengeId, mensaje}`; `POST /v1/acceso-estudiante/validar` `{challengeId, codigo}` (8 dígitos)
 * → 204 con cookie de sesión estudiantil. Mientras DD-02 no esté activado el servidor responde 501
 * `ESTUDIANTE_ACCESS_PENDING_CONTRACT`. No hay identidad simulada: sin respuesta del servidor no
 * existe sesión estudiantil.
 */
export type ResultadoAcceso =
  | { readonly tipo: 'codigo-enviado'; readonly challengeId: string; readonly mensaje: string }
  | { readonly tipo: 'sesion-abierta' }
  | { readonly tipo: 'pendiente-dd02' }
  | { readonly tipo: 'datos-invalidos' }
  | { readonly tipo: 'denegado' }
  | { readonly tipo: 'demasiados-intentos' }
  | { readonly tipo: 'no-disponible' };

export function clasificarErrorAcceso(error: unknown): ResultadoAcceso {
  if (!(error instanceof HttpErrorResponse)) return { tipo: 'no-disponible' };
  const codigo = (error.error as { code?: unknown } | null)?.code;
  if (error.status === 501 && codigo === 'ESTUDIANTE_ACCESS_PENDING_CONTRACT')
    return { tipo: 'pendiente-dd02' };
  if (error.status === 400) return { tipo: 'datos-invalidos' };
  if (error.status === 429) return { tipo: 'demasiados-intentos' };
  if (error.status === 401 || error.status === 403) return { tipo: 'denegado' };
  return { tipo: 'no-disponible' };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class AccesoEstudianteApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  solicitar(correo: string): Observable<ResultadoAcceso> {
    return this.http
      .post<unknown>(
        construirUrlApi(this.config, 'v1/acceso-estudiante/solicitar'),
        { correo: correo.trim() },
        // Sin credenciales: la solicitud no usa cookie (el Backend QA no permite CORS con credenciales).
        {},
      )
      .pipe(
        map((r): ResultadoAcceso => {
          const c = r as { challengeId?: unknown; mensaje?: unknown } | null;
          return typeof c?.challengeId === 'string' && UUID.test(c.challengeId)
            ? {
                tipo: 'codigo-enviado',
                challengeId: c.challengeId,
                mensaje: typeof c.mensaje === 'string' ? c.mensaje : '',
              }
            : { tipo: 'no-disponible' };
        }),
        catchError((e) => of(clasificarErrorAcceso(e))),
      );
  }

  validar(challengeId: string, codigo: string): Observable<ResultadoAcceso> {
    return this.http
      .post<unknown>(
        construirUrlApi(this.config, 'v1/acceso-estudiante/validar'),
        { challengeId, codigo },
        { withCredentials: true, observe: 'response' },
      )
      .pipe(
        map((r): ResultadoAcceso =>
          r.status === 204 ? { tipo: 'sesion-abierta' } : { tipo: 'no-disponible' },
        ),
        catchError((e) => of(clasificarErrorAcceso(e))),
      );
  }
}

const MENSAJES: Readonly<Record<string, string>> = {
  'pendiente-dd02':
    'El acceso estudiantil todavía no está habilitado en el servidor (DD-02 pendiente de autorización). No se creó ninguna sesión.',
  'datos-invalidos': 'Revisa los datos: el correo debe ser válido y el código tiene 8 dígitos.',
  denegado:
    'No fue posible validar el código. Puede ser incorrecto, haber caducado o haberse usado ya. Solicita uno nuevo.',
  'demasiados-intentos':
    'Se agotaron los intentos permitidos. Espera unos minutos y solicita un nuevo código.',
  'no-disponible': 'El servicio no está disponible en este momento. Inténtalo más tarde.',
};

/** Pantalla real de acceso estudiantil por código (DD-02 B). Solo en builds QA de integración. */
@Component({
  selector: 'app-acceso-estudiante-real',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="acceso">
      <section class="tarjeta" aria-labelledby="titulo-acceso-real">
        <h1 id="titulo-acceso-real">Acceso estudiantil</h1>
        <p class="descripcion">
          Recibirás un código temporal de 8 dígitos en tu correo institucional. El código caduca y
          solo puede usarse una vez.
        </p>
        @if (paso() === 'correo') {
          <form [formGroup]="formCorreo" (ngSubmit)="solicitar()" novalidate>
            <label for="correo-acceso">Correo electrónico</label>
            <input id="correo-acceso" type="email" formControlName="correo" autocomplete="email" />
            <button type="submit" [disabled]="enviando()">
              {{ enviando() ? 'Enviando…' : 'Enviar código' }}
            </button>
          </form>
        } @else if (paso() === 'codigo') {
          <p role="status" class="ok">{{ mensajeServidor() }}</p>
          <form [formGroup]="formCodigo" (ngSubmit)="validar()" novalidate>
            <label for="codigo-acceso">Código de verificación</label>
            <input
              id="codigo-acceso"
              inputmode="numeric"
              maxlength="8"
              formControlName="codigo"
              autocomplete="one-time-code"
            />
            <button type="submit" [disabled]="enviando()">
              {{ enviando() ? 'Validando…' : 'Validar código' }}
            </button>
          </form>
          <button type="button" class="secundario" (click)="reenviar()" [disabled]="enviando()">
            Reenviar código
          </button>
        } @else {
          <p role="status" class="ok" data-prueba="cuenta-activada">
            Código validado por el servidor. Tu sesión estudiantil está abierta.
          </p>
        }
        @if (error()) {
          <p role="alert" class="error" data-prueba="error-acceso">{{ error() }}</p>
        }
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
      width: min(100%, 27rem);
      padding: 2rem;
      border-radius: 1.25rem;
      background: #fff;
      color: #13213d;
      box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 0.25);
    }
    h1 {
      margin: 0 0 0.5rem;
    }
    .descripcion {
      margin: 0 0 1rem;
      font-size: 0.9rem;
      color: #44516b;
    }
    form {
      display: grid;
      gap: 0.5rem;
    }
    label {
      font-weight: 600;
    }
    input {
      padding: 0.7rem 0.9rem;
      border: 1px solid #b9c5da;
      border-radius: 0.7rem;
      font: inherit;
    }
    button {
      margin-top: 0.5rem;
      padding: 0.8rem;
      border: 0;
      border-radius: 0.8rem;
      background: #1557d6;
      color: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .secundario {
      width: 100%;
      background: #fff;
      color: #1557d6;
      border: 1px solid #1557d6;
    }
    .ok {
      color: #1e6b3a;
    }
    .error {
      color: #a11a1a;
    }
    .volver {
      display: inline-block;
      margin-top: 1rem;
    }
  `,
})
export class AccesoEstudianteReal {
  private readonly api = inject(AccesoEstudianteApi);
  protected readonly paso = signal<'correo' | 'codigo' | 'activa'>('correo');
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly mensajeServidor = signal('');
  private challengeId = '';
  protected readonly formCorreo = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });
  protected readonly formCodigo = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{8}$/)],
    }),
  });

  private tratar(r: ResultadoAcceso): void {
    this.enviando.set(false);
    if (r.tipo === 'codigo-enviado') {
      this.challengeId = r.challengeId;
      this.mensajeServidor.set(r.mensaje);
      this.formCodigo.reset();
      this.paso.set('codigo');
    } else if (r.tipo === 'sesion-abierta') {
      this.paso.set('activa');
    } else {
      this.error.set(MENSAJES[r.tipo]);
    }
  }

  protected solicitar(): void {
    this.error.set('');
    if (this.formCorreo.invalid) {
      this.error.set(MENSAJES['datos-invalidos']);
      return;
    }
    this.enviando.set(true);
    this.api.solicitar(this.formCorreo.getRawValue().correo).subscribe((r) => this.tratar(r));
  }

  protected reenviar(): void {
    this.paso.set('correo');
    this.solicitar();
  }

  protected validar(): void {
    this.error.set('');
    if (this.formCodigo.invalid) {
      this.error.set(MENSAJES['datos-invalidos']);
      return;
    }
    this.enviando.set(true);
    this.api
      .validar(this.challengeId, this.formCodigo.getRawValue().codigo)
      .subscribe((r) => this.tratar(r));
  }
}
