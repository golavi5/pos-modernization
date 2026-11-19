/** Lo mínimo que la regla necesita de un producto. */
export interface TaxRateSubject {
  tax_rate?: number | null;
}

/**
 * Tasa de IVA (%) que se aplica a un producto: la suya, o `null`/`undefined` =
 * heredar la de la empresa (`settings.taxRate`). Función pura: la consumen la
 * creación de pedidos y la respuesta de productos, y no deben desincronizarse
 * (SPEC-BACK-009). Mismo patrón que `canSellWithoutStock`.
 */
export function resolveTaxRate(product: TaxRateSubject, companyRate: number): number {
  return product.tax_rate ?? companyRate;
}
