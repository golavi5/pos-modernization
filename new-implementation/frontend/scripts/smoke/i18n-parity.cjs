// Every key in one catalog must exist in the other, with the same ICU
// placeholders and the same rich-text tags.
//
// Key symmetry alone is not enough: renaming `{min}` to `{minutes}` in one
// locale keeps both catalogs symmetric, and next-intl then throws
// MISSING_FORMAT_VALUE and renders an error string — for that locale only.
// Dropping a `<b>` that a `t.rich` call supplies fails the same way.
//
// `.cjs` on purpose: uses require()/__dirname, which don't exist in `.mjs`.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '..', 'messages');
const es = JSON.parse(fs.readFileSync(path.join(dir, 'es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') flatten(v, `${prefix}${k}.`, out);
    else out[`${prefix}${k}`] = v;
  }
  return out;
};

// `{count}` / `{count, plural, …}` → count. Rich tags `<b>…</b>` → b.
const placeholders = (v) =>
  new Set([...String(v).matchAll(/\{\s*(\w+)/g)].map((m) => m[1]));
const tags = (v) => new Set([...String(v).matchAll(/<(\w+)>/g)].map((m) => m[1]));

const esFlat = flatten(es);
const enFlat = flatten(en);
const esKeys = new Set(Object.keys(esFlat));
const enKeys = new Set(Object.keys(enFlat));

const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));
const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));

const diff = (a, b) => [...a].filter((x) => !b.has(x));
const mismatched = [];
for (const k of esKeys) {
  if (!enKeys.has(k)) continue;
  for (const [what, extract] of [['placeholder', placeholders], ['tag', tags]]) {
    const inEs = extract(esFlat[k]);
    const inEn = extract(enFlat[k]);
    const onlyEs = diff(inEs, inEn);
    const onlyEn = diff(inEn, inEs);
    if (onlyEs.length || onlyEn.length) {
      mismatched.push(
        `${k}: ${what}s only in es.json [${onlyEs}], only in en.json [${onlyEn}]`,
      );
    }
  }
}

if (missingInEn.length) console.log('missing in en.json:', missingInEn);
if (missingInEs.length) console.log('missing in es.json:', missingInEs);
for (const m of mismatched) console.log('mismatch:', m);

const failed = missingInEn.length || missingInEs.length || mismatched.length;
console.log(failed ? 'FAIL' : `PASS  ${esKeys.size} keys in sync (placeholders and tags included)`);
process.exit(failed ? 1 : 0);
