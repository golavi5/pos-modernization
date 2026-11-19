import { EmissionOutbox } from '../outbox/outbox.entity';
import { colombiaDate, toLedgerEntry } from './sales-ledger.mapper';

const line = (over: object) => ({ code: 'A', description: 'A', quantity: 1, unitPrice: 0, ivaRate: 0, subtotal: 0, ivaAmount: 0, total: 0, ...over });
const row = (over: Partial<EmissionOutbox>): EmissionOutbox =>
  ({ id: 'o1', company_id: 'c1', document_type: 'pos', prefix: 'POS', number: 5, cufe: 'cufe', issued_at: new Date('2026-11-19T15:00:00Z'), draft: null, ...over }) as EmissionOutbox;

describe('colombiaDate', () => {
  it('uses the Colombia calendar day (UTC-5), not the UTC one', () => {
    expect(colombiaDate(new Date('2026-11-19T03:30:00Z'))).toBe('2026-11-18');
    expect(colombiaDate(new Date('2026-11-19T05:00:00Z'))).toBe('2026-11-19');
    expect(colombiaDate(new Date('2026-11-19T04:59:59Z'))).toBe('2026-11-18');
  });
});

describe('toLedgerEntry', () => {
  const lines = [
    line({ ivaRate: 19, subtotal: 2000, ivaAmount: 380, total: 2380 }),
    line({ ivaRate: 5, subtotal: 1000, ivaAmount: 50, total: 1050 }),
    line({ ivaRate: 0, subtotal: 500, total: 500 }),
    line({ subtotal: 0, total: 150, bagTax: { perUnit: 50, total: 150 } }),
  ];

  it('takes the document own figures: one tax total per rate, bag tax included in tax_total', () => {
    const e = toLedgerEntry(row({ draft: { lines } }), new Date());
    expect(e).toMatchObject({ base_total: 3500, tax_total: 580, total: 4080, sign: 1, document_type: 'pos', prefix: 'POS', number: 5, cufe: 'cufe', buyer_identification: null, buyer_name: null });
    expect((e.tax_breakdown as { percent: number; tax_id: number }[]).map((t) => [t.tax_id, t.percent])).toEqual([[1, 5], [1, 19], [10, 0], [1, 0]]);
  });

  it('dates the entry by the send moment in Colombia time', () => {
    expect(toLedgerEntry(row({ draft: { lines }, issued_at: new Date('2026-11-19T03:30:00Z') }), new Date()).issue_date).toBe('2026-11-18');
  });

  it('falls back to the given moment when the send moment is unknown', () => {
    const e = toLedgerEntry(row({ draft: { lines }, issued_at: null }), new Date('2026-01-01T12:00:00Z'));
    expect(e.issued_at).toEqual(new Date('2026-01-01T12:00:00Z'));
    expect(e.issue_date).toBe('2026-01-01');
  });

  it('invoice: carries the buyer; credit note: negative sign; final consumer: no buyer', () => {
    const buyer = { identificationNumber: '900123456', name: 'ACME SAS' };
    const inv = toLedgerEntry(row({ document_type: 'invoice', draft: { lines, buyer, sendEmail: false } as never }), new Date());
    expect(inv).toMatchObject({ buyer_identification: '900123456', buyer_name: 'ACME SAS', sign: 1 });
    const cn = toLedgerEntry(row({ document_type: 'credit_note', draft: { lines, buyer: null, sendEmail: false } as never }), new Date());
    expect(cn).toMatchObject({ buyer_identification: null, sign: -1, total: 4080 });
  });
});
