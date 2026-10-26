// GA12 Q-f2f665a3691cd1692e1a / Q-2dcdf911e205525ea73c / Q-6e7be452bdd8e0dc1b8e.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
process.env.RCAP_EVALUATOR_TODAY = '2026-10-21';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const targets = {
  deferred: 'deferred-imposition-dismissal-and-sealing',
  general: 'general-conviction-sealing-under-n-d-c-c-chapter-12-60-1',
  marijuana: 'marijuana-specific-summary-pardon-or-sealing-relief'
};
const mode = process.argv[2] ?? 'candidate';
assert(['candidate', 'no-composition', 'no-override', 'candidate-sha-drift', ...Object.keys(targets).map(k => `missing-${k}`)].includes(mode));
if (mode === 'no-composition') register('data:text/javascript,' + encodeURIComponent(`export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/packet-information.ts'))return r;const s=String(r.source),a='const reviewed = reviewedPacketContractSuccessor(snapshot, authoritative.evaluation.packetPlan);';if(s.split(a).length!==2)throw Error('nonunique mutation anchor');return {...r,source:s.replace(a,'const reviewed = null;')};}`));
if (mode === 'no-override' || mode.startsWith('missing-')) {
  const mutation = mode === 'no-override'
    ? ['north-dakota-plan-forms.ts', 'export function isNorthDakotaUnmappedCandidateForm(profile, pathwayId) {', 'export function isNorthDakotaUnmappedCandidateForm(profile, pathwayId) { return false;']
    : ['reviewed-packet-contract-successors.json', `"ND:${targets[mode.slice(8)]}":`, '"ND:test-only-missing-row":'];
  register('data:text/javascript,' + encodeURIComponent('let m;export function initialize(v){m=v}export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith("/"+m[0]))return r;const s=String(r.source);if(s.split(m[1]).length!==2)throw Error("nonunique mutation anchor");return {...r,source:s.replace(m[1],m[2])};}'), { data: mutation });
}
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { isNorthDakotaUnmappedCandidateForm: matches } = await import('../src/lib/rcap-engine/north-dakota-plan-forms.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/nd-plan-form-predecessors.json', import.meta.url)));
const originalProfile = getProfileByJurisdiction('ND'), profile = structuredClone(originalProfile);
if (mode === 'candidate-sha-drift') profile.packetGenerator.pathways.find(p => p.pathwayId === targets.general).formCandidates[0].sha256 = 'test-only-drift';
let checks = 0; const failures = [];
function check(name, fn) { checks++; try { fn(); } catch (error) { failures.push({ name, error: error.message }); } }
assert.equal(fixture.rows.length, 6);
for (const row of fixture.rows) {
  const targeted = Object.values(targets).includes(row.route);
  const expected = targeted ? { ...row.evaluation.packetPlan, sourceFormIds: [], formMappingStatus: 'custom_or_manual_mapping_required' } : row.evaluation.packetPlan;
  const plan = packetPlanForPathway(profile, row.route);
  check(`${row.route}:exact-plan`, () => assert.deepEqual(plan, expected));
  check(`${row.route}:scoped-predicate`, () => assert.equal(matches(profile, row.route), targeted));
  // Global readiness semantics are a separate assigned item; this repair removes wrong form identities only.
  check(`${row.route}:readiness-unchanged`, () => assert.equal(isPacketPlanFulfillmentReady(plan), isPacketPlanFulfillmentReady(row.evaluation.packetPlan)));
  check(`${row.route}:actual-fulfillment-refused`, () => assert.equal(packetFulfillmentAuthority('ND', row.route, 'checkout creation').allowed, false));
  const answers = structuredClone(row.answers), before = structuredClone(answers);
  const actual = evaluate({ jurisdiction: 'ND', profileVersion: profile.profileVersion, matterId: row.evaluation.matterId, answers }).evaluation;
  check(`${row.route}:only-plan-changes`, () => assert.deepEqual(actual, { ...row.evaluation, packetPlan: expected }));
  check(`${row.route}:answers-unchanged`, () => assert.deepEqual(answers, before));
  const record = structuredClone(row.verification), original = structuredClone(record);
  check(`${row.route}:native-predecessor-hash`, () => assert.equal(P.protectedPacketDraftHash(record.draftSnapshot), record.draftHash));
  const model = P.protectedPacketInformationModelFor(record);
  check(`${row.route}:predecessor-readable`, () => assert(model));
  check(`${row.route}:current-model-plan`, () => assert.deepEqual(model?.packetPlan, expected));
  const update = P.packetInformationPatch({ protectedVerification: record, answers: {} });
  check(`${row.route}:saved-noop`, () => {
    assert(update);
    const next = update.protectedTransition.nextVerification;
    for (const key of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers', 'dependencies', 'packetFamilyIdentifiers']) assert.deepEqual(next.draftSnapshot[key], original.draftSnapshot[key]);
    assert.deepEqual(next, original);
    assert.equal(next.draftSnapshot.paymentAllowed, original.draftSnapshot.paymentAllowed);
    assert.equal(next.status, 'unverified');
  });
  check(`${row.route}:predecessor-immutable`, () => assert.deepEqual(record, original));
  if (!targeted) continue;
  check(`${row.route}:explicit-correction-current-plan`, () => {
    const changed = P.packetInformationPatch({ protectedVerification: record, answers: { charge: 'Synthetic corrected charge text' } });
    assert(changed);
    const next = changed.protectedTransition.nextVerification.draftSnapshot;
    assert.deepEqual(next.packetPlan, expected);
    assert.equal(next.packetAnswers.charge, 'Synthetic corrected charge text');
    for (const key of ['screeningAnswers', 'prefilledAnswers']) assert.deepEqual(next[key], original.draftSnapshot[key]);
    assert.equal(changed.readyToGenerate, false);
    assert.equal(next.paymentAllowed, original.draftSnapshot.paymentAllowed);
  });
  for (const field of ['profileSourceFingerprint', 'profileAuthorityFingerprint', 'draftHash']) {
    const bad = structuredClone(record);
    if (field === 'draftHash') bad.draftHash = 'invalid';
    else { bad.draftSnapshot[field] = 'invalid'; bad.draftHash = P.protectedPacketDraftHash(bad.draftSnapshot); }
    check(`${row.route}:refuse-${field}`, () => assert.equal(P.protectedPacketInformationModelFor(bad), null));
  }
  for (const drift of ['state', 'version', 'corpus', 'mode', 'status', 'sha', 'path', 'extra-form']) {
    const changed = structuredClone(originalProfile), source = changed.packetGenerator.pathways.find(p => p.pathwayId === row.route);
    if (drift === 'state') changed.jurisdiction.code = 'SD';
    if (drift === 'version') changed.profileVersion = 'unknown-version';
    if (drift === 'corpus') changed.source.sourceCorpusSha256 = 'unknown-corpus';
    if (drift === 'mode') source.mode = 'guidance_only';
    if (drift === 'status') source.formMappingStatus = 'not_required';
    if (drift === 'sha') source.formCandidates[0].sha256 = 'unknown-sha';
    if (drift === 'path') source.formCandidates[0].relativePath = 'unknown-path';
    if (drift === 'extra-form') source.formCandidates.push({ ...source.formCandidates[0] });
    check(`${row.route}:unmatched-${drift}-preserved`, () => assert.equal(matches(changed, row.route), false));
  }
}
// ND3 + FNE: preserve actual paid predecessor bytes while removing only reviewed wrong forms.
const B = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
assert.deepEqual(fixture.compositionCases.map(row => row.id), [...Object.values(targets).map(route => 'FNE-' + route), 'C-paid-deferred']);
for (const row of fixture.compositionCases) {
  const matches = row.record ? [{record: row.record}] : JSON.parse(fs.readFileSync(new URL('../' + row.sourcePath, import.meta.url))).rows.filter(item => item.key === row.key);
  assert.equal(matches.length, 1, row.id + ': unique retained predecessor');
  const record = structuredClone(matches[0].record), original = structuredClone(record);
  const snapshot = record.draftSnapshot, authority = P.evaluateProtectedPacketFacts(snapshot);
  const model = P.protectedPacketInformationModelFor(record);
  const noop = P.packetInformationPatch({ protectedVerification: record, answers: {} });
  const successor = P.paymentOnlyDraftSuccessor;
  check(row.id + ': original native hash', () => {
    assert.equal(record.draftHash, row.draftHash);
    assert.equal(P.protectedPacketDraftHash(snapshot), row.draftHash);
  });
  check(row.id + ': composed model and no-op remain held', () => {
    assert(model); assert(noop); assert(successor(snapshot, authority, 'unverified'));
    assert.equal(authority.evaluation.paymentAllowed, false);
    assert.deepEqual(model.packetPlan, {...snapshot.packetPlan, sourceFormIds: [], formMappingStatus: 'custom_or_manual_mapping_required'});
    assert.deepEqual(successor(snapshot, authority, 'unverified'), {...snapshot, paymentAllowed: false, packetPlan: model.packetPlan, packetFamilyIdentifiers: {...snapshot.packetFamilyIdentifiers, sourceFormIds: []}});
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
  check(row.id + ': explicit edit retains answers and remains held', () => {
    const update = P.packetInformationPatch({protectedVerification: record, answers: {participant_full_legal_name: 'Synthetic Updated Name'}});
    assert(update); assert.equal(update.readyToGenerate, false);
    const next = update.protectedTransition.nextVerification.draftSnapshot;
    assert.equal(next.paymentAllowed, false); assert.equal(next.packetAnswers.participant_full_legal_name, 'Synthetic Updated Name');
    assert.deepEqual(next.packetPlan, {...snapshot.packetPlan, sourceFormIds: [], formMappingStatus: 'custom_or_manual_mapping_required'});
    for (const map of ['screeningAnswers', 'prefilledAnswers']) assert.deepEqual(next[map], snapshot[map]);
  });
  check(row.id + ': original record remains unchanged', () => assert.deepEqual(record, original));
}
console.log(JSON.stringify({ mode, checks, passed: checks - failures.length, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
