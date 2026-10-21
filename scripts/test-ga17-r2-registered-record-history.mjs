import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
register('./lib/ts-esm-loader.mjs', import.meta.url);

// GA-17 R2-A: registered-specification routes whose reviewed specification binds no record_type and whose profile asks no
// record_type question. The inherited overlapping menu becomes optional literal history through the existing record arm
// (dc_fl_petition_record_type_history); outcomes, payment, every other plan fact and the specification pin are unchanged.
// Fixture measured at the base (nc-spec.mjs with NC_REGISTERED=1).
const spec = JSON.parse(fs.readFileSync('scripts/fixtures/ga17-r2-registered-record-history.json'));
const R2 = new Set([
  'DC:dc_actual_innocence_expungement_16_803 Q-269179a67ce87233db32',
  'GA:restriction-and-sealing-of-a-pardoned-felony Q-261c55d6fca7e08a1d53',
  'GA:sb-288-misdemeanor-conviction-restriction-and-sealing Q-454f8f18cea8461fc1bc',
  'IL:criminal-identity-theft-mistaken-identity-relief Q-5bf2bfb3d4bfaebe6171',
  'IL:felony-prostitution-relief Q-1ae6c0a67948d46499fd',
  'NV:probation-or-specialty-court-dismissal-set-aside-sealing Q-5ccf7411659316d7432d',
  'SD:suspended-imposition-of-sentence-sealing Q-ed913e13baeea013621d',
  'VA:regime-1-expungement-available-now Q-979dc4b69087b8d8c904',
]);
const memberKey = m => `${m.state}:${m.route} ${m.questionRecordId}`;
assert.equal(new Set(spec.members.map(memberKey)).size, spec.members.length);
for (const m of spec.members) assert(m.group === 'GA17' && R2.has(memberKey(m)), `not an R2-A member: ${memberKey(m)}`);
const HOOK = 'return registeredSpecificationRecordIsHistory(profile, pathwayId, specification);';
const mutations = {
  hook: ['/packet-collection.ts', HOOK, 'return false;'],
  ...Object.fromEntries(spec.members.map(m => [`r2_${m.questionRecordId}`,
    ['/registered-specification-record-history.ts', `"${m.state}:${m.route}": {`, `"unassigned-${m.state}:${m.route}": {`]])),
};
const mutation = process.argv.find(arg => arg.startsWith('--mutation='))?.slice(11);
if (mutation) {
  assert(mutations[mutation], 'unknown mutation');
  register('data:text/javascript,' + encodeURIComponent(`import {writeSync} from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith(d[0])){if(!String(r.source).includes(d[1]))throw Error('mutation target absent');writeSync(2,JSON.stringify({appliedMutation:d[3]})+'\\n');return {...r,source:String(r.source).replace(d[1],d[2])}}return r}`),
    { data: [...mutations[mutation], mutation] });
}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { dcFlPetitionRecordIsHistory } = await import('../src/lib/expungement-ai/packet-collection.ts');
const { registeredSpecificationRecordIsHistory } = await import('../src/lib/expungement-ai/registered-specification-record-history.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { contactRepresentationHash } = await import('../src/lib/expungement-ai/contact-representation.ts');
const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');

const SOURCE = 'dc_fl_petition_record_type_history', DC = 'DC:dc_actual_innocence_expungement_16_803';
// Fulfillment records exist (state STALE without an observation snapshot) for these two; the other six have NO_RECORD.
const STALE = new Set([DC, 'IL:felony-prostitution-relief']);
const collect = (m, extra = {}) => P.packetCollectionFor({ jurisdiction: m.state, pathwayId: m.route,
  requiredInputIds: packetPlanForPathway(getProfileByJurisdiction(m.state), m.route).requiredInputIds,
  serverFacts: { jurisdiction: m.state, pathway_id: m.route }, screeningAnswers: {}, ...extra });
const isHistory = fact => fact?.collection === 'conditional' && fact.optional === true && fact.source === SOURCE;

// Base RED: run at the predecessor; every member must report RED there and PASS at the range.
if (process.argv.includes('--regression-only')) {
  let red = 0;
  for (const m of spec.members) {
    const fact = collect(m).facts.find(f => f.factId === m.fact), status = isHistory(fact) ? 'PASS' : 'RED';
    if (status === 'RED') red++;
    console.log(JSON.stringify({ route: `${m.state}:${m.route}`, questionRecordId: m.questionRecordId, status,
      collection: fact?.collection ?? null, source: fact?.source ?? null }));
  }
  console.log(JSON.stringify({ status: red ? 'RED' : 'PASS', red, members: spec.members.length }));
  process.exit(red ? 1 : 0);
}

// overlapping arrest/court/conviction/juvenile labels stay literal; none is an exclusive value
const raws = ['Arrest or charge', 'Court case', 'Conviction', 'Juvenile matter', 'I am not sure',
  ['Arrest or charge', 'Court case', 'Conviction'], ['Juvenile matter', 'Conviction'], { unknown: true, value: 'Court case' }, null];
const maps = ['screeningAnswers', 'prefilledAnswers', 'savedAnswers'];
const without = (ids, id) => ids.filter(x => x !== id);
let checks = 0;
const check = (name, fn) => { try { fn(); checks++; } catch (error) { console.error(name); throw error; } };

for (const m of spec.members) {
  const key = `${m.state}:${m.route}`, profile = getProfileByJurisdiction(m.state), registered = packetSpecificationFor(key);
  check(`${key}: measured basis and specification pin are current`, () => {
    assert.equal(contactRepresentationHash(profile), m.profileHash);
    assert(registered); assert.equal(registered.routeKey, key);
    assert.equal(contactRepresentationHash(registered), m.specHash);
    assert(!JSON.stringify(registered).includes('record_type'));
    assert(!profile.questions.some(q => q.id === m.fact));
    assert.deepEqual(packetPlanForPathway(profile, m.route).requiredInputIds, m.planRequiredInputIds);
    assert(m.planRequiredInputIds.includes(m.fact));
    // DC 16-803 is a paid route at base (Reviewer3 FAIL 2): the retained paid answer set must be among the measured outcomes.
    if (key === DC) assert(m.outcomes.some(o => o.label === 'retained paid answers' && o.paymentAllowed === true && o.resultCode === 'packet_ready_with_caution'));
  });
  check(`${key}: the hook holds only for this exact pinned profile and specification`, () => {
    assert(registeredSpecificationRecordIsHistory(profile, m.route, registered));
    assert(dcFlPetitionRecordIsHistory(profile, m.route, registered));
    const drifted = [
      [profile, m.route, { ...registered, reviewedBy: 'drift' }],
      [profile, m.route, { ...registered, routeKey: `${m.state}:other-route` }],
      [{ ...profile, questions: [...profile.questions, { id: 'record_type' }] }, m.route, registered],
      [profile, 'other-route', registered],
      [profile, m.route, null], [profile, m.route, undefined]];
    for (const args of drifted) assert(!dcFlPetitionRecordIsHistory(...args));
    for (const other of spec.members.filter(o => o !== m))
      assert(!dcFlPetitionRecordIsHistory(profile, m.route, packetSpecificationFor(`${other.state}:${other.route}`)));
  });
  check(`${key}: every measured outcome (incl. payment) unchanged, and the evaluator refuses the fact`, () => {
    for (const o of m.outcomes) {
      const answers = o.answers ?? { ...m.witness.answers, ...o.delta }, profileVersion = o.profileVersion ?? m.witness.profileVersion;
      const a = evaluate({ jurisdiction: m.state, profileVersion, matterId: 'r2-' + m.route, answers }).evaluation;
      assert.deepEqual({ pathwayId: a.pathwayId, resultCode: a.resultCode, paymentAllowed: a.paymentAllowed, reason: a.reasons[0]?.code ?? null,
        hasPacketPlan: Boolean(a.packetPlan?.requiredInputIds?.length) }, { pathwayId: o.pathwayId, resultCode: o.resultCode,
        paymentAllowed: o.paymentAllowed, reason: o.reason, hasPacketPlan: o.hasPacketPlan });
      // Watch point: payment is unchanged (DC's paid set stays paid), and the deciding logic cannot read the fact.
      for (const raw of raws) assert.throws(() => evaluate({ jurisdiction: m.state, profileVersion,
        matterId: 'r2-' + m.route, answers: { ...answers, [m.fact]: raw } }), error => error.invalidQuestionIds?.includes(m.fact));
    }
  });
  check(`${key}: fulfillment authority state unchanged (NO_RECORD, or STALE where a record exists)`, () => {
    // STALE: the record holds every proof but this checkout has no current-world observation snapshot. It is not a refusal on
    // the merits, so the test claims only that the state is unchanged, never that delivery is refused.
    const authority = packetFulfillmentAuthority(m.state, m.route, 'checkout creation');
    assert.deepEqual({ allowed: authority.allowed, state: authority.reason.match(/^[^ ]+: ([A-Z_]+)\./)?.[1] ?? null }, m.authority);
    assert.deepEqual(m.authority, { allowed: false, state: STALE.has(key) ? 'STALE' : 'NO_RECORD' });
  });
  check(`${key}: collection-level optional history; every other plan fact unchanged`, () => {
    const facts = collect(m).facts, fact = facts.find(f => f.factId === m.fact);
    assert.notDeepEqual({ collection: fact.collection, source: fact.source }, m.baseBucket);
    assert(isHistory(fact));
    assert.equal(fact.active, false);
    const others = Object.fromEntries(facts.filter(f => f.factId !== m.fact)
      .map(f => [f.factId, { collection: f.collection, source: f.source, optional: f.optional ?? null }]));
    assert.deepEqual(others, m.baseOtherFacts);
  });
  for (const map of maps) for (const raw of raws) check(`${key}: raw ${map}/${JSON.stringify(raw)} kept as literal history`, () => {
    const answers = { [m.fact]: structuredClone(raw) }, before = structuredClone(answers);
    const resolved = collect(m, { [map]: answers }), fact = resolved.facts.find(f => f.factId === m.fact);
    assert(isHistory(fact));
    assert.equal(fact.active, true);
    assert.equal(fact.phase, 'render');
    assert.equal(resolved.derivedFacts?.[m.fact], undefined);
    assert.deepEqual(answers, before);
  });
  check(`${key}: protected draft drops only the invented record gate; raw copies save, resume and no-op unchanged`, () => {
    const o = m.outcomes[0], answers = m.witness.answers;
    const authoritative = evaluate({ jurisdiction: m.state, profileVersion: m.witness.profileVersion, matterId: 'r2-' + m.route, answers });
    const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, dependencies: {}, capturedAt: '2026-10-21T00:00:00Z' });
    const recordOf = snapshot => ({ status: 'unverified', revision: 0, draftSnapshot: snapshot, draftHash: P.protectedPacketDraftHash(snapshot) });
    const base = seed && P.protectedPacketInformationModelFor(recordOf(seed.snapshot));
    if (!m.baseModel) { assert.equal(base ?? null, null); return; }
    assert.deepEqual([...base.missingInputIds].sort(), without(m.baseModel.missingInputIds, m.fact));
    assert.deepEqual(base.builderQuestions.filter(q => q.required).map(q => q.id).sort(), without(m.baseModel.builderRequired, m.fact));
    assert.deepEqual(base.questions.filter(q => q.required).map(q => q.id).sort(), without(m.baseModel.requiredQuestions, m.fact));
    // Each raw once, rotating through the three draft maps: every raw and every map is covered.
    for (const [i, raw] of raws.entries()) {
      const map = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'][i % 3], snapshot = structuredClone(seed.snapshot);
      snapshot[map][m.fact] = structuredClone(raw);
      const record = recordOf(snapshot), before = structuredClone(record), model = P.protectedPacketInformationModelFor(record);
      assert(!model.missingInputIds.includes(m.fact));
      assert(!model.questions.some(q => q.id === m.fact && q.required));
      const r = P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
      assert.deepEqual([r.pathwayId, r.resultCode, r.paymentAllowed, r.reasons[0]?.code ?? null], [o.pathwayId, o.resultCode, o.paymentAllowed, o.reason]);
      assert.deepEqual(P.packetInformationPatch({ protectedVerification: record, answers: {} }).protectedTransition.nextVerification, before);
      assert.deepEqual(record, before);
    }
    // Save then resume a literal amendment; nothing becomes ready to generate. Where the measured protected model never asked
    // the fact (GA pardoned felony, IL prostitution, NV), there is nothing to save: only the collection level changes there.
    if (!m.baseModel.requiredQuestions.includes(m.fact)) return;
    // A single_choice value; multi-value legacy shapes are covered by the raw loop above (stored, no-op preserved).
    const item = { id: 'r2-' + m.route, jurisdiction: m.state, artifactRefs: {} }, amended = 'Court case';
    const patch = P.packetInformationPatch({ existingItem: item, protectedVerification: recordOf(structuredClone(seed.snapshot)), answers: { [m.fact]: amended } });
    assert(patch?.protectedTransition);
    assert.equal(patch.readyToGenerate, false);
    const next = patch.protectedTransition.nextVerification;
    assert.deepEqual(next.draftSnapshot.packetAnswers[m.fact], amended);
    const resumed = P.protectedPacketInformationModelFor(next);
    assert(!resumed.missingInputIds.includes(m.fact));
    assert.deepEqual(resumed.initialAnswers[m.fact], amended);
  });
  check(`${key}: saved-item packet surface keeps independent matters' raw answers optional, EN/ES copy`, () => {
    const items = raws.slice(0, 2).map((raw, i) => ({ id: `r2-${m.route}-${i}`, state: m.state, paymentAllowed: false,
      resultCode: m.outcomes[0].resultCode, artifactRefs: { commercialFlow: {
        screening: { pathwayId: m.route, packetPlan: packetPlanForPathway(profile, m.route), answers: m.witness.answers },
        packetInformation: { answers: { [m.fact]: raw }, prefilledAnswers: {} } } } }));
    const before = structuredClone(items);
    items.forEach((item, i) => {
      const model = P.packetInformationModelFor(item);
      assert(model);
      assert(!model.missingInputIds.includes(m.fact));
      const q = model.questions.find(q => q.id === m.fact);
      assert(q);
      assert.equal(q.required, false);
      assert(q.helperText.includes('overlap')); assert(q.translations.es.helperText.includes('coincidir'));
      assert(!model.builderQuestions.some(b => b.id === m.fact && b.required));
      assert.deepEqual(model.initialAnswers[m.fact], raws[i]);
    });
    assert.deepEqual(items, before);
  });
}
// The retained paid DC protected draft keeps its bytes, hash, result and payment; it loses only the invented record gate.
check('DC innocence retained paid draft: result and payment unchanged, only record_type leaves the missing set', () => {
  const base = spec.members.find(m => `${m.state}:${m.route}` === DC).retainedDraft;
  const record = JSON.parse(fs.readFileSync('scripts/fixtures/dc-innocence-location-predecessor.json')).record, before = structuredClone(record);
  assert.equal(P.protectedPacketDraftHash(record.draftSnapshot), record.draftHash);
  const model = P.protectedPacketInformationModelFor(record), r = P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
  assert.deepEqual([r.pathwayId, r.resultCode, r.paymentAllowed], [base.pathwayId, base.resultCode, base.paymentAllowed]);
  assert.deepEqual([base.resultCode, base.paymentAllowed], ['packet_ready_with_caution', true]);
  assert(base.missingInputIds.includes('record_type'));
  assert.deepEqual([...model.missingInputIds].sort(), without(base.missingInputIds, 'record_type'));
  assert.deepEqual(model.builderQuestions.filter(q => q.required).map(q => q.id).sort(), without(base.builderRequired, 'record_type'));
  assert.deepEqual(P.packetInformationPatch({ protectedVerification: record, answers: {} }).protectedTransition.nextVerification, before);
  assert.deepEqual(record, before);
});
console.log(JSON.stringify({ status: 'PASS_GA17_R2_REGISTERED_RECORD_HISTORY', checks, members: spec.members.length,
  measuredAt: spec.measuredAt, mutations: Object.keys(mutations), originalIds: spec.members.map(m => m.questionRecordId),
  limits: ['Collection, evaluation, protected draft save/resume transitions and saved-item surface; HTTP transport is covered by the existing route tests run alongside.',
    'No output rendering, hosted authorization, payment change, fulfillment or legal decision; DC 16-803 stays paid as at base, and fulfillment state is unchanged (NO_RECORD, or STALE without an observation snapshot).'] }));
