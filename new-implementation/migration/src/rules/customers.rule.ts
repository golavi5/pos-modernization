import type { MapRule } from '../types/Rule.js';
import { lowerTrim, trimStr, parseDotNetDate, deletedFlagToTimestamp } from '../core/transforms.js';
import { MIGRATION_COMPANY_ID } from './_constants.js';

/**
 * Legacy `tblCustomers` → new `customers`.
 *
 * The new `id` (uuid PK) is resolved by the import runner via the rule's
 * `idMap` (deterministic uuidv5 of source + CustomerID). `legacy_id` carries
 * the original PK so `verify` can join legacy → new.
 */
const rule: MapRule = {
  kind: 'map',
  source: 'tblCustomers',
  target: 'customers',
  idMap: { legacyKey: 'CustomerID', newKey: 'deterministic' },
  fields: [
    { from: 'CustomerID', to: 'legacy_id', transform: (v) => String(v), verify: 'exact' },
    { from: 'CustomerID', to: 'company_id', transform: () => MIGRATION_COMPANY_ID, verify: 'exact' },
    { from: 'FullName', to: 'name', transform: trimStr, verify: 'exact' },
    { from: 'Email', to: 'email', transform: lowerTrim, verify: 'exact' },
    { from: 'Phone', to: 'phone', transform: trimStr, verify: 'exact' },
    { from: 'Address', to: 'address', transform: trimStr, verify: 'exact' },
    { from: 'CreatedOn', to: 'created_at', transform: parseDotNetDate, verify: 'exact' },
    // soft-delete representation changes shape → migrate but don't diff.
    { from: 'IsDeleted', to: 'deleted_at', transform: (v) => deletedFlagToTimestamp(v), verify: 'ignore' },
  ],
};

export default rule;
