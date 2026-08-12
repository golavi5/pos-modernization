import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateProductDto } from '../dto/create-product.dto';

/** Lo que `ProductForm.tsx` manda hoy tal cual, sin limpiar cadenas vacías. */
const uiPayload = () => ({
  name: 'Producto de prueba',
  description: '',
  sku: 'PRD-001',
  barcode: '',
  category: '',
  price: 1000,
  cost: 0,
  stock_quantity: 5,
  min_stock_level: 0,
  max_stock_level: 0,
  unit_of_measure: 'unidad',
  tax_rate: 19,
  image_url: '',
});

const validate = (payload: Record<string, unknown>) => {
  const dto = plainToInstance(CreateProductDto, payload);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, props: errors.map((e) => e.property).sort() };
};

describe('CreateProductDto', () => {
  it('acepta el payload exacto del formulario de la UI', () => {
    const { props } = validate(uiPayload());
    expect(props).toEqual([]);
  });

  it('normaliza el SKU: recorta y pasa a mayúsculas', () => {
    const { dto, props } = validate({ ...uiPayload(), sku: '  prd-001  ' });
    expect(props).toEqual([]);
    expect(dto.sku).toBe('PRD-001');
  });

  it('acepta los SKU del catálogo legado, que son alfanuméricos puros', () => {
    expect(validate({ ...uiPayload(), sku: '1' }).props).toEqual([]);
    expect(validate({ ...uiPayload(), sku: 'ABC123' }).props).toEqual([]);
  });

  it('sigue rechazando un SKU con espacio interior', () => {
    expect(validate({ ...uiPayload(), sku: 'PRD 001' }).props).toEqual(['sku']);
  });

  it('convierte las cadenas vacías de los opcionales en undefined', () => {
    const { dto } = validate(uiPayload());
    expect(dto.barcode).toBeUndefined();
    expect(dto.image_url).toBeUndefined();
    expect(dto.description).toBeUndefined();
  });

  it('sigue validando barcode e image_url cuando SÍ traen valor', () => {
    expect(validate({ ...uiPayload(), image_url: 'no-es-una-url' }).props).toEqual(['image_url']);
    expect(validate({ ...uiPayload(), barcode: '7707358292295' }).props).toEqual([]);
  });

  it('reorder_level es opcional, y si viene se valida', () => {
    expect(validate(uiPayload()).props).toEqual([]);
    expect(validate({ ...uiPayload(), reorder_level: 5 }).props).toEqual([]);
    expect(validate({ ...uiPayload(), reorder_level: -1 }).props).toEqual(['reorder_level']);
  });

  it('ya no pide company_id ni created_by, y descarta los que le manden', () => {
    const { dto, props } = validate({
      ...uiPayload(),
      company_id: '11111111-1111-1111-1111-111111111111',
      created_by: '22222222-2222-2222-2222-222222222222',
    });
    expect(props).toEqual([]);
    expect((dto as unknown as Record<string, unknown>).company_id).toBeUndefined();
    expect((dto as unknown as Record<string, unknown>).created_by).toBeUndefined();
  });

  it('acepta allow_sale_without_stock en sus tres estados', () => {
    expect(validate({ ...uiPayload(), allow_sale_without_stock: true }).props).toEqual([]);
    expect(validate({ ...uiPayload(), allow_sale_without_stock: false }).props).toEqual([]);
    expect(validate({ ...uiPayload(), allow_sale_without_stock: null }).props).toEqual([]);
  });
});
