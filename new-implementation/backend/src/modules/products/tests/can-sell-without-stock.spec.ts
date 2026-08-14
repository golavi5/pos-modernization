import { canSellWithoutStock } from '../can-sell-without-stock';

describe('canSellWithoutStock', () => {
  const globalOn = { allowNegativeStock: true };
  const globalOff = { allowNegativeStock: false };

  it('la bandera del producto manda sobre el global cuando dice true', () => {
    expect(canSellWithoutStock({ allow_sale_without_stock: true }, globalOff)).toBe(true);
  });

  it('la bandera del producto manda sobre el global cuando dice false', () => {
    // Este es el caso de los 272 productos legados con EsFactSinExistencia=0:
    // siguen bloqueados aunque el operador encienda el interruptor global.
    expect(canSellWithoutStock({ allow_sale_without_stock: false }, globalOn)).toBe(false);
  });

  it('null hereda del global', () => {
    expect(canSellWithoutStock({ allow_sale_without_stock: null }, globalOn)).toBe(true);
    expect(canSellWithoutStock({ allow_sale_without_stock: null }, globalOff)).toBe(false);
  });

  it('undefined hereda del global, igual que null', () => {
    expect(canSellWithoutStock({}, globalOn)).toBe(true);
    expect(canSellWithoutStock({}, globalOff)).toBe(false);
  });
});
