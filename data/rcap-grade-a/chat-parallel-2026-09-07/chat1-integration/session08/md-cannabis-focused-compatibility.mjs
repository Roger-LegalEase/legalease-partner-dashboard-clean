#!/usr/bin/env node
// Focused installed-code execution, not independent approval or a whole-candidate rebuild.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = process.cwd();
const evidence = path.join(root, 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08');
const reportPath = path.join(evidence, 'md-cannabis-focused-compatibility.json');
assert(!fs.existsSync(reportPath), 'FOCUSED_EXECUTION_ALREADY_RECORDED');
const load = name => JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = load('md-cannabis-preservation-before.json');
const installation = load('md-cannabis-installation.json');
const conviction = await import(pathToFileURL(path.join(root, 'scripts/rcap-packet-recovery/chat5/md-conviction.mjs')));
const cannabis = await import(pathToFileURL(path.join(root, 'scripts/rcap-packet-recovery/chat5/md-cannabis.mjs')));
const cf = conviction.convictionFixtures(), df = cannabis.cannabisFixtures();
const checks = [], executions = [], preserved = [];
async function check(name, run) {
  try { await run(); checks.push({name, passed: true}); }
  catch (error) { checks.push({name, passed: false, error: error.stack}); }
}

for (const row of before.predicates) await check('conviction predicate unchanged: ' + row.fixture, () => {
  assert.equal(sha(JSON.stringify(cf[row.fixture])), row.factsSha256);
  assert.deepEqual(conviction.validateMdConviction(cf[row.fixture]), row.result);
});
for (const [name, facts] of Object.entries(df)) await check('cannabis predicate: ' + name, () => {
  const result = cannabis.validateMdCannabis(facts);
  const archived = JSON.parse(fs.readFileSync(path.join(root, cannabis.OUT, 'reports', name + '.json')));
  assert.equal(result.mayMarkBasis, archived.mayMarkBasis);
  assert.equal(result.earliest, archived.earliest);
  assert.deepEqual(result.facts, facts);
});

// Changed default companion/source writer and extracted costs behavior are exercised
// on three conviction branches; the new importer uses two representative 072D branches.
// Existing complete author reruns remain reuse evidence for the other unchanged PDFs.
for (const [family, module, fixtures, name] of [
  ['conviction', conviction, cf, 'canonical'],
  ['conviction', conviction, cf, 'boundary'],
  ['conviction', conviction, cf, 'diagnostic/waiver-missing-financial'],
  ['cannabis', cannabis, df, 'canonical'],
  ['cannabis', cannabis, df, 'boundary'],
]) await check('actual changed-component native execution: ' + family + '/' + name, async () => {
  const actual = await (family === 'conviction' ? module.renderMdConviction : module.renderMdCannabis)(fixtures[name]);
  const retained = path.join(root, module.OUT, 'fixtures', name + '.pdf');
  const expected = fs.readFileSync(retained);
  const nativeReport = JSON.parse(fs.readFileSync(path.join(root, module.OUT, 'reports', name + '.json')));
  assert.deepEqual(actual.bytes, expected, 'WHOLE_OUTPUT_IDENTITY_CHANGED');
  assert.equal(actual.sha256, sha(expected));
  assert.equal(actual.pageCount, nativeReport.output.pageCount);
  assert.equal(actual.allKnownFactsPrepared, nativeReport.allKnownFactsPrepared);
  assert.deepEqual(actual.pageManifest, nativeReport.pageManifest);
  executions.push({family, fixture: name, functionExecuted: family === 'conviction' ? 'renderMdConviction' : 'renderMdCannabis',
    bytes: actual.bytes.length, sha256: actual.sha256, pages: actual.pageCount,
    matchesPreviouslyPublishedWholeOutput: true, allKnownFactsPrepared: actual.allKnownFactsPrepared,
    selectedComponents: actual.components.map(c => ({documentId: c.documentId, sha256: c.sha256, sourceSha256: c.source.sha256})),
    outputPersistedAgain: false});
});

const financialMutants = [
  ['financial inputs on paid branch', f => { f.financial = {}; }, /WAIVER_INPUT/, true],
  ['unrequested waiver', f => { delete f.options.prepaidWaiverRequested; }, /EXPLICIT_WAIVER/],
  ['unknown final election', f => { delete f.options.finalOpenCostsRequested; }, /EXPLICIT_FINAL/],
  ['negative income', f => { f.financial.income.wages = -1; }, /INVALID_CENTS/],
  ['fractional cents', f => { f.financial.income.wages = 0.5; }, /INVALID_CENTS/],
  ['inconsistent total', f => { f.financial.totalCents = 1; }, /TOTAL_MISMATCH/],
  ['unknown income category', f => { f.financial.income.snap = 10000; }, /UNKNOWN_INCOME/],
  ['unconfirmed property exclusion', f => { f.financial.excludedHomeVehiclePersonalItems = false; }, /PROPERTY_EXCLUSIONS/],
  ['unconfirmed SNAP exclusion', f => { f.financial.snapExcluded = false; }, /SNAP_EXCLUSION/],
];
for (const [name, change, expected, paid] of financialMutants) for (const [family, module, fixtures] of [
  ['conviction', conviction, cf], ['cannabis', cannabis, df],
]) await check('shared financial refusal: ' + family + '/' + name, () => {
  const facts = structuredClone(fixtures[paid ? 'canonical' : 'boundary']);
  change(facts);
  assert.throws(() => (family === 'conviction' ? module.validateMdConviction : module.validateMdCannabis)(facts), expected);
});

for (const [name, date, allowed] of [['before', '2023-09-08', false], ['exact', '2023-09-07', true], ['after', '2023-09-06', true]])
  await check('PWID exact three-year boundary: ' + name, () => {
    const facts = structuredClone(df['selectable/pwid-paid']); facts.case.completionDate = date;
    if (allowed) assert.equal(cannabis.validateMdCannabis(facts).mayMarkBasis, true);
    else assert.throws(() => cannabis.validateMdCannabis(facts), /WAITING_PERIOD/);
  });
await check('completed possession retains no extra wait', () => assert.equal(cannabis.validateMdCannabis(df['selectable/possession-paid']).earliest, '2026-09-07'));
await check('already-expunged court record refuses duplicate relief', () => {
  const facts = structuredClone(df.canonical); facts.records.courtRecordStatus = 'already_expunged';
  assert.throws(() => cannabis.validateMdCannabis(facts), /COURT_RECORD_ALREADY_EXPUNGED/);
});
await check('Case Search absence is not court relief', () => {
  const facts = structuredClone(df.canonical); facts.records.courtRecordStatus = 'unknown';
  const r = cannabis.validateMdCannabis(facts);
  assert.equal(r.mayMarkBasis, false); assert(r.missing.some(x => x.factId === 'records.courtRecordStatus'));
});
for (const id of ['CC-DC-CR-072D', 'CC-DC-089', 'MDJ-008']) await check('changed source refused: ' + id, async () => {
  const raw = fs.readFileSync(path.join(root, cannabis.SOURCES[id].path)); raw[200] ^= 1;
  await assert.rejects(() => cannabis.renderMdCannabis(df.boundary, {[id]: raw}), /SOURCE_HASH/);
});
await check('missing source refused', async () => await assert.rejects(() => cannabis.renderMdCannabis(df.canonical, {'CC-DC-CR-072D': Buffer.alloc(0)}), /SOURCE_LENGTH/));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'md-cannabis-installed-'));
try {
  const facts = structuredClone(df['selectable/possession-paid']); facts.case.completionDate = '2017-01-01';
  const input = path.join(tmp, 'invalid.json'); fs.writeFileSync(input, JSON.stringify(facts));
  for (const existing of [false, true]) await check('installed CLI refuses without writes: existing=' + existing, () => {
    const out = path.join(tmp, existing ? 'existing' : 'new');
    const sentinel = Buffer.from('preserve exact bytes\0');
    if (existing) { fs.mkdirSync(out); fs.writeFileSync(path.join(out, 'sentinel.bin'), sentinel); }
    const result = spawnSync(process.execPath, ['scripts/build-census-v1-md_cannabis_petition-set.mjs', '--input', input, '--out', out], {cwd: root, encoding: 'utf8'});
    assert.equal(result.status, 1); assert.match(result.stderr, /COMPLETION_BEFORE/);
    if (existing) { assert.deepEqual(fs.readdirSync(out), ['sentinel.bin']); assert.deepEqual(fs.readFileSync(path.join(out, 'sentinel.bin')), sentinel); }
    else assert(!fs.existsSync(out));
  });
} finally { fs.rmSync(tmp, {recursive: true, force: true}); }

for (const [family, rows] of [['conviction', before.conviction], ['favorable', before.favorable], ['installed', installation.installation]]) {
  await check('all retained identities unchanged: ' + family, () => {
    for (const row of rows) assert.equal(sha(fs.readFileSync(path.join(root, row.path))), row.sha256, row.path);
    preserved.push({scope: family, files: rows.length, allExact: true});
  });
}
const report = {scope: 'INSTALLED_NATIVE_DELTA_COMPATIBILITY_NOT_INDEPENDENT_APPROVAL',
  passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length,
  checks, executions, preserved, convictionPredicateResultsCompared: before.predicates.length,
  completeFleetRebuildPerformed: false,
  retainedAuthorEvidence: ['md-cannabis-author-full-output-equivalence.json', 'md-cannabis-author-md-conviction-output-equivalence.json'],
  runtimeIntakeMeasured: false, actualVerificationAuthorityMeasured: false, independentApproval: false,
  terminalPromotion: false, productionRelease: false,
  limitations: ['Five deliberately selected real renders measure the changed shared-component scope, not a new whole-fleet determinism claim.',
    'Remaining identical output scope retains author evidence and still requires cannabis independent review.',
    'Missing-contact diagnostic static PASS remains allKnownFactsPrepared=false; it is not filing-ready.']};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed, failures: checks.filter(x => !x.passed),
  nativeExecutions: executions.length, exactWholeOutputs: executions.length, preserved}, null, 2));
if (report.failed) process.exitCode = 1;
