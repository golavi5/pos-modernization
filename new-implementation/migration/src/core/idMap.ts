import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import type { IdMap } from '../types/Rule.js';

export const MIGRATION_NAMESPACE = '2d0839ad-791f-5121-8037-2234048d3e62';

export function deterministicId(source: string, legacyPk: string | number): string {
  return uuidv5(`${source}:${String(legacyPk)}`, MIGRATION_NAMESPACE);
}
export function newId(idMap: IdMap, source: string, pk: string | number): string {
  return idMap.newKey === 'deterministic' ? deterministicId(source, pk) : uuidv4();
}
