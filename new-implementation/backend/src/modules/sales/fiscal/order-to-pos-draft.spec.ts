import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { buildAllTaxTotals, buildHeaderTotals } from '../../fiscal/emission/plemsi/plemsi.items';
import { buildPosDraft } from './order-to-pos-draft';

const order = (o: Partial<Order> = {}) => ({ order_number: 'ORD-1', total_amount: 119, discount_amount: 0, ...o }) as Order;
const item = (o: Partial<OrderItem> = {}) =>
  ({ product_id: 'p1', quantity: 1, unit_price: 100, subtotal: 100, tax_amount: 19, total: 119, ...o }) as OrderItem;
const products = new Map([['p1', { name: 'Widget', sku: 'W-1' }]]);

describe('buildPosDraft — IVA included in the price (SPEC-BACK-010)', () => {
  it('price_amount is the NET unit price, so price x quantity equals the line subtotal', () => {
    // a 9,990 price at 19%, quantity 3: stored by the sale as subtotal 25,185 / tax 4,785 / total 29,970
    const i = item({ quantity: 3, unit_price: 9990, subtotal: 25185, tax_amount: 4785, total: 29970, tax_rate: 19 });
    const r = buildPosDraft(order({ total_amount: 29970 }), [i], products);
    expect('draft' in r && r.draft.lines[0]).toMatchObject({ unitPrice: 8395, quantity: 3, subtotal: 25185, ivaRate: 19 });
  });

  it('the document amounts add up in whole pesos (DIAN rule FAU06): base + tax = total', () => {
    const lines = [
      item({ product_id: 'p1', unit_price: 9990, subtotal: 8395, tax_amount: 1595, total: 9990, tax_rate: 19 }),
      item({ product_id: 'p1', quantity: 2, unit_price: 10500, subtotal: 20000, tax_amount: 1000, total: 21000, tax_rate: 5 }),
    ];
    const r = buildPosDraft(order({ total_amount: 30990 }), lines, products);
    if (!('draft' in r)) throw new Error('unsupported');
    const totals = buildHeaderTotals(r.draft.lines);
    const taxes = buildAllTaxTotals(r.draft.lines).reduce((s, t) => s + t.tax_amount, 0);
    expect(totals.invoiceBaseTotal + taxes).toBe(totals.invoiceTaxInclusiveTotal);
    expect(totals.invoiceTaxInclusiveTotal).toBe(30990);
  });
});

describe('buildPosDraft', () => {
  it('maps the order amounts as they are and derives the IVA rate from them', () => {
    const r = buildPosDraft(order(), [item()], products);
    expect(r).toEqual({
      draft: {
        headNote: 'Venta ORD-1',
        lines: [{ code: 'W-1', description: 'Widget', quantity: 1, unitPrice: 100, ivaRate: 19, subtotal: 100, ivaAmount: 19, total: 119 }],
      },
    });
  });
  it('uses the rate recorded on the line; the derived one is only for lines that predate it', () => {
    const rounded = item({ subtotal: 100, tax_amount: 5.5, total: 105.5, tax_rate: 5.5 });
    const r = buildPosDraft(order({ total_amount: 105.5 }), [rounded], products);
    expect(r).toMatchObject({ draft: { lines: [{ ivaRate: 5.5 }] } });
    // 7% recorded although the amounts say 19%: the record wins, nothing is re-derived.
    expect(buildPosDraft(order(), [item({ tax_rate: 7 })], products)).toMatchObject({ draft: { lines: [{ ivaRate: 7 }] } });
    // an explicit 0 is a rate, not "missing"
    expect(buildPosDraft(order({ total_amount: 100 }), [item({ tax_amount: 0, total: 100, tax_rate: 0 })], products)).toMatchObject({ draft: { lines: [{ ivaRate: 0 }] } });
  });

  it('a line with no tax has rate 0; a missing product falls back to its id', () => {
    const r = buildPosDraft(order({ total_amount: 50 }), [item({ product_id: 'zz', subtotal: 50, tax_amount: 0, total: 50 })], products);
    expect(r).toMatchObject({ draft: { lines: [{ code: 'zz', description: 'zz', ivaRate: 0 }] } });
  });
  it('an order-level discount is unsupported, not guessed', () => {
    expect(buildPosDraft(order({ discount_amount: 5 }), [item()], products)).toEqual({ unsupported: expect.stringContaining('discount') });
  });
  it('line totals that do not add up to the order total are unsupported', () => {
    expect(buildPosDraft(order({ total_amount: 200 }), [item()], products)).toEqual({ unsupported: expect.stringContaining('add up') });
    expect(buildPosDraft(order(), [], products)).toEqual({ unsupported: expect.stringContaining('add up') });
  });
});
