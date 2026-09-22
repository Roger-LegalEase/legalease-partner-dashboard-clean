#!/usr/bin/env node
/*
 * Adversarial suite for the DC historical-producer mapping.
 *
 * The mapping exists so the two historical DC census filing-proof PDFs stay
 * attributed to the bytes that actually produced them, after task 53 moved a
 * shared host those PDFs predate. An exception that returns older bytes is
 * only as good as the gates around it, so every gate is mutated here and must
 * refuse. Mutations that would otherwise be stopped by the record's outer byte
 * pin are driven through assertDcHistoricalProducerConditions, so the suite
 * proves the inner conditions rather than taking credit for the pin alone.
 *
 * Nothing here writes into the working tree: every mutation is injected
 * through readBytes/readGitBlob overrides.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  HISTORICAL_PRODUCERS,
  DC_HISTORICAL_PRODUCER_SHA256,
  FOOTER_COMMIT,
  assertDcHistoricalProducer,
  assertDcHistoricalProducerConditions,
  evidenceProducerBytes,
  digest
} from './lib/noncommercial-evidence-producer-reconciliation.mjs';

const read = p => fs.readFileSync(p);
const entry = HISTORICAL_PRODUCERS[0];
const record = JSON.parse(read(entry.recordPath));
const wrapperPath = entry.providerPaths.find(p => p !== entry.movedProviderPath);

const results = [];
function deny(label, run) {
  assert.throws(run, undefined, `MISSED: ${label}`);
  results.push({ mutation: label, gate: 'RED' });
}
/** Mutate the record past its byte pin. */
const withRecord = mutate => {
  const clone = structuredClone(record);
  mutate(clone);
  return () => assertDcHistoricalProducerConditions({ entry, record: clone, readBytes: read });
};
/** Mutate the tree the mapping reads, keeping the real record. */
const withBytes = overrides => () =>
  assertDcHistoricalProducerConditions({ entry, record, readBytes: p => overrides[p] ?? read(p) });

// ---------------------------------------------------------------- positives
const proven = assertDcHistoricalProducer({ entry });
assert.equal(proven.historicalAggregate, digest(Buffer.concat(entry.providerPaths.map(
  p => p === entry.movedProviderPath ? read(entry.historicalBytesPath) : read(p)))),
  'historical aggregate is not derived from the pinned host plus the live wrapper');
assert.equal(proven.currentAggregate, digest(Buffer.concat(entry.providerPaths.map(read))),
  'current aggregate is not derived from the live tree');
assert.notEqual(proven.historicalAggregate, proven.currentAggregate);

// The mapped route resolves the moved host to the historical bytes...
assert.equal(
  digest(evidenceProducerBytes({ familyId: entry.familyId, routeId: entry.routeId, builderPath: entry.movedProviderPath, readBytes: read })),
  digest(read(entry.historicalBytesPath)),
  'the mapped route did not resolve to the pinned historical host');
// ...while the provider in the tuple that never moved needs no exception.
assert.equal(
  digest(evidenceProducerBytes({ familyId: entry.familyId, routeId: entry.routeId, builderPath: wrapperPath, readBytes: read })),
  digest(read(wrapperPath)),
  'the unmoved wrapper was rerouted through the exception');
// A sibling family/route sharing the same host is NOT covered: it must see the
// current bytes, so the mapping cannot leak into an unreconciled route.
assert.equal(
  digest(evidenceProducerBytes({ familyId: 'dc_seal_nonconviction-set', routeId: 'DC:dc_seal_nonconviction', builderPath: entry.movedProviderPath, readBytes: read })),
  digest(read(entry.movedProviderPath)),
  'an unmapped sibling route reached the historical exception');

// ---------------------------------------------------------------- mutations
// 1 — the outer byte pin itself still refuses a changed record.
deny('record bytes changed', () =>
  assertDcHistoricalProducer({ entry, readBytes: p => p === entry.recordPath ? Buffer.concat([read(p), Buffer.from(' ')]) : read(p) }));
assert.equal(digest(read(entry.recordPath)), DC_HISTORICAL_PRODUCER_SHA256, 'record pin drifted from the file');

// 2-8 — identity of the record and the exactness of the mapped tuple.
deny('schema version changed', withRecord(r => { r.schemaVersion = 'rcap-dc-innocence-historical-producer-reconciliation/v2'; }));
deny('classification relabelled', withRecord(r => { r.classification = 'cosmetic_change_exception'; }));
deny('record names a different route', withRecord(r => { r.scope.routeId = 'DC:dc_seal_nonconviction'; }));
deny('record names a different family', withRecord(r => { r.scope.familyId = 'dc_seal_nonconviction-set'; }));
deny('record widens the provider paths', withRecord(r => { r.scope.providerPaths = [...r.scope.providerPaths, 'scripts/build-census-v1-il-prostitution-j-vacate-set.mjs']; }));
deny('record names a different task-53 parent', withRecord(r => { r.scope.task53Parent = '0'.repeat(40); }));
deny('record names a different task-53 footer commit', withRecord(r => { r.scope.task53FooterCommit = '0'.repeat(40); }));

// 9-13 — the five things this record must never claim.
for (const key of ['changesLegalContent', 'changesPacketSpecification', 'changesApprovedCommercialArtifacts', 'createsApproval', 'approvesNewBytes']) {
  deny(`record claims ${key}`, withRecord(r => { r[key] = true; }));
}

// 14-16 — the historical bytes must be pinned in the tree AND be what the
// task-53 parent actually held. A pin nobody checks against git is a claim.
deny('pinned historical host bytes changed', withBytes({ [entry.historicalBytesPath]: Buffer.concat([read(entry.historicalBytesPath), Buffer.from('\n')]) }));
deny('record historical host hash disagrees with the pinned bytes', withRecord(r => { r.producerIdentity.historical.pinnedBytes.sha256 = '0'.repeat(64); }));
deny('pinned bytes are not what the task-53 parent held', () =>
  assertDcHistoricalProducerConditions({ entry, record, readBytes: read, readGitBlob: () => Buffer.from('// not the parent bytes\n') }));

// 17-21 — every identity is DERIVED, then compared with what the record says.
deny('the wrapper moved', withBytes({ [wrapperPath]: Buffer.concat([read(wrapperPath), Buffer.from('\n')]) }));
deny('record historical aggregate disagrees with the derivation', withRecord(r => { r.producerIdentity.historical.aggregateSha256 = '0'.repeat(64); }));
deny('record current shared-host hash disagrees with the tree', withRecord(r => { r.producerIdentity.currentAtReconciliation.sharedHostSha256 = '0'.repeat(64); }));
deny('record current aggregate disagrees with the derivation', withRecord(r => { r.producerIdentity.currentAtReconciliation.aggregateSha256 = '0'.repeat(64); }));
deny('the two producer identities collapse into one', withBytes({ [entry.movedProviderPath]: read(entry.historicalBytesPath) }));

// 22 — the ONLY admitted delta stays the task-53 footer treatment, unweakened.
deny('the current host carries more than the footer delta', withBytes({
  [entry.movedProviderPath]: Buffer.concat([read(entry.movedProviderPath), Buffer.from('\nconst unrelatedLegalChange = true;\n')])
}));

// 23-26 — the mapping covers these exact historical artifacts, attributed to
// the derived historical producer, and is never relabelled as current output.
deny('record names different historical artifacts', withRecord(r => { r.historicalFilingProofArtifacts.canonical = '0'.repeat(64); }));
deny('historical artifacts attributed to the current producer', withRecord(r => { r.historicalFilingProofArtifacts.producedBy = r.producerIdentity.currentAtReconciliation.aggregateSha256; }));
deny('historical artifacts flipped to current commercial', withRecord(r => { r.historicalFilingProofArtifacts.isCurrentCommercialArtifact = true; }));
deny('task-53 STALE classification relabelled', withRecord(r => { r.historicalFilingProofArtifacts.task53EvidenceStatus = 'CURRENT'; }));

// 27-32 — current participant delivery stays separately governed, unchanged.
deny('the current-commercial owner approval moved', withBytes({
  [record.currentCommercialApproval.path]: Buffer.concat([read(record.currentCommercialApproval.path), Buffer.from(' ')])
}));
deny('record names a different owner decision', withRecord(r => { r.currentCommercialApproval.recordId = 'OWNER-SOMETHING-ELSE'; }));
deny('approval verdict no longer unchanged bytes', withRecord(r => { r.currentCommercialApproval.verdict = 'APPROVED_NEW_BYTES'; }));
deny('approved artifact population changed', withRecord(r => { r.currentCommercialApproval.artifacts = r.currentCommercialApproval.artifacts.slice(0, 2); }));
deny('an approved artifact was not reproduced identically', withRecord(r => { r.currentCommercialApproval.artifacts[0].reproducedIdentical = false; }));
deny('guide-assembly contract flipped', withRecord(r => { r.currentCommercialApproval.artifacts.find(a => a.id === 'court-only').guideAssembled = true; }));

// ------------------------------------------------------------------ report
// The real record still proves, so the suite did not leave the gate weakened.
const after = assertDcHistoricalProducer({ entry });
assert.equal(after.historicalAggregate, proven.historicalAggregate);
assert.equal(after.currentAggregate, proven.currentAggregate);
assert.equal(record.scope.task53FooterCommit, FOOTER_COMMIT);

for (const row of results) console.log(`RED  ${row.mutation}`);
console.log(`\nDC historical-producer mutations: ${results.length}/${results.length} refused.`);
console.log(`historical producer: ${proven.historicalAggregate}`);
console.log(`current producer   : ${proven.currentAggregate}`);
