// Fails on any .tsx that carries user-facing strings without calling
// useTranslations. ALLOWLIST holds the files that already do, so the gate can
// be blocking while the sweep is still in progress.
//
// THE ALLOWLIST MAY ONLY SHRINK. Each domain batch of SPEC-FRONT-002 deletes its
// own files. An addition means something went backwards.
//
// Known limitation: a file that calls useTranslations is exempt entirely, so a
// partially-translated file passes. Catching those needs per-string analysis;
// this check is deliberately the cheap version that cannot produce false alarms
// on translated files.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIRS = ['app', 'components'];

const ALLOWLIST = new Set([
  'app/(panel)/dashboard/page.tsx',
  'app/(panel)/notifications/page.tsx',
  'app/(panel)/settings/page.tsx',
  'components/dashboard/QuickActions.tsx',
  'components/layout/AuthLayout.tsx',
  'components/notifications/NotificationBell.tsx',
  'components/theme/ThemeToggle.tsx',
  'components/ui/slide-over.tsx',
]);

const HAS_LETTERS = /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function literals(src) {
  const found = [];
  for (const m of src.matchAll(/>([^<>{}\n]{3,60})</g)) {
    if (HAS_LETTERS.test(m[1])) found.push(m[1].trim());
  }
  for (const m of src.matchAll(/(?:placeholder|aria-label|title)="([^"]{2,60})"/g)) {
    if (HAS_LETTERS.test(m[1])) found.push(m[1].trim());
  }
  return [...new Set(found)];
}

let violations = 0;
let stale = 0;

for (const dir of DIRS) {
  for (const abs of walk(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const src = fs.readFileSync(abs, 'utf8');
    const found = src.includes('useTranslations') ? [] : literals(src);
    const listed = ALLOWLIST.has(rel);

    if (found.length && !listed) {
      violations++;
      console.log(`FAIL  ${rel}: ${found.length} hardcoded string(s), no useTranslations`);
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
