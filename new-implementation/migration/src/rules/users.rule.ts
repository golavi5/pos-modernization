import type { Rule } from '../types/Rule.js';
// Passwords are NOT migrated; a placeholder bcrypt hash is stored so the row is valid.
// Users must reset their password after migration via the admin panel or email flow.
export const PLACEHOLDER_PASSWORD_HASH = '$2b$10$migrationplaceholderplaceholderplaceholderplaceholder';
export default {
  kind: 'map', source: 'usuarios', target: 'users', dependsOn: ['empresas'],
  idMap: { legacyKey: 'IdUsuario', newKey: 'deterministic' },
  fields: [
    { from: null,                 to: 'company_id',    transform: (_v, c) => c.companyId },
    // Legacy CorreoElectronico is nullable; synthesise deterministic fallback for NOT NULL + UNIQUE.
    { from: 'CorreoElectronico',  to: 'email',         transform: (v, c) => String(v ?? '').toLowerCase().trim() || `usuario-${c.row.IdUsuario}@migrated.local` },
    { from: 'NomUsuario',         to: 'name',          verify: 'exact' },
    { from: null,                 to: 'password_hash', transform: () => PLACEHOLDER_PASSWORD_HASH, verify: 'ignore' },
    { from: 'EsActivo',           to: 'is_active',     transform: (v) => !!Number(v), verify: 'ignore' },
  ],
} satisfies Rule;
