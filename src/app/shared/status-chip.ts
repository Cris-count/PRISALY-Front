import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Availability } from '../core/api/catalog';

const LABEL: Readonly<Record<Availability, string>> = {
  disponible: 'Disponible',
  restringido: 'Restringido',
  pendiente: 'Pendiente',
};

@Component({
  selector: 'app-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="chip chip--{{ availability() }}" [attr.data-testid]="'chip-' + availability()">{{ label() }}</span>`,
})
export class StatusChip {
  readonly availability = input.required<Availability>();
  protected readonly label = computed(() => LABEL[this.availability()]);
}
