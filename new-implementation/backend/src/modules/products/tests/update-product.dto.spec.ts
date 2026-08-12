import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateProductDto } from '../dto/update-product.dto';

const validate = (payload: Record<string, unknown>) => {
  const dto = plainToInstance(UpdateProductDto, payload);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, props: errors.map((e) => e.property).sort() };
};

describe('UpdateProductDto', () => {
  it('acepta el mismo SKU que CreateProductDto (PRD-001)', () => {
    expect(validate({ sku: 'PRD-001' }).props).toEqual([]);
  });

  it('normaliza el SKU: recorta y pasa a mayúsculas', () => {
    const { dto, props } = validate({ sku: '  prd-001  ' });
    expect(props).toEqual([]);
    expect(dto.sku).toBe('PRD-001');
  });

  it('sigue rechazando un SKU con espacio interior', () => {
    expect(validate({ sku: 'PRD 001' }).props).toEqual(['sku']);
  });

  it('acepta barcode e image_url en blanco en vez de devolver 400', () => {
    const { dto, props } = validate({ barcode: '', image_url: '' });
    expect(props).toEqual([]);
    expect(dto.barcode).toBeUndefined();
    expect(dto.image_url).toBeUndefined();
  });
});
