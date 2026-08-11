import { numericTransformer } from './column-numeric.transformer';

describe('numericTransformer', () => {
  it('convierte el string de MySQL a número', () => {
    expect(numericTransformer.from('25000.00')).toBe(25000);
    expect(typeof numericTransformer.from('25000.00')).toBe('number');
  });

  it('preserva null y undefined (columnas nullable)', () => {
    expect(numericTransformer.from(null)).toBeNull();
    expect(numericTransformer.from(undefined)).toBeUndefined();
  });

  it('no rompe si ya viene como número', () => {
    expect(numericTransformer.from(25000 as unknown as string)).toBe(25000);
  });

  it('al escribir devuelve el valor tal cual', () => {
    expect(numericTransformer.to(25000)).toBe(25000);
  });

  it('sumar dos valores convertidos NO concatena', () => {
    const a = numericTransformer.from('25000.00') as number;
    const b = numericTransformer.from('4750.00') as number;
    expect(a + b).toBe(29750);
  });
});
