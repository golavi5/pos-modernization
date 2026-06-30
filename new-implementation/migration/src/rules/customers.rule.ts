import type { Rule } from '../types/Rule.js';
import { fullName, parseLegacyDate } from '../core/transforms.js';
export default {
  kind: 'map', source: 'clientes', target: 'customers', dependsOn: ['empresas'],
  idMap: { legacyKey: 'IdCliente', newKey: 'deterministic' },
  fields: [
    { from: null,          to: 'company_id', transform: (_v, c) => c.companyId },
    { from: null,          to: 'name',       transform: (_v, c) => fullName(c.row) },
    // email is NOT NULL + UNIQUE in the new schema. Legacy email is nullable AND has
    // real duplicates (267 clientes share only ~237 distinct emails). Empty → synthesise;
    // duplicate → plus-address with the legacy id so every cliente keeps a unique, valid email.
    { from: 'Email', to: 'email', transform: (v, c) => {
      const e = String(v ?? '').toLowerCase().trim();
      if (!e) return `cliente-${c.row.IdCliente}@migrated.local`;
      if (c.lookups.clientesDupEmails?.has(e)) {
        const at = e.indexOf('@');
        return at > 0 ? `${e.slice(0, at)}+${c.row.IdCliente}@${e.slice(at + 1)}` : `cliente-${c.row.IdCliente}@migrated.local`;
      }
      return e;
    } },
    { from: 'Telefono',    to: 'phone',      verify: 'exact' },
    { from: 'Direccion',   to: 'address',    verify: 'exact' },
    { from: 'EsActivo',    to: 'deleted_at', transform: (v) => Number(v) ? null : new Date(), verify: 'ignore' },
    // Legacy FechaCreacion is NULL or the 1000-01-01 sentinel for every row in
    // the real dump; created_at is NOT NULL. Fall back to migration time.
    { from: 'FechaCreacion', to: 'created_at', transform: (v) => parseLegacyDate(v) ?? new Date(), verify: 'ignore' },
  ],
} satisfies Rule;
