import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ApiResult } from '../core/api/api-client.service';
import { KIND_LABEL } from '../core/api/errors';
import { sanitize } from '../core/api/sanitize';

interface ResultViewModel {
  readonly ok: boolean;
  readonly cssClass: string;
  readonly status: string;
  readonly line: string;
  readonly durationMs: number;
  readonly kindLabel: string | null;
  readonly code: string | null;
  readonly message: string | null;
  readonly body: string | null;
}

function toViewModel(result: ApiResult<unknown>): ResultViewModel {
  const { meta } = result;
  const common = {
    status: meta.status === 0 ? 'sin respuesta' : String(meta.status),
    line: `${meta.method} ${meta.url}`,
    durationMs: meta.durationMs,
  };
  if (result.ok) {
    return {
      ...common,
      ok: true,
      cssClass: 'result result--ok',
      kindLabel: null,
      code: null,
      message: null,
      body: result.data === null ? null : JSON.stringify(sanitize(result.data), null, 2),
    };
  }
  return {
    ...common,
    ok: false,
    cssClass: `result result--error result--${result.error.kind}`,
    kindLabel: KIND_LABEL[result.error.kind],
    code: result.error.code,
    message: result.error.message,
    body: null,
  };
}

// Outcome of one call: success body or the normalized error, plus status and timing.
@Component({
  selector: 'app-result-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as vm) {
      <div [class]="vm.cssClass" [attr.data-testid]="testId()" [attr.role]="vm.ok ? 'status' : 'alert'">
        <p class="result__line">
          <strong [attr.data-testid]="testId() + '-status'">{{ vm.status }}</strong>
          <span>{{ vm.line }}</span>
          <span class="result__time">{{ vm.durationMs }} ms</span>
        </p>
        @if (vm.kindLabel !== null) {
          <p class="result__message">
            <strong>{{ vm.kindLabel }}</strong>
            @if (vm.code !== null) {
              <code>{{ vm.code }}</code>
            }
            <span>{{ vm.message }}</span>
          </p>
        }
        @if (vm.body !== null) {
          <pre class="result__body">{{ vm.body }}</pre>
        }
      </div>
    }
  `,
})
export class ResultView {
  readonly result = input.required<ApiResult<unknown> | null>();
  readonly testId = input.required<string>();
  protected readonly view = computed(() => {
    const result = this.result();
    return result === null ? null : toViewModel(result);
  });
}
