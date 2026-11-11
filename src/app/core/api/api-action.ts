import { signal } from '@angular/core';
import { ApiResult } from './api-client.service';

// Loading flag and last result of one UI operation.
export class ApiAction<T> {
  readonly loading = signal(false);
  readonly result = signal<ApiResult<T> | null>(null);

  async run(call: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    this.loading.set(true);
    try {
      const outcome = await call();
      this.result.set(outcome);
      return outcome;
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void {
    this.result.set(null);
  }
}
