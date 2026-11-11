import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TokenStore } from './core/auth/token.store';

interface NavLink {
  readonly path: string;
  readonly label: string;
  readonly tag: string;
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly tokens = inject(TokenStore);
  protected readonly links: readonly NavLink[] = [
    { path: '/', label: 'Inicio', tag: 'A' },
    { path: '/personal', label: 'Personal', tag: 'B' },
    { path: '/casos', label: 'Casos · M3', tag: 'C' },
    { path: '/sesiones', label: 'Sesiones · M4', tag: 'D' },
    { path: '/acceso-estudiantil', label: 'Acceso estudiantil', tag: 'E' },
    { path: '/participacion', label: 'Participación · M5/M6', tag: 'F' },
    { path: '/diagnostico', label: 'Diagnóstico', tag: 'G' },
  ];
}
