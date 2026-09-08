#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bindDeclaredKyDelivery, selectDeclaredKyFixture, KY_FAMILY, KY_ROUTE, KY_DIRECTORY} from './ky-declared-delivery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = rel => fs.readFileSync(path.join(ROOT, rel));
const json = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const manifestPath = 'scripts/rcap-packet-completeness/ky-reviewed-candidate-inputs.json';
const manifest = JSON.parse(bytes(manifestPath));
const installed = new Map([manifestPath, manifest.review.path, ...manifest.files.map(f => f.path)].map(p => [p, bytes(p)]));
const read = rel => { assert.ok(installed.has(rel), `Unexpected read: ${rel}`); return installed.get(rel); };
const ports = {readFile: read, hashFile: rel => sha(read(rel))};
const family = {familyId: KY_FAMILY, directory: KY_DIRECTORY, routeKeys: [KY_ROUTE]};
const record = {family: KY_FAMILY, routeKeys: [KY_ROUTE], status: 'DECLARED_NOT_INSTALLED', authorityCreated: 'none',
  currentState: {generationAllowed: false, runtimeSelectable: false},
  binding: {routeKeys: [KY_ROUTE], paymentEligible: false, sponsorshipEligible: false}, proposedRepresentation: {}};
const report = JSON.parse(read(`${KY_DIRECTORY}/reports/rendered-artifacts.json`));
const bound = bindDeclaredKyDelivery(record, family, {report, ...ports});
const tests = [];
const it = (name, fn) => { fn(); tests.push(name); console.log(`ok ${name}`); };
const facts = fixture => JSON.parse(read(`${KY_DIRECTORY}/fixtures/${fixture}.facts.json`));
const mutatedPorts = (file, mutation) => {
  const replacements = new Map([[file, mutation(Buffer.from(read(file)))]]);
  const altered = rel => replacements.get(rel) ?? read(rel);
  return {readFile: altered, hashFile: rel => sha(altered(rel))};
};

it('all 13 actual PDFs and 90 pages are bound without default authority', () => {
  assert.equal(bound.binding.conditionalDelivery.fixtureBindings.length, 13);
  assert.equal(bound.binding.conditionalDelivery.fixtureBindings.reduce((n, f) => n + f.pageCount, 0), 90);
  assert.equal(bound.binding.conditionalDelivery.reviewInputBinding.filesMeasured, manifest.files.length);
  assert.equal(bound.proposedRepresentation.components.length, 13);
  assert.equal(bound.proposedRepresentation.defaultComponentId, null);
  assert.equal(bound.binding.acceptanceReceipt, null);
  assert.equal(bound.binding.filingPermitted, false);
  assert.equal(bound.currentState.runtimeSelectable, false);
  assert.equal(bound.proposedRepresentation.runtimeSelectable, false);
});
for (const artifact of report.pdfs) {
  it(`${artifact.fixture}: actual facts select its exact retained file, report and component pages`, () => {
    const f = facts(artifact.fixture), chosen = selectDeclaredKyFixture(bound, f, artifact.fixture, ports);
    assert.equal(chosen.file, artifact.file);
    assert.equal(chosen.sha256, artifact.sha256);
    assert.equal(chosen.input.sha256, sha(read(chosen.input.file)));
    assert.equal(chosen.report.sha256, sha(read(chosen.report.file)));
    assert.deepEqual(chosen.componentPages, artifact.componentPages);
    assert.equal(chosen.components.includes('AOC-497'), f.options.includeProposedOrder);
    assert.equal(chosen.components[0], 'AOC-497.2');
    assert.equal(chosen.pageCount, f.options.includeProposedOrder ? 8 : 6);
    assert.equal(chosen.grantsDeliveryAuthority, false);
    assert.equal(chosen.grantsEligibility, false);
  });
  it(`${artifact.fixture}: private identifiers, signing and genuine unknowns retain their own actors`, () => {
    const chosen = bound.binding.conditionalDelivery.fixtureBindings.find(f => f.fixture === artifact.fixture);
    const expected = JSON.parse(read(chosen.report.file)).blanks;
    assert.deepEqual(chosen.manualCompletions, expected.filter(b => b.requiredBeforeFiling === true));
    assert.equal(chosen.manualCompletions.filter(b => b.kind === 'private_identifier_manual_completion').length, chosen.selection.includeProposedOrder ? 2 : 1);
    assert.equal(chosen.manualCompletions.filter(b => b.kind === 'signature_or_date_participant_completion').length, 1);
    assert.equal(chosen.manualCompletions.filter(b => b.field === 'phone number').length, artifact.fixture === 'boundary' ? 2 : 0);
    assert.equal(chosen.officialActorObligations.length, chosen.selection.includeProposedOrder ? 1 : 0);
    assert.ok(chosen.writtenFields.some(w => w.documentId === 'AOC-497.2' && w.field === 'Court'));
    assert.ok(!chosen.officialActorObligations.some(b => b.field === 'Court' || b.field === 'NAME'));
    assert.ok(!chosen.writtenFields.some(w => w.documentId === 'AOC-497' && w.kind === 'explicit_selection'));
  });
}
for (const fixture of [undefined, '', 'selectable/unsupported', '../canonical']) {
  it(`refuses implicit or unsupported fixture ${String(fixture)}`, () => {
    assert.throws(() => selectDeclaredKyFixture(bound, facts('canonical'), fixture, ports), /EXPLICIT_SUPPORTED_FIXTURE_REQUIRED/);
  });
}
for (const [name, mutation, reason] of [
  ['missing order election', f => { delete f.options.includeProposedOrder; }, /EXPLICIT_COMPONENT_ELECTION_REQUIRED/],
  ['nonboolean order election', f => { f.options.includeProposedOrder = 'yes'; }, /EXPLICIT_COMPONENT_ELECTION_REQUIRED/],
  ['missing local-practice answer', f => { delete f.options.localOrderPracticeConfirmed; }, /EXPLICIT_LOCAL_ORDER_PRACTICE_REQUIRED/],
  ['nonboolean local-practice answer', f => { f.options.localOrderPracticeConfirmed = 'yes'; }, /EXPLICIT_LOCAL_ORDER_PRACTICE_REQUIRED/],
  ['order without local confirmation', f => { f.options.includeProposedOrder = true; }, /ORDER_CONDITION_NOT_CONFIRMED/],
  ['wrong route', f => { f.routeKey = 'other'; }, /WRONG_ROUTE/],
  ['unverified disposition', f => { f.charges[0].factsConfirmed = null; }, /UNRESOLVED_CASE_FACTS/],
  ['unsupported disposition', f => { f.charges[0].basis = 'conviction'; }, /WRONG_INSTRUMENT_OR_DISPOSITION/],
  ['unconfirmed automatic status', f => { f.charges[0].dispositionDate = '2026-07-09'; }, /UNRESOLVED_CASE_FACTS/],
  ['authority past retained cutoff', f => { f.asOf = '2026-09-08'; }, /AUTHORITY_REVALIDATION_REQUIRED/],
  ['private identifier input', f => { f.participant.ssn = 'synthetic-refusal'; }, /PRIVATE_IDENTIFIER_MANUAL_COMPLETION/],
  ['purported execution', f => { f.signature = 'synthetic-refusal'; }, /PROTECTED_EXECUTION_INPUT/],
  ['purported judicial finding', f => { f.judicialFindings = true; }, /PROTECTED_EXECUTION_INPUT/],
  ['different participant', f => { f.participant.fullName = 'Different Synthetic Person'; }, /FIXTURE_INPUT_MISMATCH/],
  ['real participant presented as fixture', f => { f.isSyntheticFixture = false; }, /PARTICIPANT_RENDER_REQUIRED/]
]) {
  it(`actual validator and exact binding refuse ${name}`, () => {
    const f = facts('canonical'); mutation(f);
    assert.throws(() => selectDeclaredKyFixture(bound, f, 'canonical', ports), reason);
  });
}
it('explicit with-order facts cannot select the six-page no-order PDF', () => {
  assert.throws(() => selectDeclaredKyFixture(bound, facts('selectable/acquittal-with-order'), 'selectable/acquittal', ports), /FIXTURE_INPUT_MISMATCH/);
});
it('automatic day-60 facts cannot borrow ordinary acquittal output', () => {
  assert.throws(() => selectDeclaredKyFixture(bound, facts('selectable/automatic-missed-exact-60-days'), 'selectable/acquittal', ports), /FIXTURE_INPUT_MISMATCH/);
});
it('unchosen order stays absent even though AOC-497.2 petition is present', () => {
  const selected = selectDeclaredKyFixture(bound, facts('selectable/acquittal'), 'selectable/acquittal', ports);
  assert.ok(!selected.componentPages.some(c => c.documentId === 'AOC-497'));
  assert.equal(selected.file, `${KY_DIRECTORY}/fixtures/selectable/acquittal.pdf`);
});
for (const [name, change] of [
  ['omitted with-order artifact', r => r.pdfs.splice(r.pdfs.findIndex(d => d.fixture === 'selectable/acquittal-with-order'), 1)],
  ['petition relabeled as order', r => { r.pdfs[0].componentPages[0].documentId = 'AOC-497'; }],
  ['omitted optional order component', r => { r.pdfs.find(d => d.fixture === 'selectable/acquittal-with-order').componentPages.splice(2, 1); }],
  ['canonical substituted for selected output', r => { r.pdfs.find(d => d.fixture === 'selectable/acquittal').file = r.pdfs[0].file; }],
  ['duplicate fixture', r => { r.pdfs[1] = structuredClone(r.pdfs[0]); }]
]) {
  it(`refuses changed report: ${name}`, () => {
    const altered = structuredClone(report); change(altered);
    assert.throws(() => bindDeclaredKyDelivery(record, family, {...ports, report: altered}), /Supplied KY output inventory differs/);
  });
}
for (const file of [
  'reference/chat-parallel-2026-09-07/chat5/AOC-497.2.pdf',
  'reference/chat-parallel-2026-09-07/chat5/AOC-497.pdf',
  `${KY_DIRECTORY}/fixtures/selectable/acquittal-with-order.pdf`,
  `${KY_DIRECTORY}/fixtures/boundary.facts.json`,
  `${KY_DIRECTORY}/reports/boundary.json`,
  'scripts/rcap-packet-recovery/chat5/ky-nonconviction.mjs',
  manifestPath, manifest.review.path
]) {
  it(`refuses byte drift even with recomputed caller checksum: ${file}`, () => {
    const altered = mutatedPorts(file, b => { b[b.length - 1] ^= 1; return b; });
    assert.throws(() => bindDeclaredKyDelivery(record, family, altered), /mismatch|changed/);
  });
}
it('selection rechecks current output hash instead of trusting a previously bound record', () => {
  assert.throws(() => selectDeclaredKyFixture(bound, facts('canonical'), 'canonical', {...ports,
    hashFile: file => file.endsWith('/fixtures/canonical.pdf') ? 'f'.repeat(64) : ports.hashFile(file)}), /current selected output mismatch/);
});
it('selection refuses altered record components', () => {
  const altered = structuredClone(bound);
  altered.binding.conditionalDelivery.fixtureBindings[0].components.push('AOC-497');
  assert.throws(() => selectDeclaredKyFixture(altered, facts('canonical'), 'canonical', ports), /Declared KY binding changed/);
});
it('a two-PDF receipt cannot accept a thirteen-PDF family', () => {
  assert.throws(() => bindDeclaredKyDelivery(record, family, {...ports, raster: {familyId: KY_FAMILY,
    rasterReceipt: {verdict: 'RASTER_PASS', coversTheWholeFamily: true, documentsMeasured: 2, pagesMeasured: 14}}}));
});
it('no declared binding can open generation or payment authority', () => {
  for (const change of [r => { r.currentState.generationAllowed = true; }, r => { r.binding.paymentEligible = true; },
    r => { r.binding.sponsorshipEligible = true; }, r => { r.status = 'INSTALLED'; }]) {
    const altered = structuredClone(record); change(altered);
    assert.throws(() => bindDeclaredKyDelivery(altered, family, ports));
  }
});
it('an unrelated family record remains unchanged', () => {
  assert.equal(bindDeclaredKyDelivery(record, {familyId: 'unrelated'}), record);
});
it('all 13 retained PDFs remain byte-identical after selection tests', () => {
  for (const artifact of report.pdfs) assert.equal(sha(bytes(artifact.file)), artifact.sha256);
});
const evidence = {schemaVersion: 'rcap-ky-declared-delivery-tests/v1', status: 'PASS', cases: tests.length,
  measuredAt: new Date().toISOString(), tests, installedInputsMeasured: manifest.files.length,
  unchangedPdfs: 13, unchangedPages: 90, packetRenders: 0, fullRuntimeAcceptance: false,
  evidenceBoundary: 'Actual installed validateKy and retained source/fact/report/output bytes; synthetic fixture selection only. No entitlement, render job, participant artifact, private delivery or central admission was created.'};
for (const [flag, value] of [['--report', evidence], ['--binding', bound]]) {
  const i = process.argv.indexOf(flag);
  if (i !== -1) {
    assert.ok(process.argv[i + 1], `${flag} requires a path`);
    const file = path.resolve(ROOT, process.argv[i + 1]);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, json(value));
  }
}
console.log(JSON.stringify(evidence, null, 2));
