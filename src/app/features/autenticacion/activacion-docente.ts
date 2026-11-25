import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { CAPACIDADES_DC99 } from '../academico/capacidades-dc99';

/**
 * FE-61 · D-05 (Backend DC-99 `develop` 32922bb, `ActivacionDocenteController`, candidato QA).
 *
 * `POST /v1/personal/activar` `{token, password}` → 204 sin cuerpo. Ruta PÚBLICA: el token de un
 * solo uso es la credencial, así que nunca se envía Bearer ni cookie. Solo existe con
 * `PRISALY_M1_ACTIVACION_DOCENTE_ENABLED=true` y la migración candidata V020; apagada, la cadena de
 * seguridad del Backend responde 401 (y 404 si la ruta no está publicada).
 *
 * Respuestas del contrato: 400 `ACTIVATION_INVALID` (token desconocido, caducado, consumido o
 * revocado: siempre la misma respuesta) o `VALIDATION_ERROR`; 409 `ACTIVATION_CONFLICT`; 422
 * `PASSWORD_TOO_SHORT`/`PASSWORD_TOO_LONG`/`PASSWORD_COMMON`/`PASSWORD_CONTAINS_EMAIL` (DM1-08, el
 * token sigue siendo válido); 429 `ACTIVATION_RATE_LIMITED` con `Retry-After`.
 *
 * El correo de invitación (M7) incluye el enlace `<pantalla>#token=<código>`: el fragmento no viaja
 * al servidor. Esta pantalla lo lee, lo retira de la barra de direcciones y lo conserva solo en
 * memoria del formulario; no se registra en consola ni en almacenamiento del navegador.
 */
export type CodigoPoliticaContrasena =
  'PASSWORD_TOO_SHORT' | 'PASSWORD_TOO_LONG' | 'PASSWORD_COMMON' | 'PASSWORD_CONTAINS_EMAIL';

export type ResultadoActivacion =
  | { readonly tipo: 'activada' }
  | { readonly tipo: 'codigo-invalido' }
  | { readonly tipo: 'datos-invalidos' }
  | { readonly tipo: 'conflicto' }
  | { readonly tipo: 'contrasena-rechazada'; readonly codigo: CodigoPoliticaContrasena | null }
  | { readonly tipo: 'demasiados-intentos'; readonly reintentarEnSegundos: number | null }
  | { readonly tipo: 'no-habilitada' }
  | { readonly tipo: 'no-disponible' };

const CODIGOS_POLITICA: readonly string[] = [
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'PASSWORD_COMMON',
  'PASSWORD_CONTAINS_EMAIL',
];

/** Formato del token emitido por el Backend: 32 bytes en Base64url sin relleno (43 caracteres). */
export const FORMATO_TOKEN_ACTIVACION = /^[A-Za-z0-9_-]{43}$/;
/** DM1-08 (`PoliticaContrasena`): mínimo 12 caracteres (puntos de código) y máximo 72 bytes UTF-8. */
export const MINIMO_CARACTERES_CONTRASENA = 12;
export const MAXIMO_BYTES_CONTRASENA = 72;

export function clasificarErrorActivacion(error: unknown): ResultadoActivacion {
  if (!(error instanceof HttpErrorResponse)) return { tipo: 'no-disponible' };
  const codigo = (error.error as { code?: unknown } | null)?.code;
  switch (error.status) {
    case 400:
      return codigo === 'ACTIVATION_INVALID'
        ? { tipo: 'codigo-invalido' }
        : { tipo: 'datos-invalidos' };
    case 409:
      return { tipo: 'conflicto' };
    case 422:
      return {
        tipo: 'contrasena-rechazada',
        codigo:
          typeof codigo === 'string' && CODIGOS_POLITICA.includes(codigo)
            ? (codigo as CodigoPoliticaContrasena)
            : null,
      };
    case 429: {
      const espera = Number.parseInt(error.headers?.get('Retry-After') ?? '', 10);
      return {
        tipo: 'demasiados-intentos',
        reintentarEnSegundos: Number.isFinite(espera) && espera > 0 ? espera : null,
      };
    }
    case 401:
    case 404:
      return { tipo: 'no-habilitada' };
    default:
      return { tipo: 'no-disponible' };
  }
}

/** Cliente de la ruta pública de activación D-05. Sin contexto académico: nunca lleva Bearer. */
@Injectable({ providedIn: 'root' })
export class ActivacionDocenteApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  activar(token: string, password: string): Observable<ResultadoActivacion> {
    return this.http
      .post(
        construirUrlApi(this.config, 'v1/personal/activar'),
        { token, password },
        // JSON por defecto: el 204 llega sin cuerpo y los errores conservan `{code, message}`.
        // `credentials: 'omit'` (auditoría Codex FE-61): con `withFetch()`, `withCredentials: false`
        // deja el modo por defecto de `fetch` (`same-origin`), que enviaría cookies del mismo origen.
        // La activación pública no debe llevar ninguna credencial de sesión: el token es la credencial.
        { observe: 'response', withCredentials: false, credentials: 'omit' },
      )
      .pipe(
        map((r): ResultadoActivacion =>
          r.status === 204 ? { tipo: 'activada' } : { tipo: 'no-disponible' },
        ),
        catchError((e: unknown) => of(clasificarErrorActivacion(e))),
      );
  }
}

/** Extrae el token de un fragmento `token=<código>` (sin el `#`). */
export function tokenDesdeFragmento(fragmento: string | null | undefined): string | null {
  if (!fragmento) return null;
  const valor = new URLSearchParams(fragmento).get('token');
  return valor && FORMATO_TOKEN_ACTIVACION.test(valor) ? valor : null;
}

/** Comprobación local de DM1-08 (solo orientativa: la política la decide el Backend). */
export function problemaContrasenaLocal(password: string): CodigoPoliticaContrasena | null {
  if ([...password].length < MINIMO_CARACTERES_CONTRASENA) return 'PASSWORD_TOO_SHORT';
  if (new TextEncoder().encode(password).length > MAXIMO_BYTES_CONTRASENA)
    return 'PASSWORD_TOO_LONG';
  return null;
}

const MENSAJES_POLITICA: Readonly<Record<CodigoPoliticaContrasena, string>> = {
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 12 caracteres.',
  PASSWORD_TOO_LONG: 'La contraseña supera el máximo permitido (72 bytes).',
  PASSWORD_COMMON: 'La contraseña es demasiado común. Elige otra.',
  PASSWORD_CONTAINS_EMAIL: 'La contraseña no puede contener tu correo.',
};

export function mensajeActivacion(r: ResultadoActivacion): string {
  switch (r.tipo) {
    case 'activada':
      return 'El servidor confirmó la activación. Ya puedes iniciar sesión con tu correo y la nueva contraseña.';
    case 'codigo-invalido':
      return 'El código de activación no es válido: puede haber caducado, haberse usado o haber sido revocado. Pide al administrador una nueva invitación.';
    case 'datos-invalidos':
      return 'Los datos enviados no cumplen las validaciones del servidor. Revisa el código y la contraseña.';
    case 'conflicto':
      return 'La activación cambió al mismo tiempo en otra solicitud. Vuelve a intentarlo.';
    case 'contrasena-rechazada':
      return r.codigo
        ? `${MENSAJES_POLITICA[r.codigo]} El código sigue siendo válido.`
        : 'El servidor rechazó la contraseña por su política. El código sigue siendo válido.';
    case 'demasiados-intentos':
      return r.reintentarEnSegundos
        ? `Demasiados intentos. Espera ${r.reintentarEnSegundos} segundos antes de volver a intentarlo.`
        : 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
    case 'no-habilitada':
      return 'La activación de cuentas docentes no está habilitada en el servidor.';
    case 'no-disponible':
      return 'El servicio no está disponible en este momento. Inténtalo más tarde.';
  }
}

/**
 * Pantalla pública `/activacion-docente`. Deshabilitada mientras `capacidadesBackend.activacionDocente`
 * no sea `true` en el entorno (hoy en ninguno): en ese caso no envía nada, aunque llegue un enlace.
 */
@Component({
  selector: 'app-activacion-docente',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="acceso">
      <section class="tarjeta" aria-labelledby="titulo-activacion">
        <h1 id="titulo-activacion">Activar cuenta docente</h1>
        @if (!habilitada) {
          <p role="status" class="aviso" data-prueba="activacion-no-habilitada">
            La activación de cuentas docentes no está habilitada en este entorno. No se ha enviado
            ningún dato.
          </p>
        } @else if (estado() === 'activada') {
          <p role="status" class="ok" data-prueba="activacion-confirmada">{{ mensaje() }}</p>
          <a routerLink="/login" class="boton">Ir a iniciar sesión</a>
        } @else {
          <p class="descripcion">
            Usa el código de un solo uso de tu invitación para definir tu contraseña. PRISALY nunca
            envía contraseñas por correo.
          </p>
          @if (codigoDesdeEnlace()) {
            <p class="ok" data-prueba="codigo-enlace">
              Código recibido desde el enlace de invitación.
            </p>
          }
          <form [formGroup]="form" (ngSubmit)="activar()" novalidate>
            <label for="token-activacion">Código de activación</label>
            <input
              id="token-activacion"
              type="password"
              formControlName="token"
              autocomplete="off"
              spellcheck="false"
              maxlength="128"
            />
            <label for="contrasena-activacion">Nueva contraseña</label>
            <input
              id="contrasena-activacion"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              aria-describedby="politica-contrasena"
            />
            <small id="politica-contrasena"
              >Mínimo 12 caracteres. Evita contraseñas comunes y tu correo.</small
            >
            <label for="confirmacion-activacion">Repite la contraseña</label>
            <input
              id="confirmacion-activacion"
              type="password"
              formControlName="confirmacion"
              autocomplete="new-password"
            />
            <button type="submit" [disabled]="estado() === 'enviando'">
              {{ estado() === 'enviando' ? 'Activando…' : 'Activar cuenta' }}
            </button>
          </form>
          @if (estado() === 'error') {
            <p role="alert" class="error" data-prueba="error-activacion">{{ mensaje() }}</p>
          }
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
      width: min(100%, 28rem);
      padding: 2rem;
      border-radius: 1.25rem;
      background: #fff;
      color: #13213d;
      box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 0.25);
    }
    h1 {
      margin: 0 0 0.5rem;
    }
    .descripcion,
    small {
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
    button,
    .boton {
      display: inline-block;
      margin-top: 0.5rem;
      padding: 0.8rem;
      border: 0;
      border-radius: 0.8rem;
      background: #1557d6;
      color: #fff;
      font: inherit;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
    }
    .ok {
      color: #1e6b3a;
    }
    .aviso {
      color: #7a4b00;
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
export class ActivacionDocente implements OnInit {
  private readonly api = inject(ActivacionDocenteApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly location = inject(Location);
  protected readonly habilitada = inject(CAPACIDADES_DC99).activacionDocente;

  protected readonly estado = signal<'formulario' | 'enviando' | 'error' | 'activada'>(
    'formulario',
  );
  protected readonly mensaje = signal('');
  protected readonly codigoDesdeEnlace = signal(false);

  protected readonly form = new FormGroup({
    token: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    confirmacion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    const fragmento = this.ruta.snapshot.fragment;
    if (fragmento !== null && fragmento !== undefined) {
      // El código no debe quedar en la barra de direcciones ni en el historial.
      this.location.replaceState(this.location.path(false));
    }
    const token = tokenDesdeFragmento(fragmento);
    if (token && this.habilitada) {
      this.form.controls.token.setValue(token);
      this.codigoDesdeEnlace.set(true);
    }
  }

  protected activar(): void {
    if (!this.habilitada || this.estado() === 'enviando') return;
    const { token, password, confirmacion } = this.form.getRawValue();
    const codigo = token.trim();
    if (!FORMATO_TOKEN_ACTIVACION.test(codigo)) {
      return this.fallar(
        'El código de activación no tiene el formato esperado. Cópialo completo desde la invitación.',
      );
    }
    const local = problemaContrasenaLocal(password);
    if (local) return this.fallar(MENSAJES_POLITICA[local]);
    if (password !== confirmacion) return this.fallar('Las contraseñas no coinciden.');
    this.estado.set('enviando');
    this.mensaje.set('');
    this.api.activar(codigo, password).subscribe((r) => {
      if (r.tipo === 'activada') {
        this.form.reset();
        this.codigoDesdeEnlace.set(false);
        this.estado.set('activada');
        this.mensaje.set(mensajeActivacion(r));
        return;
      }
      // Las contraseñas no se conservan tras un intento; el código sí, salvo que sea inválido.
      this.form.controls.password.reset();
      this.form.controls.confirmacion.reset();
      if (r.tipo === 'codigo-invalido') {
        this.form.controls.token.reset();
        this.codigoDesdeEnlace.set(false);
      }
      this.fallar(mensajeActivacion(r));
    });
  }

  private fallar(texto: string): void {
    this.estado.set('error');
    this.mensaje.set(texto);
  }
}
