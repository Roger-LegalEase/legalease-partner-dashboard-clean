import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import {
  bindDeclaredMdFavorableDelivery,
  selectDeclaredMdFavorableFixture,
  MD_FAVORABLE_FAMILY as FAMILY,
  MD_FAVORABLE_DIRECTORY as OUT,
  MD_FAVORABLE_ROUTE as ROUTE,
  MD_FAVORABLE_FIXTURES
} from '../../grade-a-packet-factory-24h/md-favorable-declared-delivery.mjs';

const installed = process.argv.includes('--installed');
const read = file => fs.readFileSync(path.resolve(file));
const json = file => JSON.parse(read(file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const manifestPath = 'scripts/rcap-packet-completeness/md-reviewed-candidate-inputs.json';
const adapterPath = 'scripts/rcap-packet-completeness/md-favorable-native-candidate.mjs';
const modulePath = 'scripts/grade-a-packet-factory-24h/md-favorable-declared-delivery.mjs';
const manifest = json(manifestPath);
const sourcePath = 'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072A.pdf';
const wiringPath = `${OUT}/product-wiring.json`;
const originalRecordBytes = installed ? read(wiringPath) : null;
const record = installed ? JSON.parse(originalRecordBytes) : {
  family: FAMILY, routeKeys: [ROUTE], status: 'DECLARED_NOT_INSTALLED', authorityCreated: 'none',
  currentState: { generationAllowed: false, runtimeSelectable: false },
  binding: { routeKeys: [ROUTE], paymentEligible: false, sponsorshipEligible: false }, proposedRepresentation: {}
};
const family = { familyId: FAMILY, directory: OUT, routeKeys: [ROUTE] };
const bound = installed ? record : bindDeclaredMdFavorableDelivery(record, family);
const fixtures = bound.binding.conditionalDelivery.fixtureBindings;
const facts = fixture => json(`${OUT}/fixtures/${fixture}.facts.json`);
const checks = [];
const test = async (name, run) => {
  try { await run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
};
let rawFieldNames = [];
await test('The pinned official 072A source independently contains exactly 47 distinct fields on one page', async () => {
  const bytes = read(sourcePath);
  assert.equal(hash(bytes), '8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2');
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(pdf.getPageCount(), 1);
  rawFieldNames = pdf.getForm().getFields().map(field => field.getName());
  assert.equal(rawFieldNames.length, 47);
  assert.equal(new Set(rawFieldNames).size, 47);
});
let fieldsMeasured = 0, pagesMeasured = 0;
for (const fixture of MD_FAVORABLE_FIXTURES) {
  await test(`${fixture}: exact output, all source fields and protected/manual roles remain bound`, async () => {
    const selected = selectDeclaredMdFavorableFixture(bound, facts(fixture), fixture);
    const bytes = read(selected.file);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(hash(bytes), selected.sha256);
    assert.equal(bytes.length, selected.byteLength);
    assert.equal(pdf.getPageCount(), 4);
    assert.deepEqual(selected.components, ['CC-DC-CR-072A', 'participant-instructions']);
    assert.deepEqual(selected.pageManifest.map(page => page.role), ['primary_filing', 'participant_instructions', 'participant_instructions', 'participant_instructions']);
    assert.equal(hash(read(selected.input.file)), selected.input.sha256);
    assert.equal(hash(read(selected.report.file)), selected.report.sha256);
    assert.deepEqual(selected.sourceFieldAccounting.fields.map(field => field.field).sort(), [...rawFieldNames].sort());
    assert.equal(selected.sourceFieldAccounting.total, 47);
    assert.equal(selected.sourceFieldAccounting.written + selected.sourceFieldAccounting.blank, 47);
    assert.equal(selected.notApplicableAttorneyBlanks.length, 9);
    assert.equal(selected.participantExecution.length, 1);
    assert.equal(selected.requiredBeforeFiling.length, fixture === 'boundary' ? 1 : 0);
    if (fixture === 'boundary') assert.equal(selected.requiredBeforeFiling[0].field, 'Law Enforcement Agency');
    assert.ok(selected.optionalBlanks.some(blank => blank.field === 'Defendant Fax'));
    assert.ok(!selected.optionalBlanks.some(blank => ['Defendant Telephone Number', 'Law Enforcement Agency'].includes(blank.field)));
    assert.equal(selected.sourceFieldAccounting.fields.find(field => field.field === 'Defendant Telephone Number').accounting, 'WRITTEN');
    assert.equal(selected.sourceFieldAccounting.fields.find(field => field.field === 'Signature of Defendant').accounting, 'PROTECTED_EXECUTION');
    assert.equal(selected.grantsEligibility, false);
    assert.equal(selected.grantsDeliveryAuthority, false);
    assert.equal(selected.runtimeInstalled, false);
    assert.equal(selected.participantExecutionCompleted, false);
    assert.equal(selected.filingPermitted, false);
    fieldsMeasured += selected.sourceFieldAccounting.total;
    pagesMeasured += pdf.getPageCount();
  });
}
await test('All 56 pinned candidate members and the accepted adapter retain their bytes', () => {
  assert.equal(manifest.files.length, 56);
  for (const member of manifest.files) {
    const bytes = read(member.path);
    assert.equal(bytes.length, member.byteLength);
    assert.equal(hash(bytes), member.sha256);
  }
  assert.equal(hash(read(adapterPath)), '2c0cb8fb3e2d754184b32289ceba64509ede75e704fe65386188e8a78267a4f3');
  assert.equal(fieldsMeasured, 705);
  assert.equal(pagesMeasured, 60);
});
for (const [name, change, fixture = 'canonical'] of [
  ['different participant', input => { input.participant.fullName = 'Independent Synthetic Other Participant'; }],
  ['newly held optional fax', input => { input.participant.fax = '410-555-0108'; }],
  ['newly held missing agency', input => { input.case.agency = 'Independent Synthetic Agency'; }, 'boundary'],
  ['lost required phone', input => { input.participant.phone = null; }],
  ['asserted attorney facts', input => { input.attorney = { name: 'Independent Synthetic Attorney' }; }],
  ['asserted participant signature', input => { input.execution = { signed: true, signature: 'Synthetic Claimed Signature' }; }],
  ['asserted participant ownership', input => { input.participantOwned = true; input.verified = true; }],
  ['real participant marker', input => { input.isSyntheticFixture = false; }],
  ['unknown favorable-disposition confirmation', input => { delete input.confirmations.selectedStatementTrue; }]
]) await test(`Refuses canned delivery for ${name}`, () => {
  const input = facts(fixture);
  change(input);
  assert.throws(() => selectDeclaredMdFavorableFixture(bound, input, fixture));
});
await test('A treatment-specific nolle input cannot borrow the ordinary nolle PDF', () => {
  assert.throws(() => selectDeclaredMdFavorableFixture(bound, facts('selectable/nolle-treatment'), 'selectable/nolle'));
});
await test('PBJ facts cannot borrow the ordinary canonical PDF', () => {
  assert.throws(() => selectDeclaredMdFavorableFixture(bound, facts('selectable/pbj'), 'canonical'));
});
for (const fixture of [undefined, '__proto__', 'selectable/conviction', 'selectable/cannabis']) {
  await test(`Refuses unsupported/default fixture ${String(fixture)}`, () => {
    assert.throws(() => selectDeclaredMdFavorableFixture(bound, facts('canonical'), fixture));
  });
}
for (const [name, change] of [
  ['source hash', altered => { altered.binding.conditionalDelivery.sourceBinding.sha256 = '0'.repeat(64); }],
  ['agency omission', altered => { altered.binding.conditionalDelivery.fixtureBindings.find(row => row.fixture === 'boundary').requiredBeforeFiling = []; }],
  ['attorney-role relabel', altered => { altered.binding.conditionalDelivery.fixtureBindings[0].notApplicableAttorneyBlanks = []; }],
  ['extra waiver component', altered => { altered.binding.conditionalDelivery.fixtureBindings[0].components.push('MDJ-008'); }],
  ['claimed installed state', altered => { altered.status = 'INSTALLED'; }],
  ['foreign route binding', altered => { altered.binding.routeKeys = ['obligation:track-only:MD:unrelated']; }]
]) await test(`Refuses altered declaration ${name}`, () => {
  const altered = structuredClone(bound);
  change(altered);
  assert.throws(() => selectDeclaredMdFavorableFixture(altered, facts('canonical'), 'canonical'));
});
await test('A matching caller checksum cannot bless altered adapter bytes', () => {
  const port = file => {
    const bytes = Buffer.from(read(file));
    if (file === adapterPath) bytes[bytes.length - 1] ^= 1;
    return bytes;
  };
  assert.throws(() => bindDeclaredMdFavorableDelivery(record, family, { readFile: port, hashFile: file => hash(port(file)) }), /source-role adapter changed/);
});
await test('A caller cannot grant a receipt covering only the two diagnostic outputs', () => {
  assert.throws(() => bindDeclaredMdFavorableDelivery(record, family, { raster: {
    familyId: FAMILY, rasterReceipt: { verdict: 'RASTER_PASS', coversTheWholeFamily: true, documentsMeasured: 2, pagesMeasured: 8 }
  } }));
});
await test('Record and resulting declaration remain explicitly non-runtime and non-commercial', () => {
  assert.equal(bound.status, 'DECLARED_NOT_INSTALLED');
  assert.equal(bound.authorityCreated, 'none');
  assert.equal(bound.currentState.generationAllowed, false);
  assert.equal(bound.currentState.runtimeSelectable, false);
  assert.equal(bound.binding.paymentEligible, false);
  assert.equal(bound.binding.sponsorshipEligible, false);
  assert.equal(bound.binding.filingPermitted, false);
  assert.equal(bound.binding.conditionalDelivery.runtimeInstalled, false);
  assert.equal(bound.binding.conditionalDelivery.defaultBranch, null);
  assert.equal(fixtures.length, 15);
});
await test('No independent test changed retained source, fixture or generated-record bytes', () => {
  for (const member of manifest.files) assert.equal(hash(read(member.path)), member.sha256);
  if (installed) assert.equal(hash(read(wiringPath)), hash(originalRecordBytes));
});
const failed = checks.filter(check => !check.passed).length;
const evidence = {
  schemaVersion: 'rcap-independent-md-favorable-declared-engineering/v1',
  reviewer: 'release_scope independent engineering sub-agent',
  recordedAt: new Date().toISOString(),
  familyId: FAMILY,
  verdict: failed ? 'FAIL_REPAIR_REQUIRED' : 'PASS_BOUNDED_ENGINEERING_DELTA',
  actualInstalledRecordExercised: installed,
  evidencePublicationCommit: null,
  measuredSourceIdentities: [modulePath, adapterPath, manifestPath, ...(installed ? [wiringPath] : [])].map(file => {
    const bytes = read(file); return { path: file, sha256: hash(bytes), gitBlob: blob(bytes) };
  }),
  checks,
  passed: checks.length - failed,
  failed,
  measured: { reviewedInputFiles: manifest.files.length, fixtureChoices: fixtures.length, sourceFieldsPerFixture: rawFieldNames.length, sourceFieldInstances: fieldsMeasured, completePages: pagesMeasured },
  receiptBoundary: 'Optional raster input checks identity and coverage only. Existing acceptanceIdentity/L6 caller provenance admission, not a supplied flag or checksum, remains responsible for authenticating the receipt.',
  limitations: [
    'Exact synthetic fixture delivery is measured; personalized participant rendering and ownership are not proven.',
    'Original complete-PDF review and accepted chronology guard remain unchanged evidence; no page-image reexamination or new rendering was performed.',
    'Optional fax, pro-se attorney fields, personal execution and genuinely missing required agency remain distinct source-bound obligations.',
    'No eligibility, commercial entitlement, durable job, private artifact delivery, central raster admission or production release is claimed.'
  ],
  runtimeIntakeCounters: null,
  runtimeInstalled: false,
  retainedFilesMutated: false,
  packetRendererRuns: 0,
  freshPageImagesExamined: 0,
  productionTouched: false
};
const destination = `data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/independent-md-declared-${installed ? 'installed' : 'engineering'}.json`;
fs.writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: destination, verdict: evidence.verdict, passed: evidence.passed, failed, failedChecks: checks.filter(check => !check.passed), actualInstalledRecordExercised: installed }));
if (failed) process.exitCode = 1;
