/**
 * Provider-neutral emission model (SPEC-FISC-003 T-01). Amounts are whole pesos
 * already computed by the caller: the emission layer does no tax math and holds no
 * tax rules (those live in SPEC-FISC-007). `unitPrice` is the `price_amount` sent
 * to the provider, exactly as the caller defines it.
 */
export type DocumentType = 'invoice' | 'credit_note' | 'pos';

export interface EmissionLine {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** IVA rate in percent (0 = exempt). Ignored for bag-tax lines. */
  ivaRate: number;
  /** Net of discount, excluding IVA. */
  subtotal: number;
  ivaAmount: number;
  /** Net of discount, including IVA (and bag tax). */
  total: number;
  /** Subtotal before discount, excluding IVA. Omit when the line has no discount. */
  grossSubtotal?: number;
  /** Plastic-bag tax line (tax_id 10). Per-unit rate; line total is `perUnit * quantity`. */
  bagTax?: { perUnit: number; total: number };
}

/** DIAN/provider codes for an identified buyer. `null` buyer = final consumer. */
export interface Buyer {
  identificationNumber: string;
  dv: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  typeDocumentIdentificationId: number;
  typeOrganizationId: number;
  typeLiabilityId: number;
  municipalityId: number;
  typeRegimeId: number;
}

interface DocumentBase {
  /** Authorised numbering. The caller assigns the number; the adapter never does. */
  prefix: string;
  number: number;
  resolution: string;
  lines: EmissionLine[];
  headNote?: string;
  footNote?: string;
}

export interface InvoiceDocument extends DocumentBase {
  type: 'invoice';
  buyer: Buyer | null;
  resolutionText?: string;
  sendEmail: boolean;
}

export interface CreditNoteDocument extends DocumentBase {
  type: 'credit_note';
  buyer: Buyer | null;
  resolutionText?: string;
  sendEmail: boolean;
  /** Original invoice. */
  reference: { number: string; cufe: string; issueDate: string };
  discrepancyCode: number;
  discrepancyDescription: string;
}

export interface PosDocument extends DocumentBase {
  type: 'pos';
  softwareManufacturer: { ownerName: string; softwareName: string; companyName: string };
}

export type EmissionDocument = InvoiceDocument | CreditNoteDocument | PosDocument;

export type DianVerdict = 'accepted' | 'rejected' | 'pending';

export type EmitResult =
  /** The provider took the document. DIAN's verdict may not be attached yet. */
  | { outcome: 'submitted'; cude: string | null; qr: string | null; verdict: DianVerdict; reason: string | null }
  /** The provider refused the payload itself. Permanent: fix the data, do not retry or fall back to contingency. */
  | { outcome: 'payload_rejected'; reason: string };

export interface DocumentStatus {
  verdict: DianVerdict;
  cude: string | null;
  qr: string | null;
  preview: string | null;
  reason: string | null;
}

export interface PdfResult {
  filename: string;
  base64: string;
}

/** Retryable: transport failure, timeout, gateway error or 401. The document may or may not have been taken. */
export class EmissionTransientError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export abstract class EmissionPort {
  abstract emit(doc: EmissionDocument): Promise<EmitResult>;
  abstract getStatus(type: 'invoice' | 'pos', prefix: string, number: number): Promise<DocumentStatus>;
  abstract getPdf(cude: string): Promise<PdfResult>;
  /** Next free number of an authorised range, from the provider's remaining-numbers view. */
  abstract nextNumber(resolution: string, prefix: string): Promise<number>;
}
