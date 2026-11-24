import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccesoDemoLocal } from '../autenticacion/acceso-demo-local';
import { AvisoAccesoPersonal } from '../autenticacion/aviso-acceso-personal';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { DASHBOARD_NAVEGACION } from './dashboard-secciones';
import { EntradaExperiencia, menuDeRol } from './experiencias-navegacion';

@Component({
  selector: 'app-dashboard-inicio',
  imports: [RouterLink, AvisoAccesoPersonal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-inicio.html',
  styleUrls: ['./dashboard-inicio.css', './dashboard-inicio-escena.css'],
})
export class DashboardInicio {
  protected readonly secciones = DASHBOARD_NAVEGACION;
  private readonly qa = inject(M1_PERSONAL_LOCAL);
  private readonly sesion = this.qa ? inject(SesionPersonalM1) : null;
  private readonly demo = inject(AccesoDemoLocal);

  protected readonly menu = computed((): readonly EntradaExperiencia[] | null => {
    const estado = this.sesion?.estado();
    if (this.qa && estado?.tipo === 'valida') return menuDeRol(estado.identidad.rol);
    const rol = this.demo.actual()?.rol;
    if (rol === 'ADMINISTRADOR' || rol === 'DOCENTE') return menuDeRol(rol);
    return null;
  });

  protected readonly nombre = computed(() => {
    const estado = this.sesion?.estado();
    if (estado?.tipo === 'valida') return estado.identidad.nombre;
    return this.demo.actual()?.nombre ?? '';
  });

  protected readonly indicadores = [
    'Usuarios',
    'Docentes',
    'Estudiantes',
    'Casos académicos',
    'Sesiones',
    'Convocatorias',
  ] as const;
}
