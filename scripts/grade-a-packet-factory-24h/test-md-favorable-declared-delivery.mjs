#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bindDeclaredMdFavorableDelivery, selectDeclaredMdFavorableFixture,
  MD_FAVORABLE_FAMILY as FAMILY, MD_FAVORABLE_DIRECTORY as OUT, MD_FAVORABLE_ROUTE as ROUTE,
  MD_FAVORABLE_FIXTURES} from './md-favorable-declared-delivery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = relative => fs.readFileSync(path.join(ROOT, relative));
const json = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const bindingPath = 'scripts/rcap-packet-completeness/md-reviewed-candidate-inputs.json';
const adapterPath = 'scripts/rcap-packet-completeness/md-favorable-native-candidate.mjs';
const manifest = JSON.parse(bytes(bindingPath));
const installed = new Map([bindingPath, adapterPath, ...manifest.files.map(f => f.path)].map(p => [p, bytes(p)]));
const read = relative => { assert.ok(installed.has(relative), 'Unbound test read: ' + relative); return installed.get(relative); };
const ports = {readFile: read, hashFile: file => sha(read(file))};
const family = {familyId: FAMILY, directory: OUT, routeKeys: [ROUTE]};
const record = {family: FAMILY, routeKeys: [ROUTE], status: 'DECLARED_NOT_INSTALLED', authorityCreated: 'none',
  currentState: {generationAllowed: false, runtimeSelectable: false},
  binding: {routeKeys: [ROUTE], paymentEligible: false, sponsorshipEligible: false}, proposedRepresentation: {}};
const report = JSON.parse(read(`${OUT}/reports/rendered-artifacts.json`));
const bound = bindDeclaredMdFavorableDelivery(record, family, {...ports, report});
const facts = fixture => JSON.parse(read(`${OUT}/fixtures/${fixture}.facts.json`));
const tests = [], it = (name, fn) => { fn(); tests.push(name); console.log(`ok ${name}`); };
const mutatePorts = (file, change) => {
  const changed = change(Buffer.from(read(file)));
  const altered = path => path === file ? changed : read(path);
  return {readFile: altered, hashFile: path => sha(altered(path))};
};

it('actual 56-member candidate binds 15 four-page outputs with all 705 fields and no default', () => {
  assert.equal(bound.binding.conditionalDelivery.reviewInputBinding.filesMeasured, 56);
  assert.equal(bound.binding.conditionalDelivery.fixtureBindings.length, 15);
  assert.deepEqual(bound.binding.conditionalDelivery.fixtureBindings.map(f => f.fixture), MD_FAVORABLE_FIXTURES);
  assert.equal(bound.binding.conditionalDelivery.fixtureBindings.reduce((n, f) => n + f.sourceFieldAccounting.total, 0), 705);
  assert.equal(bound.binding.conditionalDelivery.fixtureBindings.reduce((n, f) => n + f.pageCount, 0), 60);
  assert.equal(bound.proposedRepresentation.defaultComponentId, null);
  assert.equal(bound.binding.acceptanceReceipt, null);
  assert.equal(bound.runtimeInstalled, false);
  assert.equal(bound.binding.paymentEligible, false);
  assert.equal(bound.binding.sponsorshipEligible, false);
  assert.equal(bound.currentState.generationAllowed, false);
});
for (const artifact of report.pdfs) {
  it(`${artifact.fixture}: explicit facts select that exact output/input/report and source pages`, () => {
    const selected = selectDeclaredMdFavorableFixture(bound, facts(artifact.fixture), artifact.fixture, ports);
    assert.equal(selected.file, artifact.file);
    assert.equal(selected.sha256, artifact.sha256);
    assert.equal(selected.report.sha256, sha(read(selected.report.file)));
    assert.equal(selected.input.sha256, sha(read(selected.input.file)));
    assert.deepEqual(selected.pageManifest, artifact.pageManifest);
    assert.deepEqual(selected.components, ['CC-DC-CR-072A', 'participant-instructions']);
    assert.equal(selected.grantsEligibility, false);
    assert.equal(selected.grantsDeliveryAuthority, false);
    assert.equal(selected.participantExecutionCompleted, false);
  });
  it(`${artifact.fixture}: fax, attorney and signing roles remain distinct from unresolved required facts`, () => {
    const selected = bound.binding.conditionalDelivery.fixtureBindings.find(f => f.fixture === artifact.fixture);
    const native = JSON.parse(read(selected.report.file));
    assert.deepEqual(selected.requiredBeforeFiling, native.blanks.filter(b => b.requiredBeforeFiling === true));
    assert.equal(selected.requiredBeforeFiling.length, artifact.fixture === 'boundary' ? 1 : 0);
    assert.equal(selected.participantExecution.length, 1);
    assert.equal(selected.notApplicableAttorneyBlanks.length, 9);
    assert.ok(selected.optionalBlanks.some(b => b.field === 'Defendant Fax'));
    assert.ok(!selected.optionalBlanks.some(b => b.field === 'Defendant Telephone Number' || b.field === 'Law Enforcement Agency'));
    assert.equal(selected.sourceFieldAccounting.fields.find(f => f.field === 'Defendant Telephone Number').accounting, 'WRITTEN');
    assert.equal(selected.sourceFieldAccounting.fields.find(f => f.field === 'Signature of Defendant').accounting, 'PROTECTED_EXECUTION');
    assert.equal(new Set(selected.sourceFieldAccounting.fields.map(f => f.field)).size, 47);
  });
}
it('all favorable branches exclude conviction/cannabis waiver, release, notice and proposed-order components', () => {
  assert.deepEqual(bound.binding.packetComponents, ['CC-DC-CR-072A', 'participant-instructions']);
  assert.deepEqual(bound.binding.componentConditions, {});
  for (const f of bound.binding.conditionalDelivery.fixtureBindings) assert.deepEqual(f.components, bound.binding.packetComponents);
});
for (const fixture of [undefined, '', 'selectable/conviction', 'selectable/cannabis', '../canonical']) {
  it(`no implicit or unsupported fixture ${String(fixture)}`, () => {
    assert.throws(() => selectDeclaredMdFavorableFixture(bound, facts('canonical'), fixture, ports), /EXPLICIT_SUPPORTED_FIXTURE_REQUIRED/);
  });
}
for (const [name, change, reason, fixture = 'canonical'] of [
  ['different participant', f => { f.participant.fullName = 'Different Synthetic Person'; }, /FIXTURE_INPUT_MISMATCH/],
  ['supplied optional fax cannot reuse a fax-blank PDF', f => { f.participant.fax = '410-555-0184'; }, /FIXTURE_INPUT_MISMATCH/],
  ['known agency cannot be silently omitted from the boundary PDF', f => { f.case.agency = 'Synthetic Known Agency'; }, /FIXTURE_INPUT_MISMATCH/, 'boundary'],
  ['real participant', f => { f.isSyntheticFixture = false; }, /PARTICIPANT_RENDER_REQUIRED/],
  ['wrong route', f => { f.routeKey = 'wrong-route'; }, /WRONG_ROUTE/],
  ['missing predicate', f => { delete f.confirmations.selectedStatementTrue; }, /UNRESOLVED_DISPOSITION_FACTS/],
  ['wrong disposition instrument', f => { f.case.basis = 'conviction'; }, /WRONG_INSTRUMENT|BASIS|DISPOSITION/],
  ['discharge before PBJ entry', f => { f.case.probationDischargeDate = '2019-01-01'; }, /INCONSISTENT_PBJ_DATES/, 'selectable/pbj'],
  ['omitted phone does not select the known-phone fixture', f => { f.participant.phone = null; }, /FIXTURE_INPUT_MISMATCH/],
  ['known attorney cannot select the self-represented fixture', f => { f.attorney = {name: 'Synthetic Attorney'}; }, /FIXTURE_INPUT_MISMATCH|ATTORNEY/]
]) {
  it(`actual validator/exact binding refuse ${name}`, () => {
    const f = facts(fixture); change(f);
    assert.throws(() => selectDeclaredMdFavorableFixture(bound, f, fixture, ports), reason);
  });
}
it('PBJ facts cannot use an ordinary dismissal PDF', () => {
  assert.throws(() => selectDeclaredMdFavorableFixture(bound, facts('selectable/pbj'), 'canonical', ports), /FIXTURE_INPUT_MISMATCH/);
});
it('treatment and ordinary nolle outputs stay separately bound', () => {
  assert.throws(() => selectDeclaredMdFavorableFixture(bound, facts('selectable/nolle-treatment'), 'selectable/nolle', ports), /FIXTURE_INPUT_MISMATCH/);
});
for (const [name, change] of [
  ['missing fixture', r => { r.pdfs.pop(); }],
  ['duplicate fixture', r => { r.pdfs[1] = structuredClone(r.pdfs[0]); }],
  ['canonical substituted for selected artifact', r => { r.pdfs[2].file = r.pdfs[0].file; }],
  ['added fee waiver', r => { r.pdfs[0].components.push('MDJ-008'); }],
  ['substituted conviction petition', r => { r.pdfs[0].pageManifest[0].documentId = 'CC-DC-CR-072B'; }],
  ['omitted guide page', r => { r.pdfs[0].pageManifest.pop(); }]
]) {
  it(`changed output inventory refuses ${name}`, () => {
    const altered = structuredClone(report); change(altered);
    assert.throws(() => bindDeclaredMdFavorableDelivery(record, family, {...ports, report: altered}), /Supplied MD inventory differs/);
  });
}
for (const file of [
  'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072A.pdf',
  `${OUT}/fixtures/canonical.pdf`, `${OUT}/fixtures/boundary.facts.json`, `${OUT}/reports/boundary.json`,
  `${OUT}/official-field-census.json`, 'scripts/rcap-packet-recovery/chat5/md-favorable.mjs', bindingPath, adapterPath,
  'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/md-independent-review.json',
  'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/md-guard-delta-03.json'
]) {
  it(`matching caller checksum cannot legitimize changed input ${file}`, () => {
    const altered = mutatePorts(file, value => { value[value.length - 1] ^= 1; return value; });
    assert.throws(() => bindDeclaredMdFavorableDelivery(record, family, altered), /mismatch|changed/);
  });
}
it('missing reviewed source refuses', () => {
  assert.throws(() => bindDeclaredMdFavorableDelivery(record, family, {...ports, readFile: file => {
    if (file.endsWith('/CC-DC-CR-072A.pdf')) throw Error('SOURCE_ABSENT');
    return read(file);
  }}), /SOURCE_ABSENT/);
});
it('selection rechecks current output hash', () => {
  assert.throws(() => selectDeclaredMdFavorableFixture(bound, facts('canonical'), 'canonical', {...ports,
    hashFile: file => file.endsWith('/fixtures/canonical.pdf') ? 'f'.repeat(64) : ports.hashFile(file)}), /Current MD selected output hash mismatch/);
});
it('tampered recorded source roles cannot borrow an earlier binding', () => {
  const altered = structuredClone(bound);
  altered.binding.conditionalDelivery.fixtureBindings[0].optionalBlanks.push({field: 'Law Enforcement Agency'});
  assert.throws(() => selectDeclaredMdFavorableFixture(altered, facts('canonical'), 'canonical', ports), /MD declared binding changed/);
});
it('old two-PDF acceptance cannot cover 15 exact outputs', () => {
  assert.throws(() => bindDeclaredMdFavorableDelivery(record, family, {...ports,
    raster: {familyId: FAMILY, rasterReceipt: {verdict: 'RASTER_PASS', coversTheWholeFamily: true, documentsMeasured: 2, pagesMeasured: 8}}}));
});
it('declared binding refuses preexisting runtime/payment/sponsored/generation authority', () => {
  for (const change of [r => { r.runtimeInstalled = true; }, r => { r.currentState.generationAllowed = true; },
    r => { r.currentState.runtimeSelectable = true; }, r => { r.binding.paymentEligible = true; },
    r => { r.binding.sponsorshipEligible = true; }, r => { r.status = 'INSTALLED'; }]) {
    const altered = structuredClone(record); change(altered);
    assert.throws(() => bindDeclaredMdFavorableDelivery(altered, family, ports));
  }
});
it('wrong record and family route cannot borrow the declaration', () => {
  const wrong = structuredClone(record); wrong.binding.routeKeys = ['wrong'];
  assert.throws(() => bindDeclaredMdFavorableDelivery(wrong, family, ports), /route scope changed/);
  assert.throws(() => bindDeclaredMdFavorableDelivery(record, {...family, routeKeys: ['wrong']}, ports));
});
it('unrelated family is unchanged', () => {
  assert.equal(bindDeclaredMdFavorableDelivery(record, {familyId: 'unrelated'}), record);
});
it('all retained 56 inputs and 15 PDFs/60 pages are unchanged after tests', () => {
  for (const member of manifest.files) assert.equal(sha(bytes(member.path)), member.sha256);
  assert.equal(report.pdfs.length, 15);
  assert.equal(report.pdfs.reduce((n, f) => n + f.pageCount, 0), 60);
});
const evidence = {schemaVersion: 'rcap-md-favorable-declared-delivery-tests/v1', status: 'PASS', cases: tests.length,
  measuredAt: new Date().toISOString(), tests, reviewedInputsMeasured: 56, sourceFields: 47, sourceFieldInstances: 705,
  unchangedPdfs: 15, unchangedPages: 60, packetRenders: 0, runtimeInstalled: false, ownerAuthorizationMeasured: false,
  scope: 'Actual accepted validator and reviewed native field importer, bound to unchanged source/facts/reports/PDFs and original/guard review. Filesystem-port mutation tests measure refusal, not participant ownership, entitlement, durable render job, private delivery or production behavior.'};
for (const [flag, value] of [['--report', evidence], ['--binding', bound]]) {
  const i = process.argv.indexOf(flag);
  if (i !== -1) {
    assert.ok(process.argv[i + 1], `${flag} needs a file`);
    const file = path.resolve(ROOT, process.argv[i + 1]);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, json(value));
  }
}
console.log(JSON.stringify(evidence, null, 2));
