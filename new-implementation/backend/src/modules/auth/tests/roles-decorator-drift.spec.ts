// roles-decorator-drift.spec.ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { SYSTEM_ROLES } from '../constants/system-roles';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

/**
 * Resolve a dotted constant reference (e.g. "AUTH_CONSTANTS.ROLES.CASHIER")
 * to its string value. Returns undefined if the path doesn't resolve — the
 * caller treats an unresolvable reference as an offender (that's the drift
 * the guard exists to catch).
 */
function resolveConst(path: string): string | undefined {
  const parts = path.split('.');
  if (parts[0] !== 'AUTH_CONSTANTS') return undefined;
  let cur: any = AUTH_CONSTANTS;
  for (const key of parts.slice(1)) {
    if (cur == null || typeof cur !== 'object' || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * Extract every role name referenced by @Roles(...) in a source string.
 * Handles single-quoted, double-quoted, and AUTH_CONSTANTS.* referenced args.
 * An unresolvable constant reference yields the literal token so it surfaces
 * as an offender against the canonical set.
 */
export function extractRoleNames(src: string): string[] {
  const names: string[] = [];
  for (const m of src.matchAll(/@Roles\(([^)]*)\)/g)) {
    const args = m[1];
    // Split on commas so each argument is inspected independently.
    for (const rawArg of args.split(',')) {
      const arg = rawArg.trim();
      if (!arg) continue;
      const quoted = arg.match(/^['"]([^'"]+)['"]$/);
      if (quoted) {
        names.push(quoted[1]);
        continue;
      }
      if (/^[A-Za-z_$][\w.$]*$/.test(arg)) {
        // Bare identifier / dotted constant reference.
        names.push(resolveConst(arg) ?? arg);
      }
    }
  }
  return names;
}

describe('extractRoleNames (drift-guard extractor)', () => {
  it('extracts single-quoted role names', () => {
    expect(extractRoleNames(`@Roles('admin', 'manager')`)).toEqual(['admin', 'manager']);
  });

  it('extracts double-quoted role names', () => {
    expect(extractRoleNames(`@Roles("manager")`)).toEqual(['manager']);
  });

  it('resolves AUTH_CONSTANTS.ROLES.* constant references', () => {
    expect(extractRoleNames(`@Roles(AUTH_CONSTANTS.ROLES.CASHIER)`)).toEqual([
      AUTH_CONSTANTS.ROLES.CASHIER,
    ]);
  });

  it('handles mixed quoting + constant refs in one decorator', () => {
    expect(
      extractRoleNames(`@Roles('admin', "manager", AUTH_CONSTANTS.ROLES.CASHIER)`),
    ).toEqual(['admin', 'manager', AUTH_CONSTANTS.ROLES.CASHIER]);
  });

  it('surfaces an unresolvable constant reference as its literal token', () => {
    expect(extractRoleNames(`@Roles(AUTH_CONSTANTS.ROLES.BOGUS)`)).toEqual([
      'AUTH_CONSTANTS.ROLES.BOGUS',
    ]);
  });

  it('surfaces an unknown quoted role', () => {
    expect(extractRoleNames(`@Roles('wizard')`)).toEqual(['wizard']);
  });
});

describe('@Roles decorator role names', () => {
  const canonical = new Set(SYSTEM_ROLES.map((r) => r.name));
  const modulesDir = join(__dirname, '..', '..'); // src/modules
  const files = walk(modulesDir);

  it('references only defined system roles', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const name of extractRoleNames(src)) {
        if (!canonical.has(name)) {
          offenders.push(`${file.replace(modulesDir, 'modules')}: '${name}'`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
