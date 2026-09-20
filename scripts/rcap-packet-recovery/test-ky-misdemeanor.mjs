#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {drawnAt, flattenedWidgets} from '../rcap-official-forms/pdf-flattened-widgets.mjs';
import {COURT_SELECTION_FIELDS, ELECTION_FIELDS, FAMILY, ROOT, SOURCES, kyFixture, renderKy, resolveElection, sha256} from './ky-misdemeanor.mjs';

const ENTRYPOINT = path.join(ROOT, 'scripts/build-census-v1-ky_misdemeanor_expungement-set.mjs');
const mutate = (value, change) => { const copy = structuredClone(value); change(copy); return copy; };
const results = [];
async function test(name, fn) { await fn(); results.push({name, result: 'PASS'}); }

function runEntrypoint(facts, label, {expectSuccess = true} = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ky-misd-${label}-`));
  const input = path.join(temp, 'facts.json');
  const out = path.join(temp, 'out');
  fs.writeFileSync(input, `${JSON.stringify(facts, null, 2)}\n`);
  const run = spawnSync(process.execPath, [ENTRYPOINT, '--input', input, '--out', out], {cwd: ROOT, encoding: 'utf8'});
  if (expectSuccess) {
    assert.equal(run.status, 0, run.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(out, 'reports/supplied.json'), 'utf8'));
    return {temp, out, report, pdf: path.join(out, 'fixtures/supplied.pdf'), run};
  }
  assert.notEqual(run.status, 0, 'invalid record unexpectedly produced a packet');
  assert(!fs.existsSync(path.join(out, 'fixtures/supplied.pdf')), 'rejected input emitted an artifact');
  fs.rmSync(temp, {recursive: true, force: true});
  return {run};
}

for (const [kind, expectedField] of [
  ['ordinary_misdemeanor', ELECTION_FIELDS.ordinary_five_year],
  ['ordinary_violation', ELECTION_FIELDS.ordinary_five_year],
  ['ordinary_traffic', ELECTION_FIELDS.ordinary_five_year],
  ['void_218A275_8', ELECTION_FIELDS.controlled_substances_void_218A275_8],
  ['void_218A276_8', ELECTION_FIELDS.marijuana_synthetic_salvia_void_218A276_8]
]) {
  await test(`real entrypoint maps ${kind} to ${expectedField} only`, async () => {
    const made = runEntrypoint(kyFixture(kind), kind);
    try {
      assert.equal(made.report.election.field, expectedField);
      const electionWrites = made.report.writes.filter(write => Object.values(ELECTION_FIELDS).includes(write.field));
      assert.deepEqual(electionWrites.map(write => write.field), [expectedField]);
      const widgets = await flattenedWidgets(made.pdf);
      for (const [field, rect] of Object.entries({
        'Check Box19': {x: 110.836, y: 212.249},
        'Check Box20': {x: 387.446, y: 196.017},
        'Check Box21': {x: 384.74, y: 178.868}
      })) {
        const at = drawnAt(widgets, {page: 1, rect});
        assert.equal(at.length, 1, `${field}: expected one flattened source appearance`);
        assert.equal(at[0].text.trim() !== '', field === expectedField, `${field}: wrong marked state`);
      }
      const pdf = await PDFDocument.load(fs.readFileSync(made.pdf), {updateMetadata: false});
      assert.equal(pdf.getForm().getFields().length, 0);
    } finally { fs.rmSync(made.temp, {recursive: true, force: true}); }
  });
}

await test('five-year calendar boundary passes on the exact anniversary', () => {
  const f = kyFixture();
  f.record.sentenceCompletionDate = '2019-09-10';
  f.record.probationApplicable = true;
  f.record.probationCompletionDate = '2021-09-11';
  assert.deepEqual(resolveElection(f.record, f.asOf), {ground: 'ordinary_five_year', field: 'Check Box19', laterCompletionDate: '2021-09-11', firstEligibleDate: '2026-09-11'});
});

await test('one day before the five-year boundary emits no artifact', () => {
  const f = kyFixture();
  f.record.sentenceCompletionDate = '2019-09-10';
  f.record.probationApplicable = true;
  f.record.probationCompletionDate = '2021-09-12';
  const rejected = runEntrypoint(f, 'date-short', {expectSuccess: false});
  assert.match(rejected.run.stderr, /WAIT_NOT_MET/);
});

for (const [name, change] of [
  ['non-US citizenship', f => { f.participant.isUsCitizen = false; }],
  ['unknown citizenship', f => { delete f.participant.isUsCitizen; }]
]) {
  await test(`${name} stops before emitting an artifact`, () => {
    const rejected = runEntrypoint(mutate(kyFixture(), change), name.replace(/\W+/g, '-'), {expectSuccess: false});
    assert.match(rejected.run.stderr, /United States citizenship required/);
  });
}

await test('source-listed out-of-state mailing address remains independent of Kentucky venue', () => {
  const facts = kyFixture();
  facts.participant.state = 'Ohio';
  facts.participant.city = 'Cincinnati';
  facts.participant.zip = '45202';
  const made = runEntrypoint(facts, 'ohio-mailing');
  try {
    assert(made.report.writes.some(write => write.field === 'Def.Address.State' && write.value === 'Ohio'));
  } finally { fs.rmSync(made.temp, {recursive: true, force: true}); }
});

await test('mixed conviction classifications are preserved on the petition face', () => {
  const facts = kyFixture();
  facts.charges.push({count: '2', caseNumber: facts.case.number, description: 'Harassment', classification: 'violation', disposition: 'convicted', dispositionDate: '2018-06-15', recordVerified: true});
  const made = runEntrypoint(facts, 'mixed-conviction-classifications');
  try {
    assert(made.report.writes.some(write => write.field === 'Charge1' && /Criminal trespass/.test(write.value)));
    assert(made.report.writes.some(write => write.field === 'Charge2' && /Harassment/.test(write.value)));
  } finally { fs.rmSync(made.temp, {recursive: true, force: true}); }
});

await test('dismissed and amended-away companions stay off the conviction face and appear accurately in the incorporated schedule', () => {
  const facts = kyFixture();
  facts.charges.push(
    {count: '2', caseNumber: facts.case.number, description: 'Disorderly conduct', classification: 'violation', disposition: 'dismissed', dispositionDate: '2018-06-15', amendmentDestination: null, relatedFinalConviction: null, sameCriminalAction: true, recordVerified: true},
    {count: '3', caseNumber: facts.case.number, description: 'Harassing communications', classification: 'misdemeanor', disposition: 'amended', dispositionDate: '2018-06-15', amendmentDestination: 'Criminal trespass, second degree', relatedFinalConviction: 'Count 1: Criminal trespass, second degree', sameCriminalAction: true, recordVerified: true}
  );
  const made = runEntrypoint(facts, 'mixed-dispositions');
  try {
    const faceWrites = made.report.writes.filter(write => /^Charge[1-6]$/.test(write.field));
    assert.equal(faceWrites.length, 1);
    assert(!faceWrites.some(write => /Disorderly|Harassing/.test(write.value)));
    const extracted = spawnSync('pdftotext', ['-layout', made.pdf, '-'], {encoding: 'utf8'});
    assert.equal(extracted.status, 0, extracted.stderr);
    assert.match(extracted.stdout, /Supplemental Schedule of Companion Charges/);
    assert.match(extracted.stdout, /Actual disposition: dismissed\s+on\s+06\/15\/2018/);
    assert.match(extracted.stdout, /Actual disposition: amended\s+on\s+06\/15\/2018/);
    assert.match(extracted.stdout, /Amendment destination:\s+Criminal trespass, second degree/);
  } finally { fs.rmSync(made.temp, {recursive: true, force: true}); }
});

await test('felony companion stops before emitting an artifact', () => {
  const facts = kyFixture();
  facts.charges.push({count: '2', caseNumber: facts.case.number, description: 'Felony companion', classification: 'felony', disposition: 'dismissed', dispositionDate: '2018-06-15', amendmentDestination: null, relatedFinalConviction: null, sameCriminalAction: true, recordVerified: true});
  const rejected = runEntrypoint(facts, 'felony-companion', {expectSuccess: false});
  assert.match(rejected.run.stderr, /FELONY_COMPANION_REQUIRES_SEPARATE_AUTHORITY/);
});

await test('phone appearances respect static punctuation on both official forms and duplicate agency default is suppressed', () => {
  const made = runEntrypoint(kyFixture('ordinary_misdemeanor', true), 'source-presentation');
  try {
    const bbox = spawnSync('pdftotext', ['-bbox-layout', made.pdf, '-'], {encoding: 'utf8'});
    assert.equal(bbox.status, 0, bbox.stderr);
    const areaCodes = [...bbox.stdout.matchAll(/<word xMin="([0-9.]+)"[^>]*>859<\/word>/g)].map(match => Number(match[1]));
    const localNumbers = [...bbox.stdout.matchAll(/<word xMin="([0-9.]+)"[^>]*>555-0142<\/word>/g)].map(match => Number(match[1]));
    assert.equal(areaCodes.length, 2);
    assert.equal(localNumbers.length, 2);
    assert(areaCodes.every(x => x >= 44), `area code overlaps left parenthesis: ${areaCodes.join(', ')}`);
    assert(localNumbers.every(x => x >= 64), `local number overlaps right parenthesis: ${localNumbers.join(', ')}`);
    const staticLists = [...bbox.stdout.matchAll(/<word xMin="([0-9.]+)"[^>]*>LIST<\/word>/g)].map(match => Number(match[1])).filter(x => x > 150 && x < 180);
    assert.deepEqual(staticLists, [156.6816]);
  } finally { fs.rmSync(made.temp, {recursive: true, force: true}); }
});

await test('checkbox selection alone does not append the conditional schedule', () => {
  const facts = kyFixture();
  facts.victims = [];
  facts.agencies = [{name: 'KSP', address: 'Frankfort, KY'}];
  const made = runEntrypoint(facts, 'no-schedule');
  try {
    assert(!made.report.components.some(component => component.documentId === 'ky_misdemeanor_expungement-charge-agency-schedule'));
  } finally { fs.rmSync(made.temp, {recursive: true, force: true}); }
});

for (const [name, change, message] of [
  ['missing classification confirmation', f => delete f.record.classificationConfirmed, /AMBIGUOUS_RECORD_FACT/],
  ['unknown classification', f => { f.record.offenseClassification = 'traffic'; f.charges[0].classification = 'traffic'; }, /CHARGE_CLASSIFICATION_REQUIRED|UNSUPPORTED_OR_UNKNOWN_CLASSIFICATION/],
  ['missing disposition', f => delete f.record.disposition, /ORDINARY_ROUTE_REQUIRES_CONVICTION/],
  ['missing disposition date', f => delete f.record.dispositionDate, /INVALID_DATE/],
  ['missing sentence completion', f => delete f.record.sentenceCompletionDate, /INVALID_DATE/],
  ['unknown probation applicability', f => delete f.record.probationApplicable, /AMBIGUOUS_RECORD_FACT/],
  ['missing applicable probation completion date', f => { f.record.probationApplicable = true; delete f.record.probationCompletionDate; }, /INVALID_DATE/],
  ['conflicting grounds', f => f.record.groundsClaimed.push('controlled_substances_void_218A275_8'), /AMBIGUOUS_OR_CONFLICTING_GROUNDS/],
  ['ordinary and void conflict', f => f.record.expressVoidingStatute = 'KRS 218A.275(8)', /CONFLICTING_ORDINARY_AND_VOID_GROUNDS/],
  ['generic controlled substance wording', f => { const v = kyFixture('void_218A275_8'); Object.assign(f, v); f.record.expressVoidingStatute = null; }, /EXPRESS_218A275_8_VOID_REQUIRED/],
  ['missing first-conviction fact', f => { const v = kyFixture('void_218A275_8'); Object.assign(f, v); delete f.record.firstControlledSubstancesConviction; }, /AMBIGUOUS_RECORD_FACT/],
  ['wrong 218A276 offense category', f => { const v = kyFixture('void_218A276_8'); Object.assign(f, v); f.record.voidedOffenseCategory = 'controlled_substances'; }, /MARIJUANA_SYNTHETIC_SALVIA_CATEGORY_REQUIRED/]
]) {
  await test(`${name} hard-stops without an artifact`, () => {
    const rejected = runEntrypoint(mutate(kyFixture(), change), name.replace(/\W+/g, '-'), {expectSuccess: false});
    assert.match(rejected.run.stderr, message);
  });
}

await test('conditional AOC-496 keeps every judicial election blank in delivered bytes', async () => {
  const made = runEntrypoint(kyFixture('ordinary_misdemeanor', true), 'judicial-blank');
  try {
    assert(made.report.components.some(component => component.documentId === 'AOC-496' && component.firstPage === 3));
    assert(!made.report.writes.some(write => write.documentId === 'AOC-496' && COURT_SELECTION_FIELDS.includes(write.field)));
    const widgets = await flattenedWidgets(made.pdf);
    const positions = [
      [3, 52.2767, 291.395], [3, 52.2767, 274.298], [3, 52.2767, 256.08], [3, 52.2767, 238.317],
      [3, 110.228, 203.498], [3, 389.118, 187.462], [3, 387.264, 171.262],
      [4, 54.1873, 656.286], [4, 54.1873, 628.973]
    ];
    for (const [page, x, y] of positions) {
      const at = drawnAt(widgets, {page, rect: {x, y}});
      assert.equal(at.length, 1, `missing flattened judicial control at ${page}/${x}/${y}`);
      assert.equal(at[0].text, '', `judicial control marked at ${page}/${x}/${y}`);
    }
  } finally { fs.rmSync(made.temp, {recursive: true, force: true}); }
});

for (const [id, source] of Object.entries(SOURCES)) {
  await test(`exact ${id} source mismatch is rejected`, async () => {
    const bytes = Buffer.from(fs.readFileSync(path.join(ROOT, source.path)));
    bytes[100] ^= 1;
    await assert.rejects(renderKy(kyFixture('ordinary_misdemeanor', id === 'AOC-496'), {[id]: bytes}), /SOURCE_HASH_DRIFT/);
  });
}

await test('production entrypoint import has no filesystem side effects', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ky-misd-import-'));
  try {
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', `const m=await import(${JSON.stringify(`file://${ENTRYPOINT}`)});if(typeof m.runFamily!=='function')throw Error('missing runFamily');`], {cwd: temp, encoding: 'utf8'});
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(fs.readdirSync(temp), []);
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});

await test('real --check verifies committed candidate identities without claiming raster acceptance', () => {
  const run = spawnSync(process.execPath, [ENTRYPOINT, '--check'], {cwd: ROOT, encoding: 'utf8'});
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.result, 'CHECK_PASS_RASTER_PENDING');
  assert.equal(result.rasterStatus, 'RASTER_PENDING');
  assert.equal(result.independentVerificationStatus, 'PENDING');
});

await test('substantive completeness verifier reads the family and returns nine zero counters', () => {
  const run = spawnSync(process.execPath, ['scripts/rcap-packet-completeness/verify-packet-completeness.mjs', '--family', FAMILY], {cwd: ROOT, encoding: 'utf8'});
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /PASS_COMPLETE/);
  assert.match(run.stdout, /knownRequiredFieldsMissing 0/);
  assert.match(run.stdout, /visualDefects 0/);
});

const output = {familyId: FAMILY, kind: 'AUTHOR_QA_NOT_INDEPENDENT_REVIEW', passed: results.length, failed: 0, tests: results};
if (process.argv[2]) {
  fs.mkdirSync(path.dirname(path.resolve(process.argv[2])), {recursive: true});
  fs.writeFileSync(process.argv[2], `${JSON.stringify(output, null, 2)}\n`);
}
console.log(JSON.stringify(output, null, 2));
