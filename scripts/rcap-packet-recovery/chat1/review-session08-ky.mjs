#!/usr/bin/env node
// Independent engineering delta checks. No retained input is modified or rendered.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { auditPreparedInputs } from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import { auditKyNativeCandidate, KY_NATIVE_DIRECTORY as DIR, KY_NATIVE_FAMILY as FAMILY } from '../../rcap-packet-completeness/ky-native-candidate.mjs';
import { validateKy } from '../chat5/ky-nonconviction.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/independent-ky-engineering.json';
const read = p => fs.readFileSync(path.join(ROOT, p));
const json = p => JSON.parse(read(p));
const hash = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const binding = json('scripts/rcap-packet-completeness/ky-reviewed-candidate-inputs.json');
const review = json(binding.review.path);
const measurements = json('data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/ky-measurements.json');
const index = json(DIR + '/reports/rendered-artifacts.json').pdfs;
const census = json(DIR + '/official-field-census.json');
const prepared = [];
const checks = [];
async function check(name, fn) {
  try { await fn(); checks.push({ name, passed: true }); }
  catch (e) { checks.push({ name, passed: false, error: e.message }); }
}
let actual;
await check('Original independent review identity and scope are unchanged', () => {
  assert.equal(blob(read(binding.review.path)), '8b10a3b22ee00f0ac60a6f7048a2fc622919bfe5');
  assert.equal(review.rows.find(r => r.familyId === FAMILY).verdict, 'PASS');
  assert.equal(binding.review.commit, 'c0df1418c07a636564412b113e80f6a7b213fff9');
  assert.equal(review.counselApproval, false);
});
await check('All 47 candidate members and four code inputs retain their accepted bytes', () => {
  assert.equal(binding.files.length, 51);
  assert.equal(new Set(binding.files.map(f => f.path)).size, 51);
  for (const f of binding.files) {
    const bytes = read(f.path);
    assert.equal(bytes.length, f.byteLength, f.path);
    assert.equal(hash(bytes), f.sha256, f.path);
  }
});
await check('Every complete PDF and fixture fact/report matches the original independent measurements', () => {
  assert.equal(index.length, 13);
  assert.equal(measurements.wholePdfs.length, 13);
  for (const measured of measurements.wholePdfs) {
    const bytes = read(DIR + '/' + measured.file);
    const fixture = measured.file.replace(/^fixtures\//, '').replace(/\.pdf$/, '');
    const entry = index.find(a => a.fixture === fixture);
    assert(entry, fixture);
    assert.equal(hash(bytes), measured.sha256, fixture);
    assert.equal(bytes.length, measured.bytes, fixture);
    assert.equal(entry.pageCount, measured.pages.length, fixture);
    assert.equal(hash(read(DIR + '/fixtures/' + fixture + '.facts.json')), measured.factsSha256, fixture);
    assert.equal(hash(read(DIR + '/reports/' + fixture + '.json')), measured.reportSha256, fixture);
  }
});
await check('Raw official sources independently reproduce every source field and widget geometry', async () => {
  for (const source of measurements.sources) {
    const bytes = read(source.file);
    assert.equal(hash(bytes), source.sha256);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(pdf.getPageCount(), 2);
    const id = path.basename(source.file, '.pdf');
    const observed = pdf.getForm().getFields().map(field => ({
      field: field.getName(), type: field.constructor.name,
      widgets: field.acroField.getWidgets().map(widget => ({
        page: pdf.getPages().findIndex(page => page.ref.toString() === widget.P().toString()) + 1,
        rect: widget.getRectangle()
      }))
    }));
    assert.deepEqual(observed, census[id], id);
  }
});
await check('Installed adapter exhaustively classifies separate fixtures', () => {
  actual = auditKyNativeCandidate({ root: ROOT, directory: DIR, familyId: FAMILY }, input => {
    prepared.push(structuredClone(input));
    return auditPreparedInputs(DIR, FAMILY, input);
  });
  assert.equal(actual.result, 'PASS_COMPLETE');
  assert.equal(actual.fixtureResults.length, 13);
  assert.equal(prepared.length, 13);
  assert.deepEqual([actual.totals.terminalFields, actual.totals.written, actual.totals.blank], [569, 270, 299]);
  assert.equal(actual.runtimeIntakeCounters, null);
  assert.equal(actual.runtimeInstalled, false);
  assert.equal(actual.packetRebuilds, 0);
});
await check('Independent denominator accounts for every included source field exactly once', () => {
  let expectedTotal = 0, expectedWrites = 0, pages = 0;
  for (const row of actual.fixtureResults) {
    const facts = json(DIR + '/fixtures/' + row.fixture + '.facts.json');
    const report = json(DIR + '/reports/' + row.fixture + '.json');
    const ids = ['AOC-497.2', ...(facts.options.includeProposedOrder ? ['AOC-497'] : [])];
    const expected = ids.flatMap(id => census[id].map(field => id + '/' + field.field)).sort();
    assert.deepEqual(row.ledger.map(r => r.documentId + '/' + r.field).sort(), expected);
    assert.equal(new Set(expected).size, expected.length);
    assert.equal(row.totals.written, report.writes.length);
    assert.equal(row.totals.blank, expected.length - report.writes.length);
    expectedTotal += expected.length; expectedWrites += report.writes.length; pages += row.pageCount;
  }
  assert.equal(expectedTotal, 13 * 29 + 6 * 32);
  assert.equal(expectedWrites, 270);
  assert.equal(pages, 90);
});
await check('Private identifiers, boundary contacts and non-filing UI controls retain distinct roles', () => {
  const rows = actual.fixtureResults.flatMap(r => r.ledger);
  const manual = rows.filter(r => r.disposition === 'REQUIRED_BEFORE_FILING');
  assert.equal(manual.length, 21);
  assert.equal(manual.filter(r => /ssn/i.test(r.field)).length, 19);
  assert.deepEqual(manual.filter(r => r.field === 'phone number').map(r => r.fixture), ['boundary', 'boundary']);
  assert.equal(rows.filter(r => r.disposition === 'NON_FILING_SOURCE_ELEMENT').length, 38);
  assert(actual.fixtureResults.find(r => r.fixture === 'canonical').ledger.some(r => r.field === 'phone number' && r.disposition === 'WRITTEN'));
  for (const entry of index) assert.equal(json(DIR + '/fixtures/' + entry.fixture + '.facts.json').participant.ssn, undefined);
});
const boundaryIndex = index.findIndex(x => x.fixture === 'boundary');
const canonicalIndex = index.findIndex(x => x.fixture === 'canonical');
async function refusal(name, fixtureIndex, mutate, counter) {
  await check(name, () => {
    const input = structuredClone(prepared[fixtureIndex]); mutate(input);
    const result = auditPreparedInputs(DIR, FAMILY, input);
    assert.notEqual(result.result, 'PASS_COMPLETE'); assert(result.counters[counter] > 0);
  });
}
await refusal('Selected order cannot be represented by the petition prefix', boundaryIndex,
  p => { p.rendered.packets[0].documents = p.rendered.packets[0].documents.filter(id => id !== 'AOC-497'); }, 'requiredComponentsMissing');
await refusal('Selected petition cannot be represented by the companion order', boundaryIndex,
  p => { p.rendered.packets[0].documents = p.rendered.packets[0].documents.filter(id => id !== 'AOC-497.2'); }, 'requiredComponentsMissing');
await refusal('A similar but different component ID cannot satisfy exact identity', boundaryIndex,
  p => { p.rendered.packets[0].documents = p.rendered.packets[0].documents.map(id => id === 'AOC-497' ? 'AOC-497.2-copy' : id); }, 'requiredComponentsMissing');
await refusal('Missing boundary telephone disclosure is refused', boundaryIndex,
  p => { p.instructions = p.instructions.replace(/phone number/gi, 'omitted contact'); }, 'requiredFactsNotCollected');
await refusal('Held boundary phone cannot be laundered as unavailable', boundaryIndex,
  p => { p.fieldMap.availableFacts = { 'AOC-497.2/phone number': 'synthetic-held-phone' }; }, 'knownRequiredFieldsMissing');
await refusal('A judicial signature write remains protected after normalization', canonicalIndex,
  p => { p.fieldMap.writes.push({ fieldId: 'judge-signature', label: 'Judge signature', documentId: 'AOC-497.2', value: 'FORGED' }); }, 'protectedWrites');
const baseFacts = json(DIR + '/fixtures/canonical.facts.json');
for (const field of ['signature', 'notary', 'judicialFindings', 'clerkService', 'agencyCertification']) {
  await check('Actual predicate refuses supplied protected execution: ' + field, () => {
    const facts = structuredClone(baseFacts); facts[field] = { claimed: true };
    assert.throws(() => validateKy(facts), /PROTECTED_EXECUTION_INPUT/);
  });
}
await check('Actual predicate refuses a supplied private SSN', () => {
  const facts = structuredClone(baseFacts); facts.participant.ssn = 'synthetic-private-value';
  assert.throws(() => validateKy(facts), /PRIVATE_IDENTIFIER_MANUAL_COMPLETION/);
});
await check('Actual predicate refuses an unconfirmed proposed-order election', () => {
  const facts = structuredClone(baseFacts); facts.options.includeProposedOrder = true;
  assert.throws(() => validateKy(facts), /ORDER_CONDITION_NOT_CONFIRMED/);
});
await check('Actual predicate refuses mixed criminal cases', () => {
  const facts = structuredClone(baseFacts); facts.charges[0].caseNumber = 'different-synthetic-case';
  assert.throws(() => validateKy(facts), /SEPARATE_PETITION_PER_CASE/);
});
await check('Unknown disposition facts do not select a legal basis', () => {
  const facts = structuredClone(baseFacts); facts.charges[0].factsConfirmed = null;
  const result = validateKy(facts); assert.equal(result.selectable.length, 0); assert(result.missing.length > 0);
});
await check('Exact 60-day fallback succeeds and day 59 refuses', () => {
  const facts = json(DIR + '/fixtures/selectable/automatic-missed-exact-60-days.facts.json');
  assert.deepEqual(validateKy(facts).selectable, ['acquittal']); facts.asOf = '2026-09-06';
  assert.throws(() => validateKy(facts), /WAIT_NOT_MET/);
});
await check('September 8 is outside the unchanged helper authority window', () => {
  const facts = structuredClone(baseFacts); facts.asOf = '2026-09-08';
  assert.throws(() => validateKy(facts), /AUTHORITY_REVALIDATION_REQUIRED/);
});
const identityPaths = ['scripts/rcap-packet-completeness/ky-native-candidate.mjs', 'scripts/rcap-packet-completeness/ky-reviewed-candidate-inputs.json', 'scripts/rcap-packet-completeness/verify-packet-completeness.mjs', 'scripts/rcap-packet-completeness/completeness-contract.mjs', 'scripts/rcap-packet-recovery/chat5/ky-nonconviction.mjs'];
const report = {
  schemaVersion: 'rcap-independent-ky-engineering-delta/v1', reviewer: 'release_scope independent engineering sub-agent',
  recordedAt: new Date().toISOString(), familyId: FAMILY, originalReviewCommit: binding.review.commit,
  verdict: checks.every(c => c.passed) ? 'PASS_BOUNDED_ENGINEERING_DELTA' : 'FAIL',
  checks, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length,
  sourceIdentities: Object.fromEntries(identityPaths.map(p => [p, { sha256: hash(read(p)), gitBlob: blob(read(p)) }])),
  measured: { originalInputs: 51, completePdfs: 13, completePagesReused: 90, sourceFieldInstances: actual?.totals.terminalFields, written: actual?.totals.written, blank: actual?.totals.blank, blankDispositions: actual?.totals.blanksByDisposition },
  limitations: ['No fresh page-image review or renderer execution; original PR238 exact-byte review is reused.', 'Static retained-fixture compatibility only; no runtime intake, entitlement, worker or production acceptance.', 'The unchanged validator refuses asOf after 2026-09-07; extending its authority window requires appropriate current-source evidence.'],
  retainedFilesMutated: false, originalVerdictEdited: false, runtimeFulfillmentProven: false, productionTouched: false
};
fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ verdict: report.verdict, passed: report.passed, failed: report.failed, report: OUT, failures: checks.filter(c => !c.passed) }));
if (report.failed) process.exitCode = 1;
