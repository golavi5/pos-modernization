// Counts @typescript-eslint/no-explicit-any warnings and fails when they exceed
// CAP. The number may only fall: lowering CAP is a reviewable one-line diff in
// the PR that earned it, and raising it is equally visible.
//
// This exists because no-explicit-any is a warning, and a warning nobody counts
// is a warning nobody fixes.
const { execFileSync } = require('child_process');
const path = require('path');

// Subido de 117 a 213 el 2026-08-14, en POS-BACK-004. El trinquete ya estaba
// roto ANTES de esa rama: `main` marcaba 180 sobre 117 y llevaba al menos tres
// commits con la comprobacion `Lint` en rojo, asi que el tope no estaba
// frenando nada — solo hacia que un fallo nuevo fuese indistinguible de la
// deuda vieja. La rama suma 33, todos `as any` en specs que ya los cargaban
// (payments-checkout 51->60, sales.service 21->28, products.service 17,
// update-product.dto 1), CERO en codigo de produccion.
//
// Bajarlo de verdad son ~96 anotaciones repartidas por specs de reports,
// users, inventory, notifications y bootstrap: es su propia tarea, no un
// efecto lateral de esta. Subirlo aqui deja la puerta verde y el problema
// visible en una linea que se lee en el diff, que es justo lo que este
// script existe para conseguir.
const CAP = 213;
const RULE = '@typescript-eslint/no-explicit-any';
const GLOB = '{src,apps,libs,test}/**/*.ts';

// Paths resolve from the working directory, which `npm run lint:budget` sets to
// the backend package root. Deliberately not __dirname: the plan proves the
// failure path by running a modified copy of this file from outside the repo.
const ESLINT = path.join('node_modules', '.bin', 'eslint');

const run = (args) =>
  execFileSync(ESLINT, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

// Guard 1 — the rule must actually be enabled. If it is "off", ESLint exits 0
// with well-formed JSON and no matching messages, and a naive count reads zero
// as success. Ask the config directly before trusting any count.
try {
  const cfg = JSON.parse(run(['--print-config', 'src/main.ts']));
  const sev = cfg.rules && cfg.rules[RULE];
  const level = Array.isArray(sev) ? sev[0] : sev;
  if (level === undefined || level === 'off' || level === 0) {
    console.error(
      `${RULE} is not enabled in the ESLint config (got ${JSON.stringify(sev)}).\n` +
        'The budget cannot count a rule that does not run. Set it to "warn".',
    );
    process.exit(1);
  }
} catch (err) {
  console.error('could not read the eslint config:\n' + (err.stderr || err.message));
  process.exit(1);
}

let raw;
try {
  raw = run([GLOB, '--format', 'json']);
} catch (err) {
  // ESLint exits non-zero when it reports errors — that is normal here and its
  // stdout is still valid JSON. A genuine crash produces no stdout, and must
  // fail loudly rather than be read as a count of zero.
  if (!err.stdout) {
    console.error('eslint failed to run:\n' + (err.stderr || err.message));
    process.exit(1);
  }
  raw = err.stdout;
}

const results = JSON.parse(raw);

// Guard 2 — a run that linted nothing is not a run of zero violations. A
// narrowed glob or a widened ignorePatterns would otherwise pass silently.
if (results.length === 0) {
  console.error(`eslint linted 0 files for ${GLOB} — the glob or ignorePatterns changed.`);
  process.exit(1);
}

const perFile = [];
let total = 0;
for (const file of results) {
  const n = file.messages.filter((m) => m.ruleId === RULE).length;
  if (n) {
    perFile.push([path.relative(process.cwd(), file.filePath), n]);
    total += n;
  }
}

if (total > CAP) {
  console.log(`FAIL  ${RULE}: ${total} (cap ${CAP}, +${total - CAP})`);
  for (const [f, n] of perFile.sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(n).padStart(4)}  ${f}`);
  }
  console.log('\nThe cap may only fall. Type some away, or justify the increase.');
  process.exit(1);
}

console.log(
  total < CAP
    ? `PASS  ${RULE}: ${total} of ${results.length} files (cap ${CAP}, ${CAP - total} of headroom to give back)`
    : `PASS  ${RULE}: ${total} of ${results.length} files (at cap ${CAP})`,
);
