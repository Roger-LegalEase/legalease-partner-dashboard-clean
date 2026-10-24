import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, SOURCE, INDEX, hash, importSource, verifySource } from './rcap-corpus/import-md-juvenile-source.mjs';
import { censusOf, resolveFacts, confirmedFixture, renderCandidate, runFamily, ROUTE } from './build-census-v1-md_juvenile_expungement-set.mjs';
const { recordFactConfirmationFor } = await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const { mdJuvenileCaptionQuestion } = await import('../src/lib/expungement-ai/md-juvenile-county-source-purpose.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const question = mdJuvenileCaptionQuestion(getProfileByJurisdiction('MD'), 'juvenile-expungement', null);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'md-juvenile-test-'));
const evidence = process.env.RCAP_MD_JUVENILE_FAMILY_EVIDENCE;
if (evidence) { assert(!fs.existsSync(evidence), 'fresh evidence destination'); fs.mkdirSync(evidence, { recursive: true }); }
const checks = [];
function check(name, fn) { fn(); checks.push(name); }
try {
  const original = path.join(ROOT, SOURCE.path);
  const bytes = verifySource(fs.readFileSync(original));
  const census = await censusOf(bytes);
  const input = confirmedFixture();
  check('45 measured fields on two original pages', () => assert.deepEqual([census.rows.length, census.pageCount], [45, 2]));
  check('confirmed county is exact option', () => assert.equal(resolveFacts(input, census).facts['matter.county'], 'Baltimore City'));
  const cases = [
    ['canonical', value => value, 'Baltimore City'],
    ['unconfirmed', value => { delete value.recordFactConfirmations; return value; }, null],
    ['status-only-forgery', value => { value.recordFactConfirmations.county = { status: 'confirmed' }; return value; }, null],
    ['stale-county', value => { value.answers.county = 'Worcester County'; return value; }, null],
    ['stale-charge', value => { value.answers.charge = 'Different juvenile charge'; return value; }, null],
    ['stale-court', value => { value.answers.court = 'Actual transferee juvenile court'; return value; }, null],
    ['unknown', value => { value.answers.county = { value: 'Baltimore City', unknown: true }; return value; }, null],
    ['not-sure', value => { value.answers.county = 'I am not sure'; return value; }, null],
    ['invalid-option', value => { value.answers.county = 'Example County'; return value; }, null],
    ['residence-only', value => { delete value.answers.county; value.answers.residency_or_location = 'Baltimore City'; return value; }, null],
    ['incident-only', value => { delete value.answers.county; value.answers.incident_county = 'Baltimore City'; return value; }, null],
    ['option-spelling-mismatch', () => confirmedFixture('Prince George’s County'), null],
    ['other-supported-county', () => confirmedFixture('Worcester County'), 'Worcester County'],
    ['confirmed-transferee', value => {
      value.answers.court = 'Actual transferee juvenile court';
      value.answers.county = 'Worcester County';
      value.recordFactConfirmations.county = recordFactConfirmationFor(ROUTE, 'county', value.answers, question);
      return value;
    }, 'Worcester County'],
  ];
  const artifacts = [];
  for (const [name, change, county] of cases) {
    const value = change(structuredClone(input));
    value.savedAnswerHistory = { county: [{ value: 'old residence', meaning: 'prior_factual_pathway_answer' }] };
    const before = structuredClone(value);
    const directory = path.join(evidence ?? temp, name);
    const result = await renderCandidate(bytes, value, directory);
    const countyWrites = result.actualWrites.filter(row => row.field === 'City/County of Circuit Court');
    check(`${name}: exact county write or blank`, () => assert.deepEqual(countyWrites.map(row => row.drawnText), county ? [county] : []));
    check(`${name}: all inputs/history preserved`, () => assert.deepEqual(value, before));
    check(`${name}: only four mapped fields can be written`, () => assert(result.actualWrites.every(row => [
      'City/County of Circuit Court', 'RespondentPetitioner', 'Printed Name', 'I was charged with the offense of'].includes(row.field))));
    check(`${name}: two name destinations and actual charge`, () => assert.deepEqual(result.actualWrites.filter(row => row.field !== 'City/County of Circuit Court').map(row => [row.field, row.drawnText]).sort(), [
      ['RespondentPetitioner', value.answers.participant_full_legal_name], ['Printed Name', value.answers.participant_full_legal_name],
      ['I was charged with the offense of', value.answers.charge]].sort()));
    check(`${name}: blank refused fields and no outside ink`, () => assert.deepEqual([result.refusedFieldsWithInk, result.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes], [[], 0]));
    check(`${name}: still held/no authority`, () => assert.deepEqual([result.status, result.paymentAllowed, result.fulfillmentStatus], ['HELD_DRAFT', false, 'NO_RECORD']));
    if (!county) check(`${name}: missing county disclosed`, () => assert(result.holds.some(row => row.field === 'City/County of Circuit Court')));
    artifacts.push({ name, file: path.join(directory, 'candidate.pdf'), sha256: hash(result.bytes), county,
      writes: result.actualWrites, holds: result.holds });
  }
  for (const routeKey of ['MD:adult-non-conviction-expungement-under-crim-proc-10-105', 'VA:juvenile-expungement', '', null]) {
    check(`refuse route ${routeKey}`, () => assert.throws(() => resolveFacts({ ...input, routeKey }, census), /refuses other routes/));
  }
  const unknownIdentity = structuredClone(input);
  unknownIdentity.answers.participant_full_legal_name = { value: 'Known-looking name', unknown: true };
  unknownIdentity.answers.charge = { value: 'Known-looking charge', unknown: true };
  check('unknown identity and charge never filled', () => assert.deepEqual(resolveFacts(unknownIdentity, census).facts, {}));
  const long = structuredClone(input);
  long.answers.participant_full_legal_name = 'Longname'.repeat(200);
  const longBefore = structuredClone(long);
  const longResult = await renderCandidate(bytes, long, path.join(evidence ?? temp, 'overflow'));
  check('overflow is a disclosed refusal', () => assert(longResult.holds.some(row => row.field === 'RespondentPetitioner')));
  check('overflow preserves raw answers', () => assert.deepEqual(long, longBefore));
  check('source corruption refused before rendering', () => {
    const changed = Buffer.from(bytes); changed[200] ^= 1;
    assert.throws(() => verifySource(changed), /source digest/);
  });

  // Exercise intake in isolated custody. Existing index entries are never regenerated.
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX), 'utf8'));
  const without = structuredClone(index);
  without.entries = without.entries.filter(row => row.custody !== SOURCE.custody);
  without.custodies = without.custodies.filter(row => row.id !== SOURCE.custody);
  without.totals.binariesIndexed--; without.totals.pdfsIndexed--; without.totals.byAssetFormat.pdf--;
  without.totals.byStructure.acroform--; without.byState.MD--; delete without.totals.byCustody[SOURCE.custody];
  const intakeRoot = path.join(temp, 'intake');
  fs.mkdirSync(path.dirname(path.join(intakeRoot, INDEX)), { recursive: true });
  fs.writeFileSync(path.join(intakeRoot, INDEX), JSON.stringify(without, null, 2) + '\n');
  await importSource(original, intakeRoot);
  const after = JSON.parse(fs.readFileSync(path.join(intakeRoot, INDEX), 'utf8'));
  check('intake adds exactly the declared record and counts', () => assert.deepEqual(after, index));
  check('all prior entries preserved', () => assert.deepEqual(after.entries.slice(0, -1), without.entries));
  check('all prior custody declarations preserved', () => assert.deepEqual(after.custodies.slice(0, -1), without.custodies));
  const indexBeforeRepeat = fs.readFileSync(path.join(intakeRoot, INDEX));
  const repeat = await importSource(original, intakeRoot);
  check('repeat intake is byte-identical', () => assert.deepEqual([repeat.indexChanged, fs.readFileSync(path.join(intakeRoot, INDEX))], [false, indexBeforeRepeat]));
  fs.writeFileSync(path.join(intakeRoot, SOURCE.path), Buffer.from('different existing input'));
  await assert.rejects(importSource(original, intakeRoot), /source length/);
  check('existing different bytes are never overwritten', () => assert.equal(fs.readFileSync(path.join(intakeRoot, SOURCE.path), 'utf8'), 'different existing input'));
  check('failed intake preserves index', () => assert.deepEqual(fs.readFileSync(path.join(intakeRoot, INDEX)), indexBeforeRepeat));

  const output = path.join(temp, 'family');
  await runFamily(['--output', output]);
  const receipt = JSON.parse(fs.readFileSync(path.join(output, 'source-receipt.json'), 'utf8'));
  check('truthful newly acquired custody', () => assert.deepEqual([receipt.custodyClass, receipt.acquisitionCommissioned], ['NEWLY_ACQUIRED_OFFICIAL_PUBLICATION', true]));
  const product = JSON.parse(fs.readFileSync(path.join(output, 'product-wiring.json'), 'utf8'));
  check('no runtime/fulfillment promotion', () => assert.deepEqual([product.status, product.authorityCreated, product.currentState.fulfillmentStatus, product.binding.paymentEligible], ['DECLARED_NOT_INSTALLED', 'none', 'NO_RECORD', false]));
  check('source bytes preserved throughout', () => assert.equal(hash(fs.readFileSync(original)), SOURCE.sha256));
  if (evidence) fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({ result: 'PASS', checks, artifacts,
    limitations: ['central raster and independent completeness pending', 'no runtime selection or paid delivery'] }, null, 2) + '\n');
  console.log(`PASS MD juvenile family: ${checks.length} checks, ${artifacts.length} rendered boundaries`);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
