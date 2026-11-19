/**
 * Mirror of `backend/src/modules/sales/tax-math.ts` (SPEC-BACK-010) for the cart
 * preview. Whole pesos, half up. The backend is authoritative: the payment amount
 * always comes from the order the server creates, so keep this file in sync but
 * never trust it for money that is actually charged.
 */
export interface LineAmounts {
  subtotal: number;
  tax: number;
  total: number;
}

export const roundPeso = (n: number): number => Math.round(Math.round(n * 1e6) / 1e6);

export function computeLine(input: { quantity: number; unitPrice: number; taxRate: number; included: boolean }): LineAmounts {
  const { quantity, unitPrice, taxRate, included } = input;
  const gross = roundPeso(quantity * unitPrice);
  if (included) {
    const subtotal = taxRate === 0 ? gross : roundPeso(gross / (1 + taxRate / 100));
    return { subtotal, tax: gross - subtotal, total: gross };
  }
  const tax = taxRate === 0 ? 0 : roundPeso((gross * taxRate) / 100);
  return { subtotal: gross, tax, total: gross + tax };
}
