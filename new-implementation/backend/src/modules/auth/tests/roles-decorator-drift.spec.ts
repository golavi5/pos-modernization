// roles-decorator-drift.spec.ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { SYSTEM_ROLES } from '../constants/system-roles';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

describe('@Roles decorator role names', () => {
  const canonical = new Set(SYSTEM_ROLES.map((r) => r.name));
  const modulesDir = join(__dirname, '..', '..'); // src/modules
  const files = walk(modulesDir);

  it('references only defined system roles', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/@Roles\(([^)]*)\)/g)) {
        for (const nameMatch of m[1].matchAll(/'([^']+)'/g)) {
          if (!canonical.has(nameMatch[1])) {
            offenders.push(`${file.replace(modulesDir, 'modules')}: '${nameMatch[1]}'`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
