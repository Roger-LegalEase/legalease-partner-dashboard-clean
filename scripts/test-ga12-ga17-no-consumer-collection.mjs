import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
register('./lib/ts-esm-loader.mjs', import.meta.url);

// GA-12 O01 / GA-17 O16 "no-consumer" members (Acceptance 05:05:36Z, reading (b)): the route packet plan collects the fact,
// but no measured answer set reaches a packet model. Each member is an R1 table entry: optional literal history at
// collection level, every measured outcome and every other plan fact unchanged. One fixture per batch, each measured at its
// own base (nc-spec.mjs), so parallel batch branches add separate files.
const DIR = 'scripts/fixtures/ga12-ga17-no-consumer-collection';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
const specs = files.map(f => JSON.parse(fs.readFileSync(`${DIR}/${f}`)));
const spec = { members: specs.flatMap(s => s.members) };
// The shared tests skip their sibling negatives for exactly these fixture routes, so the fixtures may only hold measured NC
// members (Reviewer4 2026-10-21): a fixture entry outside this list fails here.
const NC = new Set([
  // CA tool-1: Reviewer TABLE 2026-10-21T16:06:44Z (no-consumer, output-13), assigned by the lead 16:07:31Z.
  'CA:tool-1-dismissal-set-aside GA12 Q-41440690b7f0b71ee058',
  'CO:juvenile-expungement-19-1-306 GA12 Q-8ba92917ff60d81c7f05',
  'CO:juvenile-expungement-19-1-306 GA17 Q-25e1a3f5c0a9545f247a',
  'DE:discretionary-court-expungement-under-11-del-c-4374 GA12 Q-05091f0804053105e852',
  'KS:drug-registration-relief-coordination GA12 Q-bba726936bb6f046044d',
  'KY:felony-conviction-431073 GA12 Q-9ad9403d580ecc4dd1fc',
  'MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8 GA12 Q-72d0f90f14e83e9055cf',
  'MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8 GA17 Q-7afb75fc02c80d21fe6e',
  'MO:marijuana-expungement-under-missouri-constitution-article-xiv GA12 Q-a39167ba4722efe9f48a',
  // MS active-case members: GA1217_TO_LEAD 2026-10-21T08:09:56Z, assigned by the lead 08:14:05Z.
  'MS:controlled-substance-conditional-discharge-active-case-admission GA12 Q-e5aae0617a5b7c0b4e69',
  'MS:controlled-substance-conditional-discharge-active-case-admission GA17 Q-1c87028cbb0245b356ec',
  'MS:nonadjudication-99-15-26-active-case-admission GA12 Q-ff587f6aaeb542414c0d',
  'MS:nonadjudication-99-15-26-active-case-admission GA17 Q-4b3c8bc1491c65d69d4e',
  'MS:pretrial-intervention-active-case-admission GA12 Q-140ce429d095361ecb54',
  'MS:pretrial-intervention-active-case-admission GA17 Q-68b05fc2444ab78b80a9',
  'MT:deferred-sentence-dismissal-or-confidentiality-route GA12 Q-36f94b32930c7fc0e916',
  'MT:deferred-sentence-dismissal-or-confidentiality-route GA17 Q-da2839e57717001e88c0',
  'NY:conditional-treatment-sealing-under-cpl-160-58 GA12 Q-f89138cbd1584a2640c1',
  'NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59 GA12 Q-248865769cbca4a8a8f7',
  'OK:clean-slate-automatic-expungement GA12 Q-f96c5ed3f036716c4879',
  'OK:clean-slate-automatic-expungement GA17 Q-ecd8c474ef5fd2388e5e',
  'TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a GA12 Q-24ea2697ada09a8abedd',
  'TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a GA17 Q-79eaa1fccb7aaba781a1',
  'TX:expunction-after-qualifying-class-c-deferred-disposition GA12 Q-5f780cd6ffe0b6439b4c',
  'TX:expunction-after-qualifying-class-c-deferred-disposition GA17 Q-225bd1a97176e98a7d2e',
  'TX:expunction-after-qualifying-dismissal-or-quash GA12 Q-223607467c30551b5c2b',
  'TX:expunction-after-qualifying-dismissal-or-quash GA17 Q-ef3fc93d77fc46a36bf1',
  'WV:eligible-conviction-expungement-under-w-va-code-61-11-26 GA12 Q-d926b44b902ba90dd628',
  'WV:eligible-conviction-expungement-under-w-va-code-61-11-26 GA17 Q-bdfd23ba0ca4636669a2',
]);
const memberKey = m => `${m.state}:${m.route} ${m.group} ${m.questionRecordId}`;
assert.equal(new Set(spec.members.map(memberKey)).size, spec.members.length);
for (const m of spec.members) assert(NC.has(memberKey(m)), `not a measured NC member: ${memberKey(m)}`);
const SOURCE = { GA12: 'r1_category_history', GA17: 'dc_fl_petition_record_type_history' };
const okIds = Object.fromEntries(spec.members.filter(m => m.state === 'OK').map(m => [m.group, m.questionRecordId]));
// OK's accepted routes use okCategoryAndRecordAreHistory (not the R1 table), so OK Clean Slate is one combined line there.
const line = m => m.state === 'OK' ? `"${m.route}", // GA12 ${okIds.GA12} / GA17 ${okIds.GA17}` : `"${m.route}", // ${m.group} ${m.questionRecordId}`;
const source = m => m.state === 'OK' && m.group === 'GA12' ? 'ok_category_history' : SOURCE[m.group];
const mutations = Object.fromEntries(spec.members.map(m => [`nc_${m.state.toLowerCase()}_${m.questionRecordId}`,
  [line(m), line(m).replace(`"${m.route}"`, '"unassigned-r1-route"')]]));
const mutation = process.argv.find(arg => arg.startsWith('--mutation='))?.slice(11);
if (mutation) {
  assert(mutations[mutation], 'unknown mutation');
  register('data:text/javascript,' + encodeURIComponent(`import {writeSync} from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/packet-collection.ts')){if(!String(r.source).includes(d[0]))throw Error('mutation target absent');writeSync(2,JSON.stringify({appliedMutation:d[2]})+'\\n');return {...r,source:String(r.source).replace(d[0],d[1])}}return r}`),
    { data: [...mutations[mutation], mutation] });
}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { contactRepresentationHash } = await import('../src/lib/expungement-ai/contact-representation.ts');
const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');

const collect = (m, extra = {}) => P.packetCollectionFor({ jurisdiction: m.state, pathwayId: m.route,
  requiredInputIds: packetPlanForPathway(getProfileByJurisdiction(m.state), m.route).requiredInputIds,
  serverFacts: { jurisdiction: m.state, pathway_id: m.route }, screeningAnswers: {}, ...extra });
const isHistory = (fact, m) => fact?.collection === 'conditional' && fact.optional === true && fact.source === source(m);

// Base RED: run at the predecessor; every member must report RED there and PASS at the range.
if (process.argv.includes('--regression-only')) {
  let red = 0;
  for (const m of spec.members) {
    const fact = collect(m).facts.find(f => f.factId === m.fact);
    const status = isHistory(fact, m) ? 'PASS' : 'RED';
    if (status === 'RED') red++;
    console.log(JSON.stringify({ route: `${m.state}:${m.route}`, group: m.group, questionRecordId: m.questionRecordId, status,
      collection: fact?.collection ?? null, source: fact?.source ?? null }));
  }
  console.log(JSON.stringify({ status: red ? 'RED' : 'PASS', red, members: spec.members.length }));
  process.exit(red ? 1 : 0);
}

const raws = {
  // ordinary levels, a jurisdiction-specific label, unknown, a later amendment, multiple matters, legacy shapes
  GA12: ['Misdemeanor', 'Felony', 'Class C misdemeanor', { unknown: true }, 'Count 1 theft; count 2 amended to trespass',
    ['Misdemeanor', 'Felony'], { value: 'Amended literal category', unknown: false }, null],
  // overlapping arrest/court/conviction/juvenile labels stay literal; none is an exclusive value
  GA17: ['Arrest or charge', 'Court case', 'Conviction', 'Juvenile matter', 'I am not sure',
    ['Arrest or charge', 'Court case', 'Conviction'], ['Juvenile matter', 'Conviction'], { unknown: true, value: 'Court case' }, null]
};
const maps = ['screeningAnswers', 'prefilledAnswers', 'savedAnswers'];
let checks = 0;
const check = (name, fn) => { try { fn(); checks++; } catch (error) { console.error(name); throw error; } };

for (const m of spec.members) {
  const key = `${m.state}:${m.route}`, profile = getProfileByJurisdiction(m.state);
  check(`${key}/${m.group}: measured basis is current`, () => {
    assert.equal(contactRepresentationHash(profile), m.profileHash);
    assert.equal(packetSpecificationFor(key), undefined);
    assert.deepEqual(packetPlanForPathway(profile, m.route).requiredInputIds, m.planRequiredInputIds);
    assert(m.planRequiredInputIds.includes(m.fact));
    assert(!profile.questions.some(q => q.id === m.fact));
  });
  check(`${key}/${m.group}: every measured outcome unchanged, unpaid, and the evaluator refuses the fact`, () => {
    for (const o of m.outcomes) {
      const answers = { ...m.witness.answers, ...o.delta };
      const a = evaluate({ jurisdiction: m.state, profileVersion: m.witness.profileVersion, matterId: 'nc-' + m.route, answers }).evaluation;
      assert.deepEqual({ pathwayId: a.pathwayId, resultCode: a.resultCode, paymentAllowed: a.paymentAllowed, reason: a.reasons[0]?.code ?? null,
        hasPacketPlan: Boolean(a.packetPlan?.requiredInputIds?.length) }, { pathwayId: o.pathwayId, resultCode: o.resultCode,
        paymentAllowed: o.paymentAllowed, reason: o.reason, hasPacketPlan: o.hasPacketPlan });
      // Delivery stays closed: no fulfillment record binds the route.
      const authority = packetFulfillmentAuthority(m.state, m.route, 'checkout creation');
      assert.equal(authority.allowed, false); assert.match(authority.reason, /: NO_RECORD\./);
      // Watch point: no measured outcome reaches payment or a packet, and the deciding logic cannot read the fact.
      assert.equal(a.paymentAllowed, false);
      for (const raw of raws[m.group]) assert.throws(() => evaluate({ jurisdiction: m.state, profileVersion: m.witness.profileVersion,
        matterId: 'nc-' + m.route, answers: { ...answers, [m.fact]: raw } }), error => error.invalidQuestionIds?.includes(m.fact));
    }
  });
  check(`${key}/${m.group}: collection-level optional history; every other plan fact unchanged`, () => {
    const facts = collect(m).facts, fact = facts.find(f => f.factId === m.fact);
    assert.notDeepEqual({ collection: fact.collection, source: fact.source }, m.baseBucket);
    assert(isHistory(fact, m));
    assert.equal(fact.active, false);
    const others = Object.fromEntries(facts.filter(f => !['offense_category', 'record_type'].includes(f.factId))
      .map(f => [f.factId, { collection: f.collection, source: f.source, optional: f.optional ?? null }]));
    assert.deepEqual(others, m.baseOtherFacts);
  });
  for (const map of maps) for (const raw of raws[m.group]) check(`${key}/${m.group}: raw ${map}/${JSON.stringify(raw)} kept as literal history`, () => {
    const answers = { [m.fact]: structuredClone(raw) }, before = structuredClone(answers);
    const resolved = collect(m, { [map]: answers }), fact = resolved.facts.find(f => f.factId === m.fact);
    assert(isHistory(fact, m));
    assert.equal(fact.active, true);
    assert.equal(fact.phase, 'render');
    assert.equal(resolved.derivedFacts?.[m.fact], undefined);
    assert.deepEqual(answers, before);
  });
  check(`${key}/${m.group}: protected draft keeps every raw copy with no gate, and a no-op save preserves it`, () => {
    const o = m.outcomes[0], answers = m.witness.answers;
    const authoritative = evaluate({ jurisdiction: m.state, profileVersion: m.witness.profileVersion, matterId: 'nc-' + m.route, answers });
    const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, dependencies: {}, capturedAt: '2026-10-21T00:00:00Z' });
    assert(seed);
    // Each raw once, rotating through the three draft maps: every raw and every map is covered at a third of the cost.
    for (const [i, raw] of raws[m.group].entries()) {
      const map = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'][i % 3], snapshot = structuredClone(seed.snapshot); snapshot[map][m.fact] = structuredClone(raw);
      const record = { status: 'unverified', revision: 0, draftSnapshot: snapshot, draftHash: P.protectedPacketDraftHash(snapshot) };
      const before = structuredClone(record), model = P.protectedPacketInformationModelFor(record);
      assert(model);
      assert(!model.missingInputIds.includes(m.fact));
      assert(!model.questions.some(q => q.id === m.fact && q.required));
      const r = P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
      assert.deepEqual([r.pathwayId, r.resultCode, r.paymentAllowed, r.reasons[0]?.code ?? null], [o.pathwayId, o.resultCode, o.paymentAllowed, o.reason]);
      assert.deepEqual(P.packetInformationPatch({ protectedVerification: record, answers: {} }).protectedTransition.nextVerification, before);
      assert.deepEqual(record, before);
    }
  });
  check(`${key}/${m.group}: saved-item packet surface keeps independent matters' raw answers optional`, () => {
    const items = raws[m.group].slice(0, 2).map((raw, i) => ({ id: `nc-${m.route}-${i}`, state: m.state, paymentAllowed: false,
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
      if (m.group === 'GA17') { assert(q.helperText.includes('overlap')); assert(q.translations.es.helperText.includes('coincidir')); }
      assert(!model.builderQuestions.some(b => b.id === m.fact && b.required));
      assert.deepEqual(model.initialAnswers[m.fact], raws[m.group][i]);
    });
    assert.deepEqual(items, before);
  });
}
console.log(JSON.stringify({ status: 'PASS_GA12_GA17_NO_CONSUMER_COLLECTION', checks, members: spec.members.length,
  measuredAt: Object.fromEntries(files.map((f, i) => [f, specs[i].measuredAt])), mutations: Object.keys(mutations),
  originalIds: spec.members.map(m => m.questionRecordId),
  limits: ['Collection, evaluation and saved-item surface only; no measured answer set reaches a protected packet, payment or render.',
    'No output rendering, hosted authorization, commercial delivery or legal decision; the GA17 members whose base bucket is render_required (MD, MS) are named for Acceptance.'] }));
