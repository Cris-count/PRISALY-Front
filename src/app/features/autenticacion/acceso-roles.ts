import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { API_CONFIG, construirUrlApi } from '../../core/config/api.config';
import { CredencialPersonalMemoria } from './m1-personal-memoria';

type RolQa = 'administrador' | 'docente' | 'estudiante';

/**
 * Pantalla de entrada por rol. Elegir una opción NO concede permisos: cada botón lleva a la autenticación
 * real (personal: correo y contraseña; estudiante: código de un solo uso enviado al correo registrado).
 * Sin cuentas compartidas, contraseñas incrustadas ni inicio automático.
 */
@Component({
  selector: 'app-acceso-roles',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="acceso" aria-labelledby="titulo-acceso">
    <header class="cabecera">
      <img src="images/prisaly-logo.png" alt="PRISALY" class="logo" />
      <p class="lema">APRENDER · COMPRENDER · TRANSFORMAR</p>
      <h1 id="titulo-acceso">¿Cómo quieres ingresar?</h1>
      <p class="intro">Plataforma académica de simulación de casos situacionales</p>
    </header>

    <nav class="roles" aria-label="Tipo de acceso">
      <a class="rol" routerLink="/login" [queryParams]="{ perfil: 'administrador' }" data-prueba="acceso-administrador">
        <span class="icono" aria-hidden="true">🛡️</span>
        <span class="titulo">Ingresar como administrador</span>
        <span class="texto">Gestiona docentes, estudiantes, roles y permisos.</span>
        <span class="accion">Correo y contraseña →</span>
      </a>
      <a class="rol" routerLink="/login" [queryParams]="{ perfil: 'docente' }" data-prueba="acceso-docente">
        <span class="icono" aria-hidden="true">🎓</span>
        <span class="titulo">Ingresar como docente</span>
        <span class="texto">Crea casos y rúbricas, programa sesiones, convoca y evalúa.</span>
        <span class="accion">Correo y contraseña →</span>
      </a>
      <a class="rol" routerLink="/estudiante/acceso" data-prueba="acceso-estudiante">
        <span class="icono" aria-hidden="true">📘</span>
        <span class="titulo">Ingresar como estudiante</span>
        <span class="texto">Participa en tus sesiones y consulta tus resultados publicados.</span>
        <span class="accion">Código enviado a tu correo →</span>
      </a>
    </nav>

    @if (accesoQa) {
      <section class="qa" aria-labelledby="titulo-qa" data-prueba="acceso-rapido-qa">
        <h2 id="titulo-qa">Acceso rápido QA</h2>
        <p>Solo en este entorno local de pruebas. El servidor usa el login y el código oficiales con las cuentas ficticias de QA.</p>
        <div class="qa-botones">
          <button type="button" (click)="entrarQa('administrador')" [disabled]="enCurso() !== null" data-prueba="qa-administrador">
            {{ enCurso() === 'administrador' ? 'Ingresando…' : 'Administrador QA' }}
          </button>
          <button type="button" (click)="entrarQa('docente')" [disabled]="enCurso() !== null" data-prueba="qa-docente">
            {{ enCurso() === 'docente' ? 'Ingresando…' : 'Docente QA' }}
          </button>
          <button type="button" (click)="entrarQa('estudiante')" [disabled]="enCurso() !== null" data-prueba="qa-estudiante">
            {{ enCurso() === 'estudiante' ? 'Ingresando…' : 'Estudiante QA' }}
          </button>
        </div>
        @if (errorQa()) {
          <p class="qa-error" role="alert" data-prueba="qa-error">{{ errorQa() }}</p>
        }
      </section>
    }

    <p class="nota">
      Seleccionar una entrada no concede permisos: el servidor verifica tu identidad y tu rol en cada operación.
    </p>
  </main>`,
  styles: [
    `
      :host { display: block; min-height: 100vh; background: linear-gradient(160deg, #0b2447 0%, #19376d 55%, #2f5d8a 100%); }
      .acceso { max-width: 64rem; margin: 0 auto; padding: 3rem 1.5rem; font-family: var(--fuente-base); color: #fff; }
      .cabecera { text-align: center; margin-bottom: 2.5rem; }
      .logo { width: 9rem; height: auto; border-radius: 1rem; box-shadow: 0 10px 30px rgb(0 0 0 / 35%); }
      .lema { margin: 1.25rem 0 0.25rem; letter-spacing: 0.25em; font-size: 0.75rem; font-weight: 700; color: #f0b429; }
      h1 { margin: 0; font-size: 2.2rem; }
      .intro { margin: 0.5rem 0 0; opacity: 0.85; }
      .roles { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1.25rem; }
      .rol { display: flex; flex-direction: column; gap: 0.6rem; padding: 1.75rem 1.5rem; border-radius: 1rem; background: #fff; color: #1f2933; text-decoration: none; box-shadow: 0 8px 24px rgb(0 0 0 / 25%); border: 2px solid transparent; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }
      .rol:hover { transform: translateY(-4px); box-shadow: 0 14px 32px rgb(0 0 0 / 35%); border-color: #f0b429; }
      .rol:focus-visible { outline: 3px solid #f0b429; outline-offset: 3px; }
      .icono { font-size: 2.2rem; }
      .titulo { font-size: 1.25rem; font-weight: 800; color: #17314f; }
      .texto { color: #52606d; flex: 1; }
      .accion { font-weight: 700; color: #2f5d8a; }
      .qa { margin: 2rem auto 0; max-width: 40rem; padding: 1.25rem 1.5rem; border-radius: 1rem; background: rgb(255 255 255 / 10%); border: 1px dashed rgb(240 180 41 / 70%); text-align: center; }
      .qa h2 { margin: 0 0 0.25rem; font-size: 1.05rem; color: #f0b429; letter-spacing: 0.05em; }
      .qa p { margin: 0 0 1rem; font-size: 0.85rem; opacity: 0.85; }
      .qa-botones { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      .qa-botones button { cursor: pointer; padding: 0.6rem 1.1rem; border-radius: 0.5rem; border: 1px solid #f0b429; background: #f0b429; color: #0b2447; font-weight: 700; }
      .qa-botones button:disabled { opacity: 0.6; cursor: wait; }
      .qa-botones button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
      .qa-error { margin: 1rem 0 0; color: #ffd6d6; font-weight: 600; }
      .nota { margin-top: 2rem; text-align: center; font-size: 0.9rem; opacity: 0.8; }
    `,
  ],
})
export class AccesoRoles {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly memoria = inject(CredencialPersonalMemoria);
  private readonly router = inject(Router);

  /** Solo builds QA locales que lo declaren; el Backend además lo tiene desactivado por defecto. */
  protected readonly accesoQa = (environment as { accesoRapidoQa?: boolean }).accesoRapidoQa === true;
  protected readonly enCurso = signal<RolQa | null>(null);
  protected readonly errorQa = signal('');

  protected entrarQa(rol: RolQa): void {
    this.enCurso.set(rol);
    this.errorQa.set('');
    if (rol === 'estudiante') {
      // Si el navegador ya tiene una sesión estudiantil válida (cookie M1), no se pide otro código.
      this.http
        .get(construirUrlApi(this.api, 'v1/estudiantes/convocatorias'), { withCredentials: true })
        .subscribe({
          next: () => void this.router.navigate(['/estudiante/portal']),
          error: () =>
            this.http
              .post(construirUrlApi(this.api, 'v1/qa/acceso-rapido/estudiante'), null, { withCredentials: true })
              .subscribe({
                next: () => void this.router.navigate(['/estudiante/portal']),
                error: (e: { status?: number }) => this.fallo(e?.status),
              }),
        });
      return;
    }
    this.http
      .post<{ accessToken?: unknown }>(construirUrlApi(this.api, `v1/qa/acceso-rapido/personal/${rol}`), null)
      .subscribe({
        next: (r) => {
          if (typeof r?.accessToken !== 'string') return this.fallo();
          // El token lo emitió el login oficial; la sesión se confirma con GET /v1/personal/me al navegar.
          this.memoria.guardar(r.accessToken);
          void this.router.navigate(['/dashboard']);
        },
        error: (e: { status?: number }) => this.fallo(e?.status),
      });
  }

  private fallo(estado?: number): void {
    this.enCurso.set(null);
    this.errorQa.set(
      estado === 429
        ? 'Se alcanzó el límite oficial de códigos para esta cuenta (5 cada 15 minutos). Espera unos minutos y vuelve a intentarlo.'
        : estado === 503
          ? 'La credencial QA de esta cuenta no está configurada en el servidor local.'
          : 'No fue posible iniciar el acceso QA. Revisa que el entorno QA local esté en marcha y configurado.',
    );
  }
}
