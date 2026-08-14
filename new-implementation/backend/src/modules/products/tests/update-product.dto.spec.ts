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

  // Fix: en `update()` (no en `create()`), `''` debe mapear a `null`, no a
  // `undefined`. `Object.assign(product, updateProductDto)` + `save` de
  // TypeORM tratan `undefined` como "no tocar el campo" — con `emptyToUndefined`
  // (el transform de creación) vaciar el barcode desde el formulario de
  // edición era un no-op silencioso. `null` sí se escribe: ambas columnas son
  // `nullable: true`.
  it('acepta barcode e image_url en blanco y los vacía a null (no a undefined, no a "")', () => {
    const { dto, props } = validate({ barcode: '', image_url: '' });
    expect(props).toEqual([]);
    expect(dto.barcode).toBeNull();
    expect(dto.image_url).toBeNull();
  });

  it('un barcode real sigue pasando la validación y llega intacto', () => {
    const { dto, props } = validate({ barcode: '7501234567890' });
    expect(props).toEqual([]);
    expect(dto.barcode).toBe('7501234567890');
  });

  it('una image_url real sigue pasando la validación y llega intacta', () => {
    const { dto, props } = validate({ image_url: 'https://cdn.example.com/p.png' });
    expect(props).toEqual([]);
    expect(dto.image_url).toBe('https://cdn.example.com/p.png');
  });
});
