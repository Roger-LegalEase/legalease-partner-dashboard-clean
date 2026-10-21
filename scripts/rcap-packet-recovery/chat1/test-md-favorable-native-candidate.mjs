#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditPreparedInputs} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {auditMdNativeCandidate, prepareMdNativeFixture, MD_NATIVE_DIRECTORY as directory, MD_NATIVE_FAMILY as familyId} from '../../rcap-packet-completeness/md-favorable-native-candidate.mjs';
import {validateMdFavorable, BASIS_FIELDS} from '../chat5/md-favorable.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const json = relative => JSON.parse(fs.readFileSync(path.join(root, directory, relative), 'utf8'));
const evidence = path.join(root, 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08');
const audit = inputs => auditPreparedInputs(directory, familyId, inputs);
const cases = [], result = auditMdNativeCandidate({root, directory, familyId}, audit);
function test(name, fn) { fn(); cases.push({name, result: 'PASS'}); }
test('all 15 actual retained PDFs and 60 pages pass the existing classifier', () => {
  assert.equal(result.result, 'PASS_COMPLETE', JSON.stringify(result.findings));
  assert.equal(result.fixtureResults.length, 15); assert.equal(result.totals.terminalFields, 47 * 15);
  assert.equal(result.totals.written, 268 + 46);
  for (const fixture of result.fixtureResults) { assert.equal(fixture.totals.terminalFields, 47); assert.equal(fixture.ledger.length, 47); }
  assert(Object.values(result.counters).every(value => value === 0));
  assert.equal(result.runtimeIntakeCounters, null); assert.equal(result.packetRebuilds, 0);
});
test('optional fax and source-owned attorney blocks are accounted for in every fixture', () => {
  for (const fixture of result.fixtureResults) {
    assert.equal(fixture.ledger.find(row => row.field === 'Defendant Fax').accounting, 'OPTIONAL_FACT_NOT_SUPPLIED');
    assert.equal(fixture.ledger.filter(row => row.accounting === 'ATTORNEY_BLOCK_NOT_APPLICABLE').length, 9);
    assert.equal(fixture.ledger.filter(row => row.accounting === 'PROTECTED_EXECUTION').length, 2);
    assert.equal(fixture.ledger.filter(row => row.accounting === 'SOURCE_VIEWER_CONTROL').length, 1);
  }
});
test('boundary has its own absent agency and tracking facts; canonical does not donate facts', () => {
  const boundary = result.fixtureResults.find(fixture => fixture.fixture === 'boundary');
  assert.equal(boundary.totals.blanksByDisposition.REQUIRED_BEFORE_FILING, 1);
  assert.equal(boundary.ledger.find(row => row.field === 'Tracking Number').accounting, 'OPTIONAL_FACT_NOT_SUPPLIED');
  assert.equal(boundary.ledger.find(row => row.field === 'Law Enforcement Agency').accounting, 'REQUIRED_BEFORE_FILING');
  assert.equal(result.fixtureResults.find(fixture => fixture.fixture === 'canonical').ledger.find(row => row.field === 'Law Enforcement Agency').accounting, 'WRITTEN');
});

const census = json('official-field-census.json'), fieldMap = json('production-field-map.json');
const base = fixture => ({fixture, census: structuredClone(census), fieldMap: structuredClone(fieldMap),
  report: json('reports/' + fixture + '.json'), checked: validateMdFavorable(json('fixtures/' + fixture + '.facts.json')), basisFields: BASIS_FIELDS});
function altered(edit, fixture = 'canonical') {
  const input = base(fixture); edit(input);
  input.fieldMap.fixtures[fixture] = {writes: input.report.writes, blanks: input.report.blanks};
  return input;
}
const refuse = (name, edit, expected, fixture) => test(name, () => assert.throws(() => prepareMdNativeFixture(altered(edit, fixture)), expected));
refuse('an unbound 48th field is refused', input => input.census.push({...input.census[0], name: 'Unbound Required Fact'}), /47-field census/);
refuse('a same-size source census with an unknown actor is refused', input => { input.census.find(field => field.name === 'Attorney Fax').name = 'Prosecutor Approval'; }, /unbound source field or unknown actor/);
refuse('a caller-supplied actor or verified flag cannot authenticate an attorney blank', input => { input.report.blanks.find(blank => blank.field === 'Attorney Fax').sourceActorEvidence = {verified: true, actor: 'clerk'}; }, /unrecognized native actor/);
refuse('a selected disposition mark cannot disappear', input => { input.report.writes = input.report.writes.filter(write => write.field !== BASIS_FIELDS.dismissal); }, /required selected field is missing/);
refuse('a selected court mark cannot disappear', input => { input.report.writes = input.report.writes.filter(write => write.field !== 'District Court'); }, /required selected field is missing/);
refuse('a selected event fact cannot disappear', input => { delete input.checked.facts.case.event; }, /selected court, event or disposition fact is missing/);
refuse('an uncollected predicate answer cannot borrow the old selected output', input => { const facts = json('fixtures/canonical.facts.json'); delete facts.confirmations.selectedStatementTrue; input.checked = validateMdFavorable(facts); }, /selected disposition lacks required facts/);
refuse('known phone facts cannot become a required-before-filing blank', input => {
  input.report.writes = input.report.writes.filter(write => write.field !== 'Defendant Telephone Number');
  input.report.blanks.push({field: 'Defendant Telephone Number', document: 'CC-DC-CR-072A', page: 1, disposition: 'required_before_filing', requiredBeforeFiling: true, value: null});
}, /known field missing its native write/);
refuse('a supplied fax cannot retain the optional blank treatment', input => { input.checked.facts.participant.fax = '301-555-0123'; }, /known field missing its native write/);
refuse('source fax optionality cannot be relabeled required', input => { input.report.blanks.find(blank => blank.field === 'Defendant Fax').requiredBeforeFiling = true; }, /optional source fact falsely required/);
refuse('a required agency cannot borrow optional fax treatment', input => { input.report.blanks.find(blank => blank.field === 'Law Enforcement Agency').disposition = 'optional_blank'; }, /required missing fact is not disclosed/, 'boundary');
refuse('a represented matter cannot borrow the self-represented attorney exemption', input => { input.checked.facts.attorney = {name: 'Known Attorney'}; }, /outside this reviewed self-represented candidate/);
refuse('an attorney write is refused even if its label resembles participant contact', input => {
  const source = input.census.find(field => field.name === 'Attorney Fax');
  input.report.blanks = input.report.blanks.filter(blank => blank.field !== source.name);
  input.report.writes.push({field: source.name, page: 1, kind: 'held_text', value: '301-555-0123', widgets: source.widgets.map(widget => ({rect: widget.rect}))});
}, /protected or simultaneously blank field written/);
refuse('a dropped incident continuation cannot pass as a complete narrative', input => { input.report.writes.find(write => write.field === 'Incident Continued').value = 'different'; }, /complete incident narrative was not written/);
refuse('a text value cannot borrow another fixtures phone', input => { input.report.writes.find(write => write.field === 'Defendant Telephone Number').value = '301-555-0199'; }, /known text fact differs/);
refuse('a selected alternative with no supporting fact is refused', input => {
  const source = input.census.find(field => field.name === 'Circuit Court');
  input.report.writes.push({field: source.name, page: 1, kind: 'explicit_selection', value: true, widgets: source.widgets.map(widget => ({rect: widget.rect}))});
}, /unsupported selected field/);
test('existing classifier detects a genuinely missing delivered agency disclosure', () => {
  const prepared = prepareMdNativeFixture(base('boundary'));
  const missing = audit({fieldMap: prepared.fieldMap, census: null, actualWrites: null,
    receipt: {allSourcesExact: true, documents: [{formNumber: 'CC-DC-CR-072A', sha256: 'a'.repeat(64)}]},
    rendered: {componentIdentityMode: 'exact', packets: [{documents: ['CC-DC-CR-072A']}]}, approval: null, instructions: ''});
  assert.equal(missing.counters.requiredFactsNotCollected, 1);
});
test('existing chronology guard rejects discharge before PBJ entry', () => {
  const facts = json('fixtures/selectable/pbj.facts.json'); facts.case.probationDischargeDate = '2019-01-01';
  assert.throws(() => validateMdFavorable(facts), /INCONSISTENT_PBJ_DATES/);
});
test('changed actual PDF bytes refuse before any old review can be reused', () => {
  const binding = JSON.parse(fs.readFileSync(path.join(root, 'scripts/rcap-packet-completeness/md-reviewed-candidate-inputs.json')));
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'md-native-byte-refusal-'));
  try {
    for (const file of binding.files) {
      const target = path.join(scratch, file.path); fs.mkdirSync(path.dirname(target), {recursive: true});
      const bytes = fs.readFileSync(path.join(root, file.path));
      fs.writeFileSync(target, file.path.endsWith('.pdf') ? Buffer.concat([bytes, Buffer.from('\nCHANGED')]) : bytes);
      if (file.path.endsWith('.pdf')) break;
    }
    const changed = auditMdNativeCandidate({root: scratch, directory, familyId}, audit);
    assert.equal(changed.result, 'FAIL_COMPONENT_SET'); assert.equal(changed.independentReviewReused, false);
    assert.match(changed.findings[0].why, /reviewed input mismatch: .*\.pdf/);
  } finally { fs.rmSync(scratch, {recursive: true, force: true}); }
});
test('wrong family or directory refuses and cannot reuse this candidates review', () => {
  assert.equal(auditMdNativeCandidate({root, directory, familyId: 'md_10110_conviction-set'}, audit).auditable, false);
  assert.equal(auditMdNativeCandidate({root, directory: directory + '-other', familyId}, audit).auditable, false);
});
test('all retained input hashes still match after mutation tests', () => {
  const binding = JSON.parse(fs.readFileSync(path.join(root, 'scripts/rcap-packet-completeness/md-reviewed-candidate-inputs.json')));
  for (const file of binding.files) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, file.path))).digest('hex'), file.sha256);
});

fs.mkdirSync(evidence, {recursive: true});
fs.writeFileSync(path.join(evidence, 'md-native-completeness.json'), JSON.stringify(result, null, 2) + '\n');
const report = {familyId, scope: 'AUTHOR_ENGINEERING_QA_NOT_INDEPENDENT_REVIEW', passed: cases.length, failed: 0,
  staticTerminalFields: result.totals.terminalFields, retainedPdfs: 15, retainedPages: 60,
  runtimeIntakeCounters: null, packetRebuilds: 0, cases};
fs.writeFileSync(path.join(evidence, 'md-native-tests.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
