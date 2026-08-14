/** El ajuste de empresa que actúa como defecto (`settings.allowNegativeStock`). */
export interface OversellPolicy {
  allowNegativeStock: boolean;
}

/** Lo mínimo que la regla necesita de un producto. */
export interface OversellSubject {
  allow_sale_without_stock?: boolean | null;
}

/**
 * ¿Se puede vender este producto sin existencias?
 *
 * La bandera del producto manda; `null`/`undefined` significan "heredar del
 * ajuste global". Reproduce la semántica del legado
 * (`inventarios.EsFactSinExistencia`), que es por producto, y deja que los 272
 * productos marcados como NO vendibles sin stock sigan bloqueados aunque el
 * interruptor global esté encendido.
 *
 * Función pura a propósito: la consumen tres puntos de validación distintos y
 * tres copias del `??` se habrían desincronizado.
 */
export function canSellWithoutStock(
  product: OversellSubject,
  policy: OversellPolicy,
): boolean {
  return product.allow_sale_without_stock ?? policy.allowNegativeStock;
}
