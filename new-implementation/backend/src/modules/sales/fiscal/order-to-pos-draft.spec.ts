import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { buildPosDraft } from './order-to-pos-draft';

const order = (o: Partial<Order> = {}) => ({ order_number: 'ORD-1', total_amount: 119, discount_amount: 0, ...o }) as Order;
const item = (o: Partial<OrderItem> = {}) =>
  ({ product_id: 'p1', quantity: 1, unit_price: 100, subtotal: 100, tax_amount: 19, total: 119, ...o }) as OrderItem;
const products = new Map([['p1', { name: 'Widget', sku: 'W-1' }]]);

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
