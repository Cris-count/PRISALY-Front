import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PendingOperation } from '../core/api/catalog';
import { StatusChip } from './status-chip';

@Component({
  selector: 'app-pending-list',
  imports: [StatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="pending" data-testid="pending-list">
      @for (operation of operations(); track operation.label) {
        <li>
          <app-status-chip availability="pendiente" />
          <div>
            <strong>{{ operation.label }}</strong>
            <span>{{ operation.reason }}</span>
          </div>
        </li>
      }
    </ul>
  `,
})
export class PendingList {
  readonly operations = input.required<readonly PendingOperation[]>();
}
