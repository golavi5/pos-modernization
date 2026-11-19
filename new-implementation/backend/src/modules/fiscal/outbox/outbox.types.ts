import { PosDocument } from '../emission/emission.types';

/**
 * Row lifecycle: pending -> sent (provider took it, DIAN verdict not yet attached)
 * -> validated | rejected. `failed` = needs a person (reconciliation view, PR C).
 * A `sent` row is never re-emitted: that would burn a consecutive.
 */
export type OutboxStatus = 'pending' | 'sent' | 'validated' | 'rejected' | 'failed';

/** What a POS sale hands to fiscal: lines and notes only. Numbering, date and issuer data are added at send time. */
export type PosDraft = Pick<PosDocument, 'lines' | 'headNote' | 'footNote'>;

export interface EnqueuePosInput {
  companyId: string;
  orderId: string;
  /** null when the sale cannot be mapped yet; the row is recorded as `failed` with `unsupportedReason`. */
  draft: PosDraft | null;
  unsupportedReason?: string;
}
