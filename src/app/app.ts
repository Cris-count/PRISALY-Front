import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private pantallaCompleta(url: string): boolean {
    const ruta = url.split(/[?#]/)[0];
    return (
      ruta === '/' || ruta === '/login' || ruta === '/dashboard' || ruta.startsWith('/dashboard/')
    );
  }

  protected readonly esPantallaCompleta = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => this.pantallaCompleta(event.urlAfterRedirects)),
    ),
    { initialValue: this.pantallaCompleta(this.router.url) },
  );
}
