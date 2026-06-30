/**
 * Migration-wide constants shared by rule files.
 *
 * The legacy POS is single-tenant; the new schema is multi-tenant. Every
 * migrated row is assigned to one target company. `customers.company_id` /
 * `products.company_id` are plain VARCHARs (no FK), so a literal id is safe
 * and keeps transforms pure → `verify` re-applies them identically.
 *
 * When the real dump arrives, set MIGRATION_COMPANY_ID to the provisioned
 * tenant's UUID (via env override in a follow-up) before running import.
 */
export const MIGRATION_COMPANY_ID =
  process.env.MIGRATION_COMPANY_ID ?? '00000000-0000-4000-8000-000000000001';
