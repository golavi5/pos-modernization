import { CreditNoteDocument, InvoiceDocument, PosDocument } from '../emission/emission.types';

/**
 * Row lifecycle: pending -> sent (provider took it, DIAN verdict not yet attached)
 * -> validated | rejected. `failed` = needs a person (reconciliation view).
 * A `sent` row is never re-emitted: that would burn a consecutive.
 */
export type OutboxStatus = 'pending' | 'sent' | 'validated' | 'rejected' | 'failed';

export type OutboxDocumentType = 'pos' | 'invoice' | 'credit_note';

/** The part of a document the caller provides; numbering, date and issuer data are added at send time. */
type Draft<D> = Omit<D, 'type' | 'prefix' | 'number' | 'resolution' | 'softwareManufacturer'>;
export type PosDraft = Pick<PosDocument, 'lines' | 'headNote' | 'footNote'>;
export type InvoiceDraft = Draft<InvoiceDocument>;
export type CreditNoteDraft = Draft<CreditNoteDocument>;
export type OutboxDraft = PosDraft | InvoiceDraft | CreditNoteDraft;

export interface EnqueuePosInput {
  companyId: string;
  orderId: string;
  /** null when the sale cannot be mapped yet; the row is recorded as `failed` with `unsupportedReason`. */
  draft: PosDraft | null;
  unsupportedReason?: string;
}

export interface EnqueueDocumentInput {
  companyId: string;
  type: 'invoice' | 'credit_note';
  draft: InvoiceDraft | CreditNoteDraft;
}
