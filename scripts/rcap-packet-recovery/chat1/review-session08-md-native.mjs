#!/usr/bin/env node
/** Independent importer engineering review. No packet, adapter or author
 * evidence is changed. Temporary copies exist only for exact-byte refusals. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {auditMdNativeCandidate, prepareMdNativeFixture, MD_NATIVE_DIRECTORY as directory,
  MD_NATIVE_FAMILY as familyId} from '../../rcap-packet-completeness/md-favorable-native-candidate.mjs';
import {auditPreparedInputs} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {validateMdFavorable, BASIS_FIELDS} from '../chat5/md-favorable.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourcePath = 'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072A.pdf';
const helperPath = 'scripts/rcap-packet-recovery/chat5/md-favorable.mjs';
const adapterPath = 'scripts/rcap-packet-completeness/md-favorable-native-candidate.mjs';
const bindingPath = 'scripts/rcap-packet-completeness/md-reviewed-candidate-inputs.json';
const bytes = relative => fs.readFileSync(path.join(root, relative));
const sha = value => createHash('sha256').update(value).digest('hex');
const blob = value => createHash('sha1').update(`blob ${value.length}\0`).update(value).digest('hex');
const read = relative => JSON.parse(bytes(`${directory}/${relative}`));
const binding = JSON.parse(bytes(bindingPath));
const before = new Map(binding.files.map(file => [file.path, sha(bytes(file.path))]));
const census = read('official-field-census.json'), fieldMap = read('production-field-map.json');
const index = read('reports/rendered-artifacts.json').pdfs;
const source = await PDFDocument.load(bytes(sourcePath), {updateMetadata: false});
const sourceFields = source.getForm().getFields();
const actual = sourceFields.map(field => ({name: field.getName(), type: field.constructor.name,
  widgets: field.acroField.getWidgets().map(widget => ({page: source.getPages().findIndex(p => p.ref.toString() === widget.P()?.toString()) + 1,
    rect: widget.getRectangle()}))}));
const attorney = ['Signature of Attorney', 'Attorney Number', 'Date Attorney Signed', 'Attorney Printed Name',
  'Attorney Address', 'Attorney City, State, Zip', 'Attorney Telephone Number', 'Attorney E-mail', 'Attorney Fax'];
const signatures = ['Signature of Defendant', 'Date Defendant Signed'];
const tests = [], findings = [];
const check = (name, fn) => {
  try { fn(); tests.push({name, result: 'PASS'}); }
  catch (error) { tests.push({name, result: 'FAIL', why: error.message}); findings.push({name, why: error.message}); }
};
const audit = inputs => auditPreparedInputs(directory, familyId, inputs);
const result = auditMdNativeCandidate({root, directory, familyId}, audit);

check('all 47 source identities/types/pages match, with only the accepted two-point incident inset', () => {
  assert.equal(source.getPageCount(), 1);
  assert.equal(actual.length, 47);
  // The unchanged accepted helper insets this one text widget before recording
  // its census. The original independent review examined these mapped bounds.
  // No general tolerance, source substitution or geometry exemption is allowed.
  const mapped = structuredClone(actual);
  const incident = mapped.find(field => field.name === 'List the Incident');
  assert.equal(incident.widgets.length, 1);
  incident.widgets[0].rect.x += 2;
  incident.widgets[0].rect.width -= 2;
  assert.deepEqual(mapped, census.map(({name, type, widgets}) => ({name, type, widgets})));
  assert.equal(new Set(actual.map(f => f.name)).size, 47);
});
check('attorney and defendant execution roles correspond to the distinct source columns', () => {
  for (const name of attorney) {
    const entry = actual.find(f => f.name === name);
    assert.ok(entry, name);
    assert.ok(entry.widgets.every(w => w.page === 1 && w.rect.x + w.rect.width / 2 < 310), name);
  }
  for (const name of signatures) {
    const entry = actual.find(f => f.name === name);
    assert.ok(entry.widgets.every(w => w.page === 1 && w.rect.x + w.rect.width / 2 > 310), name);
  }
  assert.equal(actual.find(f => f.name === 'Reset Form').type, 'PDFButton');
});
check('accepted helper and whole source retain exact review identities', () => {
  assert.equal(blob(bytes(helperPath)), '4f7f87558c98691b1ff77825ede2f13dbf7ebd7c');
  assert.equal(sha(bytes(sourcePath)), '8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2');
});
check('existing classifier independently measures all 705 source-field instances', () => {
  assert.equal(result.result, 'PASS_COMPLETE', JSON.stringify(result.findings));
  assert.equal(result.fixtureResults.length, 15);
  assert.equal(result.totals.terminalFields, 705);
  assert.equal(result.totals.written, 314);
  assert.equal(result.totals.blank, 391);
  assert.ok(Object.values(result.counters).every(value => value === 0));
  assert.equal(result.runtimeIntakeCounters, null);
  assert.equal(result.runtimeInstalled, false);
  assert.equal(result.centralRasterAdmission, false);
  assert.equal(result.packetRebuilds, 0);
});
for (const item of index) {
  check(`${item.fixture}: all actual source fields occur exactly once with fixture-bound facts`, () => {
    const measured = result.fixtureResults.find(f => f.fixture === item.fixture);
    const report = read(`reports/${item.fixture}.json`);
    const checked = validateMdFavorable(read(`fixtures/${item.fixture}.facts.json`));
    assert.deepEqual([...measured.ledger.map(r => r.field)].sort(), [...actual.map(f => f.name)].sort());
    assert.equal(new Set(measured.ledger.map(r => r.field)).size, 47);
    assert.equal(measured.totals.written, report.writes.length);
    assert.deepEqual(report.confirmedConditions, checked.conditions);
    assert.ok(measured.ledger.every(row => row.fixture === item.fixture && row.sourcePage === 1));
    assert.equal(measured.ledger.find(row => row.field === 'Defendant Fax').accounting, 'OPTIONAL_FACT_NOT_SUPPLIED');
    for (const name of attorney) assert.equal(measured.ledger.find(row => row.field === name).accounting, 'ATTORNEY_BLOCK_NOT_APPLICABLE');
    for (const name of signatures) assert.equal(measured.ledger.find(row => row.field === name).accounting, 'PROTECTED_EXECUTION');
    assert.equal(measured.ledger.find(row => row.field === 'Defendant Telephone Number').accounting, 'WRITTEN');
    assert.equal(measured.ledger.find(row => row.field === 'Defendant Address').accounting, 'WRITTEN');
    assert.equal(sha(bytes(item.file)), item.sha256);
    assert.equal(item.pageCount, 4);
  });
}
check('the boundary agency remains an explicit unresolved obligation, separate from optional tracking/fax', () => {
  const boundary = result.fixtureResults.find(f => f.fixture === 'boundary');
  assert.equal(boundary.ledger.find(row => row.field === 'Law Enforcement Agency').accounting, 'REQUIRED_BEFORE_FILING');
  assert.equal(boundary.ledger.find(row => row.field === 'Tracking Number').accounting, 'OPTIONAL_FACT_NOT_SUPPLIED');
  assert.equal(boundary.totals.blanksByDisposition.REQUIRED_BEFORE_FILING, 1);
  assert.equal(result.fixtureResults.find(f => f.fixture === 'canonical').ledger.find(row => row.field === 'Law Enforcement Agency').accounting, 'WRITTEN');
});

function altered(fixture, change) {
  const facts = read(`fixtures/${fixture}.facts.json`), report = read(`reports/${fixture}.json`);
  const input = {fixture, census: structuredClone(census), fieldMap: structuredClone(fieldMap), report,
    checked: validateMdFavorable(facts), basisFields: structuredClone(BASIS_FIELDS)};
  change(input);
  input.fieldMap.fixtures[fixture] = {writes: input.report.writes, blanks: input.report.blanks};
  return input;
}
function refuse(name, change, reason, fixture = 'canonical') {
  check(name, () => assert.throws(() => prepareMdNativeFixture(altered(fixture, change)), reason));
}
function addText(input, field, factId, value) {
  const entry = input.census.find(f => f.name === field);
  input.report.blanks = input.report.blanks.filter(b => b.field !== field);
  input.report.writes.push({field, page: 1, kind: 'held_text', factId, value,
    widgets: entry.widgets.map(widget => ({rect: widget.rect}))});
}
check('a supplied optional fax is written and accounted for, not generically exempted', () => {
  const value = '410-555-0184';
  const input = altered('canonical', data => {
    data.checked.facts.participant.fax = value;
    data.checked = validateMdFavorable(data.checked.facts);
    addText(data, 'Defendant Fax', 'participant.fax', value);
  });
  const prepared = prepareMdNativeFixture(input);
  assert.equal(prepared.ledger.find(row => row.field === 'Defendant Fax').accounting, 'WRITTEN');
  assert.equal(prepared.fieldMap.availableFacts['participant.fax'], value);
  assert.equal(prepared.fieldMap.writes.find(row => row.field === 'Defendant Fax').value, value);
});
refuse('a held fax cannot be suppressed by its optional category', input => { input.checked.facts.participant.fax = '410-555-0184'; }, /known field missing its native write/);
refuse('a required known phone cannot borrow fax optionality', input => {
  input.report.writes = input.report.writes.filter(w => w.field !== 'Defendant Telephone Number');
  input.report.blanks.push({field: 'Defendant Telephone Number', document: 'CC-DC-CR-072A', page: 1,
    disposition: 'optional_blank', requiredBeforeFiling: false, value: null});
}, /known field missing its native write/);
refuse('boundary required agency cannot borrow fax optionality', input => {
  const blank = input.report.blanks.find(b => b.field === 'Law Enforcement Agency');
  blank.disposition = 'optional_blank'; blank.requiredBeforeFiling = false;
}, /required missing fact is not disclosed/, 'boundary');
for (const name of attorney) {
  refuse(`${name}: source attorney role cannot become a generic optional blank`, input => {
    input.report.blanks.find(b => b.field === name).disposition = 'optional_blank';
  }, /attorney role blank not explicitly self-represented/);
  refuse(`${name}: participant contact cannot fill the attorney block`, input => {
    addText(input, name, 'participant.phone', '410-555-0184');
  }, /protected or simultaneously blank field written/);
}
for (const name of signatures) refuse(`${name}: participant execution cannot be supplied by an importer`, input => {
  addText(input, name, 'participant.fullName', input.checked.facts.participant.fullName);
}, /protected or simultaneously blank field written/);
refuse('known attorney facts cannot reuse a pro-se fixture', input => { input.checked.facts.attorney = {fullName: 'Synthetic Lawyer'}; }, /outside this reviewed self-represented candidate/);
refuse('a caller flag cannot establish a source actor', input => {
  input.report.blanks.find(b => b.field === 'Attorney Fax').sourceActorEvidence = {verified: true};
}, /unrecognized native actor/);
refuse('another source identity cannot replace an attorney field', input => {
  input.census.find(f => f.name === 'Attorney Fax').name = 'State Attorney Approval';
}, /unbound source field or unknown actor/);
refuse('a field cannot move to another page', input => { input.census[0].widgets[0].page = 2; }, /source type\/page mismatch/);
refuse('a further incident widget change cannot borrow the accepted two-point inset', input => {
  input.census.find(field => field.name === 'List the Incident').widgets[0].rect.width += 1;
}, /source write geometry differs/);
refuse('one omitted field cannot be hidden by a duplicate', input => { input.census[1] = structuredClone(input.census[0]); }, /47-field census/);
refuse('missing selected checkbox cannot become an unselected alternative', input => {
  input.report.writes = input.report.writes.filter(w => w.field !== BASIS_FIELDS.dismissal);
}, /required selected field is missing/);
refuse('an unsupported checkbox cannot be justified by truthy text', input => {
  const field = input.census.find(f => f.name === 'Circuit Court');
  input.report.writes.push({field: field.name, page: 1, kind: 'explicit_selection', value: 'true',
    widgets: field.widgets.map(w => ({rect: w.rect}))});
}, /unsupported selected field/);
refuse('missing required recital remains a refusal after the actual validator runs', input => {
  delete input.checked.facts.confirmations.selectedStatementTrue;
  input.checked = validateMdFavorable(input.checked.facts);
}, /selected disposition lacks required facts/);
refuse('partial narrative cannot be declared a complete source field', input => {
  input.report.writes.find(w => w.field === 'Incident Continued').value = 'Dropped continuation';
}, /complete incident narrative was not written/);
check('accepted chronology guard refuses discharge before PBJ entry', () => {
  const facts = read('fixtures/selectable/pbj.facts.json');
  facts.case.probationDischargeDate = '2019-01-01';
  assert.throws(() => validateMdFavorable(facts), /INCONSISTENT_PBJ_DATES/);
});
check('missing actual instructions keep required boundary facts incomplete', () => {
  const input = altered('boundary', () => {}), prepared = prepareMdNativeFixture(input);
  const incomplete = audit({fieldMap: prepared.fieldMap, census: null, actualWrites: null,
    receipt: {allSourcesExact: true, documents: [{formNumber: 'CC-DC-CR-072A', sha256: sha(bytes(sourcePath))}]},
    rendered: {componentIdentityMode: 'exact', packets: [{documents: ['CC-DC-CR-072A', 'participant-instructions']}]},
    approval: null, instructions: ''});
  assert.equal(incomplete.counters.requiredFactsNotCollected, 1);
});

for (const target of [
  `${directory}/fixtures/canonical.pdf`, `${directory}/fixtures/boundary.facts.json`,
  `${directory}/reports/canonical.json`, sourcePath, helperPath,
  'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/md-guard-delta-03.json'
]) {
  check(`exact-byte gate refuses changed retained input: ${target}`, () => {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'independent-md-prefix-'));
    try {
      let reached = false;
      for (const file of binding.files) {
        const out = path.join(scratch, file.path), value = bytes(file.path);
        fs.mkdirSync(path.dirname(out), {recursive: true});
        if (file.path === target) {
          const changed = Buffer.from(value); changed[changed.length - 1] ^= 1;
          fs.writeFileSync(out, changed); reached = true; break;
        }
        fs.writeFileSync(out, value);
      }
      assert.ok(reached, 'Exact mutation target is in bound inventory');
      const refused = auditMdNativeCandidate({root: scratch, directory, familyId}, audit);
      assert.equal(refused.result, 'FAIL_COMPONENT_SET');
      assert.equal(refused.auditable, false);
      assert.equal(refused.independentReviewReused, false);
      assert.equal(refused.runtimeIntakeCounters, null);
      assert.equal(refused.findings[0].why, 'reviewed input mismatch: ' + target);
    } finally { fs.rmSync(scratch, {recursive: true, force: true}); }
  });
}
check('all retained inputs and 15 PDFs remain unchanged after independent tests', () => {
  for (const file of binding.files) {
    assert.equal(sha(bytes(file.path)), before.get(file.path));
    assert.equal(before.get(file.path), file.sha256);
  }
  assert.equal(index.length, 15);
  assert.equal(index.reduce((n, f) => n + f.pageCount, 0), 60);
});

const report = {
  schemaVersion: 'rcap-independent-md-native-importer-review/v1',
  familyId, verdict: findings.length ? 'FAIL' : 'PASS_BOUNDED_ENGINEERING_REVIEW',
  reviewerRole: 'Independent of md_importer author; no importer or candidate modifications',
  measuredAt: new Date().toISOString(),
  adapter: {path: adapterPath, gitBlob: blob(bytes(adapterPath)), sha256: sha(bytes(adapterPath))},
  inputBinding: {path: bindingPath, sha256: sha(bytes(bindingPath)), files: binding.files.length},
  acceptedHelperGitBlob: blob(bytes(helperPath)),
  explainedSourceGeometry: {
    field: 'List the Incident',
    rawWidgets: actual.find(field => field.name === 'List the Incident').widgets,
    mappedWidgets: census.find(field => field.name === 'List the Incident').widgets,
    reason: 'Accepted helper insets only this text widget by x + 2 and width - 2 before recording its census, to separate narrative ink from the printed label.',
    implementation: helperPath + ':225',
    initialComparison: 'independent-md-native-review-initial.json retained the overly strict raw-widget equality failure; all other checks passed. No candidate or importer change was needed.'
  },
  originalReviewCommit: binding.review.originalCommit, guardDeltaCommit: binding.review.guardDeltaCommit,
  casesPassed: tests.filter(t => t.result === 'PASS').length, casesFailed: findings.length, tests, findings,
  measured: {actualSourceFields: actual.length, fixtures: result.fixtureResults?.length ?? 0,
    terminalFields: result.totals.terminalFields, written: result.totals.written, blank: result.totals.blank,
    retainedPdfs: 15, retainedPages: 60, packetRenders: 0, runtimeIntakeCounters: null},
  limits: [
    'Review covers importer source accounting and exact retained candidate evidence, not fresh all-page visual examination.',
    'Optional fax/email/tracking treatment comes from the accepted 072A adapter mapping. The printed form does not label every contact field optional.',
    'Boundary agency remains required before filing and is disclosed; it is not represented as a completed participant fact.',
    'Attorney block is inapplicable only to these exact self-represented fixtures. No generic actor exemption exists.',
    'No runtime intake, eligibility authority, central admission, entitlement, render job, participant artifact or authorized delivery is proved.'
  ]
};
const output = path.join(root, 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/independent-md-native-review.json');
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exitCode = findings.length ? 1 : 0;
