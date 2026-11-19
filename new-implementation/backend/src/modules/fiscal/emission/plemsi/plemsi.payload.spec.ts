import { EmissionLine } from '../emission.types';
import { buildAllTaxTotals, buildHeaderTotals, buildItems, toInt } from './plemsi.items';
import { buildPayload, colombiaStamp } from './plemsi.payload';

/** Golden values ported from ApiFacturame Test/DianPayloadBuilderTests.cs. */
const regular: EmissionLine = { code: '10', description: 'Producto A', quantity: 2, unitPrice: 1190, ivaRate: 19, subtotal: 2000, ivaAmount: 380, total: 2380 };
const bag: EmissionLine = { code: 'x', description: 'BOLSA', quantity: 3, unitPrice: 0, ivaRate: 0, subtotal: 0, ivaAmount: 0, total: 150, bagTax: { perUnit: 50, total: 150 } };
const disc19: EmissionLine = { code: '20', description: 'P19', quantity: 1, unitPrice: 119000, ivaRate: 19, subtotal: 90000, ivaAmount: 17100, total: 107100, grossSubtotal: 100000 };
const disc5: EmissionLine = { code: '21', description: 'P5', quantity: 1, unitPrice: 105000, ivaRate: 5, subtotal: 90000, ivaAmount: 4500, total: 94500, grossSubtotal: 100000 };
const papa: EmissionLine = { code: '22', description: 'Papa', quantity: 0.85, unitPrice: 3500, ivaRate: 0, subtotal: 2975, ivaAmount: 0, total: 2975 };

/** FAU06 identities the C# suite asserts on every discounted document. */
function expectFau06(lines: EmissionLine[]) {
  const items = buildItems(lines);
  const totals = buildHeaderTotals(lines);
  const taxes = buildAllTaxTotals(lines);
  expect(items.reduce((s, i) => s + i.line_extension_amount, 0)).toBe(totals.invoiceBaseTotal);
  expect(totals.invoiceTaxInclusiveTotal).toBe(totals.invoiceBaseTotal + taxes.reduce((s, t) => s + t.tax_amount, 0));
  for (const i of items.filter((x) => x.allowance_charges)) {
    expect(i.allowance_charges![0].base_amount - i.allowance_charges![0].amount).toBe(i.line_extension_amount);
  }
}

describe('items', () => {
  it('regular line: IVA tax total, net extension, no allowance key at all', () => {
    const [i] = buildItems([regular]);
    expect(i).toMatchObject({ code: '10', line_extension_amount: 2000, free_of_charge_indicator: false, price_amount: 1190, unit_measure_id: 70, type_item_identification_id: 1 });
    expect(i.tax_totals).toEqual([{ tax_id: 1, percent: 19, tax_amount: 380, taxable_amount: 2000 }]);
    expect('allowance_charges' in JSON.parse(JSON.stringify(i))).toBe(false);
  });
  it('bag line: tax 10, free of charge, per-unit rate', () => {
    const [i] = buildItems([bag]);
    expect(i).toMatchObject({ code: 'BOLSA', free_of_charge_indicator: true, line_extension_amount: 0, type_item_identification_id: 4, price_amount: 50 });
    expect(i.tax_totals[0]).toMatchObject({ tax_id: 10, tax_amount: 150, per_unit_amount: 50, base_unit_measure: 1, unit_measure_id: 70 });
  });
  it('fractional quantity is kept (DEAV04b), whole quantity stays integral', () => {
    expect(buildItems([papa])[0]).toMatchObject({ invoiced_quantity: 0.85, base_quantity: 0.85, line_extension_amount: 2975 });
    expect(buildItems([{ ...regular, quantity: 4.000000 }])[0].invoiced_quantity).toBe(4);
  });
  it('discount (case B): allowance with ex-IVA amounts, net extension and taxable', () => {
    for (const l of [disc19, disc5]) {
      const [i] = buildItems([l]);
      expect(i.allowance_charges).toEqual([
        { charge_indicator: false, allowance_charge_reason: 'Descuento general', base_amount: 100000, amount: 10000, multiplier_factor_numeric: 10 },
      ]);
      expect(i.line_extension_amount).toBe(90000);
      expect(i.tax_totals[0].taxable_amount).toBe(90000);
    }
  });
  it('a discount that nets to zero ex-IVA emits no allowance', () => {
    const l: EmissionLine = { code: '24', description: 'Dulce', quantity: 1, unitPrice: 1006, ivaRate: 19, subtotal: 845, ivaAmount: 160, total: 1005, grossSubtotal: 845.4 };
    expect(buildItems([l])[0].allowance_charges).toBeUndefined();
  });
  it('a bag line never carries an allowance', () => {
    expect(buildItems([{ ...bag, grossSubtotal: 10 }])[0].allowance_charges).toBeUndefined();
  });
  it('fractional + discount (tomate) reproduces 2500/250/10.00', () => {
    const l: EmissionLine = { code: '23', description: 'Tomate', quantity: 0.85, unitPrice: 3500, ivaRate: 19, subtotal: 2250, ivaAmount: 427, total: 2677, grossSubtotal: 2500 };
    expect(buildItems([l])[0].allowance_charges).toEqual([
      { charge_indicator: false, allowance_charge_reason: 'Descuento general', base_amount: 2500, amount: 250, multiplier_factor_numeric: 10 },
    ]);
    expectFau06([l, regular]);
  });
});

describe('header tax totals and totals', () => {
  it('splits by IVA rate and includes bags; omits unused rates', () => {
    const t = buildAllTaxTotals([regular, bag]);
    expect(t).toContainEqual({ tax_id: 1, percent: 19, tax_amount: 380, taxable_amount: 2000 });
    expect(t).toContainEqual(expect.objectContaining({ tax_id: 10, tax_amount: 150, per_unit_amount: 50 }));
    expect(t.find((x) => x.percent === 5)).toBeUndefined();
    expect(buildAllTaxTotals([regular])).toHaveLength(1);
  });
  it('mirrors every rate on the lines, not only 5/19/0', () => {
    const mk = (ivaRate: number, subtotal: number, ivaAmount: number): EmissionLine => ({ code: 'x', description: 'X', quantity: 1, unitPrice: 0, ivaRate, subtotal, ivaAmount, total: subtotal + ivaAmount });
    const lines = [mk(0, 1300, 0), mk(5, 10952, 548), mk(16, 3793, 607), mk(19, 7479, 1421), mk(19, 5882, 1118)];
    const t = buildAllTaxTotals(lines);
    expect(t).toContainEqual({ tax_id: 1, percent: 16, tax_amount: 607, taxable_amount: 3793 });
    expect(t).toContainEqual({ tax_id: 1, percent: 19, tax_amount: 2539, taxable_amount: 13361 });
    expect(t.filter((x) => x.tax_id === 1).reduce((s, x) => s + x.taxable_amount, 0)).toBe(lines.reduce((s, l) => s + l.subtotal, 0));
    expect(t.filter((x) => x.tax_id === 1).reduce((s, x) => s + x.tax_amount, 0)).toBe(lines.reduce((s, l) => s + l.ivaAmount, 0));
  });
  it('totals sum subtotal and total across lines', () => {
    expect(buildHeaderTotals([regular, bag])).toEqual({ allowanceTotal: 0, invoiceBaseTotal: 2000, invoiceTaxExclusiveTotal: 2000, invoiceTaxInclusiveTotal: 2530, totalToPay: 2530 });
  });
  it('totals with discount: 180000 / 201600', () => {
    expect(buildHeaderTotals([disc19, disc5])).toMatchObject({ invoiceBaseTotal: 180000, invoiceTaxExclusiveTotal: 180000, invoiceTaxInclusiveTotal: 201600, totalToPay: 201600, allowanceTotal: 0 });
    expectFau06([disc19, disc5]);
  });
  it('mixed discount, fractional and bag keeps the FAU06 identities', () => {
    const lines = [disc19, papa, bag];
    expect(buildHeaderTotals(lines)).toMatchObject({ invoiceBaseTotal: 92975, invoiceTaxInclusiveTotal: 107100 + 2975 + 150 });
    expectFau06(lines);
  });
});

describe('document payloads', () => {
  const now = new Date('2026-11-19T03:30:15Z'); // 22:30:15 in Bogota, previous day
  const base = { prefix: 'SETP', number: 990000001, resolution: '18760000001', lines: [regular] };

  it('stamps Colombia time (UTC-5), MM/dd/yyyy and HH:mm:ss', () => {
    expect(colombiaStamp(now)).toEqual({ date: '11/18/2026', time: '22:30:15' });
    expect(colombiaStamp(new Date('2026-01-01T05:00:00Z'))).toEqual({ date: '01/01/2026', time: '00:00:00' });
  });
  it('invoice: final consumer has no customer; totals and finalTotalToPay', () => {
    const p = JSON.parse(JSON.stringify(buildPayload({ ...base, type: 'invoice', buyer: null, sendEmail: true }, now)));
    expect(p).toMatchObject({ date: '11/18/2026', time: '22:30:15', isFinalCustomer: true, send_email: true, totalToPay: 2380, finalTotalToPay: 2380, invoiceBaseTotal: 2000 });
    expect(p.customer).toBeUndefined();
    expect(p.payment).toEqual({ payment_form_id: 1, payment_method_id: 10, payment_due_date: '11/18/2026', duration_measure: '30' });
  });
  it('invoice with buyer maps the provider codes', () => {
    const buyer = { identificationNumber: '123', dv: '4', name: 'Juan', typeDocumentIdentificationId: 3, typeOrganizationId: 1, typeLiabilityId: 117, municipalityId: 350, typeRegimeId: 2 };
    const p = JSON.parse(JSON.stringify(buildPayload({ ...base, type: 'invoice', buyer, sendEmail: false }, now)));
    expect(p.isFinalCustomer).toBe(false);
    expect(p.customer).toMatchObject({ identification_number: '123', dv: '4', type_document_identification_id: 3, municipality_id: 350 });
  });
  it('credit note: references the original CUFE, no finalTotalToPay', () => {
    const p = JSON.parse(JSON.stringify(buildPayload({ ...base, type: 'credit_note', buyer: null, sendEmail: false, reference: { number: 'SETP1', cufe: 'abc', issueDate: '2026-11-01' }, discrepancyCode: 2, discrepancyDescription: 'Anulación solicitada por el emisor' }, now)));
    expect(p.invoiceReference).toEqual({ number: 'SETP1', uuid: 'abc', issue_date: '2026-11-01' });
    expect(p.discrepancy).toEqual({ code: 2, description: 'Anulación solicitada por el emisor' });
    expect(p.finalTotalToPay).toBeUndefined();
  });
  it('POS: software manufacturer, no customer fields', () => {
    const p = JSON.parse(JSON.stringify(buildPayload({ ...base, type: 'pos', softwareManufacturer: { ownerName: 'O', softwareName: 'Plemsi', companyName: 'C' } }, now)));
    expect(p.softwareManufacturer).toEqual({ ownerName: 'O', softwareName: 'Plemsi', companyName: 'C' });
    expect(p.customer).toBeUndefined();
    expect(p.invoiceTaxInclusiveTotal).toBe(2380);
  });
});

describe('toInt', () => {
  it('truncates like the C# (int) cast but absorbs float noise', () => {
    expect(toInt(1234.99)).toBe(1234);
    expect(toInt(0.1 * 3 * 10000)).toBe(3000); // 3000.0000000000005 / 2999.99999 style noise
    expect(toInt(999.9999999)).toBe(1000);
  });
});
