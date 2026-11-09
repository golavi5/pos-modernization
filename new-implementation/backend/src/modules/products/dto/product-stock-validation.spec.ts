import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProductDto } from './update-product.dto';
import { CreateProductDto } from './create-product.dto';

// SPEC-BACK-007: stock changes only through inventory adjust and sales (they
// journal), so editing a product must never carry a stock_quantity.
describe('stock_quantity on the product DTOs', () => {
  it('update drops stock_quantity under the app ValidationPipe whitelist', async () => {
    const dto = plainToInstance(UpdateProductDto, { name: 'Café', stock_quantity: 99 });

    await validate(dto, { whitelist: true });

    expect(dto).not.toHaveProperty('stock_quantity');
    expect(dto).toHaveProperty('name', 'Café');
  });

  it('create still rejects a negative initial stock', async () => {
    const errors = await validate(plainToInstance(CreateProductDto, { stock_quantity: -1 }));

    expect(errors.filter((e) => e.property === 'stock_quantity')).toHaveLength(1);
  });
});
