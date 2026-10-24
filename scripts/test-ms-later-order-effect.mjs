// O26-MS1 (GA21-CONVICTION-REQUEST-01, ms_later_order): adopted review l.282 "separately collect the actual later order and
// effect" and l.312 "use the legally effective later disposition" (approved decisions §9 l.333/l.348). Every effect is held:
// a dismissal or acquittal after the order waits on counsel (item-32 request) and is never applied to a nonconviction route.
// --mutation=<name> rewrites the real transpiled selector and must fail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const MUTATIONS = {
  counsel_auto_applied: ['return { status: "review", code: "later_order_counsel" };', 'return selected("non-conviction-expungement-for-dismissal-no-disposition-or-acquittal");'],
  effect_not_collected: ['if (!exactChoice(effect, MS_LATER_ORDER_EFFECTS))', 'if (false)'],
  none_asks_effect: ['if (later === "none")', 'if (false)'],
  pending_not_distinct: ['effect === "pending" ? "later_order_pending" : "later_order_not_cleared"', '"later_order_not_cleared"'],
  effect_asked_for_none: ['exactChoice(answers.ms_later_order, ["vacated", "reversed", "dismissed", "other"])', 'exactChoice(answers.ms_later_order, ["vacated", "reversed", "dismissed", "other", "none"])']
};
const mutation = process.argv.find(arg => arg.startsWith('--mutation='))?.slice(11);
if (mutation) {
  assert(MUTATIONS[mutation], 'unknown mutation');
  const url = pathToFileURL(path.resolve('src/lib/rcap-engine/conviction-relief-request.ts')).href;
  register('data:text/javascript,' + encodeURIComponent(`
let target, from, to;
export function initialize(data) { ({ target, from, to } = data); }
export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (url !== target) return loaded;
  const source = String(loaded.source);
  if (source.split(from).length !== 2) throw new Error('mutation target absent or repeated');
  return { ...loaded, source: source.replace(from, to) };
}`), { data: { target: url, from: MUTATIONS[mutation][0], to: MUTATIONS[mutation][1] } });
  console.error(JSON.stringify({ appliedMutation: mutation }));
}
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { convictionReliefRequest, convictionReliefQuestions, CONVICTION_NONCONVICTION_ROUTES, CONVICTION_RELIEF_COPY } = await import('../src/lib/rcap-engine/conviction-relief-request.ts');
const { sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/conviction-fallback-predecessors.json', import.meta.url))).rows;
let checks = 0;
const check = (id, fn) => { try { fn(); checks++; } catch (error) { console.log(JSON.stringify({ failedCheck: id, checks })); throw error; } };
const profile = getProfileByJurisdiction('MS'), pub = projectPublicProfile(profile);
const ORDERS = ['vacated', 'reversed', 'dismissed', 'other'];
const EFFECTS = { dismissed: 'later_order_counsel', acquitted: 'later_order_counsel', convicted_again: 'later_order_not_cleared', pending: 'later_order_pending', unchanged: 'later_order_not_cleared' };
const effectQuestion = pub.questions.find(q => q.id === 'ms_later_order_effect');
check('MS/effect question is public with the exact values', () => {
  assert(effectQuestion);
  assert.deepEqual(effectQuestion.options, [...Object.keys(EFFECTS), 'unknown']);
  assert.equal(effectQuestion.required, false);
  assert.notEqual(effectQuestion.translations.es.prompt, effectQuestion.prompt);
  for (const value of effectQuestion.options) assert(effectQuestion.optionDisplay[value].translations.es.label);
});
check('GA/IL: no effect question and unchanged later-order routing', () => {
  for (const state of ['GA', 'IL']) assert(!convictionReliefQuestions(state).some(q => q.id === 'ms_later_order_effect'));
  const ga = getProfileByJurisdiction('GA'), il = getProfileByJurisdiction('IL');
  const gaFixture = fixtures.find(r => r.id.startsWith('GA') && r.id.endsWith('/omitted')), ilFixture = fixtures.find(r => r.id.startsWith('IL') && r.id.endsWith('/omitted'));
  const strip = a => { const out = { ...a }; delete out.possible_pathway_context; return out; };
  assert.deepEqual(convictionReliefRequest(ga, { ...strip(gaFixture.answers), ga_record_help: 'later_order', ga_later_order: 'vacated', ms_later_order_effect: 'dismissed' }), { status: 'review', code: 'later_order' });
  assert.deepEqual(convictionReliefRequest(il, { ...strip(ilFixture.answers), il_record_help: 'later_order', il_later_order: 'vacated' }), { status: 'selected', pathwayId: 'adult-non-conviction-expungement' });
});
const run = (label, answers, expect) => {
  const before = structuredClone(answers);
  const a = evaluateAuthoritativeScreeningResult({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'o26-ms1-' + label, answers }), e = a.evaluation;
  const asked = selectScreeningQuestionIds(profile, pub, answers), resumed = sanitizeResumedAnswersForQuestionIds(pub, answers, asked);
  check(label, () => {
    assert.deepEqual(answers, before, 'raw answers are never rewritten');
    assert.equal(e.paymentAllowed, false); assert.equal(e.pathwayId ?? null, null); assert.equal(e.packetPlan ?? null, null); assert.equal(a.packetType ?? null, null);
    assert(!CONVICTION_NONCONVICTION_ROUTES.MS.includes(e.pathwayId));
    for (const id of ['case_outcome', 'ms_record_help', 'ms_later_order', ...(expect.effectAsked ? ['ms_later_order_effect'] : [])])
      if (Object.hasOwn(answers, id)) assert.deepEqual(resumed[id], answers[id], 'original history kept on resume: ' + id);
    assert.equal(asked.includes('ms_later_order_effect'), expect.effectAsked);
    if (expect.missing) {
      assert.equal(e.resultCode, 'needs_more_info'); assert.deepEqual(e.missingQuestionIds, [expect.missing]);
      assert.deepEqual(e.reasons.map(r => r.code), ['ms.conviction_relief_missing']);
    } else {
      assert.equal(e.resultCode, 'needs_review'); assert.deepEqual(e.missingQuestionIds ?? [], []);
      assert.deepEqual(e.reasons.map(r => r.code), ['ms.conviction_relief_' + expect.code]);
      assert.equal(e.reasons[0].text, CONVICTION_RELIEF_COPY[expect.code][0]);
      assert.equal(resolveRuntimeText('es', e.reasons[0].text), CONVICTION_RELIEF_COPY[expect.code][1]);
    }
  });
};
for (const outcome of ['Misdemeanor conviction', 'Felony conviction', 'Other conviction or adjudication', 'Pardoned conviction']) {
  const fixture = fixtures.find(r => r.id === `MS/${outcome}/generic/omitted`);
  assert(fixture, outcome);
  const base = { ...fixture.answers, ms_record_help: 'later_order' };
  delete base.possible_pathway_context;
  for (const order of ORDERS) {
    // Collection: the effect is asked; legacy saved answers without it are asked, never inferred.
    run(`${outcome}/${order}/effect-omitted`, { ...base, ms_later_order: order }, { missing: 'ms_later_order_effect', effectAsked: true });
    for (const bad of ['unknown', 'cleared', ''])
      run(`${outcome}/${order}/effect-${bad || 'empty'}`, { ...base, ms_later_order: order, ms_later_order_effect: bad }, { missing: 'ms_later_order_effect', effectAsked: true });
    // Each effect has its own held reason; the counsel hold covers dismissal/acquittal after the order.
    for (const [effect, code] of Object.entries(EFFECTS))
      run(`${outcome}/${order}/${effect}`, { ...base, ms_later_order: order, ms_later_order_effect: effect }, { code, effectAsked: true });
  }
  // Negative: no later order changed the conviction, so it does not clear; the effect is not asked, and a stray one is ignored.
  run(`${outcome}/none`, { ...base, ms_later_order: 'none' }, { code: 'later_order_not_cleared', effectAsked: false });
  run(`${outcome}/none/stray-effect`, { ...base, ms_later_order: 'none', ms_later_order_effect: 'dismissed' }, { code: 'later_order_not_cleared', effectAsked: false });
  // Unknown or missing order: asked first, the effect is not.
  run(`${outcome}/order-unknown`, { ...base, ms_later_order: 'unknown', ms_later_order_effect: 'dismissed' }, { missing: 'ms_later_order', effectAsked: false });
  run(`${outcome}/order-omitted`, { ...base }, { missing: 'ms_later_order', effectAsked: false });
}
console.log(JSON.stringify({ status: 'PASS_MS_LATER_ORDER_EFFECT', checks, mutations: Object.keys(MUTATIONS) }));
