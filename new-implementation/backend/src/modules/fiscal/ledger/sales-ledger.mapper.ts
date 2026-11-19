import { COLOMBIA_TZ } from '../emission/plemsi/plemsi.constants';
import { buildAllTaxTotals, buildHeaderTotals } from '../emission/plemsi/plemsi.items';
import { EmissionOutbox } from '../outbox/outbox.entity';
import { InvoiceDraft } from '../outbox/outbox.types';
import { LedgerSale } from './ledger-sale.entity';

/** Calendar date (YYYY-MM-DD) in Colombia. */
export function colombiaDate(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: COLOMBIA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Outbox row (validated) -> sales book entry. The figures are the document's own; nothing is recomputed from rules. */
export function toLedgerEntry(row: EmissionOutbox, fallbackIssuedAt: Date): Omit<LedgerSale, 'id' | 'created_at'> {
  const lines = row.draft?.lines ?? [];
  const header = buildHeaderTotals(lines);
  const taxes = buildAllTaxTotals(lines);
  const issuedAt = row.issued_at ?? fallbackIssuedAt;
  const buyer = row.document_type === 'pos' ? null : (row.draft as InvoiceDraft | null)?.buyer ?? null;
  return {
    company_id: row.company_id,
    outbox_id: row.id,
    document_type: row.document_type,
    prefix: row.prefix as string,
    number: row.number as number,
    cufe: row.cufe,
    issued_at: issuedAt,
    issue_date: colombiaDate(issuedAt),
    buyer_identification: buyer?.identificationNumber ?? null,
    buyer_name: buyer?.name ?? null,
    base_total: header.invoiceBaseTotal,
    tax_total: taxes.reduce((s, t) => s + t.tax_amount, 0),
    total: header.invoiceTaxInclusiveTotal,
    tax_breakdown: taxes,
    sign: row.document_type === 'credit_note' ? -1 : 1,
  };
}
