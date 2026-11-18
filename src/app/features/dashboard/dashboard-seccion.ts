import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DashboardSeccion } from './dashboard-secciones';

@Component({
  selector: 'app-dashboard-seccion',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-configuracion.html',
  styleUrls: [
    './dashboard-page.css',
    './dashboard-modulos.css',
    './dashboard-configuracion.css',
    './dashboard-configuracion-paneles.css',
  ],
})
export class DashboardSeccionPage {
  protected readonly categorias = [
    {
      titulo: 'General',
      texto: 'Ajusta la información básica de PRISALY.',
      tono: 'azul',
      icono:
        'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4',
    },
    {
      titulo: 'Roles y permisos',
      texto: 'Define los roles, accesos y privilegios de usuario.',
      tono: 'naranja',
      icono: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z',
    },
    {
      titulo: 'Parámetros académicos',
      texto: 'Configura periodos, áreas, programas y asignaturas.',
      tono: 'violeta',
      icono: 'M2 9 12 4l10 5-10 5L2 9M6 11v6c4 3 8 3 12 0v-6M22 9v8',
    },
    {
      titulo: 'Escenarios',
      texto: 'Administra los escenarios previstos: hospital, fiscalía, policía y universidad.',
      tono: 'verde',
      icono: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    },
    {
      titulo: 'Integraciones',
      texto: 'Conecta PRISALY con servicios externos: correo, notificaciones y API.',
      tono: 'cian',
      icono: 'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6',
    },
    {
      titulo: 'Datos y seguridad',
      texto: 'Gestiona copias de seguridad, restauración y políticas de acceso.',
      tono: 'violeta',
      icono: 'M3 6a9 4 0 1 0 18 0 9 4 0 1 0-18 0M3 6v12a9 4 0 0 0 18 0V6M3 12a9 4 0 0 0 18 0',
    },
  ] as const;
  protected readonly preferencias = [
    'Notificaciones por correo',
    'Registro de nuevos usuarios',
    'Seguimiento y estadísticas',
    'Autenticación en dos pasos (2FA)',
  ];
  private readonly ruta = inject(ActivatedRoute);
  protected readonly seccion = toSignal(
    this.ruta.data.pipe(map((data) => data['seccion'] as DashboardSeccion)),
    {
      initialValue: this.ruta.snapshot.data['seccion'] as DashboardSeccion,
    },
  );
}
