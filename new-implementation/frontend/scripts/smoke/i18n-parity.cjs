// Every key in one catalog must exist in the other. SPEC-FRONT-002 will add
// ~20 more translated files; this keeps them from drifting.
// `.cjs` on purpose: uses require()/__dirname, which don't exist in `.mjs`.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '..', 'messages');
const es = JSON.parse(fs.readFileSync(path.join(dir, 'es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const esKeys = new Set(flatten(es));
const enKeys = new Set(flatten(en));
const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));
const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));

if (missingInEn.length) console.log('missing in en.json:', missingInEn);
if (missingInEs.length) console.log('missing in es.json:', missingInEs);
console.log(missingInEn.length || missingInEs.length ? 'FAIL' : `PASS  ${esKeys.size} keys in sync`);
process.exit(missingInEn.length || missingInEs.length ? 1 : 0);
