import { calculateDv, isValidNit, splitNit } from './nit';

describe('nit', () => {
  it.each([
    ['800197268', '4'], // NIT público de la DIAN
    ['40720042', '4'], // vectores de radian-dian
    ['123456789', '6'],
    ['900123456', '8'],
  ])('calculateDv(%s) = %s', (base, dv) => {
    expect(calculateDv(base)).toBe(dv);
  });

  it('maps remainders 0 and 1 to themselves', () => {
    // 0 sums to remainder 0 → DV 0
    expect(calculateDv('0')).toBe('0');
  });

  it('splits with dots, spaces and hyphen', () => {
    expect(splitNit('800.197.268-4')).toEqual({ base: '800197268', dv: '4' });
    expect(splitNit('800197268 -4')).toEqual({ base: '800197268', dv: '4' });
  });

  it('refuses to guess a DV when the hyphen is missing', () => {
    expect(splitNit('8001972684')).toBeNull();
    expect(isValidNit('8001972684')).toBe(false);
  });

  it('validates DV', () => {
    expect(isValidNit('800197268-4')).toBe(true);
    expect(isValidNit('800197268-5')).toBe(false);
  });

  it('rejects non-numeric / oversize bases', () => {
    expect(() => calculateDv('12a')).toThrow();
    expect(() => calculateDv('1'.repeat(16))).toThrow();
  });
});
