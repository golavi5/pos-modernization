// Fails on any .tsx that carries a user-facing string literal. ALLOWLIST holds
// the files that already do, so the gate can be blocking while a sweep is still
// in progress.
//
// THE ALLOWLIST MAY ONLY SHRINK. Each domain batch of SPEC-FRONT-002 deletes its
// own files. An addition means something went backwards.
//
// The check is per-string, not per-file. It used to exempt a whole file the
// moment `useTranslations` appeared anywhere in it, which meant a
// partially-translated file passed: `Sidebar.tsx` shipped a hardcoded
// "Cerrar sesión" on every panel page while the gate reported PASS with an
// empty allowlist. The detector lives in `i18n-detect.cjs` — see the comment
// there for why it anchors on tags rather than on a bare `>`.
const fs = require('fs');
const path = require('path');
const { literals } = require('./i18n-detect.cjs');

const ROOT = path.join(__dirname, '..', '..');
const DIRS = ['app', 'components'];

const ALLOWLIST = new Set([]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

let violations = 0;
let stale = 0;

for (const dir of DIRS) {
  for (const abs of walk(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const found = literals(fs.readFileSync(abs, 'utf8'));
    const listed = ALLOWLIST.has(rel);

    if (found.length && !listed) {
      violations++;
      console.log(`FAIL  ${rel}: ${found.length} hardcoded string(s)`);
      for (const l of found.slice(0, 5)) console.log(`        ${JSON.stringify(l)}`);
    } else if (!found.length && listed) {
      stale++;
      console.log(`STALE ${rel}: allowlisted but clean — delete it from ALLOWLIST`);
    }
  }
}

if (violations || stale) {
  console.log(`FAIL  ${violations} offending file(s), ${stale} stale allowlist entr(ies)`);
  process.exit(1);
}
console.log(`PASS  no hardcoded strings outside the allowlist (${ALLOWLIST.size} remaining)`);
