import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AccesoDemoLocal } from '../autenticacion/acceso-demo-local';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';

/**
 * Pantallas de preparación FE-59. No consultan agregados ni envían identidades.
 * En QA el guard las deja fuera; en demostración solo explican el bloqueo.
 */
@Component({
  selector: 'app-preparacion-institucional',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preparacion-institucional.html',
  styleUrl: './dashboard-page.css',
})
export class PreparacionInstitucional {
  private readonly qa = inject(M1_PERSONAL_LOCAL);
  private readonly sesion = this.qa ? inject(SesionPersonalM1) : null;
  private readonly demo = inject(AccesoDemoLocal);

  protected readonly perfil = computed(() => {
    const estado = this.sesion?.estado();
    if (estado?.tipo === 'valida') {
      return {
        nombre: estado.identidad.nombre,
        correo: estado.identidad.correo,
        rol: estado.identidad.rol,
        origen: 'Sesión de personal confirmada',
      };
    }
    const local = this.demo.actual();
    if (!local) return null;
    return {
      nombre: local.nombre,
      correo: local.correo,
      rol: local.rol,
      origen: 'Presentación local, sin token',
    };
  });

  protected readonly tipo = toSignal(
    inject(ActivatedRoute).data.pipe(map((datos) => datos['preparacion'] as string)),
    { initialValue: '' },
  );
}
