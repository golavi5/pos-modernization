import { describe, it, expect } from 'vitest';
import { applyFields } from '../src/core/applyFields.js';
import { fullName, parseLegacyDate } from '../src/core/transforms.js';
import type { MapRule, TransformCtx } from '../src/types/Rule.js';

const ctx: TransformCtx = { row: {}, source: 'clientes', lookups: {}, companyId: 'co-1', bootstrapUserId: 'u-1' };

const rule: MapRule = {
  kind: 'map', source: 'clientes', target: 'customers',
  idMap: { legacyKey: 'IdCliente', newKey: 'deterministic' },
  fields: [
    { from: null,        to: 'company_id', transform: (_v, c) => c.companyId },
    { from: null,        to: 'name',       transform: (_v, c) => fullName(c.row) },
    { from: 'Email',     to: 'email',      transform: (v) => String(v ?? '').toLowerCase().trim() || null },
    { from: 'FechaCreacion', to: 'created_at', transform: parseLegacyDate, verify: 'ignore' },
  ],
};

describe('applyFields', () => {
  it('maps computed + transformed fields and injects id/legacy_id', () => {
    const row = { IdCliente: 7, Nombre1: 'Ana', Apellido1: 'Díaz', Email: ' A@B.CO ', FechaCreacion: '2021-03-04 00:00:00' };
    const { target, errors } = applyFields(rule, row, 'uuid-here', { ...ctx, row });
    expect(errors).toEqual([]);
    expect(target).toMatchObject({ id: 'uuid-here', legacy_id: '7', company_id: 'co-1', name: 'Ana Díaz', email: 'a@b.co' });
  });
  it('collects a RowError when a transform throws', () => {
    const row = { IdCliente: 8, Nombre1: 'Bo', FechaCreacion: 'not-a-date' };
    const { errors } = applyFields(rule, row, 'u2', { ...ctx, row });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ rule: 'clientes', legacyPk: '8', field: 'created_at' });
  });
});
