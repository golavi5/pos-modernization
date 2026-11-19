import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Envelope encryption (ADR-007 controls 1 and 6): a fresh AES-256-GCM data key per
 * secret encrypts it, and a key-encryption key (KEK) that lives OUTSIDE the database
 * wraps that data key. `aad` binds both ciphertexts to their owner (the company id),
 * so a row copied to another tenant does not decrypt. A database dump alone opens nothing.
 */
export interface Sealed {
  wrappedKey: string;
  ciphertext: string;
}

const gcm = (key: Buffer, aad: string, plain: Buffer): string => {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
};

const ungcm = (key: Buffer, aad: string, b64: string): Buffer => {
  const raw = Buffer.from(b64, 'base64');
  const d = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]);
};

export function seal(kek: Buffer, aad: string, plaintext: string): Sealed {
  const dataKey = randomBytes(32);
  return { ciphertext: gcm(dataKey, aad, Buffer.from(plaintext, 'utf8')), wrappedKey: gcm(kek, aad, dataKey) };
}

export function open(kek: Buffer, aad: string, sealed: Sealed): string {
  return ungcm(ungcm(kek, aad, sealed.wrappedKey), aad, sealed.ciphertext).toString('utf8');
}

/** `FISCAL_KEK`: 32 random bytes, base64 (`openssl rand -base64 32`). Read only when a secret is sealed or opened. */
export function loadKek(raw: string | undefined = process.env.FISCAL_KEK): Buffer {
  const kek = Buffer.from(raw ?? '', 'base64');
  if (kek.length !== 32) throw new Error('FISCAL_KEK must be 32 bytes, base64-encoded');
  return kek;
}
