import {
  DocumentStatus,
  EmissionDocument,
  EmissionPort,
  EmissionTransientError,
  EmitResult,
  PdfResult,
} from '../emission.types';
import { REQUEST_TIMEOUT_MS } from './plemsi.constants';
import { PLEMSI_EMIT_PATH, buildPayload } from './plemsi.payload';
import {
  parseEmitHttpError,
  parseEmitResponse,
  parseJsonObject,
  parseStatusResponse,
} from './plemsi.response';

export interface PlemsiAdapterOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

/**
 * EmissionPort over Plemsi. Never logs payloads, responses or the token. No retry
 * or backoff here: the outbox worker (SPEC-FISC-003 T-05) owns that.
 */
export class PlemsiAdapter extends EmissionPort {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly opts: PlemsiAdapterOptions) {
    super();
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? (() => new Date());
  }

  async emit(doc: EmissionDocument): Promise<EmitResult> {
    const issuedAt = this.now();
    const res = await this.call('POST', PLEMSI_EMIT_PATH[doc.type], buildPayload(doc, issuedAt));
    const parsed = res.ok ? parseEmitResponse(parseJsonObject(res.raw)) : parseEmitHttpError(res.status, res.raw);
    return parsed.outcome === 'submitted' ? { ...parsed, issuedAt } : parsed;
  }

  async getStatus(type: 'invoice' | 'pos', prefix: string, number: number): Promise<DocumentStatus | null> {
    const base = type === 'invoice' ? 'api/billing/invoice' : 'api/equivalent/pos';
    const res = await this.call('GET', `${base}/one?by=number&value=${encodeURIComponent(`${prefix}${number}`)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new EmissionTransientError(`Provider HTTP ${res.status}`, res.status);
    return parseStatusResponse(parseJsonObject(res.raw));
  }

  /** VERIFY: ApiFacturame sends the raw key (no `Bearer`) to a fixed host in production for this call; this uses Bearer everywhere until a sandbox run proves otherwise. */
  async getPdf(cude: string): Promise<PdfResult> {
    const res = await this.call('GET', `api/billing/invoice/pdf/${encodeURIComponent(cude)}`);
    const body = parseJsonObject(res.raw);
    if (!res.ok || typeof body?.data !== 'string') throw new EmissionTransientError(`PDF unavailable (HTTP ${res.status})`, res.status);
    return { base64: body.data, filename: typeof body.filename === 'string' ? body.filename : `${cude}.pdf` };
  }

  async nextNumber(resolution: string, prefix: string): Promise<number> {
    const res = await this.call('GET', `api/billing/resolution/remaining-numbers/${encodeURIComponent(resolution)}`);
    if (!res.ok) throw new EmissionTransientError(`Provider HTTP ${res.status}`, res.status);
    const list = parseJsonObject(res.raw)?.data;
    const hit = Array.isArray(list)
      ? list.find((x) => (x as { invoice?: { prefix?: string } })?.invoice?.prefix === prefix)
      : undefined;
    const n = Number((hit as { invoice?: { number?: unknown } } | undefined)?.invoice?.number);
    if (!hit || !Number.isFinite(n)) throw new Error(`No numbering found for prefix ${prefix} in resolution ${resolution}`);
    return n + 1;
  }

  private async call(method: 'GET' | 'POST', path: string, body?: object): Promise<{ ok: boolean; status: number; raw: string }> {
    try {
      const res = await this.fetchImpl(`${this.opts.baseUrl}/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.opts.token}`,
          Accept: 'application/json',
          'Accept-Language': 'es',
          ...(body && { 'Content-Type': 'application/json' }),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return { ok: res.ok, status: res.status, raw: await res.text() };
    } catch (e) {
      // Name only: the message of a fetch error may echo the URL, never the token or payload.
      throw new EmissionTransientError(`Provider unreachable (${(e as Error).name})`);
    }
  }
}
