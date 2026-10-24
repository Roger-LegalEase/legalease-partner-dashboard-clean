import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-23';
globalThis.fetch = () => { throw Error('NETWORK_FORBIDDEN'); };
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const F = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const profile = getProfileByJurisdiction('MS'), pub = projectPublicProfile(profile);
const alternate = 'Uncharged or unprosecuted misdemeanor after 12 months (§ 99-15-59)';
assert(pub.questions.find(q => q.id === 'possible_pathway_context').options.includes(alternate));
const original = structuredClone(F.MS_NONCONVICTION_SCREENING_ANSWERS);
const hints = [original.possible_pathway_context, alternate, undefined];
const inputs = hint => { const a = { ...original }; if (hint === undefined) delete a.possible_pathway_context; else a.possible_pathway_context = hint; return a; };
const run = answers => evaluate({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-ms-context', answers });
const legal = r => ({ evaluation: r.evaluation, selectedTrackId: r.selectedTrackId });
const baseline = run(original);
for (const hint of hints) {
  const answers = inputs(hint), saved = structuredClone(answers), result = run(answers);
  assert.deepEqual(legal(result), legal(baseline), 'optional hint must not select the legal route');
  assert.equal(result.evaluation.pathwayId, F.MS_NONCONVICTION_ROUTE.pathwayId);
  assert.deepEqual(selectScreeningQuestionIds(profile, pub, answers), selectScreeningQuestionIds(profile, pub, original));
  assert.deepEqual(answers, saved);
}
// Source identity must survive reordered compiled pathways/rules and acquittal.
const paths = profile.pathways, rules = profile.orderedDecisionRules;
try {
  profile.pathways = [...paths].reverse();
  profile.orderedDecisionRules = [...rules].reverse();
  for (const hint of hints) {
    assert.equal(run(inputs(hint)).evaluation.pathwayId, F.MS_NONCONVICTION_ROUTE.pathwayId);
    assert.equal(run({ ...inputs(hint), case_outcome: 'Acquitted or found not guilty' }).evaluation.pathwayId, F.MS_NONCONVICTION_ROUTE.pathwayId);
  }
} finally { profile.pathways = paths; profile.orderedDecisionRules = rules; }
// Exercise real source collection and confirmation on the original counterexample.
const answers = inputs(alternate), authoritative = run(answers);
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, dependencies: {}, capturedAt: '2026-10-23T00:00:00.000Z' });
assert(seed);
const item = { id: 'synthetic-ms-context', jurisdiction: 'MS', state: 'MS', artifactRefs: {} };
const initial = { status: 'unverified', reason: 'final_verification_not_completed', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot };
const packet = structuredClone(F.MS_NONCONVICTION_PACKET_ANSWERS), savedPacket = structuredClone(packet);
const collected = P.packetInformationPatch({ existingItem: item, answers: packet, verify: false, protectedVerification: initial });
assert(collected);
const record = collected.protectedTransition.nextVerification;
const raw = { ...record.draftSnapshot.screeningAnswers, ...record.draftSnapshot.prefilledAnswers, ...record.draftSnapshot.packetAnswers };
assert.equal(raw.possible_pathway_context, alternate);
for (const id of ['actual_arrest', 'release_confirmed', 'statutory_disposition_category', 'nonadjudication_or_diversion']) assert.deepEqual(raw[id], packet[id]);
assert.equal(P.mississippiNonConvictionPacketSafety(raw, '2026-10-23T00:00:00.000Z').safe, true);
const confirmed = P.packetInformationPatch({ existingItem: item, answers: {}, verify: true, protectedVerification: record });
assert.equal(confirmed.protectedTransition.nextVerification.status, 'verified');
assert.equal(confirmed.readyToGenerate, true);
assert.deepEqual(packet, savedPacket);
// Source family nomination cannot bypass adverse or uncertain protected facts.
for (const change of [{ actual_arrest: { value: 'No', unknown: false } }, { release_confirmed: 'I am not sure' }]) {
  const changed = P.packetInformationPatch({ existingItem: item, answers: { ...packet, ...change }, verify: false, protectedVerification: initial });
  assert(changed);
  const refused = P.packetInformationPatch({ existingItem: item, answers: {}, verify: true, protectedVerification: changed.protectedTransition.nextVerification });
  assert(refused);
  assert.notEqual(refused.protectedTransition.nextVerification.status, 'verified');
  assert.equal(refused.readyToGenerate, false);
}
// Existing actual program elections retain priority over nonconviction history.
for (const [election, expected] of [
  [{ ms_program_order: '99-15-26', ms_program_record_status: 'completed_and_closed' }, 'nonadjudication-under-99-15-26'],
  [{ ms_program_order: 'unknown' }, undefined],
]) for (const hint of hints) {
  const r = run({ ...inputs(hint), ...election });
  assert.equal(r.evaluation.pathwayId, expected);
  assert.equal(r.evaluation.paymentAllowed, false);
}
for (const outcome of ['I am not sure', 'Misdemeanor conviction']) {
  const rows = hints.map(hint => run({ ...inputs(hint), case_outcome: outcome }));
  for (const r of rows) {
    assert.equal(r.evaluation.paymentAllowed, false);
    assert(!r.evaluation.pathwayId, JSON.stringify({outcome,evaluation:r.evaluation}));
    if (outcome === 'I am not sure') {
      assert.equal(r.evaluation.resultCode, 'needs_review');
      assert(r.evaluation.reasons.some(reason => reason.code === 'ms.source_fact_unknown'));
    } else assert(r.evaluation.missingQuestionIds.includes('ms_record_help'));
    assert.deepEqual(legal(r), legal(rows[0]));
  }
}
console.log(JSON.stringify({ status: 'PASS', originalAlternate: alternate, naturalProtectedConfirmation: confirmed.protectedTransition.nextVerification.status, controls: ['raw-history', 'private-facts', 'reordered-source', 'acquittal', 'private-adverse-or-unknown', 'question-selection', 'program-election', 'program-unknown', 'outcome-unknown', 'conviction-election-missing'] }));
