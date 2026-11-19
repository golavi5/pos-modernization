import { Buyer, CreditNoteDocument, EmissionDocument, InvoiceDocument, PosDocument } from '../emission.types';
import { COLOMBIA_TZ, DEFAULT_PAYMENT } from './plemsi.constants';
import { buildAllTaxTotals, buildHeaderTotals, buildItems } from './plemsi.items';

/**
 * DIAN rules FAD09b/FAD09e (observed live by ApiFacturame, 2026-09-17): the document
 * date/time must be the transmission moment, zero tolerance. So the adapter stamps
 * `now` at every send, including retries; callers never supply a date.
 */
export function colombiaStamp(now: Date): { date: string; time: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: COLOMBIA_TZ,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.month}/${p.day}/${p.year}`, time: `${p.hour}:${p.minute}:${p.second}` };
}

const customer = (b: Buyer) => ({
  identification_number: b.identificationNumber,
  dv: b.dv,
  name: b.name,
  phone: b.phone,
  address: b.address,
  email: b.email,
  type_document_identification_id: b.typeDocumentIdentificationId,
  type_organization_id: b.typeOrganizationId,
  type_liability_id: b.typeLiabilityId,
  municipality_id: b.municipalityId,
  type_regime_id: b.typeRegimeId,
});

const common = (d: EmissionDocument, date: string) => ({
  prefix: d.prefix,
  number: d.number,
  resolution: d.resolution,
  head_note: d.headNote,
  foot_note: d.footNote,
  payment: { ...DEFAULT_PAYMENT, payment_due_date: date },
  items: buildItems(d.lines),
  allTaxTotals: buildAllTaxTotals(d.lines),
  ...buildHeaderTotals(d.lines),
});

function invoice(d: InvoiceDocument, now: Date) {
  const { date, time } = colombiaStamp(now);
  return {
    date,
    time,
    send_email: d.sendEmail,
    isFinalCustomer: d.buyer === null,
    customer: d.buyer ? customer(d.buyer) : undefined,
    resolutionText: d.resolutionText,
    ...common(d, date),
    finalTotalToPay: buildHeaderTotals(d.lines).totalToPay,
  };
}

function creditNote(d: CreditNoteDocument, now: Date) {
  const { date } = colombiaStamp(now);
  return {
    send_email: d.sendEmail,
    invoiceReference: { number: d.reference.number, uuid: d.reference.cufe, issue_date: d.reference.issueDate },
    discrepancy: { code: d.discrepancyCode, description: d.discrepancyDescription },
    isFinalCustomer: d.buyer === null,
    customer: d.buyer ? customer(d.buyer) : undefined,
    resolutionText: d.resolutionText,
    ...common(d, date),
  };
}

function pos(d: PosDocument, now: Date) {
  const { date, time } = colombiaStamp(now);
  const c = common(d, date);
  return {
    softwareManufacturer: {
      ownerName: d.softwareManufacturer.ownerName,
      softwareName: d.softwareManufacturer.softwareName,
      companyName: d.softwareManufacturer.companyName,
    },
    date,
    time,
    ...c,
  };
}

export const PLEMSI_EMIT_PATH = {
  invoice: 'api/billing/invoice',
  credit_note: 'api/billing/credit',
  pos: 'api/equivalent/pos',
} as const;

export function buildPayload(d: EmissionDocument, now: Date): object {
  switch (d.type) {
    case 'invoice':
      return invoice(d, now);
    case 'credit_note':
      return creditNote(d, now);
    case 'pos':
      return pos(d, now);
  }
}
