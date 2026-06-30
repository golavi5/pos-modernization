import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { MIGRATION_UUID_NAMESPACE, type IdMap } from '../types/Rule.js';

/**
 * Deterministic identity: the same (source, legacyId) always yields the same
 * UUID, across processes and runs. This is what makes `import` idempotent —
 * re-running upserts the same id rather than inserting a duplicate.
 */
export function deterministicId(source: string, legacyId: unknown): string {
  return uuidv5(`${source}:${String(legacyId)}`, MIGRATION_UUID_NAMESPACE);
}

/** Resolve the target PK for a legacy row according to the rule's IdMap. */
export function resolveId(
  idMap: IdMap,
  source: string,
  row: Record<string, unknown>,
): string {
  if (idMap.newKey === 'uuid-v4') return uuidv4();
  return deterministicId(source, row[idMap.legacyKey]);
}
