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
 * Read the argument list of the `@Roles(` occurrence starting at `open` (the
 * index of the `(`), balancing nested parentheses and skipping over quoted
 * strings. A regex like /@Roles\(([^)]*)\)/ stops at the first `)`, which for
 * `@Roles(...Object.values(MAP), 'wizard')` truncates the list mid-argument —
 * fabricating an offender out of the callee and never inspecting 'wizard'.
 */
function readArgList(src: string, open: number): { args: string; end: number } {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return { args: src.slice(open + 1, i), end: i };
    }
  }
  return { args: src.slice(open + 1), end: src.length };
}

/** Split an argument list on top-level commas only (ignoring nested ones). */
function splitArgs(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      out.push(args.slice(start, i));
      start = i + 1;
    }
  }
  out.push(args.slice(start));
  return out.map((a) => a.trim()).filter(Boolean);
}

/**
 * Extract every role name referenced by @Roles(...) in a source string.
 * Handles single-quoted, double-quoted, and AUTH_CONSTANTS.* referenced args.
 * An unresolvable constant reference yields the literal token so it surfaces
 * as an offender against the canonical set.
 *
 * A computed argument (spread, call, array — anything not a literal or a plain
 * dotted reference) is skipped: the extractor cannot resolve it statically, and
 * guessing would either fabricate offenders out of callee names or hide the
 * literals sitting beside it.
 */
export function extractRoleNames(src: string): string[] {
  const names: string[] = [];
  const marker = '@Roles(';
  for (let at = src.indexOf(marker); at !== -1; at = src.indexOf(marker, at + 1)) {
    const { args } = readArgList(src, at + marker.length - 1);
    for (const arg of splitArgs(args)) {
      // A quoted literal spanning the whole argument — a comma inside it must
      // not split the token (@Roles('a,b')), which top-level splitting ensures.
      const quoted = /^'([^']*)'$|^"([^"]*)"$/.exec(arg);
      if (quoted) {
        names.push(quoted[1] ?? quoted[2]);
        continue;
      }
      // A plain dotted reference: resolved if it points at AUTH_CONSTANTS,
      // otherwise surfaced verbatim so unresolvable drift shows up.
      if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(arg)) {
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

  it('does not split a comma inside a quoted role name', () => {
    // Guards against the naive comma-split that would drop the token entirely.
    expect(extractRoleNames(`@Roles('a,b')`)).toEqual(['a,b']);
  });

  describe('arguments containing parentheses', () => {
    const nested = `@Roles(...Object.values(SOME_MAP), 'wizard')`;

    it('still reaches role literals after a nested call', () => {
      // A regex stopping at the first ')' would never inspect 'wizard' — real
      // drift would pass the guard.
      expect(extractRoleNames(nested)).toContain('wizard');
    });

    it('does not report a nested callee as a role', () => {
      // ...and would report 'Object.values' as an offender, failing good code.
      expect(extractRoleNames(nested)).not.toContain('Object.values');
    });

    it('skips a computed argument rather than guessing at its contents', () => {
      // The extractor cannot statically resolve a spread, so it reports nothing
      // for it — but must not let that hide the literals beside it.
      expect(extractRoleNames(nested)).toEqual(['wizard']);
    });

    it('still resolves constant refs alongside a computed argument', () => {
      expect(
        extractRoleNames(
          `@Roles(...Object.values(SOME_MAP), AUTH_CONSTANTS.ROLES.CASHIER)`,
        ),
      ).toEqual([AUTH_CONSTANTS.ROLES.CASHIER]);
    });
  });
});

describe('@Roles decorator role names', () => {
  const canonical = new Set(SYSTEM_ROLES.map((r) => r.name));
  // Scan from `src`, not `src/modules`: controllers also live at the top level
  // (e.g. `src/app.controller.ts`), and a guard that skips them reports green on
  // real drift.
  const srcDir = join(__dirname, '..', '..', '..');
  const files = walk(srcDir);

  it('scans controllers outside src/modules', () => {
    expect(files).toContain(join(srcDir, 'app.controller.ts'));
  });

  it('scans controllers inside src/modules', () => {
    expect(files).toContain(
      join(srcDir, 'modules', 'companies', 'companies.controller.ts'),
    );
  });

  it('references only defined system roles', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const name of extractRoleNames(src)) {
        if (!canonical.has(name)) {
          offenders.push(`${file.replace(srcDir, 'src')}: '${name}'`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
