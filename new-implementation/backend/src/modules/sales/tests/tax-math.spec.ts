import { computeLine, roundPeso } from '../tax-math';

const line = (quantity: number, unitPrice: number, taxRate: number, included: boolean) => computeLine({ quantity, unitPrice, taxRate, included });

describe('computeLine — IVA included in the price', () => {
  it('splits a 19% price: 11,900 -> 10,000 + 1,900', () => {
    expect(line(1, 11900, 19, true)).toEqual({ subtotal: 10000, tax: 1900, total: 11900 });
  });
  it('9,990 at 19% (cents otherwise): whole pesos, and subtotal + tax = total exactly', () => {
    const r = line(1, 9990, 19, true);
    expect(r).toEqual({ subtotal: 8395, tax: 1595, total: 9990 });
    expect(r.subtotal + r.tax).toBe(r.total);
  });
  it('quantity multiplies the gross first: 3 x 9,990', () => {
    expect(line(3, 9990, 19, true)).toEqual({ subtotal: 25185, tax: 4785, total: 29970 });
  });
  it('0% and 5%', () => {
    expect(line(2, 1500, 0, true)).toEqual({ subtotal: 3000, tax: 0, total: 3000 });
    expect(line(1, 10500, 5, true)).toEqual({ subtotal: 10000, tax: 500, total: 10500 });
  });
  it('fractional quantity (weight): 0.85 kg x 3,500 at 19% -> gross 2,975', () => {
    const r = line(0.85, 3500, 19, true);
    expect(r.total).toBe(2975);
    expect(r.subtotal + r.tax).toBe(r.total);
  });
});

describe('computeLine — IVA on top of the price', () => {
  it('adds the tax: 10,000 -> 1,900 -> 11,900', () => {
    expect(line(1, 10000, 19, false)).toEqual({ subtotal: 10000, tax: 1900, total: 11900 });
  });
  it('rounds the tax to whole pesos: 9,990 at 19% = 1,898.1 -> 1,898', () => {
    const r = line(1, 9990, 19, false);
    expect(r).toEqual({ subtotal: 9990, tax: 1898, total: 11888 });
  });
  it('0% has no tax', () => {
    expect(line(2, 1500, 0, false)).toEqual({ subtotal: 3000, tax: 0, total: 3000 });
  });
});

describe('roundPeso', () => {
  it('rounds half up and absorbs float noise', () => {
    expect(roundPeso(0.5)).toBe(1);
    expect(roundPeso(1234.5)).toBe(1235);
    expect(roundPeso(0.1 * 3 * 10000)).toBe(3000);
    expect(roundPeso(2999.9999999)).toBe(3000);
  });
});

describe('identity: total = subtotal + tax for any price, rate and mode', () => {
  it.each([true, false])('included=%s', (included) => {
    for (const price of [1, 99, 999, 1190, 9990, 12345, 100001]) {
      for (const rate of [0, 5, 16, 19]) {
        for (const q of [1, 2, 3, 0.5, 2.35]) {
          const r = line(q, price, rate, included);
          expect(r.subtotal + r.tax).toBe(r.total);
          expect(Number.isInteger(r.subtotal) && Number.isInteger(r.tax) && Number.isInteger(r.total)).toBe(true);
        }
      }
    }
  });
});
