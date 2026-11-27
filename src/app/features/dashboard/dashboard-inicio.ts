import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvisoAccesoPersonal } from '../autenticacion/aviso-acceso-personal';
import { PanelAdministracionM1 } from '../academico/panel-administracion-m1';
import { MAPEO_RUTAS_PERSONAL } from '../autenticacion/m1-mapeo-rutas';
import { M1_PERSONAL_LOCAL } from '../autenticacion/m1-personal-http';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { NAVEGACION_PRESENTACION, seccionesPorRol } from './navegacion-rol';

@Component({
  selector: 'app-dashboard-inicio',
  imports: [RouterLink, AvisoAccesoPersonal, PanelAdministracionM1],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-inicio.html',
  styleUrls: ['./dashboard-inicio.css', './dashboard-inicio-escena.css'],
})
export class DashboardInicio {
  protected readonly identidad = computed(() => {
    const e = this.sesion?.estado();
    return e?.tipo === 'valida' ? e.identidad : null;
  });
  protected readonly sinPermisos = computed(() => {
    const u = this.identidad();
    return !!u && u.rol !== 'ADMINISTRADOR' && this.secciones().length === 0;
  });

  private readonly sesion = inject(M1_PERSONAL_LOCAL) ? inject(SesionPersonalM1) : null;
  private readonly mapeo = inject(MAPEO_RUTAS_PERSONAL);
  /** DC-FE-UX-ROLES-24: mismas secciones que el menú lateral según la identidad de `/me`. */
  protected readonly secciones = computed(() =>
    this.sesion ? seccionesPorRol(this.sesion.estado(), this.mapeo) : NAVEGACION_PRESENTACION,
  );
  /**
   * FE-UX-04B: accesos principales del Inicio. Para el administrador, la gestión de usuarios se desdobla en sus tres
   * vistas reales (Docentes, Estudiantes, Roles y permisos), que abren su pestaña con `?vista=`. El menú lateral no
   * cambia y no se añade ninguna ruta ni permiso: solo enlaces a la misma página ya autorizada.
   */
  protected readonly accesos = computed<readonly AccesoInicio[]>(() =>
    this.secciones().flatMap((s) =>
      this.identidad()?.rol === 'ADMINISTRADOR' && s.ruta === 'usuarios-docentes'
        ? VISTAS_ADMINISTRACION.map((v) => ({ ...s, ...v, ruta: s.ruta }))
        : [{ ...s, vista: null }],
    ),
  );
}

interface AccesoInicio {
  readonly ruta: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly icono: string;
  readonly vista: 'docentes' | 'estudiantes' | 'permisos' | null;
}

const VISTAS_ADMINISTRACION: readonly Omit<AccesoInicio, 'ruta'>[] = [
  {
    vista: 'docentes',
    titulo: 'Docentes',
    descripcion: 'Registra docentes, consulta su estado y gestiona su activación.',
    icono: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M19 8v6M22 11h-6',
  },
  {
    vista: 'estudiantes',
    titulo: 'Estudiantes',
    descripcion: 'Consulta las cuentas de estudiantes y su acceso por código.',
    icono: 'M2 9 12 4l10 5-10 5L2 9M6 11v6c4 3 8 3 12 0v-6M22 9v8',
  },
  {
    vista: 'permisos',
    titulo: 'Roles y permisos',
    descripcion: 'Consulta los roles y asigna permisos a cada cuenta.',
    icono: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3zM9 12l2 2 4-4',
  },
];
