import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiClient, ApiResult } from '../../core/api/api-client.service';
import { EndpointDef, allEndpoints } from '../../core/api/catalog';
import { KIND_LABEL } from '../../core/api/errors';
import { RequestLog } from '../../core/api/request-log.service';
import { TokenStore } from '../../core/auth/token.store';
import { Panel } from '../../shared/panel';
import { ResultView } from '../../shared/result-view';

const CALLABLE: readonly EndpointDef[] = allEndpoints.filter((endpoint) => endpoint.availability !== 'pendiente');

function paramNames(path: string): string[] {
  return [...path.matchAll(/:([A-Za-z]+)/g)].map((match) => match[1] ?? '');
}

type ParsedBody = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly message: string };

function parseBody(text: string): ParsedBody {
  if (text.trim().length === 0) {
    return { ok: true, value: null };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'JSON no válido' };
  }
}

// Screen G: request log plus a tester restricted to routes that exist in the catalog.
@Component({
  selector: 'app-diagnostico',
  imports: [FormsModule, JsonPipe, Panel, ResultView],
  templateUrl: './diagnostico.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Diagnostico {
  private readonly api = inject(ApiClient);
  protected readonly log = inject(RequestLog);
  protected readonly tokens = inject(TokenStore);

  protected readonly apiUrl = environment.apiUrl;
  protected readonly callable = CALLABLE;
  protected readonly kindLabel = KIND_LABEL;

  protected readonly endpointId = signal<string>(CALLABLE[0]?.id ?? '');
  protected readonly params = signal<Readonly<Record<string, string>>>({});
  protected readonly bodyText = signal('');
  protected readonly useToken = signal(true);
  protected readonly loading = signal(false);
  protected readonly result = signal<ApiResult<unknown> | null>(null);
  protected readonly inputError = signal<string | null>(null);

  protected readonly endpoint = computed(() => CALLABLE.find((item) => item.id === this.endpointId()) ?? null);
  protected readonly names = computed(() => {
    const endpoint = this.endpoint();
    return endpoint === null ? [] : paramNames(endpoint.path);
  });
  protected readonly acceptsBody = computed(() => {
    const endpoint = this.endpoint();
    return endpoint !== null && endpoint.method !== 'GET';
  });

  protected selectEndpoint(id: string): void {
    this.endpointId.set(id);
    this.params.set({});
    this.bodyText.set('');
    this.result.set(null);
    this.inputError.set(null);
  }

  protected setParam(name: string, value: string): void {
    this.params.update((previous) => ({ ...previous, [name]: value }));
  }

  protected async send(): Promise<void> {
    const endpoint = this.endpoint();
    if (endpoint === null) {
      return;
    }
    const body: ParsedBody = this.acceptsBody() ? parseBody(this.bodyText()) : { ok: true, value: null };
    if (!body.ok) {
      this.inputError.set(`Cuerpo JSON no válido: ${body.message}`);
      return;
    }
    const missing = this.names().filter((name) => (this.params()[name] ?? '').trim().length === 0);
    if (missing.length > 0) {
      this.inputError.set(`Faltan parámetros de ruta: ${missing.join(', ')}`);
      return;
    }
    this.inputError.set(null);
    this.loading.set(true);
    try {
      this.result.set(await this.api.request<unknown>(endpoint, this.params(), body.value, this.useToken()));
    } finally {
      this.loading.set(false);
    }
  }
}
