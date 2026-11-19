/**
 * Importes de una línea de venta en pesos enteros (SPEC-BACK-010). Función pura: la
 * usan la creación de pedidos y su espejo de vista previa en el frontend, y no deben
 * desincronizarse. Pesos enteros porque el documento fiscal exige
 * `subtotal + IVA = total` sin centavos.
 */
export interface LineAmounts {
  subtotal: number;
  tax: number;
  total: number;
}

/** Mitad hacia arriba; el pase por 1e6 absorbe el ruido de coma flotante (0.1 * 3). */
export const roundPeso = (n: number): number => Math.round(Math.round(n * 1e6) / 1e6);

export function computeLine(input: {
  quantity: number;
  unitPrice: number;
  /** Tasa de IVA en %. */
  taxRate: number;
  /** El precio ya incluye el IVA. */
  included: boolean;
}): LineAmounts {
  const { quantity, unitPrice, taxRate, included } = input;
  const gross = roundPeso(quantity * unitPrice);
  if (included) {
    const subtotal = taxRate === 0 ? gross : roundPeso(gross / (1 + taxRate / 100));
    return { subtotal, tax: gross - subtotal, total: gross };
  }
  const tax = taxRate === 0 ? 0 : roundPeso((gross * taxRate) / 100);
  return { subtotal: gross, tax, total: gross + tax };
}
