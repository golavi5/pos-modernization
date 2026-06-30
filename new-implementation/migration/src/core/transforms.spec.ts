import { describe, it, expect } from 'vitest';
import {
  lowerTrim,
  trimStr,
  toBit,
  parseDotNetDate,
  deletedFlagToTimestamp,
} from './transforms.js';

describe('lowerTrim / trimStr', () => {
  it('lowercases and trims', () => {
    expect(lowerTrim('  ADA@X.COM ')).toBe('ada@x.com');
    expect(trimStr('  Ada  ')).toBe('Ada');
  });
  it('passes null through', () => {
    expect(lowerTrim(null)).toBeNull();
    expect(trimStr(undefined)).toBeNull();
  });
});

describe('toBit', () => {
  it('maps truthy legacy flags to 1', () => {
    for (const v of [true, 1, '1', 'true', 'TRUE']) expect(toBit(v)).toBe(1);
  });
  it('maps everything else to 0', () => {
    for (const v of [false, 0, '0', '', null, undefined, 'no']) {
      expect(toBit(v)).toBe(0);
    }
  });
});

describe('parseDotNetDate', () => {
  it('passes Date through', () => {
    const d = new Date('2024-01-01');
    expect(parseDotNetDate(d)).toBe(d);
  });
  it('parses ISO / SQL strings', () => {
    expect(parseDotNetDate('2024-01-02T03:04:05Z')!.toISOString()).toBe(
      '2024-01-02T03:04:05.000Z',
    );
  });
  it('parses .NET /Date(ms)/ format', () => {
    expect(parseDotNetDate('/Date(1704164645000)/')!.getTime()).toBe(1704164645000);
  });
  it('returns null for null/empty', () => {
    expect(parseDotNetDate(null)).toBeNull();
    expect(parseDotNetDate('')).toBeNull();
  });
  it('throws on garbage (→ RowError upstream)', () => {
    expect(() => parseDotNetDate('not-a-date')).toThrow(/un-parseable/);
  });
});

describe('deletedFlagToTimestamp', () => {
  it('returns a timestamp when deleted', () => {
    const now = new Date('2024-05-01T00:00:00Z');
    expect(deletedFlagToTimestamp(1, now)).toBe(now);
  });
  it('returns null when not deleted', () => {
    expect(deletedFlagToTimestamp(0)).toBeNull();
  });
});
