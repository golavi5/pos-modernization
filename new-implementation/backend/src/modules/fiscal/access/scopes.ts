export const FISCAL_SCOPES = [
  'profile:read',
  'profile:write',
  'third-parties:read',
  'third-parties:write',
] as const;

export type FiscalScope = (typeof FISCAL_SCOPES)[number];

/** Set on `req.fiscal` by ApiKeyGuard. */
export interface FiscalRequestContext {
  /** The issuer: always a POS `company`. */
  issuerId: string;
  apiKeyId: string;
  scopes: string[];
}
