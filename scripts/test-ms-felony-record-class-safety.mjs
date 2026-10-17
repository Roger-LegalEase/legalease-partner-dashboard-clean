import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
if (process.env.RCAP_FELONY_BASELINE) {
  const file = 'src/lib/rcap-engine/evaluator.ts';
  const sources = { [pathToFileURL(`${process.cwd()}/${file}`).href]: ts.transpileModule(
    execFileSync('git', ['show', `${process.env.RCAP_FELONY_BASELINE}:${file}`], { encoding: 'utf8' }),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
  register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources = data; } export async function load(url, context, next) { return url in sources ? { format: "module", source: sources[url], shortCircuit: true } : next(url, context); }')}`, { data: sources });
}
process.env.RCAP_EVALUATOR_TODAY = '2026-10-11';

const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { reviewedResultText } = await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const { MS_NONCONVICTION_SCREENING_ANSWERS: screening, MS_NONCONVICTION_ROUTE: route } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const profile = getProfileByJurisdiction('MS');
const publicProfile = projectPublicProfile(profile);
const felonyId = 'eligible-felony-conviction-expungement-99-19-71';
const felonyLabel = profile.pathways.find(p => p.id === felonyId).label;
const conflictCode = 'ms.felony_route_case_outcome_conflict';
const evaluate = answers => evaluateAuthoritativeScreeningResult({ jurisdiction: 'MS', profileVersion: profile.profileVersion, matterId: 'synthetic-ms-record-class-safety', answers }).evaluation;
const sourceTrack = JSON.parse(readFileSync('data/record-clearing/legal-design-track-registry.json', 'utf8')).tracks.find(t => t.trackId === 'ms-fel');
assert.deepEqual(sourceTrack.recordTypes, ['conviction']);
assert.deepEqual(sourceTrack.dispositions, ['felony_conviction']);

// The unmodified retained dismissal fixture must keep its proven nonconviction
// route. Only the optional remedy label changes in the first negative case.
const baseline = evaluate(screening);
assert.equal(baseline.pathwayId, route.pathwayId);
assert.equal(baseline.resultCode, 'packet_ready_with_caution');
assert.equal(baseline.paymentAllowed, true);
assert.ok(baseline.packetPlan);
let negativeCases = 0;
for (const case_outcome of ['Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Misdemeanor conviction']) {
  assert.ok(publicProfile.questions.find(q => q.id === 'case_outcome').options.includes(case_outcome));
  // The original charge's severity cannot convert a dismissal or misdemeanor
  // disposition into a felony conviction. All existing severity choices count.
  for (const offense_level of publicProfile.questions.find(q => q.id === 'offense_level').options) {
    const result = evaluate({ ...screening, case_outcome, offense_level, possible_pathway_context: felonyLabel });
    assert.equal(result.pathwayId, felonyId);
    assert.equal(result.resultCode, 'needs_review');
    assert.equal(result.paymentAllowed, false);
    assert.equal(result.packetPlan, undefined);
    // The existing uncertainty gate runs first and already holds this input.
    // Preserve its earlier, accurate reason instead of requiring our later one.
    if (offense_level === 'I am not sure') {
      assert.ok(result.reasons.some(r => r.code === 'ms.source_fact_unknown'));
      negativeCases++;
      continue;
    }
    const reason = result.reasons.find(r => r.code === conflictCode);
    assert.ok(reason);
    assert.equal(reason.sourceRef, 'LD-MS-01; legal-design-track-registry:ms-fel:recordTypes,dispositions');
    const copy = reviewedResultText(reason.text);
    assert.equal(copy.en, reason.text);
    assert.match(copy.es, /no coincide con esta opción/);
    negativeCases++;
  }
}
// Ambiguous outcomes are not an established felony conviction. Earlier
// unknown/program clarification gates may hold them first; none may be positive.
let otherOutcomeCases = 0;
for (const case_outcome of publicProfile.questions.find(q => q.id === 'case_outcome').options) {
  if (['Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Misdemeanor conviction'].includes(case_outcome)) continue;
  const result = evaluate({ ...screening, case_outcome, possible_pathway_context: felonyLabel });
  assert.ok(!result.reasons.some(r => r.code === conflictCode));
  if (case_outcome !== 'Felony conviction') {
    assert.equal(result.paymentAllowed, false, `Unproven final class: ${case_outcome}`);
    assert.ok(['needs_review', 'needs_more_info'].includes(result.resultCode));
    if (case_outcome === 'Other conviction or adjudication' || case_outcome === 'Pardoned conviction') {
      const reason = result.reasons.find(r => r.code === 'ms.felony_route_case_outcome_unconfirmed');
      assert.ok(reason);
      assert.match(reviewedResultText(reason.text).es, /condena final/);
    }
  } else {
    assert.ok(!result.reasons.some(r => r.code === 'ms.felony_route_case_outcome_unconfirmed'));
    assert.equal(result.resultCode, 'packet_ready_with_caution');
    assert.equal(result.paymentAllowed, true);
    assert.ok(result.packetPlan);
  }
  otherOutcomeCases++;
}
assert.deepEqual(evaluate(screening), baseline, 'rejected context cannot mutate the retained route or inputs');
console.log(JSON.stringify({ status: 'PASS', negativeCases, otherOutcomeCases, retainedNonconvictionPreserved: true, scope: 'Exact MS final-felony prerequisite; two published contradictory outcomes and ambiguous classes held; retained nonconviction positive preserved. No commercial, protected or document-output acceptance claimed.' }));
