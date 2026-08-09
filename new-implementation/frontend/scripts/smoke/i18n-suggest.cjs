// Usage: node scripts/smoke/i18n-suggest.cjs <file.tsx> [...]
// Prints one line per literal: REUSE <existing.key> when the exact string is
// already a value in es.json, otherwise NEW. Reusing beats authoring a synonym
// that later drifts from its twin.
const fs = require('fs');

const es = JSON.parse(fs.readFileSync('messages/es.json', 'utf8'));
const byValue = {};
(function walk(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') walk(v, `${prefix}${k}.`);
    else if (typeof v === 'string' && !(v.trim() in byValue)) byValue[v.trim()] = `${prefix}${k}`;
  }
})(es, '');

const HAS_LETTERS = /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  const found = new Set();
  for (const m of src.matchAll(/>([^<>{}\n]{3,60})</g)) if (HAS_LETTERS.test(m[1])) found.add(m[1].trim());
  for (const m of src.matchAll(/(?:placeholder|aria-label|title)="([^"]{2,60})"/g)) if (HAS_LETTERS.test(m[1])) found.add(m[1].trim());
  for (const lit of found) {
    const key = byValue[lit];
    console.log(`${(key ? `REUSE ${key}` : 'NEW').padEnd(30)} ${file}  ${JSON.stringify(lit)}`);
  }
}
