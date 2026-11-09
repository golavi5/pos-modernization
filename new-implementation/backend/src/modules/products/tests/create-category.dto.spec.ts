import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateCategoryDto } from '../dto/create-category.dto';

const validate = (payload: Record<string, unknown>) =>
  validateSync(plainToInstance(CreateCategoryDto, payload), { whitelist: true }).map(
    (e) => e.property,
  );

describe('CreateCategoryDto', () => {
  it('acepta lo que manda CategoryManager: solo name y description, sin company_id', () => {
    expect(validate({ name: 'Bebidas', description: '' })).toEqual([]);
  });

  it('rechaza un nombre vacío', () => {
    expect(validate({ name: '' })).toEqual(['name']);
  });
});
