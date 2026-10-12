import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const file = 'src/lib/rcap-engine/evaluator.ts';
const baseline = process.env.RCAP_ANCHOR_BASELINE;
const source = baseline ? execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8');
// Expose the actual private calculation in memory, with all real dependencies.
// No source file, production export, authority or profile is modified.
const sources = { [pathToFileURL(`${process.cwd()}/${file}`).href]: ts.transpileModule(
  source + '\nexport { chooseTimingAnchor, evaluateCompiledTiming };',
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources = data; } export async function load(url, context, next) { return url in sources ? { format: "module", source: sources[url], shortCircuit: true } : next(url, context); }')}`, { data: sources });
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { chooseTimingAnchor, evaluateCompiledTiming, evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const profile = getProfileByJurisdiction('TX');
const nd = [
  'automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07',
  'petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725',
  'petitioned-nondisclosure-for-an-eligible-conviction-411-0735',
  'first-offense-dwi-nondisclosure'
].map(id => { const p = profile.pathways.find(p => p.id === id); assert.ok(p); return p; });
// Duration fixture isolates anchor choice, not legal subtype eligibility. Actual
// adopted TX memo/OCA sources use discharge or completion, never arrest, for ND.
const rule = { id: 'synthetic-anchor-isolation', sourceRef: 'synthetic-duration-control',
  when: { duration: { value: 2, unit: 'years' }, sourceConditionText: 'completion; unrelated arrest expunction text' },
  then: { suggestedResultCode: 'packet_ready_with_caution' } };
const completed = { court_requirements_completed: 'yes', sentence_completion_date: 'Yes', financial_obligations: 'Yes', pending_cases: 'No', new_convictions_during_waiting_period: 'No', special_preconditions_confirmed: 'Yes' };
let checked = 0;
for (const pathway of process.argv.includes('--replay-only') ? [] : nd) {
  for (const arrest_date of ['2000-01-01', '2026-10-11', 'not a date', 'I am not sure']) {
    assert.equal(chooseTimingAnchor(rule, pathway, { arrest_date }, undefined, 'TX'), undefined, `${pathway.id}: arrest alone cannot anchor ND`); checked++;
    for (const field of ['discharge_date', 'sentence_completion_actual_date', 'probation_parole_supervision_end_date']) {
      assert.equal(chooseTimingAnchor(rule, pathway, { arrest_date, [field]: '2026-10-11' }, undefined, 'TX'), field); checked++;
    }
    // Configured anchors also cannot reintroduce the invalid arrest dependency.
    const configured = { ...rule, when: { ...rule.when, timingAnchorFactId: 'arrest_date', timingAnchorAlternateFactIds: ['discharge_date'] } };
    assert.equal(chooseTimingAnchor(configured, pathway, { arrest_date, discharge_date: '2026-10-11' }, undefined, 'TX'), 'discharge_date'); checked++;
    if (pathway.filingRequired) {
      const result = evaluateCompiledTiming(profile, { ...completed, arrest_date }, rule, pathway);
      assert.notEqual(result.status, 'satisfied'); checked++;
      const recent = evaluateCompiledTiming(profile, { ...completed, arrest_date, sentence_completion_actual_date: '2026-10-11' }, rule, pathway);
      assert.equal(recent.status, 'not_yet'); checked++;
      const old = evaluateCompiledTiming(profile, { ...completed, arrest_date, sentence_completion_actual_date: '2000-01-01' }, rule, pathway);
      assert.equal(old.status, 'satisfied'); checked++;
    }
  }
  assert.equal(chooseTimingAnchor(rule, pathway, { arrest_date: '2000-01-01' }, undefined, 'OTHER'), 'arrest_date'); checked++;
}
// Preserve every actual TX expunction route's arrest dependency.
for (const pathway of profile.pathways.filter(p => !process.argv.includes('--replay-only') && !nd.includes(p))) {
  assert.equal(chooseTimingAnchor(rule, pathway, { arrest_date: '2000-01-01' }, undefined, 'TX'), 'arrest_date'); checked++;
}
// Record actual public witnesses for baseline comparison. Their actual outcomes
// are not ND approval or proof that every timing branch is publicly reachable.
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.filter(w => w.jurisdiction === 'TX');
const replay = witnesses.map(w => {
  const r = evaluateScreening({ jurisdiction: 'TX', profileVersion: profile.profileVersion, matterId: 'synthetic-tx-anchor-preservation', answers: w.finalAnswers });
  return { pathwayKey: w.pathwayKey, resultCode: r.resultCode, paymentAllowed: r.paymentAllowed, pathwayId: r.pathwayId, reasons: r.reasons.map(r => r.code) };
});
console.log(JSON.stringify({ status: 'PASS_BOUNDED_ANCHOR', checked, replay, limits: 'No subtype/duration correction or full eligibility/fulfillment acceptance. Generic disposition/bucket semantics remain separately open.' }, null, 2));
