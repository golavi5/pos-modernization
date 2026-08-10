// Usage: node scripts/smoke/i18n-suggest.cjs <file.tsx> [...]
// Prints one line per literal: REUSE <existing.key> when the exact string is
// already a value in es.json, otherwise NEW. Reusing beats authoring a synonym
// that later drifts from its twin.
const fs = require('fs');
const path = require('path');
const { literals } = require('./i18n-detect.cjs');

const es = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'messages', 'es.json'), 'utf8'),
);
const byValue = {};
(function walk(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') walk(v, `${prefix}${k}.`);
    else if (typeof v === 'string' && !(v.trim() in byValue)) byValue[v.trim()] = `${prefix}${k}`;
  }
})(es, '');

for (const file of process.argv.slice(2)) {
  for (const lit of literals(fs.readFileSync(file, 'utf8'))) {
    const key = byValue[lit];
    console.log(`${(key ? `REUSE ${key}` : 'NEW').padEnd(30)} ${file}  ${JSON.stringify(lit)}`);
  }
}
