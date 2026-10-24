import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-11';
const { courtCompletionContractsFor, refreshCourtCompletionImplications: refresh } = await import('../src/lib/expungement-ai/court-completion-reuse.ts');
const { protectedPacketDraftSeedFromAuthoritative: seedFor, protectedPacketInformationModelFor: modelFor, protectedPacketDraftHash } = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { MS_NONCONVICTION_SCREENING_ANSWERS: screening, MS_NONCONVICTION_ROUTE: route } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const [contract] = courtCompletionContractsFor(route.routeId);
assert.equal(contract.targetFactId, 'financial_obligations');
const source = contract.sourceFactId, target = contract.targetFactId;
const names = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'];
const empty = () => ({ screeningAnswers: { [source]: 'yes' }, prefilledAnswers: {}, packetAnswers: {} });
const run = (maps, extra = {}) => refresh({ contracts: [contract], currentContractIds: new Set([contract.contractId]), original: maps, incoming: maps, authorityUnchanged: () => true, ...extra });
let checks = 0;
const positive = run(empty());
assert.equal(positive.maps.prefilledAnswers[target], 'Yes');
assert.equal(positive.provenance[target].scope, 'same_protected_snapshot');checks++;
for (const value of ['no', 'not_sure', 'not_applicable', 'Yes', '', null, false, 0, { unknown: true }, { value: 'yes', unknown: false }]) {
  for (const name of names) {
    const maps = empty();maps[name][source] = value;
    const result = run(maps);
    assert.deepEqual(result.maps, maps, `source override ${name}`);
    assert.equal(result.provenance[target], undefined);checks++;
  }
}
for (const value of ['Yes', 'No', 'I am not sure', '', null, 0, false, ['Yes'], { value: 'Yes', unknown: false }, { unknown: true }]) {
  for (const name of names) {
    const maps = empty();maps[name][target] = value;
    const result = run(maps);
    assert.deepEqual(result.maps, maps, `independent target ${name}`);
    assert.equal(result.provenance[target], undefined);checks++;
  }
}
assert.deepEqual(run(empty(), { currentContractIds: new Set() }).maps, empty());checks++;
let evaluations = 0;
const rejected = run(empty(), { authorityUnchanged: () => ++evaluations === 1 });
assert.equal(evaluations, 2);assert.deepEqual(rejected.maps, empty());assert.deepEqual(rejected.provenance, {});checks++;
for (const value of ['no', 'not_sure', 'not_applicable', '', null, { unknown: true }]) {
  const maps = structuredClone(positive.maps);maps.packetAnswers[source] = value;
  const result = run(maps, { original: positive.maps, provenance: positive.provenance });
  assert.ok(!Object.hasOwn(result.maps.prefilledAnswers, target));assert.ok(!Object.hasOwn(result.provenance, target));
  assert.deepEqual(result.maps.packetAnswers[source], value);checks++;
}
for (const value of ['No', 'Yes', '', null, { unknown: true }]) {
  const maps = structuredClone(positive.maps);maps.packetAnswers[target] = value;
  const result = run(maps, { original: positive.maps, provenance: positive.provenance });
  assert.deepEqual(result.maps, maps);assert.equal(result.provenance[target], undefined);checks++;
}
const stale = run(positive.maps, { provenance: positive.provenance, currentContractIds: new Set() });
assert.ok(!Object.hasOwn(stale.maps.prefilledAnswers, target));checks++;
for (const key of ['contractId', 'contractSha256', 'routeKey', 'profileVersion', 'profileSourceFingerprint', 'profileAuthorityFingerprint', 'sourceFactId', 'targetFactId', 'sourceMap', 'sourceRawValueSha256', 'outputMap', 'outputRawValueSha256', 'scope', 'version']) {
  const markers = structuredClone(positive.provenance);markers[target][key] = 'invalid';
  const result = run(positive.maps, { provenance: markers });
  assert.deepEqual(result.maps, positive.maps, 'unproven value remains independent');
  assert.equal(result.provenance[target], undefined);checks++;
}

const authority = evaluate({ jurisdiction: 'MS', profileVersion: route.profileVersion, matterId: 'synthetic-completion-reuse', answers: screening });
const params = { authoritative: authority, screeningAnswers: screening, dependencies: { commercialFlowVersion: 1, entitlementSource: 'consumer_payment', productId: 'expungement_packet' }, capturedAt: '2026-10-11T12:00:00Z' };
const seed = seedFor(params), record = s => ({ status: 'unverified', reason: 'test', revision: 0, draftHash: s.hash, draftSnapshot: s.snapshot });
assert.equal(seed.snapshot.prefilledAnswers[target], 'Yes');assert.ok(seed.snapshot.dependencies.courtCompletionImplications[target]);
const model = modelFor(record(seed));assert.ok(model);assert.equal(model.initialAnswers[target], 'Yes');
assert.ok(!model.builderQuestions.some(q => q.id === target));assert.ok(!model.missingInputIds.includes(target));
assert.equal(model.pathwayId, route.pathwayId);assert.equal(seed.snapshot.paymentAllowed, authority.evaluation.paymentAllowed);checks++;
// A legacy read may project safe reuse but never silently writes its old hash.
const legacy = structuredClone(seed.snapshot);delete legacy.prefilledAnswers[target];delete legacy.dependencies.courtCompletionImplications;
const legacyBefore = structuredClone(legacy), legacyRecord = record({ snapshot: legacy, hash: protectedPacketDraftHash(legacy) });
const legacyModel = modelFor(legacyRecord);assert.ok(legacyModel);assert.equal(legacyModel.initialAnswers[target], 'Yes');assert.deepEqual(legacy, legacyBefore);
assert.equal(legacyModel.reviewSafety.safe, false);assert.equal(legacyModel.reviewSafety.reason, 'stale_packet_derivation');checks++;
for (const name of names) for (const value of ['Yes', 'No', 'I am not sure', null, '', { unknown: true }]) {
  const input = { ...params, [name]: { ...(params[name] ?? {}), [target]: value } };
  const independent = seedFor(input);
  // The established seed makes maps disjoint and may carry a screening value
  // into prefill. Its independently supplied value must remain unchanged and
  // must never acquire implication provenance merely because it is Yes.
  assert.deepEqual({ ...independent.snapshot.screeningAnswers, ...independent.snapshot.prefilledAnswers, ...independent.snapshot.packetAnswers }[target], value);
  assert.equal(independent.snapshot.dependencies.courtCompletionImplications?.[target], undefined);checks++;
}
// Reuse cannot cure the demonstrated contradictory felony witness or choose a
// different route. It also never converts a date/actual-payment excluded row.
const contradictory = { ...screening, possible_pathway_context: 'Eligible felony-conviction expungement (§ 99-19-71)' };
const heldAuthority = evaluate({ jurisdiction: 'MS', profileVersion: route.profileVersion, matterId: 'synthetic-held', answers: contradictory });
const held = seedFor({ ...params, authoritative: heldAuthority, screeningAnswers: contradictory });
assert.equal(held.snapshot.resultCode, 'needs_review');assert.equal(held.snapshot.paymentAllowed, false);assert.equal(held.snapshot.dependencies.courtCompletionImplications, undefined);checks++;
for (const [routeKey, factId] of [['GA:sb-288-misdemeanor-conviction-restriction-and-sealing','sentence_completion_date'],['IL:felony-prostitution-relief','sentence_completion_date'],['WY:felony-conviction-expungement-w-s-7-13-1502','sentence_completion_date'],['MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1','financial_obligations']]) {
  assert.ok(getProfileByJurisdiction(routeKey.slice(0, 2)).pathways.some(pathway => pathway.id === routeKey.slice(3)), 'real compiled exclusion control');
  assert.ok(!courtCompletionContractsFor(routeKey).some(c => c.targetFactId === factId));checks++;
}
console.log(JSON.stringify({ status: 'PASS', checks, scope: 'Pure provenance/independent-value/authority gates plus real seed/read projection. No protected persistence, legal-positive claim for other routes, payment or output acceptance.' }));
