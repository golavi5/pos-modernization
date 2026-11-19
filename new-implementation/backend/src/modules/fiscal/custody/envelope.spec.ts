import { randomBytes } from 'crypto';
import { loadKek, open, seal } from './envelope';

const kek = randomBytes(32);

describe('envelope', () => {
  it('round-trips and never stores the plaintext', () => {
    const s = seal(kek, 'company-1', 'plemsi-token-123');
    expect(open(kek, 'company-1', s)).toBe('plemsi-token-123');
    expect(JSON.stringify(s)).not.toContain('plemsi-token-123');
    expect(Buffer.from(s.ciphertext, 'base64').toString('latin1')).not.toContain('plemsi');
  });
  it('seals the same secret differently each time', () => {
    const a = seal(kek, 'c', 'x');
    const b = seal(kek, 'c', 'x');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.wrappedKey).not.toBe(b.wrappedKey);
  });
  it('does not open for another owner (AAD), with another KEK, or after tampering', () => {
    const s = seal(kek, 'company-1', 'secret');
    expect(() => open(kek, 'company-2', s)).toThrow();
    expect(() => open(randomBytes(32), 'company-1', s)).toThrow();
    const raw = Buffer.from(s.ciphertext, 'base64');
    raw[raw.length - 1] ^= 1;
    expect(() => open(kek, 'company-1', { ...s, ciphertext: raw.toString('base64') })).toThrow();
  });
  it('rejects a missing or wrong-size KEK', () => {
    expect(() => loadKek(undefined)).toThrow('FISCAL_KEK');
    expect(() => loadKek(randomBytes(16).toString('base64'))).toThrow('FISCAL_KEK');
    expect(loadKek(kek.toString('base64'))).toEqual(kek);
  });
});
