import { getMetadataArgsStorage, ValueTransformer } from 'typeorm';
import { Customer } from '../customer.entity';
import { numericTransformer } from '../../../common/column-numeric.transformer';

/**
 * Los unit tests de `CustomersService` mockean el repositorio y devuelven
 * números, así que NUNCA ven lo que MySQL devuelve de verdad para un DECIMAL:
 * un string. Ese hueco dejó vivo el bug de D7 en clientes —
 * `customer.loyalty_points += points` daba `"100.00" + 50 = "100.0050"`, y el
 * `reduce` de `getStats` concatenaba hasta sacar `avgPurchaseValue = NaN`.
 *
 * Este test no mockea nada: lee el transformer REAL que la entidad declara en
 * los metadatos de TypeORM y suma con él. Si alguien quita el
 * `transformer: numericTransformer` de la columna, el transformer leído es
 * `undefined` y el test se pone rojo.
 */
describe('Customer entity — columnas DECIMAL', () => {
  const columnOptions = (propertyName: string) => {
    const args = getMetadataArgsStorage().columns.find(
      (c) => c.target === Customer && c.propertyName === propertyName,
    );
    expect(args).toBeDefined();
    return args!.options;
  };

  const transformerOf = (propertyName: string): ValueTransformer => {
    const { transformer } = columnOptions(propertyName);
    // Un array de transformers también sería válido para TypeORM, pero aquí no
    // se usa; si aparece, esta aserción lo señala en vez de romper por dentro.
    expect(Array.isArray(transformer)).toBe(false);
    return transformer as ValueTransformer;
  };

  it.each(['loyalty_points', 'total_purchases'])(
    '%s es DECIMAL y lleva el numericTransformer',
    (propertyName) => {
      expect(columnOptions(propertyName).type).toBe('decimal');
      expect(transformerOf(propertyName)).toBe(numericTransformer);
    },
  );

  it('sumar dos loyalty_points convertidos NO concatena', () => {
    const from = transformerOf('loyalty_points').from;
    // Lo que MySQL entrega para `loyalty_points = 100.00`, más los 50 puntos
    // que `PATCH /customers/:id/loyalty` acumula con `+=`.
    const stored = from('100.00') as number;

    expect(typeof stored).toBe('number');
    expect(stored + 50).toBe(150);
    expect(stored + 50).not.toBe('100.0050');
  });

  it('el reduce de getStats suma y avgPurchaseValue no sale NaN', () => {
    const from = transformerOf('total_purchases').from;
    const rows = ['1000.50', '2000.00', '500.25'].map(
      (raw) => from(raw) as number,
    );

    const totalRevenue = rows.reduce((sum, value) => sum + (value || 0), 0);
    const avgPurchaseValue = totalRevenue / rows.length;

    expect(totalRevenue).toBeCloseTo(3500.75, 2);
    expect(Number.isNaN(avgPurchaseValue)).toBe(false);
    expect(avgPurchaseValue).toBeCloseTo(1166.9166666, 5);
  });
});
