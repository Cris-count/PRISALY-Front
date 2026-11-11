import { Injectable, signal } from '@angular/core';

// Cases created during this tab (there is no GET route to list them from the server).
@Injectable({ providedIn: 'root' })
export class CasosCreadosStore {
  private readonly ids = signal<readonly string[]>([]);

  readonly casos = this.ids.asReadonly();

  add(idCaso: string): void {
    this.ids.update((previous) => [idCaso, ...previous]);
  }
}
