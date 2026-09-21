#!/usr/bin/env node
// TEMPORARY — Target #4 diagnostic only. Delete with the exception it proves.
//
// Mutation checks for the scoped worker-input exception in
// .github/workflows/rcap-hosted-acceptance-staging.yml.
//
// The point of this verifier is that it does not re-implement the decision.
// It extracts the EXACT shell function that ships in the workflow, together
// with the four TARGET4_* constants the workflow defines, and runs those bytes
// under bash with mutated arguments. A future edit that widens the exception
// and forgets to update this file will therefore fail here rather than pass a
// stale copy of the old logic.
//
// What it proves:
//   1. the exact four-path delta passes, under the exact application SHA,
//      worker source, digest and each allowed phase;
//   2. adding a fifth changed worker-input path refuses;
//   3. removing one of the four refuses;
//   4. renaming one of the four to a substitute refuses;
//   5. changing the application SHA refuses;
//   6. changing the worker source SHA refuses;
//   7. changing the worker digest refuses;
//   8. every other phase -- payment, full, browser, clinic_preview,
//      production-shaped names and the empty string -- refuses;
//   9. the live repository's own measured delta is the admitted delta, so the
//      exception is not admitting a set the tree does not actually produce.

import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const WORKFLOW = '.github/workflows/rcap-hosted-acceptance-staging.yml';
const BEGIN = '--- target4-diagnostic-exception:begin ---';
const END = '--- target4-diagnostic-exception:end ---';

const yaml = readFileSync(WORKFLOW, 'utf8');

// --- extract the shipped function ------------------------------------------
const begin = yaml.indexOf(BEGIN);
const end = yaml.indexOf(END);
if (begin < 0 || end < 0 || end < begin) {
  throw new Error(`${WORKFLOW} no longer carries the delimited exception block`);
}
const blockLines = yaml.slice(yaml.indexOf('\n', begin) + 1, yaml.lastIndexOf('\n', end)).split('\n');
// The block sits inside a YAML block scalar, indented. Strip the common indent
// so bash sees an ordinary function definition.
const indent = Math.min(...blockLines.filter(l => l.trim()).map(l => l.length - l.trimStart().length));
const shellFunction = blockLines.map(l => l.slice(indent)).join('\n');
if (!/^\s*target4_diagnostic_exception_applies\(\)/m.test(shellFunction)) {
  throw new Error('the delimited block does not define target4_diagnostic_exception_applies');
}

// --- extract the four constants the workflow defines ------------------------
const scalar = (name) => {
  const m = new RegExp(`^  ${name}: (.+)$`, 'm').exec(yaml);
  if (!m) throw new Error(`${WORKFLOW} does not define ${name}`);
  return m[1].trim();
};
const APPLICATION_SHA = scalar('TARGET4_DIAGNOSTIC_APPLICATION_SHA');
const WORKER_SOURCE_SHA = scalar('TARGET4_DIAGNOSTIC_WORKER_SOURCE_SHA');
const WORKER_DIGEST = scalar('TARGET4_DIAGNOSTIC_WORKER_DIGEST');

const deltaBlock = /^  TARGET4_DIAGNOSTIC_WORKER_INPUT_DELTA: \|-\n((?:^    .*\n)+)/m.exec(yaml);
if (!deltaBlock) throw new Error(`${WORKFLOW} does not define TARGET4_DIAGNOSTIC_WORKER_INPUT_DELTA`);
const DELTA = deltaBlock[1].split('\n').filter(Boolean).map(l => l.slice(4)).join('\n');
const DELTA_PATHS = DELTA.split('\n');

// --- the harness: run the shipped bytes -------------------------------------
const run = (args, env = {}) => {
  const script = [
    'set -u',
    `TARGET4_DIAGNOSTIC_APPLICATION_SHA=${JSON.stringify(env.app ?? APPLICATION_SHA)}`,
    `TARGET4_DIAGNOSTIC_WORKER_SOURCE_SHA=${JSON.stringify(env.worker ?? WORKER_SOURCE_SHA)}`,
    `TARGET4_DIAGNOSTIC_WORKER_DIGEST=${JSON.stringify(env.digest ?? WORKER_DIGEST)}`,
    `TARGET4_DIAGNOSTIC_WORKER_INPUT_DELTA=${JSON.stringify(env.delta ?? DELTA)}`,
    shellFunction,
    `if target4_diagnostic_exception_applies ${args.map(a => JSON.stringify(a)).join(' ')}; then echo ADMITTED; else echo REFUSED; fi`
  ].join('\n');
  return execFileSync('bash', ['-c', script], {encoding: 'utf8'}).trim();
};

let failures = 0;
let checks = 0;
const expect = (label, actual, wanted) => {
  checks += 1;
  if (actual === wanted) {
    console.log(`  ok        ${label}`);
  } else {
    console.log(`  FAILED    ${label} — expected ${wanted}, observed ${actual}`);
    failures += 1;
  }
};

const ALLOWED_PHASES = ['replace_preview', 'checkout_gate'];
const args = (over = {}) => [
  over.app ?? APPLICATION_SHA,
  over.worker ?? WORKER_SOURCE_SHA,
  over.digest ?? WORKER_DIGEST,
  over.phase ?? 'replace_preview',
  over.delta ?? DELTA
];

console.log('Target #4 diagnostic worker-input exception — mutation checks');
console.log(`  extracted from ${WORKFLOW}`);
console.log(`  application ${APPLICATION_SHA}`);
console.log(`  delta       ${DELTA_PATHS.length} path(s)\n`);

// 1 — the authorized combination, for each allowed phase.
console.log('1. the exact four-path delta under the exact diagnostic inputs');
for (const phase of ALLOWED_PHASES) {
  expect(`phase ${phase} admits the exact delta`, run(args({phase})), 'ADMITTED');
}

// 2 — a fifth changed worker-input path.
console.log('\n2. a fifth changed worker-input path refuses');
for (const extra of [
  'src/lib/rcap/documents/packet-route-resolver.ts',
  'package.json',
  'scripts/rcap-render-worker.mjs',
  'scripts/lib/rcap-render-shared.mjs',
  'deploy/rcap-render-worker/Dockerfile'
]) {
  const widened = [...DELTA_PATHS, extra].sort().join('\n');
  expect(`delta + ${extra}`, run(args({delta: widened})), 'REFUSED');
}

// 3 — a missing path.
console.log('\n3. a missing path refuses (no partial-delta admission)');
for (const dropped of DELTA_PATHS) {
  const narrowed = DELTA_PATHS.filter(p => p !== dropped).join('\n');
  expect(`delta without ${dropped}`, run(args({delta: narrowed})), 'REFUSED');
}
expect('an empty delta', run(args({delta: ''})), 'REFUSED');

// 4 — a renamed substitute.
console.log('\n4. a renamed substitute refuses');
for (const original of DELTA_PATHS) {
  const substitute = original.replace(/\.ts$/, '.renamed.ts');
  const swapped = [...DELTA_PATHS.filter(p => p !== original), substitute].sort().join('\n');
  expect(`${original} -> ${substitute}`, run(args({delta: swapped})), 'REFUSED');
}

// 5 — a different application SHA.
console.log('\n5. a different application SHA refuses');
for (const sha of [
  '884ad51d0ad50c520ec0ba2834eac03194ce88ac',
  '8f3a789170000000000000000000000000000000',
  'd7a81d46b71d500b32d62cdac54808d9b1f2b157',
  APPLICATION_SHA.slice(0, 39) + '1',
  APPLICATION_SHA.slice(0, 7),
  APPLICATION_SHA.toUpperCase(),
  ''
]) {
  expect(`application ${sha || '(empty)'}`, run(args({app: sha})), 'REFUSED');
}

// 6 — a different worker source SHA.
console.log('\n6. a different worker source SHA refuses');
for (const sha of ['c88f10341000000000000000000000000000000a', WORKER_SOURCE_SHA.slice(0, 39) + '1', '']) {
  expect(`worker source ${sha || '(empty)'}`, run(args({worker: sha})), 'REFUSED');
}

// 7 — a different worker digest.
console.log('\n7. a different worker digest refuses');
for (const digest of [
  'sha256:df6c2965000000000000000000000000000000000000000000000000000000aa',
  WORKER_DIGEST.slice(0, -1) + '0',
  WORKER_DIGEST.replace('sha256:', ''),
  ''
]) {
  expect(`digest ${digest || '(empty)'}`, run(args({digest})), 'REFUSED');
}

// 8 — every other phase.
console.log('\n8. every phase outside replace_preview / checkout_gate refuses');
for (const phase of [
  'payment', 'full', 'browser', 'clinic_preview', 'clinic_migrate', 'legal_aid_browser',
  'legal_aid_migrate', 'deploy', 'accept', 'stripe_retarget', 'migrate', 'worker_contract',
  'preflight', 'vercel_identity', 'vercel_audit',
  'production_smoke', 'production_activate', 'production_worker_deploy',
  'production_live_zero_dollar_order', 'production_public_verify',
  'replace_preview ', ' checkout_gate', 'Replace_Preview', 'checkout_gate;payment', '*', ''
]) {
  expect(`phase ${JSON.stringify(phase)}`, run(args({phase})), 'REFUSED');
}

// 9 — the admitted delta is the delta the real tree produces.
console.log('\n9. the admitted delta equals the repository\'s measured delta');
const PATHSPEC = [
  'package.json', 'package-lock.json', 'tsconfig.json', 'scripts/rcap-render-worker.mjs',
  'deploy/rcap-render-worker/Dockerfile', 'scripts/lib', 'src',
  'data/record-clearing/supplemental-guides', 'data/record-clearing/brand/legalease-logo.png',
  ':(exclude)src/lib/clinic-mode/result-follow-up.ts'
];
let measured = null;
try {
  measured = execFileSync('git', [
    'diff', '--name-only', '--no-renames', WORKER_SOURCE_SHA, APPLICATION_SHA, '--', ...PATHSPEC
  ], {encoding: 'utf8'}).split('\n').filter(Boolean).sort().join('\n');
} catch {
  console.log('  SKIPPED   both commits are not present in this checkout; the delta was not re-measured');
}
if (measured !== null) {
  expect('measured worker-input delta matches the admitted constant', measured, DELTA);
  expect('the measured delta is admitted by the shipped function', run(args({delta: measured})), 'ADMITTED');
}

// 10 — the strict refusal still ships verbatim, for every other input.
console.log('\n10. the unchanged strict refusal still ships');
expect(
  'the original refusal message is still the failure path',
  yaml.includes('::error::final application changes canonical worker inputs; build and pin one new full-SHA image') ? 'PRESENT' : 'ABSENT',
  'PRESENT'
);
expect(
  'preflight and vercel_identity remain outside the worker-input comparison entirely',
  /if \[ "\$\{\{ inputs\.phase \}\}" != "preflight" \] && \[ "\$\{\{ inputs\.phase \}\}" != "vercel_identity" \]; then/.test(yaml) ? 'PRESENT' : 'ABSENT',
  'PRESENT'
);
expect(
  'the application-bytes equivalence check is untouched and unconditional',
  /git diff --quiet "\$\{\{ inputs\.application_sha \}\}" "\$\{\{ inputs\.tools_sha \}\}" -- src package\.json[^\n]*\n\s*\|\| \{ echo "::error::tools_sha differs from application_sha on application bytes"/.test(yaml) ? 'PRESENT' : 'ABSENT',
  'PRESENT'
);
expect(
  'the tools/application worker-input check is untouched',
  yaml.includes('::error::workflow tools differ from the final application on worker inputs') ? 'PRESENT' : 'ABSENT',
  'PRESENT'
);
expect(
  'the canonical-history ancestry refusal is untouched',
  yaml.includes('::error::$SHA is outside the canonical integration history') ? 'PRESENT' : 'ABSENT',
  'PRESENT'
);
expect(
  'the tools_sha == workflow source pin is untouched',
  yaml.includes('::error::tools_sha must equal the workflow source SHA') ? 'PRESENT' : 'ABSENT',
  'PRESENT'
);
expect(
  'the acceptance Supabase project pin is untouched',
  yaml.includes('::error::supabase_project_ref is not the authorized acceptance project') ? 'PRESENT' : 'ABSENT',
  'PRESENT'
);
expect(
  'the authorized worker source and digest refusals are untouched',
  yaml.includes('::error::worker_source_sha is not the authorized value') &&
  yaml.includes('::error::worker_digest is not the authorized value') ? 'PRESENT' : 'ABSENT',
  'PRESENT'
);
expect(
  'the exception reads no input other than the five arguments',
  /target4_diagnostic_exception_applies\(\) \{[\s\S]*?\n\s*\}/.exec(shellFunction)[0]
    .match(/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g)
    .every(v => /^\$\{?(1|2|3|4|5|TARGET4_DIAGNOSTIC_(APPLICATION_SHA|WORKER_SOURCE_SHA|WORKER_DIGEST|WORKER_INPUT_DELTA))\}?$/.test(v))
    ? 'CLOSED' : 'OPEN',
  'CLOSED'
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
