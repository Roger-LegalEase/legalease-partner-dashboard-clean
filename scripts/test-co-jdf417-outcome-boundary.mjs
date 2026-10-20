import fs from 'node:fs';
import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-20';
const {evaluateExpungementAiMatter} = await import('../src/lib/rcap-engine/expungement-ai-adapter.ts');
const {getProfileByJurisdiction} = await import('../src/lib/rcap-engine/profile-registry.ts');
const {convictionReliefQuestions} = await import('../src/lib/rcap-engine/conviction-relief-request.ts');
const profile = getProfileByJurisdiction('CO');
const nonconviction = 'petition-based-non-conviction-sealing-jdf-417-24-72-704';
const conviction = 'petition-based-conviction-sealing-jdf-612-24-72-706';
const fixture = JSON.parse(fs.readFileSync(new URL('../data/rcap-ledger/public-witness-fixtures.json', import.meta.url)))
  .fixtures.find(item => item.jurisdiction === 'CO' && item.pathwayId === conviction);
const baseline = JSON.parse(fs.readFileSync(new URL('./fixtures/co-jdf417-nonconviction-baseline.json', import.meta.url)));
const cases = [];
for (const outcome of ['Misdemeanor conviction', 'Felony conviction', 'Other conviction or adjudication', 'Pardoned conviction'])
  for (const hint of [null, nonconviction, conviction]) cases.push({outcome, hint, adult: true});
for (const outcome of ['Arrest or citation with no charge filed', 'Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Acquitted or found not guilty'])
  for (const hint of [null, nonconviction]) cases.push({outcome, hint, adult: false});
const results = [];
assert.deepEqual(convictionReliefQuestions('CO'), [], 'routing boundary must not introduce a CO remedy election');
for (const item of cases) {
  const answers = structuredClone({...fixture.answers, case_outcome: item.outcome});
  if (item.outcome === 'Felony conviction') answers.offense_level = 'Felony';
  if (['Other conviction or adjudication', 'Pardoned conviction'].includes(item.outcome)) answers.offense_level = 'I am not sure';
  if (item.hint) answers.possible_pathway_context = profile.pathways.find(pathway => pathway.id === item.hint).label;
  else delete answers.possible_pathway_context;
  const before = structuredClone(answers);
  const result = evaluateExpungementAiMatter({jurisdiction: 'CO', profileVersion: fixture.profileVersion,
    matterId: 'synthetic-co-outcome-boundary', answers});
  assert.deepEqual(answers, before, 'saved answers must remain exact');
  if (item.adult) {
    assert.notEqual(result.pathwayId, nonconviction, `${item.outcome}/${item.hint}: a conviction cannot select JDF417`);
    assert.equal(result.paymentAllowed, false);
    assert.equal(result.resultCode, 'needs_review');
    if (item.hint !== nonconviction) assert.equal(result.pathwayId, conviction);
  } else {
    // Exact parent result continuity, not a new legal or commercial approval.
    assert.deepEqual(result, baseline.result, `${item.outcome}/${item.hint}: existing nonconviction result changed`);
  }
  results.push({outcome: item.outcome, hint: item.hint, resultCode: result.resultCode,
    pathwayId: result.pathwayId, paymentAllowed: result.paymentAllowed});
}
console.log(JSON.stringify({status: 'PASS', cases: results.length, adultConvictionsHeld: 12,
  nonconvictionResultsUnchanged: 6, savedAnswersPreserved: 18, results}, null, 2));
