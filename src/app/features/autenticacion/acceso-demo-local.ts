import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SesionDemoLocal, UsuarioDemoLocal } from './usuarios-demo-locales';

/** Lista vacía en producción y en QA. Development y demo traen las tres cuentas locales. */
export const USUARIOS_DEMO = new InjectionToken<readonly UsuarioDemoLocal[]>('USUARIOS_DEMO', {
  providedIn: 'root',
  factory: () => environment.usuariosDemo,
});

@Injectable({ providedIn: 'root' })
export class AccesoDemoLocal {
  private readonly interno = signal<SesionDemoLocal | null>(null);
  readonly actual = this.interno.asReadonly();

  entrar(usuario: UsuarioDemoLocal): void {
    this.interno.set({
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
      espacio: usuario.espacio,
      permisos: usuario.permisos,
    });
  }

  salir(): void {
    this.interno.set(null);
  }

  esPersonal(): boolean {
    const rol = this.interno()?.rol;
    return rol === 'ADMINISTRADOR' || rol === 'DOCENTE';
  }
}

export function inyectarUsuariosDemo(): readonly UsuarioDemoLocal[] {
  return inject(USUARIOS_DEMO);
}
