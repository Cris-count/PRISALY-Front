import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
      .nota { margin-top: 2rem; text-align: center; font-size: 0.9rem; opacity: 0.8; }
    `,
  ],
})
export class AccesoRoles {}
