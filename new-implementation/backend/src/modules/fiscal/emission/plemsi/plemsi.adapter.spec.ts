import { EmissionDocument, EmissionTransientError } from '../emission.types';
import { PlemsiAdapter } from './plemsi.adapter';

const TOKEN = 'tok_secret_value';
const doc: EmissionDocument = {
  type: 'pos', prefix: 'POS', number: 7, resolution: '123',
  softwareManufacturer: { ownerName: 'O', softwareName: 'S', companyName: 'C' },
  lines: [{ code: '1', description: 'A', quantity: 1, unitPrice: 1190, ivaRate: 19, subtotal: 1000, ivaAmount: 190, total: 1190 }],
};

type Call = { url: string; init: RequestInit };
function make(responder: (c: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const c = { url, init };
    calls.push(c);
    return responder(c);
  }) as unknown as typeof fetch;
  const adapter = new PlemsiAdapter({ baseUrl: 'https://plemsi.test', token: TOKEN, fetchImpl, now: () => new Date('2026-11-19T15:00:00Z') });
  return { adapter, calls };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('PlemsiAdapter', () => {
  it('POSTs the document to the type-specific path with Bearer auth and a timeout', async () => {
    const { adapter, calls } = make(() => json({ success: true, data: { cude: 'c1', QRCode: 'q1' } }, 201));
    const r = await adapter.emit(doc);
    expect(r).toEqual({ outcome: 'submitted', cude: 'c1', qr: 'q1', verdict: 'pending', reason: null });
    expect(calls[0].url).toBe('https://plemsi.test/api/equivalent/pos');
    expect(calls[0].init.method).toBe('POST');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({ prefix: 'POS', number: 7, date: '11/19/2026', time: '10:00:00' });
  });

  it('routes invoice and credit note to their own endpoints', async () => {
    const { adapter, calls } = make(() => json({ success: true, data: {} }));
    await adapter.emit({ ...doc, type: 'invoice', buyer: null, sendEmail: false } as EmissionDocument);
    await adapter.emit({ ...doc, type: 'credit_note', buyer: null, sendEmail: false, reference: { number: 'A1', cufe: 'c', issueDate: '2026-01-01' }, discrepancyCode: 2, discrepancyDescription: 'd' } as EmissionDocument);
    expect(calls.map((c) => c.url)).toEqual(['https://plemsi.test/api/billing/invoice', 'https://plemsi.test/api/billing/credit']);
  });

  it('a payload rejection comes back as a result, not an exception', async () => {
    const { adapter } = make(() => json({ success: false, info: 'bad', data: { message: 'DV', errors: { a: ['b'] } }, errCode: 'EFVE014' }, 500));
    expect(await adapter.emit(doc)).toEqual({ outcome: 'payload_rejected', reason: 'DV' });
  });

  it.each([502, 503, 401])('HTTP %s is transient', async (status) => {
    const { adapter } = make(() => new Response('', { status }));
    await expect(adapter.emit(doc)).rejects.toBeInstanceOf(EmissionTransientError);
  });

  it('a network failure is transient and never leaks the token or payload', async () => {
    const { adapter } = make(() => {
      throw Object.assign(new Error(`connect failed to https://x with ${TOKEN}`), { name: 'TypeError' });
    });
    const err = await adapter.emit(doc).catch((e) => e);
    expect(err).toBeInstanceOf(EmissionTransientError);
    expect(err.message).not.toContain(TOKEN);
    expect(err.message).not.toContain('POS');
  });

  it('getStatus queries by number and maps the state', async () => {
    const { adapter, calls } = make(() => json({ data: { state: 'Emitted', cude: 'c', QRStr: 'q' } }));
    expect(await adapter.getStatus('pos', 'POS', 7)).toMatchObject({ verdict: 'accepted', cude: 'c', qr: 'q' });
    expect(calls[0].url).toBe('https://plemsi.test/api/equivalent/pos/one?by=number&value=POS7');
    await adapter.getStatus('invoice', 'SETP', 9);
    expect(calls[1].url).toBe('https://plemsi.test/api/billing/invoice/one?by=number&value=SETP9');
  });

  it('getStatus returns null on 404 (document unknown to the provider) and is transient on 5xx', async () => {
    expect(await make(() => new Response('', { status: 404 })).adapter.getStatus('pos', 'POS', 1)).toBeNull();
    await expect(make(() => new Response('', { status: 502 })).adapter.getStatus('pos', 'POS', 1)).rejects.toBeInstanceOf(EmissionTransientError);
  });

  it('getPdf returns base64 and filename; failure is transient', async () => {
    const ok = make(() => json({ data: 'JVBERi0=', filename: 'f.pdf' }));
    expect(await ok.adapter.getPdf('abc def')).toEqual({ base64: 'JVBERi0=', filename: 'f.pdf' });
    expect(ok.calls[0].url).toBe('https://plemsi.test/api/billing/invoice/pdf/abc%20def');
    const bad = make(() => json({ info: 'x' }, 404));
    await expect(bad.adapter.getPdf('x')).rejects.toBeInstanceOf(EmissionTransientError);
  });

  it('nextNumber is the last used number of the matching prefix plus one', async () => {
    const { adapter, calls } = make(() => json({ data: [{ invoice: { prefix: 'FE', number: 10 } }, { invoice: { prefix: 'SETP', number: 41 } }] }));
    expect(await adapter.nextNumber('18760', 'SETP')).toBe(42);
    expect(calls[0].url).toBe('https://plemsi.test/api/billing/resolution/remaining-numbers/18760');
    await expect(adapter.nextNumber('18760', 'ZZ')).rejects.toThrow('No numbering found');
  });
});
