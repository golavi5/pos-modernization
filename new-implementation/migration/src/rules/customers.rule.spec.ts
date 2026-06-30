import { describe, it, expect } from 'vitest';
import rule from './customers.rule.js';
import { buildTargetRow } from '../core/mapRow.js';
import { deterministicId } from '../core/idMap.js';
import { MIGRATION_COMPANY_ID } from './_constants.js';

describe('customers.rule', () => {
  const legacy = {
    CustomerID: 42,
    FullName: '  Ada Lovelace ',
    Email: '  ADA@Example.COM ',
    Phone: ' 555-1234 ',
    Address: ' 1 Analytical St ',
    CreatedOn: '2024-01-02T03:04:05Z',
    IsDeleted: 0,
  };

  it('resolves a deterministic id from CustomerID', () => {
    const { id } = buildTargetRow(rule, legacy);
    expect(id).toBe(deterministicId('tblCustomers', 42));
  });

  it('maps and normalizes every field', () => {
    const { target, errors } = buildTargetRow(rule, legacy);
    expect(errors).toEqual([]);
    expect(target).toMatchObject({
      legacy_id: '42',
      company_id: MIGRATION_COMPANY_ID,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-1234',
      address: '1 Analytical St',
      deleted_at: null,
    });
    expect((target.created_at as Date).toISOString()).toBe(
      '2024-01-02T03:04:05.000Z',
    );
  });

  it('collects a RowError for an un-parseable date instead of throwing', () => {
    const { errors } = buildTargetRow(rule, { ...legacy, CreatedOn: 'garbage' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ field: 'created_at', legacyPk: '42' });
  });

  it('sets deleted_at when the legacy row is soft-deleted', () => {
    const { target } = buildTargetRow(rule, { ...legacy, IsDeleted: 1 });
    expect(target.deleted_at).toBeInstanceOf(Date);
  });
});
