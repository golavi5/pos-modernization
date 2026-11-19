import {
  DocumentStatus,
  EmissionDocument,
  EmissionPort,
  EmissionTransientError,
  EmitResult,
  PdfResult,
  StatusLookup,
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

  async getStatus(type: 'invoice' | 'pos', prefix: string, number: number, opts: StatusLookup = {}): Promise<DocumentStatus | null> {
    const base = type === 'invoice' ? 'api/billing/invoice' : 'api/equivalent/pos';
    const by = opts.cufe ? `by=cude&value=${encodeURIComponent(opts.cufe)}` : `by=number&value=${encodeURIComponent(`${prefix}${number}`)}`;
    const res = await this.call('GET', `${base}/one?${by}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new EmissionTransientError(`Provider HTTP ${res.status}`, res.status);
    const body = parseJsonObject(res.raw);
    // Another resolution of the same account can own the same prefix+number: only accept a document that is ours.
    const data = body?.data as Record<string, unknown> | undefined;
    if (!opts.cufe && data) {
      if (typeof data.resolution_number === 'string' && opts.resolution && data.resolution_number !== opts.resolution) return null;
      if (typeof data.prefix === 'string' && data.prefix !== prefix) return null;
      // A stale document can sit on the number we want (sandbox: a 2024 `Error` document at EPOS1). Ours cannot predate our first attempt.
      if (opts.notBefore && typeof data.date === 'string') {
        const at = new Date(`${data.date}T${typeof data.time === 'string' ? data.time : '00:00:00'}-05:00`); // Colombia, UTC-5
        if (!Number.isNaN(at.getTime()) && at.getTime() < opts.notBefore.getTime() - 60_000) return null;
      }
    }
    return parseStatusResponse(body);
  }

  /** VERIFY: ApiFacturame sends the raw key (no `Bearer`) to a fixed host in production for this call; this uses Bearer everywhere until a sandbox run proves otherwise. */
  async getPdf(cude: string): Promise<PdfResult> {
    const res = await this.call('GET', `api/billing/invoice/pdf/${encodeURIComponent(cude)}`);
    const body = parseJsonObject(res.raw);
    if (!res.ok || typeof body?.data !== 'string') throw new EmissionTransientError(`PDF unavailable (HTTP ${res.status})`, res.status);
    return { base64: body.data, filename: typeof body.filename === 'string' ? body.filename : `${cude}.pdf` };
  }

  /**
   * Next free number of the range for `prefix` in `resolution`. A resolution can hold several
   * ranges with the same prefix (seen in the sandbox: an exhausted 1..1,000,000 range next to the
   * live 1..1000 one), so exhausted ranges are skipped and more than one live range is an error:
   * guessing would send a number outside the range.
   */
  async nextNumber(resolution: string, prefix: string): Promise<number> {
    const res = await this.call('GET', `api/billing/resolution/remaining-numbers/${encodeURIComponent(resolution)}`);
    if (!res.ok) throw new EmissionTransientError(`Provider HTTP ${res.status}`, res.status);
    type Range = { from?: unknown; to?: unknown; remaining?: unknown; invoice?: { prefix?: string; number?: unknown } };
    const list = parseJsonObject(res.raw)?.data;
    const sameRanges = (Array.isArray(list) ? (list as Range[]) : []).filter((x) => x?.invoice?.prefix === prefix);
    if (sameRanges.length === 0) throw new Error(`No numbering found for prefix ${prefix} in resolution ${resolution}`);
    const live = sameRanges.filter((x) => x.remaining !== 0 && !(Number(x.invoice?.number) >= Number(x.to)));
    if (live.length === 0) throw new Error(`Numbering exhausted for prefix ${prefix} in resolution ${resolution}`);
    if (live.length > 1) throw new Error(`More than one live range for prefix ${prefix} in resolution ${resolution}: use a prefix that identifies one range`);
    const { invoice, from } = live[0];
    // `number: null` = no number used yet in the range: start at its first number (seen in the sandbox).
    const next = invoice?.number == null ? Number(from) : Number(invoice.number) + 1;
    if (!Number.isFinite(next)) throw new Error(`Unreadable numbering for prefix ${prefix} in resolution ${resolution}`);
    return next;
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
