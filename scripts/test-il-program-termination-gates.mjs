// O26 IL1: adopted IL.memo tracks il-exp-supervision and il-exp-qualprob.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
process.env.RCAP_EVALUATOR_TODAY = '2026-10-21';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mode = process.argv[2] ?? 'candidate';
const mutations = {
  q09: ['illinois-program-facts.ts', 'return missing("il_program_termination");', 'return { status: "satisfied" };'],
  q10: ['illinois-program-facts.ts', 'return review("ordinary");', 'return { status: "satisfied" };'],
  two_years: ['illinois-program-facts.ts', '? 5 : 2;', '? 5 : 0;'],
  five_years: ['illinois-program-facts.ts', 'let years = 5;', 'let years = 0;'],
  age25: ['illinois-program-facts.ts', 'if (a.il_reckless_age_25 !== "yes")', 'if (false)'],
  vacatur: ['illinois-program-facts.ts', 'if (needsVacatur(type) && a.il_program_judgment_vacated !== "yes")', 'if (false)'],
  no_successor: ['reviewed-packet-contract-successors.json', '"IL:expungement-after-eligible-supervision-or-qualified-probation":', '"IL:test-only-missing-successor":'],
  form: ['packet-planner.ts', 'const illinoisProgramUnmapped = illinoisProgramContext(profile, pathwayId);', 'const illinoisProgramUnmapped = false;']
};
assert(mode === 'candidate' || mutations[mode]);
if (mutations[mode]) register('data:text/javascript,' + encodeURIComponent(`let m;export function initialize(v){m=v}export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/'+m[0]))return r;const s=String(r.source);if(s.split(m[1]).length!==2)throw Error('nonunique mutation anchor');return {...r,source:s.replace(m[1],m[2])};}`), { data: mutations[mode] });
const G = await import('../src/lib/rcap-engine/illinois-program-facts.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { parseJurisdictionProfile } = await import('../src/lib/expungement-ai/frontend/schemas.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { POST } = await import('../src/app/api/expungement-ai/evaluate/route.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const rows = JSON.parse(fs.readFileSync(new URL('./fixtures/il1-program-witnesses.json', import.meta.url))).rows;
const profile = getProfileByJurisdiction('IL'), pub = projectPublicProfile(profile), route = G.IL_PROGRAM_ROUTE;
const failures = []; let checks = 0;
function check(name, fn) { checks++; try { fn(); } catch (error) { failures.push({ name, error: error.message }); } }
const request = answers => ({ jurisdiction: 'IL', profileVersion: profile.profileVersion, matterId: 'synthetic-il1', answers });
const base = { ...rows[1].answers, il_program_type: 'supervision', il_program_termination: 'satisfactory', il_program_termination_date: { value: '2024-10-21', unknown: false }, il_program_minor_traffic: 'no', il_supervision_offense: 'other', il_supervision_sexual_minor: 'no' };
check('profile-schema', () => assert(parseJurisdictionProfile(pub).ok));
check('applicable-program-facts-not-labelled-optional', () => assert(G.IL_PROGRAM_FACT_IDS.every(id => pub.questions.find(q => q.id === id)?.required === true)));
check('other-route-does-not-ask-program-facts', () => assert(G.IL_PROGRAM_FACT_IDS.every(id => !G.illinoisProgramQuestionApplies(profile, 'felony-prostitution-relief', base, id))));
check('plan-no-wrong-cannabis', () => assert.deepEqual(packetPlanForPathway(profile, route).sourceFormIds, []));
check('plan-not-fulfillment-ready', () => assert.equal(isPacketPlanFulfillmentReady(packetPlanForPathway(profile, route)), false));
for (const row of rows) {
  const input = structuredClone(row.answers), result = evaluate(request(input)).evaluation;
  check(`${row.name}:held`, () => assert(result.paymentAllowed === false && !result.resultCode.startsWith('packet_ready')));
  check(`${row.name}:raw`, () => assert.deepEqual(input, row.answers));
  if (result.pathwayId === route) check(`${row.name}:form`, () => assert.deepEqual(result.packetPlan?.sourceFormIds, []));
}
const cases = [
  ['two-years-exact', {}, 'satisfied'], ['two-years-short', { il_program_termination_date: '2024-10-22' }, 'not_yet'],
  ['date-future', { il_program_termination_date: '2027-01-01' }, 'not_yet'], ['date-invalid', { il_program_termination_date: '2024-02-30' }, 'missing'],
  ['date-unknown', { il_program_termination_date: { unknown: true } }, 'missing'], ['date-omitted', { il_program_termination_date: undefined }, 'missing'],
  ['date-retained-unknown', { il_program_termination_date: { value: '2024-10-21', unknown: true } }, 'missing'],
  ['date-invalid-wrapper', { il_program_termination_date: { value: '2024-10-21', unknown: 'yes' } }, 'missing'],
  ['date-year-zero', { il_program_termination_date: '0000-01-01' }, 'missing'],
  ['age-retained-unknown', { il_supervision_offense: 'reckless_misdemeanor', age_at_offense: { value: '20', unknown: true }, il_reckless_age_25: 'yes', il_other_dui_reckless: 'no' }, 'missing'],
  ['termination-omitted', { il_program_termination: undefined }, 'missing'], ['termination-unknown', { il_program_termination: 'unknown' }, 'missing'],
  ['termination-ongoing', { il_program_termination: 'ongoing' }, 'not_yet'],
  ['ordinary', { il_program_type: 'ordinary' }, 'review', 'ordinary'], ['type-unknown', { il_program_type: 'unknown' }, 'missing'],
  ['type-malformed', { il_program_type: ['cannabis_10'] }, 'missing'],
  ['qualified-five-years-short', { il_program_type: 'controlled_410', il_program_termination_date: '2021-10-22' }, 'not_yet'],
  ['qualified-five-years-exact', { il_program_type: 'controlled_410', il_program_termination_date: '2021-10-21' }, 'satisfied'],
  ['minor-traffic', { il_program_minor_traffic: 'yes' }, 'review', 'excluded'], ['sexual-minor', { il_supervision_sexual_minor: 'yes' }, 'review', 'excluded'],
  ['dui', { il_supervision_offense: 'dui' }, 'review', 'excluded'], ['other-reckless', { il_supervision_offense: 'other_reckless' }, 'review', 'excluded'],
  ['unsatisfactory-probation', { il_program_type: 'steroid_10', il_program_termination: 'unsatisfactory' }, 'review', 'completion'],
  ['unsatisfactory-order-unknown', { il_program_termination: 'unsatisfactory' }, 'missing'],
  ['unsatisfactory-order-not-changed', { il_program_termination: 'unsatisfactory', il_supervision_termination_changed: 'no', il_supervision_conviction_status: 'reversed_or_vacated' }, 'review', 'completion'],
  ['unsatisfactory-conviction-remains', { il_program_termination: 'unsatisfactory', il_supervision_termination_changed: 'yes', il_supervision_conviction_status: 'stands' }, 'review', 'completion'],
  ['later-order-review', { il_program_termination: 'unsatisfactory', il_supervision_termination_changed: 'yes', il_supervision_conviction_status: 'reversed_or_vacated' }, 'review', 'order_review']
];
for (const offense of ['vehicle_3_707','vehicle_3_708','vehicle_3_710','vehicle_5_401_3','criminal_11_1_50','criminal_12_3_2','criminal_12_15']) {
  cases.push([`${offense}-short`, { il_supervision_offense: offense, il_program_termination_date: '2021-10-22' }, 'not_yet']);
  cases.push([`${offense}-exact`, { il_supervision_offense: offense, il_program_termination_date: '2021-10-21' }, 'satisfied']);
}
for (const type of ['cannabis_10','meth_70','ucc_5_6_3_3','ucc_5_6_3_4','steroid_10','alcohol_10_102','substance_40_10']) {
  cases.push([`${type}-positive`, { il_program_type: type, il_program_termination_date: '2021-10-21', il_program_judgment_vacated: 'yes' }, 'satisfied']);
}
for (const type of ['alcohol_10_102','substance_40_10']) for (const value of [undefined,'unknown','no']) cases.push([`${type}-vacatur-${value}`, { il_program_type: type, il_program_termination_date: '2021-10-21', il_program_judgment_vacated: value }, value === 'no' ? 'review' : 'missing']);
for (const [name, extra, expected, code] of cases) {
  const a = { ...base, ...extra }, before = structuredClone(a), d = G.illinoisProgramFacts(a, '2026-10-21');
  check(name, () => { assert.equal(d.status, expected); if (code) assert.equal(d.code, code); });
  check(`${name}:raw`, () => assert.deepEqual(a, before));
}
const reckless = { ...base, il_supervision_offense: 'reckless_misdemeanor', age_at_offense: '24', il_reckless_age_25: 'yes', il_other_dui_reckless: 'no', il_program_termination_date: '2026-10-20' };
for (const [name, patch, expected] of [['reached25', {}, 'satisfied'],['under25-now',{il_reckless_age_25:'no'},'not_yet'],['age25-at-offense',{age_at_offense:'25'},'review'],['other-DUI',{il_other_dui_reckless:'yes'},'review'],['age-unknown',{age_at_offense:'I am not sure'},'missing']]) check(name, () => assert.equal(G.illinoisProgramFacts({ ...reckless, ...patch }, '2026-10-21').status, expected));
const positive = evaluate(request(base)).evaluation;
check('native-positive-held-for-form', () => assert(positive.pathwayId === route && positive.resultCode === 'needs_review' && positive.paymentAllowed === false && positive.reasons[0].code === 'il.program_form_mapping_unavailable'));
const response = await POST(new Request('http://localhost/api/expungement-ai/evaluate', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(request(base)) }));
const body = await response.json();
check('public-positive-held', () => assert(response.status === 200 && body.paymentAllowed === false && body.consumerPacketAvailable === false && body.sponsoredPacketAvailable === false && body.reasons[0].code === 'il.program_form_mapping_unavailable'));
check('native-positive-nextSteps', () => assert.deepEqual(positive.nextSteps, [G.IL_PROGRAM_COPY.form[0]]));
check('native-missing-nextSteps', () => assert.deepEqual(evaluate(request(rows[1].answers)).evaluation.nextSteps, [G.IL_PROGRAM_COPY.missing[0]]));
check('native-ordinary-refused', () => assert.equal(evaluate(request({ ...base, il_program_type: 'ordinary' })).evaluation.reasons[0].code, 'il.program_ordinary'));
check('resumed-all-answers', () => assert.deepEqual(sanitizeResumedAnswersForQuestionIds(pub, base, selectScreeningQuestionIds(profile, pub, base)), base));
for (const [code, [en, es]] of Object.entries(G.IL_PROGRAM_COPY)) check(`spanish-${code}`, () => assert.equal(resolveRuntimeText('es', en), es));
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative: evaluate(request(base)), screeningAnswers: base, dependencies: {}, capturedAt: '2026-10-21T00:00:00Z' });
check('saved-seed', () => assert(seed));
if (seed) {
  const verification = { status: 'unverified', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot }, before = structuredClone(verification);
  const model = P.protectedPacketInformationModelFor(verification);
  check('saved-readable', () => assert(model));
  check('saved-correction-ids', () => assert(P.factualPathwayCorrectionIds('IL', route, base).includes('il_program_termination')));
  const update = P.packetInformationPatch({ existingItem: { id:'synthetic-il1-owner',jurisdiction:'IL',artifactRefs:{} }, protectedVerification:verification, answers:{il_program_termination:'ongoing'} });
  check('saved-correction-applied-held', () => assert(update?.protectedTransition.nextVerification.draftSnapshot.packetAnswers.il_program_termination === 'ongoing' && update.readyToGenerate === false));
  check('saved-original-immutable', () => assert.deepEqual(verification, before));
}
const predecessor = JSON.parse(fs.readFileSync(new URL('./fixtures/il1-program-predecessor.json', import.meta.url))).verification;
const oldBefore = structuredClone(predecessor), oldModel = P.protectedPacketInformationModelFor(predecessor);
check('predecessor-hash-unchanged', () => assert.equal(P.protectedPacketDraftHash(predecessor.draftSnapshot), predecessor.draftHash));
check('predecessor-readable-via-plan-successor', () => assert(oldModel));
check('predecessor-raw-history-preserved', () => assert.deepEqual(predecessor, oldBefore));
for (const variant of ['wrong-hash','wrong-source','wrong-authority','verified']) {
  const bad = structuredClone(predecessor);
  if (variant === 'wrong-hash') bad.draftHash = 'invalid';
  if (variant === 'wrong-source') { bad.draftSnapshot.profileSourceFingerprint = 'invalid'; bad.draftHash = P.protectedPacketDraftHash(bad.draftSnapshot); }
  if (variant === 'wrong-authority') { bad.draftSnapshot.profileAuthorityFingerprint = 'invalid'; bad.draftHash = P.protectedPacketDraftHash(bad.draftSnapshot); }
  if (variant === 'verified') bad.status = 'verified';
  check(`predecessor-${variant}-refused`, () => assert.equal(P.protectedPacketInformationModelFor(bad), null));
}
const noop = P.packetInformationPatch({ existingItem: { id:'synthetic-il1-old-owner',jurisdiction:'IL',artifactRefs:{} }, protectedVerification:predecessor, answers:{} });
check('predecessor-noop-preserves-raw', () => { assert(noop); for (const map of ['screeningAnswers','prefilledAnswers','packetAnswers']) assert.deepEqual(noop.protectedTransition.nextVerification.draftSnapshot[map],predecessor.draftSnapshot[map]); });
const oldUpdate = P.packetInformationPatch({ existingItem: { id:'synthetic-il1-old-owner',jurisdiction:'IL',artifactRefs:{} }, protectedVerification:predecessor, answers: { il_program_type:'ordinary' } });
check('predecessor-correction-held', () => assert(oldUpdate && oldUpdate.readyToGenerate === false && oldUpdate.protectedTransition.nextVerification.draftSnapshot.packetAnswers.il_program_type === 'ordinary'));
if (oldUpdate) for (const map of ['screeningAnswers','prefilledAnswers','packetAnswers']) check(`predecessor-${map}-preserved`, () => {
  for (const [id,value] of Object.entries(predecessor.draftSnapshot[map])) assert.deepEqual(oldUpdate.protectedTransition.nextVerification.draftSnapshot[map][id], value);
});
console.log(JSON.stringify({ mode, checks, passed:checks-failures.length, failures, positive },null,2));
process.exitCode = failures.length ? 1 : 0;
