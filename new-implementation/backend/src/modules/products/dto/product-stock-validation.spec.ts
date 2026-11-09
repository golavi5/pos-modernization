import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProductDto } from './update-product.dto';
import { CreateProductDto } from './create-product.dto';

const stockErrors = async <T extends object>(
  cls: new () => T,
  stock: number,
  extra: object = {},
) =>
  (await validate(plainToInstance(cls, { stock_quantity: stock, ...extra })))
    .filter((e) => e.property === 'stock_quantity');

// SPEC-BACK-004: an oversell leaves stock negative, and the edit form resends
// the whole product — so an UPDATE with a negative stock must validate.
describe('stock_quantity validation', () => {
  it('update accepts a negative stock', async () => {
    expect(await stockErrors(UpdateProductDto, -1)).toHaveLength(0);
  });

  it('create still rejects a negative initial stock', async () => {
    expect(await stockErrors(CreateProductDto, -1)).toHaveLength(1);
  });
});
