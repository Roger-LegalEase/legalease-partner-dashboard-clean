// IL2a: exact reviewed source plans, with no generation or payment promotion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
process.env.RCAP_EVALUATOR_TODAY = '2026-10-21';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mode = process.argv[2] ?? 'candidate';
const mutations = {
  no_composition: ['packet-information.ts', 'const reviewed = reviewedPacketContractSuccessor(snapshot, authoritative.evaluation.packetPlan);', 'const reviewed = null;'],
  no_override: ['packet-planner.ts', 'const illinoisForms = illinoisPlanForms(profile, pathwayId);', 'const illinoisForms = undefined;'],
  no_hold: ['illinois-plan-forms.ts', 'return (formsByRoute[plan.pathwayId]?.length ?? 0) > 0', 'return false'],
  no_il1_history: ['reviewed-packet-contract-successors.json', '"9df0de9f55558def255230bcab5e42dfca9d4b3fc40f4cae4629161c64fc9980"', '"missing-test-history"']
};
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/il2-plan-predecessors.json', import.meta.url)));
for (const route of Object.keys(fixture.expectedForms)) mutations['drop:' + route] = ['reviewed-packet-contract-successors.json', '"IL:' + route + '":', '"IL:missing-test-successor":'];
assert(mode === 'candidate' || mutations[mode]);
if (mutations[mode]) register('data:text/javascript,' + encodeURIComponent(`let m;export function initialize(v){m=v}export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/'+m[0]))return r;const s=String(r.source);if(s.split(m[1]).length!==2)throw Error('nonunique mutation anchor');return {...r,source:s.replace(m[1],m[2])};}`), { data: mutations[mode] });
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { illinoisPlanForms } = await import('../src/lib/rcap-engine/illinois-plan-forms.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const profile = getProfileByJurisdiction('IL'), failures = []; let checks = 0;
const check = (name, fn) => { checks++; try { fn(); } catch (error) { failures.push({ name, error: error.message }); } };
for (const row of fixture.rows.filter(r => r.verification)) {
  const forms = fixture.expectedForms[row.route], moved = forms !== undefined;
  const expected = moved ? { ...row.evaluation.packetPlan, sourceFormIds: forms, formMappingStatus: forms.length ? 'source_candidate_identified' : 'not_required' } : row.evaluation.packetPlan;
  const plan = packetPlanForPathway(profile, row.route);
  check(row.route + ':exact-plan', () => assert.deepEqual(plan, moved ? expected : fixture.priorStaticPlans[row.route]));
  check(row.route + ':scope', () => assert.equal(illinoisPlanForms(profile, row.route) !== undefined, moved));
  if (row.route === 'expungement-after-eligible-supervision-or-qualified-probation') check('program-literal-no-CXP', () => assert(plan.sourceFormIds.every(id => !id.includes('CXP'))));
  if (forms?.length) check(row.route + ':plan-not-fulfillment-ready', () => assert.equal(isPacketPlanFulfillmentReady(plan), false));
  check(row.route + ':actual-FA-refusal', () => assert.equal(packetFulfillmentAuthority('IL', row.route, 'checkout creation').allowed, false));
  const answers = structuredClone(row.answers), result = evaluate({ jurisdiction: 'IL', profileVersion: profile.profileVersion, matterId: row.evaluation.matterId, answers }).evaluation;
  check(row.route + ':only-plan-changes', () => assert.deepEqual(result, { ...row.evaluation, packetPlan: expected }));
  check(row.route + ':raw-answers', () => assert.deepEqual(answers, row.answers));
  const record = structuredClone(row.verification), original = structuredClone(record);
  check(row.route + ':native-hash', () => assert.equal(P.protectedPacketDraftHash(record.draftSnapshot), record.draftHash));
  const model = P.protectedPacketInformationModelFor(record);
  check(row.route + ':readable', () => assert(model));
  check(row.route + ':current-model-plan', () => assert.deepEqual(model?.packetPlan, expected ?? null));
  check(row.route + ':saved-noop', () => {
    const update = P.packetInformationPatch({ protectedVerification: record, answers: {} });
    assert(update); assert.deepEqual(update.protectedTransition.nextVerification, original);
  });
  check(row.route + ':record-immutable', () => assert.deepEqual(record, original));
  if (!moved) continue;
  check(row.route + ':specification-still-absent', () => assert.equal(packetSpecificationFor('IL:' + row.route), undefined));
  check(row.route + ':explicit-correction', () => {
    const update = P.packetInformationPatch({ protectedVerification: record, answers: { charge: 'Synthetic corrected charge text' } });
    assert(update); const next = update.protectedTransition.nextVerification;
    assert.equal(next.status, 'unverified'); assert.deepEqual(next.draftSnapshot.packetPlan, expected);
    assert.equal(next.draftSnapshot.packetAnswers.charge, 'Synthetic corrected charge text');
    for (const key of ['screeningAnswers', 'prefilledAnswers']) assert.deepEqual(next.draftSnapshot[key], original.draftSnapshot[key]);
    assert.equal(next.draftSnapshot.paymentAllowed, false); assert.equal(update.readyToGenerate, false);
  });
  for (const field of ['profileSourceFingerprint', 'profileAuthorityFingerprint', 'draftHash']) {
    const bad = structuredClone(record);
    if (field === 'draftHash') bad.draftHash = 'invalid';
    else { bad.draftSnapshot[field] = 'invalid'; bad.draftHash = P.protectedPacketDraftHash(bad.draftSnapshot); }
    check(row.route + ':refuse-' + field, () => assert.equal(P.protectedPacketInformationModelFor(bad), null));
  }
  for (const drift of ['state','version','corpus','mode','status','sha','path','extra-form']) {
    const altered = structuredClone(profile), source = altered.packetGenerator.pathways.find(p => p.pathwayId === row.route);
    if (drift === 'state') altered.jurisdiction.code = 'XX';
    if (drift === 'version') altered.profileVersion = 'drift';
    if (drift === 'corpus') altered.source.sourceCorpusSha256 = 'drift';
    if (drift === 'mode') source.mode = 'state_specific_custom_packet_from_source_rules';
    if (drift === 'status') source.formMappingStatus = 'not_required';
    if (drift === 'sha') source.formCandidates[0].sha256 = 'drift';
    if (drift === 'path') source.formCandidates[0].relativePath = 'drift';
    if (drift === 'extra-form') source.formCandidates.push({ ...source.formCandidates[0] });
    check(row.route + ':unmatched-' + drift, () => assert.equal(illinoisPlanForms(altered, row.route), undefined));
  }
}
// m190/m193: retain the original paid/future drafts while composing only reviewed IL form plans.
const B = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
assert.deepEqual(fixture.compositionCases.map(row => row.id), ['D1-adult-paid', 'future-date', 'future-wrapped']);
for (const row of fixture.compositionCases) {
  const source = JSON.parse(fs.readFileSync(new URL('../' + row.sourcePath, import.meta.url)));
  const matches = source.rows.filter(item => item[row.rowField] === row.rowValue);
  assert.equal(matches.length, 1, row.id + ': unique retained predecessor');
  const record = structuredClone(matches[0][row.recordField]), original = structuredClone(record);
  const snapshot = record.draftSnapshot, authority = P.evaluateProtectedPacketFacts(snapshot);
  const model = P.protectedPacketInformationModelFor(record);
  const noop = P.packetInformationPatch({ protectedVerification: record, answers: {} });
  const successor = P[row.successor];
  check(row.id + ': original native hash', () => {
    assert.equal(record.draftHash, row.draftHash);
    assert.equal(P.protectedPacketDraftHash(snapshot), row.draftHash);
  });
  check(row.id + ': composed model and no-op remain held', () => {
    assert(model); assert(noop); assert(successor(snapshot, authority, 'unverified'));
    assert.equal(authority.evaluation.paymentAllowed, false);
    assert.deepEqual(model.packetPlan.sourceFormIds, fixture.expectedForms[snapshot.pathwayId]);
    assert.equal(noop.readyToGenerate, false);
    assert.deepEqual(noop.protectedTransition.nextVerification, original);
    for (const map of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) {
      assert.deepEqual(noop.protectedTransition.nextVerification.draftSnapshot[map], snapshot[map]);
    }
  });
  const item = { id: '00000000-0000-4000-8000-000000000037', jurisdiction: snapshot.jurisdiction,
    createdAt: snapshot.capturedAt, artifactRefs: {} };
  const briefcase = await B.decorateBriefcaseItemForPresentationWithDependencies({ consumerAuthUserId: item.id, item }, {
    readProtectedArtifact: async () => ({ ok: true, value: null }),
    readProtectedVerification: async () => ({ ok: true, value: record }),
    readTrustedPendingSource: async () => ({ ok: true, value: {
      jurisdiction: snapshot.jurisdiction, profileVersion: snapshot.profileVersion, matterId: item.id,
      answers: P.protectedPacketScreeningAnswers(snapshot), product: 'expungement_ai_dtc',
      sourceSessionId: 'synthetic-only', claimedAt: snapshot.capturedAt, partnerBenefitActive: false, partnerSlug: null
    } }),
    readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
    evaluateAuthoritative: evaluate,
    readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
  });
  check(row.id + ': Briefcase retains protected draft', () => assert.equal(briefcase.authorityStatus, 'protected_draft'));
  for (const kind of ['verified', 'invalidated', 'old-plan', 'old-family', 'old-required', 'old-source', 'new-plan', 'new-paid']) {
    check(row.id + ': composition refuses ' + kind, () => {
      const old = structuredClone(snapshot), current = structuredClone(authority);
      const status = ['verified', 'invalidated'].includes(kind) ? kind : 'unverified';
      if (kind === 'old-plan') old.packetPlan.sourceFormIds = ['wrong-form'];
      if (kind === 'old-family') old.packetFamilyIdentifiers.sourceFormIds = ['wrong-family'];
      if (kind === 'old-required') old.requiredInputIds.push('unreviewed-fact');
      if (kind === 'old-source') old.profileSourceFingerprint = 'unreviewed';
      if (kind === 'new-plan') current.evaluation.packetPlan.sourceFormIds = ['unreviewed-current-form'];
      if (kind === 'new-paid') current.evaluation.paymentAllowed = true;
      assert.equal(successor(old, current, status), null);
    });
  }
  if (row.id.startsWith('future')) check(row.id + ': explicit date correction remains held', () => {
    const update = P.packetInformationPatch({ protectedVerification: record, answers: { il_program_termination_date: '2024-10-22' } });
    assert(update); assert.equal(update.readyToGenerate, false);
    assert.equal(update.protectedTransition.nextVerification.draftSnapshot.paymentAllowed, false);
    assert.equal(update.protectedTransition.nextVerification.draftSnapshot.packetAnswers.il_program_termination_date, '2024-10-22');
    for (const map of ['screeningAnswers', 'prefilledAnswers']) {
      const expected = { ...snapshot[map] };
      delete expected.il_program_termination_date;
      assert.deepEqual(update.protectedTransition.nextVerification.draftSnapshot[map], expected);
    }
  });
  check(row.id + ': original record remains unchanged', () => assert.deepEqual(record, original));
}
const prior = JSON.parse(fs.readFileSync(new URL('./fixtures/il1-program-predecessor.json', import.meta.url))).verification;
check('pre-IL1-CXP-draft-readable', () => assert(P.protectedPacketInformationModelFor(prior)));
check('pre-IL1-CXP-draft-preserved', () => assert.equal(P.protectedPacketDraftHash(prior.draftSnapshot), prior.draftHash));
const program = 'expungement-after-eligible-supervision-or-qualified-probation';
check('pre-IL1-current-plan', () => assert.deepEqual(P.protectedPacketInformationModelFor(prior)?.packetPlan, packetPlanForPathway(profile, program)));
check('cannabis-status-check-no-plan', () => {
  const row = fixture.rows.find(r => r.route === 'cannabis-specific-automatic-or-petition-expungement');
  const result = evaluate({ jurisdiction: 'IL', profileVersion: profile.profileVersion, matterId: row.evaluation.matterId, answers: { ...row.answers, il_cannabis_next_step: 'status_check' } }).evaluation;
  assert.equal(result.packetPlan, undefined); assert.equal(result.paymentAllowed, false);
});
check('clean-slate-unchanged', () => {
  const plan = packetPlanForPathway(profile, 'clean-slate-automatic-sealing');
  assert.deepEqual(plan.sourceFormIds, []); assert.equal(plan.formMappingStatus, 'not_required'); assert.equal(isPacketPlanFulfillmentReady(plan), false);
});
console.log(JSON.stringify({ mode, checks, passed: checks - failures.length, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
