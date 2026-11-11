import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EndpointDef } from '../core/api/catalog';
import { StatusChip } from './status-chip';

// Card for one operation; shows the real route it calls and its availability.
@Component({
  selector: 'app-panel',
  imports: [StatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" [attr.data-testid]="testId()">
      <header class="panel__head">
        <h2>{{ title() }}</h2>
        @if (endpoint(); as route) {
          <app-status-chip [availability]="route.availability" />
        }
      </header>
      @if (endpoint(); as route) {
        <p class="panel__route">
          <span class="method method--{{ route.method.toLowerCase() }}">{{ route.method }}</span>
          <code>{{ route.path }}</code>
          @if (route.note.length > 0) {
            <span class="panel__note">{{ route.note }}</span>
          }
        </p>
      }
      <ng-content />
    </section>
  `,
})
export class Panel {
  readonly title = input.required<string>();
  readonly endpoint = input.required<EndpointDef | null>();
  readonly testId = input.required<string>();
}
