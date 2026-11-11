import { Injectable, signal } from '@angular/core';
import { HttpMethod } from './catalog';
import { ApiErrorKind } from './errors';

// One sanitized entry per API call, shown in the diagnostics screen.
export interface RequestRecord {
  readonly seq: number;
  readonly at: string;
  readonly endpointId: string;
  readonly method: HttpMethod;
  readonly url: string;
  readonly status: number;
  readonly durationMs: number;
  readonly withToken: boolean;
  readonly errorKind: ApiErrorKind | null;
  readonly requestBody: unknown;
  readonly responseBody: unknown;
}

const LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class RequestLog {
  private readonly entries = signal<readonly RequestRecord[]>([]);
  private seq = 0;

  readonly records = this.entries.asReadonly();

  nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  add(record: RequestRecord): void {
    this.entries.update((previous) => [record, ...previous].slice(0, LIMIT));
  }

  clear(): void {
    this.entries.set([]);
  }
}
