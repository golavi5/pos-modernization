import { Buyer, EmissionLine } from '../emission/emission.types';
import { CreditNoteDraft, InvoiceDraft } from '../outbox/outbox.types';
import { BuyerDto, CreateDocumentDto, LineDto } from './document.dto';

const buyer = (b: BuyerDto): Buyer => ({
  identificationNumber: b.identification_number,
  dv: b.dv,
  name: b.name,
  phone: b.phone,
  address: b.address,
  email: b.email,
  typeDocumentIdentificationId: b.type_document_identification_id,
  typeOrganizationId: b.type_organization_id,
  typeLiabilityId: b.type_liability_id,
  municipalityId: b.municipality_id,
  typeRegimeId: b.type_regime_id,
});

const line = (l: LineDto): EmissionLine => ({
  code: l.code,
  description: l.description,
  quantity: l.quantity,
  unitPrice: l.unit_price,
  ivaRate: l.iva_rate,
  subtotal: l.subtotal,
  ivaAmount: l.iva_amount,
  total: l.total,
  grossSubtotal: l.gross_subtotal,
  bagTax: l.bag_tax ? { perUnit: l.bag_tax.per_unit, total: l.bag_tax.total } : undefined,
});

/** API (snake_case) -> internal draft. Pure; the numbering is added by the worker. */
export function toDraft(dto: CreateDocumentDto): InvoiceDraft | CreditNoteDraft {
  const base: InvoiceDraft = {
    buyer: dto.buyer ? buyer(dto.buyer) : null,
    lines: dto.lines.map(line),
    headNote: dto.head_note,
    footNote: dto.foot_note,
    resolutionText: dto.resolution_text,
    sendEmail: dto.send_email ?? false,
  };
  if (dto.type === 'invoice') return base;
  return {
    ...base,
    reference: { number: dto.reference!.number, cufe: dto.reference!.cufe, issueDate: dto.reference!.issue_date },
    discrepancyCode: dto.discrepancy_code!,
    discrepancyDescription: dto.discrepancy_description!,
  };
}
