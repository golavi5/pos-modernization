// Compiled-smoke harness: the frontend has no unit runner, so pure logic is
// compiled with tsc and exercised here. See the plan (Task 3 Step 2) for the
// compile command.
// `.cjs` on purpose: this file uses require(), which does not exist in the
// ESM context Node gives `.mjs` files.
const Module = require('module');
const OUT = process.env.SMOKE_OUT;
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req.startsWith('@/')) req = OUT + '/' + req.slice(2);
  return orig.call(this, req, ...rest);
};

const { findNavLabelKey } = require(OUT + '/lib/navigation/nav-items.js');

let fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got ${got}, want ${want}`}`);
};

check('exact route', findNavLabelKey('/sales'), 'sales');
check('nested route', findNavLabelKey('/products/123/edit'), 'products');
check('settings is matched too', findNavLabelKey('/settings'), 'settings');
check('unknown route', findNavLabelKey('/nope'), undefined);
check('root', findNavLabelKey('/'), undefined);
check('prefix is not a false match', findNavLabelKey('/salesperson'), undefined);

process.exit(fail ? 1 : 0);
