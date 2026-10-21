import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import test from 'node:test';
import { MI_MO_FAMILIES, miMoCandidateMatrix, createDeclaredMiMoDelivery, bindDeclaredMiMoDelivery, selectDeclaredMiMoFixture, resolveMiMoRasterEnrollment } from './mi-mo-declared-candidates.mjs';

const read = file => fs.readFileSync(file);
const json = file => JSON.parse(read(file));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const master = json('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json');
const families = new Map(MI_MO_FAMILIES.map(id => [id, master.families.find(family => family.familyId === id)]));
const binding = family => ({ family: family.familyId, routeKeys: family.routeKeys, paymentEligible: false, sponsorshipEligible: false });
const records = new Map(MI_MO_FAMILIES.map(id => [id, createDeclaredMiMoDelivery(families.get(id), binding(families.get(id)))]));
const moId = MI_MO_FAMILIES[2], miId = MI_MO_FAMILIES[0], owiId = MI_MO_FAMILIES[1];
function inputFor(item) {
  const input = json(item.input.file);
  if (input.familyId !== moId || item.fixture === 'automatic-on-notice') return input;
  input.opensNewCase = item.selection.opensNewCase;
  input.proposedOrderRequested = item.selection.proposedOrderRequested;
  if (item.selection.confidentialSheetRequired != null) input.confidentialSheetRequired = item.selection.confidentialSheetRequired;
  return input;
}
const first = id => records.get(id).binding.conditionalDelivery.fixtureBindings[0];
const allFiles = new Map();
for (const record of records.values()) for (const item of record.binding.conditionalDelivery.fixtureBindings)
  for (const file of [item.file, item.guide.file, item.input.file]) allFiles.set(file, sha(read(file)));

for (const [familyId, record] of records) {
  for (const item of record.binding.conditionalDelivery.fixtureBindings) test(`${familyId}/${item.fixture}: select exact reviewed facts, complete PDF and own guide`, () => {
    const selected = selectDeclaredMiMoFixture(record, inputFor(item), item.fixture);
    assert.equal(selected.file, item.file); assert.equal(selected.sha256, sha(read(item.file)));
    assert.equal(selected.guide.sha256, sha(read(item.guide.file)));
    assert.equal(selected.filingPermitted, false); assert.equal(selected.participantExecutionCompleted, false);
    assert.equal(selected.grantsDeliveryAuthority, false); assert.equal(selected.runtimeInstalled, false);
    assert.equal(selected.paymentEligible, false); assert.equal(selected.sponsorshipEligible, false);
  });
  test(`${familyId}: exhaustive selected raster inventory with independently parsed pages`, async () => {
    const result = await resolveMiMoRasterEnrollment(families.get(familyId));
    const items = record.binding.conditionalDelivery.fixtureBindings;
    assert.equal(result.documents.length, items.length);
    assert.deepEqual(result.documents.map(item => item.path).sort(), items.map(item => item.file).sort());
    assert.equal(new Set(result.documents.map(item => item.path)).size, items.length);
    assert.equal(result.documents.reduce((sum, item) => sum + item.pageCount, 0), record.binding.conditionalDelivery.outputInventory.pages);
    assert.deepEqual(result.coverage.notRenderedByThisGate, []);
    assert.equal(result.coverage.complete, true);
    assert(result.documents.some(item => item.name === result.canonical.name));
    assert(result.documents.some(item => item.name === result.boundary.name));
  });
}

test('MI preserves known/manual identifiers and after-mailing protected execution fields', () => {
  const c = first(miId);
  assert.equal(c.completion.requiredBeforeFiling.length, 4);
  assert(c.completion.protectedFields.some(item => item.field === 'sig'));
  assert.deepEqual(c.completion.missingAttachments, ['certified conviction copies', 'RI-008 fingerprint card']);
  for (const item of records.get(owiId).binding.conditionalDelivery.fixtureBindings.filter(item => item.fixture.includes('handoff'))) {
    assert.equal(item.expectedOutcome, 'PREPARATION_ONLY_ATTORNEY_REVIEW');
    assert.equal(item.selection.historyTreatment.permissionToReapply, false);
  }
});

test('MO automatic guidance ignores legacy base order/sheet elections and has no funding gate', () => {
  const item = records.get(moId).binding.conditionalDelivery.fixtureBindings.find(item => item.fixture === 'automatic-on-notice');
  assert.equal(inputFor(item).proposedOrderRequested, true, 'The actual retained base value stays true');
  assert.equal(item.expectedOutcome, 'AUTOMATIC_STATUS_GUIDANCE');
  assert.deepEqual(item.components.map(component => component.documentId), ['instructions']);
  assert.deepEqual(item.requiredCourtForms, []); assert.equal(item.paymentGate, null); assert.equal(item.sponsorshipGate, null);
});

test('MO preserves all 310 qualified party/filing occurrences without falsely missing canonical race', () => {
  const items = records.get(moId).binding.conditionalDelivery.fixtureBindings;
  assert.equal(items.reduce((sum, item) => sum + item.completion.requiredBeforeFiling.length, 0), 310);
  for (const item of items) for (const missing of item.completion.requiredBeforeFiling) {
    assert.equal(missing.fixture, item.fixture); assert(missing.partyRole); assert(missing.page > 0);
    if (missing.partyName === null) {
      assert.equal(missing.partyRole, 'Filing information');
      assert.equal(missing.partyIndex, null);
      assert(['Case Type Code', 'Case Type Description'].includes(missing.fieldName));
    }
    if (item.fixture.startsWith('canonical.')) assert.notEqual(missing.fieldName, 'Race');
  }
  assert(items.some(item => item.completion.requiredBeforeFiling.some(missing => missing.sheet === 2)));
});

for (const [name, familyId, change] of [
  ['wrong participant', miId, input => { input.participant.name = 'Different participant'; }],
  ['stale fact snapshot date', miId, input => { input.reviewAsOf = '2026-09-08'; }],
  ['missing required contact', miId, input => { input.participant.phone = ''; }],
  ['unknown pending-charge answer', miId, input => { delete input.attestations.noPendingCharges; }],
  ['unconfirmed OWI prior-relief answer', owiId, input => { delete input.attestations.noPriorFirstOwiRelief; }],
  ['wrong selected proposed order', moId, input => { input.proposedOrderRequested = !input.proposedOrderRequested; }],
  ['invented judicial act', moId, input => { input.judgeSignature = 'SYNTHETIC SIGNATURE'; }],
]) test(`selection refuses ${name}`, () => {
  const item = first(familyId), input = inputFor(item); change(input);
  assert.throws(() => selectDeclaredMiMoFixture(records.get(familyId), input, item.fixture));
});

test('a petition cannot borrow the automatic-guidance output', () => {
  const record = records.get(moId), item = record.binding.conditionalDelivery.fixtureBindings.find(item => item.fixture === 'automatic-on-notice');
  const input = inputFor(item); input.route = 'petition';
  assert.throws(() => selectDeclaredMiMoFixture(record, input, item.fixture), /FIXTURE_INPUT_MISMATCH/);
});

for (const [name, change] of [
  ['installed assertion', record => { record.runtimeInstalled = true; }],
  ['payment authority', record => { record.binding.paymentEligible = true; }],
  ['sponsored authority', record => { record.binding.sponsorshipEligible = true; }],
  ['wrong route scope', record => { record.binding.routeKeys = []; }],
  ['changed component selection', record => { record.binding.conditionalDelivery.fixtureBindings[0].components = []; }],
]) test(`declared output refuses ${name}`, () => {
  const record = structuredClone(records.get(miId)); change(record);
  assert.throws(() => selectDeclaredMiMoFixture(record, inputFor(first(miId)), first(miId).fixture));
});

test('real participant input cannot select a synthetic fixture', () => {
  const input = inputFor(first(moId)); input.synthetic = false;
  assert.throws(() => selectDeclaredMiMoFixture(records.get(moId), input, first(moId).fixture), /PARTICIPANT_RENDER_REQUIRED/);
});

test('changed source bytes refuse before the shared matrix can enroll or bind an output', () => {
  const source = 'reference/chat-parallel-2026-09-07/chat7/CR301.pdf';
  const options = { readFile: file => { const bytes = Buffer.from(read(file)); if (file === source) bytes[100] ^= 1; return bytes; } };
  assert.throws(() => miMoCandidateMatrix(families.get(moId), options), /input hash mismatch/);
});

test('partial or substituted output inventory is refused without altering retained files', () => {
  const family = families.get(miId), report = json(`${family.directory}/reports/rendered-artifacts.json`);
  report.artifacts.pop();
  assert.throws(() => bindDeclaredMiMoDelivery(records.get(miId), family, { report }), /differs from reviewed bytes/);
  assert.throws(() => bindDeclaredMiMoDelivery(records.get(miId), family, { hashFile: () => '0'.repeat(64) }), /current selected output mismatch/);
});

test('a structurally asserted partial raster receipt cannot cover a whole family', () => {
  const family = families.get(moId);
  const raster = { familyId: moId, rasterReceipt: { verdict: 'RASTER_PASS', coversTheWholeFamily: true, documentsMeasured: 1 } };
  assert.throws(() => bindDeclaredMiMoDelivery(records.get(moId), family, { raster }));
});

test('unrelated families are untouched by both scoped integration points', async () => {
  const record = { untouched: true }, family = { familyId: 'other' };
  assert.equal(bindDeclaredMiMoDelivery(record, family), record);
  assert.equal(createDeclaredMiMoDelivery(family, {}), null);
  assert.equal(await resolveMiMoRasterEnrollment(family), null);
});

test('no retained PDF, fixture, source or delivered guide changed during these controls', () => {
  for (const [file, digest] of allFiles) assert.equal(sha(read(file)), digest, file);
});
