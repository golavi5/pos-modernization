import { describe, it, expect } from 'vitest';
import { parseLegacyDate, fullName } from '../src/core/transforms.js';

describe('parseLegacyDate', () => {
  it('parses a normal datetime as UTC', () => {
    expect(parseLegacyDate('2021-03-04 09:30:00')?.toISOString()).toBe('2021-03-04T09:30:00.000Z');
  });
  it('maps the legacy sentinel to null', () => {
    expect(parseLegacyDate('1000-01-01 00:00:00')).toBeNull();
  });
  it('throws on garbage', () => {
    expect(() => parseLegacyDate('banana')).toThrow();
  });
});

describe('fullName', () => {
  it('joins name parts and collapses whitespace', () => {
    expect(fullName({ Nombre1: 'Ana', Nombre2: '', Apellido1: 'Díaz', Apellido2: null })).toBe('Ana Díaz');
  });
  it('falls back to RazonSocial when no person name', () => {
    expect(fullName({ Nombre1: '', Apellido1: '', RazonSocial: 'Tienda SAS' })).toBe('Tienda SAS');
  });
});
