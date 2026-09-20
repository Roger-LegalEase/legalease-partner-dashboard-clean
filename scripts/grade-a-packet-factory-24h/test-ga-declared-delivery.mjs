import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bindDeclaredGaDelivery, selectDeclaredGaFixture } from './ga-declared-delivery.mjs';
import { FAMILY, ROUTE, OUT, fixtures } from '../rcap-packet-recovery/chat5/ga-pre2013.mjs';

const family = { familyId: FAMILY, directory: OUT, routeKeys: [ROUTE] };
const seed = { family: FAMILY, routeKeys: [ROUTE], status: 'DECLARED_NOT_INSTALLED', authorityCreated: 'none',
  currentState: { generationAllowed: false }, binding: { routeKeys: [ROUTE], paymentEligible: false, sponsorshipEligible: false },
  proposedRepresentation: {} };
const bound = bindDeclaredGaDelivery(seed, family);
const examples = fixtures();
let controls = 0, selected = 0;
assert.deepEqual(bound.binding.conditionalDelivery.outputInventory, { documents: 15, pages: 108, diagnosticDocuments: 3, conditionalExamples: 12 });
assert.equal(bound.proposedRepresentation.defaultComponentId, null);
for (const item of bound.binding.conditionalDelivery.fixtureBindings) {
  assert.equal(item.filingReady, false);
  assert(item.requiredBeforeFiling.some(m => m.fieldId === 'participant.ssn'));
  if (item.selectionKind === 'diagnostic') {
    assert.throws(() => selectDeclaredGaFixture(bound, examples[item.fixture], item.fixture), /DIAGNOSTIC_IS_NOT/); controls++;
  } else {
    assert.deepEqual(selectDeclaredGaFixture(bound, examples[item.fixture], item.fixture), item); selected++;
  }
}
assert.equal(selected, 12);
for (const mutate of [
  r => { r.status = 'INSTALLED'; }, r => { r.binding.paymentEligible = true; },
  r => { r.binding.sponsorshipEligible = true; }, r => { r.routeKeys = ['wrong']; },
  r => { r.runtimeInstalled = true; }, r => { r.currentState.runtimeSelectable = true; },
  r => { r.binding.runtimeInstalled = true; }, r => { r.binding.generationAllowed = true; },
  r => { r.binding.filingPermitted = true; },
  r => { r.binding.conditionalDelivery.fixtureBindings.pop(); },
  r => { r.binding.conditionalDelivery.fixtureBindings[0].filingReady = true; },
  r => { r.proposedRepresentation.components[0].file = `${OUT}/fixtures/canonical.pdf`; },
  r => { r.proposedRepresentation.components[0].role = 'primary_filing'; },
]) {
  const changed = structuredClone(bound); mutate(changed);
  assert.throws(() => selectDeclaredGaFixture(changed, examples['basis-01'], 'basis-01')); controls++;
}
for (const input of [ { ...examples['basis-01'], sample: false }, examples['basis-02'],
  { ...examples['basis-01'], participant: { ...examples['basis-01'].participant, fullName: 'Changed' } } ]) {
  assert.throws(() => selectDeclaredGaFixture(bound, input, 'basis-01')); controls++;
}
assert.throws(() => selectDeclaredGaFixture(bound, examples['basis-01'], null)); controls++;
const report = JSON.parse(fs.readFileSync(`${OUT}/reports/rendered-artifacts.json`));
const shortened = structuredClone(report); shortened.artifacts = shortened.artifacts.slice(0, 2); shortened.packets = shortened.artifacts;
assert.throws(() => bindDeclaredGaDelivery(seed, family, { report: shortened })); controls++;
const queue = JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json'));
const raster = queue.rows.find(r => r.familyId === FAMILY);
let actualCentralReceiptChecked = false;
if (raster.rasterReceipt) {
  const withReceipt = bindDeclaredGaDelivery(seed, family, { raster });
  assert.equal(withReceipt.binding.acceptanceReceipt.pagesMeasured, 108); actualCentralReceiptChecked = true;
  for (const mutate of [
    r => { r.rasterReceipt.pagesMeasured = 15; }, r => { r.rasterReceipt.documentsCovered.pop(); },
    r => { r.documents[0].selectionKind = 'conditional_packet_example'; },
    r => { r.documents[0].requiredBeforeFiling = []; }, r => { r.documents[0].sha256 = '0'.repeat(64); },
    r => { r.rasterReceipt.boundToBoundarySha256 = '0'.repeat(64); },
  ]) { const changed = structuredClone(raster); mutate(changed); assert.throws(() => bindDeclaredGaDelivery(seed, family, { raster: changed })); controls++; }
}
console.log(JSON.stringify({ documents: 15, pages: 108, conditionalExamplesSelected: selected, diagnosticSelectionsRefused: 3,
  negativeControlsCaught: controls, actualCentralReceiptChecked, filingReady: false, runtimeInstalled: false }));
