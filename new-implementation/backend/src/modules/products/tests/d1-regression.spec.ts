import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ProductQueryDto } from '../dto/product-query.dto';

describe('D1 — ProductQueryDto.is_active', () => {
  const run = (q: any) => {
    const dto = plainToInstance(ProductQueryDto, q);
    return { errs: validateSync(dto).map(e => Object.values(e.constraints||{})).flat(), is_active: (dto as any).is_active };
  };
  it('sin parámetros (el caso que devolvía 400 siempre)', () => {
    const r = run({}); expect(r.errs).toEqual([]); expect(r.is_active).toBe(true);
  });
  it('lo que manda el frontend: search vacío + paginación', () => {
    const r = run({ search: '', page: '1', pageSize: '50' }); expect(r.errs).toEqual([]); expect(r.is_active).toBe(true);
  });
  it('is_active=false filtra a inactivos', () => {
    const r = run({ is_active: 'false' }); expect(r.errs).toEqual([]); expect(r.is_active).toBe(false);
  });
  it('is_active=true explícito', () => {
    const r = run({ is_active: 'true' }); expect(r.errs).toEqual([]); expect(r.is_active).toBe(true);
  });
});
