import { PosDraft } from '../../fiscal/outbox/outbox.types';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

export type PosDraftResult = { draft: PosDraft } | { unsupported: string };

/**
 * Maps a closed sale to the fiscal context's draft. The amounts are the order's own;
 * no tax is computed here. The IVA rate is the one recorded on the line when the order was
 * created (SPEC-BACK-009); orders created before that have none, so it is derived from the
 * stored amounts. VERIFY the derived case.
 */
export function buildPosDraft(
  order: Order,
  items: OrderItem[],
  products: Map<string, { name: string; sku: string }>,
): PosDraftResult {
  if (Number(order.discount_amount) > 0) {
    return { unsupported: 'Order-level discount is not mapped to POS document lines yet' };
  }
  const lines = items.map((i) => {
    const p = products.get(i.product_id);
    const subtotal = Number(i.subtotal);
    const ivaAmount = Number(i.tax_amount);
    return {
      code: p?.sku ?? i.product_id,
      description: p?.name ?? i.product_id,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      ivaRate: i.tax_rate != null ? Number(i.tax_rate) : subtotal > 0 ? Math.round((ivaAmount / subtotal) * 100) : 0,
      subtotal,
      ivaAmount,
      total: Number(i.total),
    };
  });
  const sum = lines.reduce((s, l) => s + l.total, 0);
  if (lines.length === 0 || Math.abs(sum - Number(order.total_amount)) > 0.5) {
    return { unsupported: 'Line totals do not add up to the order total' };
  }
  return { draft: { lines, headNote: `Venta ${order.order_number}` } };
}
