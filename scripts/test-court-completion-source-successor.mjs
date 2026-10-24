import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Observe the real production admission filter before authority evaluation.
// Returning its admitted IDs here creates no protected state or legal-positive
// fixture. The unchanged existing carry tests exercise real seed/read authority.
const loader = pathToFileURL(path.join(process.cwd(), 'scripts/lib/ts-esm-loader.mjs')).href;
register(`data:text/javascript,${encodeURIComponent(`
import { load as baseLoad } from ${JSON.stringify(loader)};
import { readFileSync } from 'node:fs';
export { resolve } from ${JSON.stringify(loader)};
export async function load(url, context, next) {
 if (url.endsWith('/src/lib/expungement-ai/reviewed-court-completion-contracts.json') && process.env.RCAP_CARRY_BASELINE_CATALOG) return { format: 'module', source: 'export default ' + readFileSync(process.env.RCAP_CARRY_BASELINE_CATALOG, 'utf8'), shortCircuit: true };
 const result = await baseLoad(url, context, next);
 if (!url.endsWith('/src/lib/expungement-ai/packet-information.ts') || typeof result.source !== 'string') return result;
 const start = result.source.indexOf('function refreshedCourtCompletionFactMaps(');
 const needle = 'const authority = evaluateProtectedPacketFacts(base);';
 const at = result.source.indexOf(needle, start);
 if (start < 0 || at < 0) throw Error('Exact production carry admission seam missing');
 const source = result.source.slice(0, at) + 'if (globalThis.__observeCarryAdmission) return globalThis.__observeCarryAdmission(currentContractIds);\\n' + result.source.slice(at);
 return { ...result, source: source + '\\nexport { profileAuthorityFingerprint, refreshedCourtCompletionFactMaps };\\n' };
}`)}`);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-16';
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const retainedWitnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses;
const actualWitnessComparisons = [];
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { profileAuthorityFingerprint, refreshedCourtCompletionFactMaps: admit } = await import('../src/lib/expungement-ai/packet-information.ts');
const { wy1401QuestionApplies, WY_1401_NEW_IDS } = await import('../src/lib/rcap-engine/wyoming-1401-facts.ts');
const { wy1501QuestionApplies, WY_1501_FACT_IDS } = await import('../src/lib/rcap-engine/wyoming-1501-facts.ts');
const { courtCompletionContractsFor, refreshCourtCompletionImplications: refresh } = await import('../src/lib/expungement-ai/court-completion-reuse.ts');
const catalog = JSON.parse(fs.readFileSync('src/lib/expungement-ai/reviewed-court-completion-contracts.json'));
const routes = [
 'IL:adult-conviction-sealing',
 'IL:expungement-after-eligible-supervision-or-qualified-probation',
 'IL:cannabis-specific-automatic-or-petition-expungement',
 'IL:adult-non-conviction-expungement',
 'IL:human-trafficking-survivor-vacatur-and-expungement',
 'IL:juvenile-automatic-or-petition-expungement',
 'DC:dc_actual_innocence_expungement_16_803',
 'GA:non-conviction-record-restriction-through-the-agency-prosecutor-process',
 'GA:restriction-and-sealing-of-a-pardoned-felony',
 'ME:adult-non-conviction-record-relief',
 'MO:closed-record-outcome-under-rsmo-610-105',
 'MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1',
 'MT:deferred-sentence-dismissal-or-confidentiality-route',
 'NY:automatic-clean-slate-sealing-under-cpl-160-57',
 'NY:automatic-non-conviction-sealing-under-cpl-160-50-160-55',
 'NY:conditional-treatment-sealing-under-cpl-160-58',
 'NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59',
 'NY:marijuana-record-destruction-under-the-mrta',
 'WY:adult-non-conviction-expungement-w-s-7-13-1401',
 'WY:misdemeanor-conviction-expungement-w-s-7-13-1501'
];
assert.equal(catalog.contracts.length, 229);
assert.equal(catalog.independentPaidFactContracts.length, 139);
let checks = 2;
const failures = [], observations = [];
const mapsFor = () => ({ screeningAnswers: { ownership_scope: 'Yes', court_requirements_completed: 'yes' }, prefilledAnswers: {}, packetAnswers: {} });
function admission(base, maps) {
 let observed = new Set();
 globalThis.__observeCarryAdmission = ids => { observed = ids; return { maps, dependencies: base.dependencies }; };
 try { admit(base, maps); } finally { delete globalThis.__observeCarryAdmission; }
 return observed;
}
for (const routeKey of routes) {
 const state = routeKey.slice(0, 2), pathwayId = routeKey.slice(3), profile = getProfileByJurisdiction(state);
 const contract = courtCompletionContractsFor(routeKey).find(c => c.targetFactId === 'sentence_completion_date');
 assert.ok(contract, routeKey);
 assert.equal(contract.meaning, 'all_same_case_court_requirements_completed_positive_status_only');
 assert.equal(contract.sourceFactId, 'court_requirements_completed');
 assert.equal(contract.outputCanonicalValue, 'Yes'); checks += 4;
 const plan = packetPlanForPathway(profile, pathwayId);
 const maps = mapsFor();
 const base = { jurisdiction: state, pathwayId, profileVersion: profile.profileVersion,
  profileSourceFingerprint: profile.source.sourceCorpusSha256,
  profileAuthorityFingerprint: profileAuthorityFingerprint(profile, pathwayId),
  packetPlan: plan, requiredInputIds: plan.requiredInputIds,
  serverFacts: { jurisdiction: state, pathway_id: pathwayId }, ...maps, dependencies: {} };
 const ids = admission(base, maps);
 const admitted = ids.has(contract.contractId);
 const wyCurrentSource = routeKey.startsWith('WY:');
 observations.push({ routeKey, contractId: contract.contractId, admitted, applicable: !wyCurrentSource });
 if (wyCurrentSource) {
  assert.equal(admitted, false, routeKey + ': adopted source predicates intentionally replace generic completion'); checks++;
  const applies = routeKey.includes('1401') ? wy1401QuestionApplies : wy1501QuestionApplies;
  const sourceIds = routeKey.includes('1401') ? WY_1401_NEW_IDS : WY_1501_FACT_IDS;
  for (const factId of ['court_requirements_completed', 'sentence_completion_date', 'financial_obligations']) { assert.equal(applies(profile, pathwayId, maps.screeningAnswers, factId), false); checks++; }
  for (const value of ['yes', 'no', 'not_sure', null, '', { unknown: true }]) {
   const input = mapsFor(); input.packetAnswers.court_requirements_completed = value; input.packetAnswers.sentence_completion_date = { value: 'No', unknown: true }; input.packetAnswers.financial_obligations = 'No';
   const before = structuredClone(input); const result = refresh({ contracts: [contract], currentContractIds: ids, original: input, incoming: input, authorityUnchanged: () => { throw Error('Inapplicable status must not propose authority'); } });
   assert.deepEqual(result.maps, before); assert.deepEqual(result.provenance, {});
   for (const factId of sourceIds) assert.equal(Object.hasOwn(result.maps.prefilledAnswers, factId), false, 'Broad completion cannot supply WY incident/term-expiration facts');
   checks += 2 + sourceIds.length;
  }
  continue;
 }
 if (!admitted) { failures.push({ routeKey, contractId: contract.contractId, reason: 'Current production source/plan/spec/descriptor admission rejects retained contract' }); continue; }
 checks++;
 // Admission is necessary, never sufficient for authority. The isolated helper
 // below receives an explicit invariant synthetic tuple; it does not establish
 // that these reviewed routes are legally reachable or commercially available.
 const target = contract.targetFactId;
 const retained = retainedWitnesses.find(witness => witness.pathwayKey === routeKey);
 if (retained) {
  // Reuse only an existing factual witness; never manufacture a legal-positive
  // witness for the eight routes lacking one. No authority is persisted.
  const actualMaps = { screeningAnswers: { ...retained.finalAnswers }, prefilledAnswers: {}, packetAnswers: {} };
  assert.equal(actualMaps.screeningAnswers.court_requirements_completed, 'yes');
  delete actualMaps.screeningAnswers[target];
  const beforeMaps = structuredClone(actualMaps);
  const authoritative = maps => evaluate({ jurisdiction: state, profileVersion: profile.profileVersion,
   matterId: 'synthetic-carry-source-successor', answers: { ...maps.screeningAnswers, ...maps.prefilledAnswers, ...maps.packetAnswers } });
  const authorityTuple = result => ({ evaluation: result.evaluation, packetType: result.packetType ?? null, selectedTrackId: result.selectedTrackId ?? null });
  const beforeAuthority = authorityTuple(authoritative(actualMaps));
  const proposed = { ...actualMaps, prefilledAnswers: { [target]: 'Yes' } };
  const wouldPreserveAuthority = JSON.stringify(authorityTuple(authoritative(proposed))) === JSON.stringify(beforeAuthority);
  const actual = refresh({ contracts: [contract], currentContractIds: admission(base, actualMaps), original: actualMaps, incoming: actualMaps,
   authorityUnchanged: maps => JSON.stringify(authorityTuple(authoritative(maps))) === JSON.stringify(beforeAuthority) });
  assert.deepEqual(actual.maps, wouldPreserveAuthority ? proposed : actualMaps);
  assert.deepEqual(authorityTuple(authoritative(actual.maps)), beforeAuthority);
  assert.deepEqual(actualMaps, beforeMaps);
  actualWitnessComparisons.push({ routeKey, reusedExistingWitness: true, statusCarried: Object.hasOwn(actual.maps.prefilledAnswers, target),
   resultCode: beforeAuthority.evaluation.resultCode, pathwayId: beforeAuthority.evaluation.pathwayId,
   paymentAllowed: beforeAuthority.evaluation.paymentAllowed, fullEvaluationPacketTypeTrackUnchanged: true });
  checks += 4;
 }
 const tuple = { pathwayId, resultCode: 'needs_review', paymentAllowed: false,
  familyId: 'synthetic-held-family', selectedTrackId: 'synthetic-held-track', packetType: null,
  treatment: 'held', deferrals: [], packetPlan: plan };
 const tupleBefore = structuredClone(tuple);
 const run = (incoming, extra = {}) => refresh({ contracts: [contract], currentContractIds: ids,
  original: incoming, incoming, authorityUnchanged: () => { assert.deepEqual(tuple, tupleBefore); return true; }, ...extra });
 const initial = run(maps);
 assert.deepEqual(initial.maps, { ...maps, prefilledAnswers: { [target]: 'Yes' } });
 assert.equal(initial.provenance[target].contractId, contract.contractId);
 assert.equal(initial.provenance[target].profileAuthorityFingerprint, base.profileAuthorityFingerprint);
 assert.deepEqual(tuple, tupleBefore); checks += 4;
 for (const id of ['sentencing_date', 'release_date', 'disposition_date', 'ny_16059_physical_custody_days_confirmed',
  'ny_16059_release_sentence_relationship_confirmed', 'ny_16059_later_conviction_entered', 'ny_16059_undisposed_arrest',
  'ga_pardoned_offense_section', 'ga_pardon_date', 'financial_obligations']) {
  assert.equal(Object.hasOwn(initial.maps.prefilledAnswers, id), false, routeKey + ': completion supplies status only'); checks++;
 }
 for (const name of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) {
  for (const value of ['no', 'not_sure', 'not_applicable', null, '', { unknown: true }, { value: 'yes', unknown: false }]) {
   const input = mapsFor(); input[name].court_requirements_completed = value;
   const before = structuredClone(input), result = run(input);
   assert.deepEqual(result.maps, before); assert.deepEqual(result.provenance, {}); assert.deepEqual(input, before); checks += 3;
  }
  for (const value of ['Yes', 'No', 'I am not sure', null, '', { unknown: true }, { value: 'Yes', unknown: false }]) {
   const input = mapsFor(); input[name][target] = value;
   const before = structuredClone(input), result = run(input);
   assert.deepEqual(result.maps, before); assert.deepEqual(result.provenance, {}); assert.deepEqual(input, before); checks += 3;
  }
 }
 const context = mapsFor(); Object.assign(context.packetAnswers, {
  financial_obligations: 'No', financial_history: { waived: true, paid: false },
  pending_cases: 'Yes', new_convictions_during_waiting_period: 'I am not sure',
  supervision_status: 'unknown', sentencing_date: '2000-01-01', release_date: { unknown: true },
  ga_pardoned_offense_section: { unknown: true }, ga_pardon_date: { unknown: true },
  ny_16059_physical_custody_days_confirmed: 'not_sure', ny_16059_release_sentence_relationship_confirmed: 'not_sure'
 });
 const preserved = structuredClone(context), result = run(context);
 assert.deepEqual(result.maps, { ...context, prefilledAnswers: { [target]: 'Yes' } });
 assert.deepEqual(context, preserved); assert.deepEqual(result.maps.packetAnswers, preserved.packetAnswers); checks += 3;
 // A noop retains exact maps/provenance; invalidated source withdraws only a
 // proven output. An independent correction keeps its own raw/history value.
 const noop = run(initial.maps, { original: initial.maps, provenance: initial.provenance });
 assert.deepEqual(noop, initial); checks++;
 const withdrawn = run(initial.maps, { original: initial.maps, provenance: initial.provenance, currentContractIds: new Set() });
 assert.deepEqual(withdrawn.maps, maps); assert.deepEqual(withdrawn.provenance, {}); checks += 2;
 const independent = structuredClone(initial.maps); independent.packetAnswers[target] = 'No';
 assert.deepEqual(run(independent, { original: initial.maps, provenance: initial.provenance }).maps, independent); checks++;
 // No invariant route/result/payment/family before/after comparison, no carry.
 for (const [key, changedValue] of Object.entries({ pathwayId: 'other-route', resultCode: 'packet_ready', paymentAllowed: true, familyId: 'other-family', selectedTrackId: 'other-track', packetType: 'new-packet', treatment: 'eligible', deferrals: ['new'], packetPlan: { ...plan, explanation: 'changed' } })) {
  let calls = 0;
  const denied = run(maps, { authorityUnchanged: () => { calls++; const observedTuple = calls === 1 ? tuple : { ...tuple, [key]: changedValue }; return JSON.stringify(observedTuple) === JSON.stringify(tupleBefore); } });
  assert.equal(calls, 2, key); assert.deepEqual(denied.maps, maps); assert.deepEqual(denied.provenance, {}); checks += 3;
 }
 for (const mutate of [
  changed => { changed.profileSourceFingerprint = 'wrong-source'; },
  changed => { changed.profileAuthorityFingerprint = 'wrong-authority'; },
  changed => { changed.profileVersion = 'wrong-version'; },
  changed => { changed.pathwayId = 'wrong-route'; },
  changed => { changed.requiredInputIds = changed.requiredInputIds.filter(id => id !== target); },
  changed => { changed.packetPlan = { ...changed.packetPlan, requiredInputIds: changed.requiredInputIds.filter(id => id !== target) }; },
  changed => { changed.packetPlan = { ...changed.packetPlan, explanation: 'unreviewed plan' }; }
 ]) {
  const changed = structuredClone(base); mutate(changed);
  assert.equal(admission(changed, maps).has(contract.contractId), false, routeKey + ': wrong source/authority/route/plan cannot inherit carry'); checks++;
 }
 for (const field of ['sourceDescriptorSha256', 'targetDescriptorSha256', 'pathwayCanonicalSha256', 'expectedPlanCanonicalSha256', 'registeredSpecificationCanonicalSha256']) {
  const before = structuredClone(contract);
  try {
   contract[field] = 'unreviewed';
   if (field === 'targetDescriptorSha256') contract.assistedTargetDescriptorSha256 = 'unreviewed';
   assert.equal(admission(base, maps).has(contract.contractId), false, routeKey + ': changed exact contract pin denied'); checks++;
  } finally { for (const key of Object.keys(contract)) if (!Object.hasOwn(before, key)) delete contract[key]; Object.assign(contract, before); }
 }
}
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', checks, sourceSuccessorContracts: routes.length, expectedCurrentApplicable: 18, expectedCurrentNonapplicable: 2, admitted: observations.filter(x => x.admitted).length, actualWitnessComparisons, observations, failures,
 scope: 'Actual production admission filter plus isolated status-only/provenance/raw/noop/withdrawal/authority-invariance controls. No protected state, new legal-positive witness, owner, database, payment, output or whole-finding acceptance.' }));
assert.deepEqual(failures, [], 'Exact current source successors must pass the unchanged production admission predicate');
