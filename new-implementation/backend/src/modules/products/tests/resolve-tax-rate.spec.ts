import { resolveTaxRate } from '../resolve-tax-rate';

describe('resolveTaxRate', () => {
  it('the product rate wins', () => {
    expect(resolveTaxRate({ tax_rate: 5 }, 19)).toBe(5);
  });
  it('an explicit 0 is a rate, not "unset"', () => {
    expect(resolveTaxRate({ tax_rate: 0 }, 19)).toBe(0);
  });
  it('null or missing inherits the company rate', () => {
    expect(resolveTaxRate({ tax_rate: null }, 8)).toBe(8);
    expect(resolveTaxRate({}, 8)).toBe(8);
  });
});
