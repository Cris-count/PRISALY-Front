import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-acceso-roles',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main aria-labelledby="titulo-acceso">
    <h1 id="titulo-acceso">Acceso a PRISALY</h1>
    <p>Seleccionar una entrada no concede permisos. El Backend verifica tu identidad y tu rol.</p>
    <nav aria-label="Tipo de acceso">
      <a routerLink="/login" [queryParams]="{ perfil: 'administrador' }"
        >Ingresar como administrador</a
      >
      <a routerLink="/login" [queryParams]="{ perfil: 'docente' }">Ingresar como docente</a>
      <a routerLink="/estudiante/acceso">Ingresar como estudiante</a>
    </nav>
    <p>Personal: correo y contraseña. Estudiantes: código enviado al correo registrado.</p>
    <p>
      Las cuentas ficticias de QA utilizan la misma autenticación. No hay inicio automático ni
      cuentas compartidas.
    </p>
  </main>`,
  styles: [
    `
      main {
        max-width: 52rem;
        margin: 4rem auto;
        padding: 2rem;
        font-family: system-ui;
        color: #17314f;
      }
      nav {
        display: grid;
        gap: 1rem;
        margin: 2rem 0;
      }
      a {
        padding: 1rem;
        border: 2px solid #0755d9;
        border-radius: 0.5rem;
        color: #064aac;
      }
      a:focus-visible {
        outline: 3px solid #bf5900;
        outline-offset: 3px;
      }
    `,
  ],
})
export class AccesoRoles {}
