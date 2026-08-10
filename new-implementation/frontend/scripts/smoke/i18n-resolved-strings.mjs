// Usage: node scripts/smoke/i18n-resolved-strings.mjs <git-rev>
//
// For every t('key') call site — including the t.rich('key', ...),
// t.markup('key', ...) and t.raw('key') variants — resolves the string it
// renders from that revision's catalog and prints {file: [strings]} as JSON.
// Diff two revisions to see whether a catalog refactor changed any
// user-visible text.
//
// This is the check `global.ts` cannot do. Typing every t() against the catalog
// proves a key EXISTS; it cannot prove a key move left the rendered text alone.
// Run it either side of any consolidation that moves keys between namespaces.
//
// Two known limits, both benign:
//   - attribution is per-file, so a string rendered through a shared hook
//     (see hooks/useRelativeTime.ts) reads as removed from its consumers;
//   - the namespace map must use Object.create(null) — a plain {} inherits
//     Object.prototype.toLocaleString, and `toLocaleString('es-CO')` then
//     parses as a translation call.
import { execFileSync } from 'node:child_process';

const rev = process.argv[2];
if (!rev) {
  console.error('Usage: node scripts/smoke/i18n-resolved-strings.mjs <git-rev>');
  process.exit(1);
}
const run = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const cat = JSON.parse(run(['show', `${rev}:new-implementation/frontend/messages/es.json`]));
const lookup = (key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), cat);

const files = run(['ls-tree', '-r', '--name-only', rev, 'new-implementation/frontend/'])
  .split('\n').filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

const out = new Map();
for (const f of files) {
  let src;
  try { src = run(['show', `${rev}:${f}`]); } catch { continue; }
  if (!src.includes('useTranslations')) continue;
  // namespace per variable: const t = useTranslations('ns')
  const ns = Object.create(null);
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g)) ns[m[1]] = m[2];
  for (const m of src.matchAll(/\b(\w+)(?:\.(?:rich|markup|raw))?\(\s*'([^']+)'\s*[),]/g)) {
    const space = ns[m[1]];
    if (!space) continue;
    const key = `${space}.${m[2]}`;
    const val = lookup(key);
    const file = f.split('/frontend/')[1];
    if (!out.has(file)) out.set(file, []);
    out.get(file).push(val === undefined ? `<<MISSING:${key}>>` : String(val));
  }
}
console.log(JSON.stringify(Object.fromEntries([...out].map(([f,v])=>[f,v.sort()]).sort((a,b)=>(a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))), null, 0));
