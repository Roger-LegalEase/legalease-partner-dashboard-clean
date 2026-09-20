import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const OH_FAMILY = 'rcap-oh-custom-pleading-clean-tracks';
export const OH_DIRECTORY = "data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading";
export const OH_ROUTES = [
  "obligation:track-only:OH:oh_2953_32_sealing",
  "obligation:track-pathway:OH:oh_2953_32_expungement:adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32",
  "obligation:track-pathway:OH:oh_2953_33_nonconviction:adult-non-conviction-sealing-or-expungement-under-2953-33",
  "obligation:track-pathway:OH:oh_2953_35_firearm:certain-firearm-carry-conviction-expungement-under-2953-35"
];
export const OH_HISTORICAL_MAPPING = {
  "familyId": "rcap-oh-custom-pleading-clean-tracks",
  "stateOverride": "PRODUCT_PATH_PENDING",
  "executionOwner": "CAPTAIN",
  "nextExecutableAction": "Bind statewide composed routes versus local-court application routes, split delivery types where required, and route exact missing local forms or instructions to source work.",
  "ownerDecision": "This is route-family and customer-delivery binding, not a Lawrence question."
};
export const OH_EVIDENCE_PINS = {
  "data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/packet-set-manifest.json": "6a09b25b7a8e9b93fff22f77836d4f7b26b56508150b49516e8429b343e14c1b",
  "data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/source-receipt.json": "040d18294b21cea9b9aa603a7f93b571e3fc8ed1df3751afb17054fbebeb8b6a",
  "data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/reports/rendered-artifacts.json": "7fefac9f6163194594920b75843c150eb04c614166a568200f617307bf14ff26",
  "data/rcap-grade-a/packet-factory-24h/pf08/oh-continuation-20260913/adopted-track-input-projection.json": "6b29f3a5cae019fbbff104f15fc73d51dd43be4921fcfbdcd9a5bf8d62b545bc",
  "data/rcap-grade-a/packet-factory-24h/vfoh1/rows-vfoh1-current-semantic-20260914.json": "0f1ba75b996fd3735b23a8f62fd277129646487fe303628bb706dd30c759a87e",
  "data/rcap-grade-a/packet-factory-24h/vfoh1/oh-current-adopted-route-binding-review.json": "24776643f1f2650b7e5d145677bf4bbc7cc61ab8d585bfbaf6d2a7dafa5bc48f"
};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sorted = xs => [...xs].sort();
// Exact saved-build mapping only. This never alters selected review, counters,
// source/raster verdicts, runtime behavior or commercial authority.
export function assessOhReviewedBuildMapping(root, input, overrides = {}) {
  if (input.familyId !== OH_FAMILY) return null;
  assert.equal(input.treatment ?? null, null, 'Conflicting OH treatment mapping');
  assert.equal(input.implementationStrategy, 'custom_pleading');
  assert.deepEqual(input.executionReclassification, OH_HISTORICAL_MAPPING, 'OH owner instruction changed');
  const routeKeys = input.routes.map(r => r.routeKey);
  assert(routeKeys.length === 1 || routeKeys.length === 4, 'Unexpected OH route count');
  assert.deepEqual(sorted(routeKeys), sorted(routeKeys.length === 1 ? [OH_ROUTES[0]] : OH_ROUTES));
  const read = overrides.readBytes ?? (relative => {
    assert(!path.isAbsolute(relative) && relative.split('/').every(p => p && p !== '.' && p !== '..'), 'Unconfined OH evidence path');
    return fs.readFileSync(path.join(root, relative));
  });
  const evidence = Object.entries(OH_EVIDENCE_PINS).map(([p, digest]) => {
    const bytes = read(p); assert.equal(hash(bytes), digest, `OH reviewed evidence changed: ${p}`);
    return JSON.parse(bytes);
  });
  const [manifest, receipt, report, projection, review, scope] = evidence;
  assert.deepEqual(manifest.routeKeys, OH_ROUTES);
  assert.equal(receipt.allSourcesExact, true);
  assert.equal(receipt.documents.length, 5);
  for (const source of receipt.documents) assert.equal(hash(read(source.path)), source.sha256, `OH source changed: ${source.sourceId}`);
  assert.deepEqual(manifest.components, projection.tracks.flatMap(t => t.packetSet.components));
  assert.equal(manifest.components.length, 20);
  assert.equal(scope.verdict, 'PASS_CURRENT_SYNTHETIC_BUILD_SCOPE');
  assert.equal(review.laneKind, 'independent-verification');
  assert.equal(review.rows.length, 1);
  const row = review.rows[0];
  assert.equal(row.familyId, OH_FAMILY); assert.equal(row.verdict, 'PASS');
  assert.equal(row.terminalClosureGranted, false); assert.equal(row.commercialAuthorityGranted, false);
  for (const [name, obligation] of Object.entries(row.proofObligations)) if (name !== 'CLIPPING_AND_OVERLAP') {
    assert.equal(obligation.measured, true); assert.equal(obligation.result, 'PASS');
  }
  assert.equal(report.packets.length, 8);
  assert.equal(report.packets.reduce((sum, p) => sum + p.pageCount, 0), 84);
  for (const packet of report.packets) {
    const binding = row.packetBindings.find(b => b.fixture === packet.fixture);
    assert(binding); assert.equal(binding.path, `${OH_DIRECTORY}/${packet.file}`);
    assert.equal(binding.sha256, packet.sha256); assert.equal(binding.pageCount, packet.pageCount);
    const bytes = read(binding.path); assert.equal(hash(bytes), binding.sha256); assert.equal(bytes.length, binding.byteLength);
    let next = 1;
    for (const doc of packet.documents) {
      assert.equal(doc.firstPage, next); next += doc.pageCount;
      const local = `continuation/${doc.documentId}.pdf`;
      assert.equal(hash(read(`${OH_DIRECTORY}/${local}`)), doc.sha256);
    }
    assert.equal(next, packet.pageCount + 1);
  }
  const original = input.routes.find(r => r.routeKey === OH_ROUTES[0]);
  const routes = OH_ROUTES.map(routeKey => {
    const track = projection.tracks.find(t => routeKey.includes(`:${t.trackId}`));
    assert(track);
    const existing = input.routes.find(r => r.routeKey === routeKey);
    return {...(existing ?? {}), routeKey, jurisdiction: 'OH', familyId: OH_FAMILY,
      participantFacingInstrument: track.trackId === 'oh_2953_32_sealing' ? 'Official96C1 and adopted continuation; local filing guidance' : 'Adopted custom application; local filing guidance',
      currentOutputStrategy: 'custom_pleading',
      requiredSourceIds: [...new Set([...(existing?.requiredSourceIds ?? original.requiredSourceIds ?? []).filter(id => !id.startsWith('component:')), ...track.packetSet.components.map(c => `component:${c.componentId}`)])]};
  });
  return {routes, implementationStrategy: 'custom_pleading', directory: OH_DIRECTORY,
    executionReclassification: {...input.executionReclassification, stateOverride: null,
      mappingResolvedBy: Object.keys(OH_EVIDENCE_PINS).at(-1), historicalStateOverride: 'PRODUCT_PATH_PENDING',
      nextExecutableAction: 'Complete independent current-byte raster and final review of the bound Franklin County synthetic four-track build; retain unsupported local/indigency refusals.'}};
}
