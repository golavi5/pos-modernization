import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateOrderDto } from '../dto/create-order.dto';

/**
 * D5 (dry-run 2026-08-11): el payload REAL que manda el carrito era rechazado
 * con 400 por dos motivos independientes, ambos verificados por mutación.
 */
describe('D5 — CreateOrderDto acepta el payload real del carrito', () => {
  const cartPayload = {
    items: [
      {
        product_id: 'b5a3e029-3ebb-4b9a-9fb7-bafd96d4a4cc',
        quantity: 1,
        unit_price: '25000.00', // MySQL DECIMAL -> string
        discount: 0,
        tax_rate: '19.00',
      },
    ],
    payment_method: 'card',
    payment_status: 'paid',
    discount_amount: 0, // venta sin descuento: el caso normal
  };

  const errs = (p: any) =>
    validateSync(plainToInstance(CreateOrderDto, p), { whitelist: true })
      .flatMap((e) => [
        ...Object.values(e.constraints ?? {}),
        ...(e.children ?? []).flatMap((c) =>
          (c.children ?? []).flatMap((g) => Object.values(g.constraints ?? {})),
        ),
      ]);

  it('acepta el payload del carrito tal cual', () => {
    expect(errs(cartPayload)).toEqual([]);
  });

  it('unit_price string se coacciona a número', () => {
    const dto = plainToInstance(CreateOrderDto, cartPayload);
    expect(typeof dto.items[0].unit_price).toBe('number');
    expect(dto.items[0].unit_price).toBe(25000);
  });

  it('discount_amount = 0 es válido (cero no es "positivo")', () => {
    expect(errs({ ...cartPayload, discount_amount: 0 })).toEqual([]);
  });

  it('sigue rechazando un descuento negativo', () => {
    expect(errs({ ...cartPayload, discount_amount: -5 }).join()).toMatch(/discount_amount/);
  });
});
