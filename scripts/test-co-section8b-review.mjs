import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-20';
const {evaluateExpungementAiMatter} = await import('../src/lib/rcap-engine/expungement-ai-adapter.ts');
const fixture = JSON.parse(fs.readFileSync(new URL('../data/rcap-ledger/public-witness-fixtures.json', import.meta.url), 'utf8'))
  .fixtures.find(row => row.jurisdiction === 'CO' && row.pathwayId === 'petition-based-conviction-sealing-jdf-612-24-72-706');
assert.ok(fixture);
let cases = 0;
const evaluate = answers => {
  const saved = structuredClone(answers);
  const result = evaluateExpungementAiMatter({jurisdiction: 'CO', profileVersion: fixture.profileVersion,
    matterId: 'synthetic-co-section8b-review', answers});
  assert.deepEqual(answers, saved, 'evaluating must preserve saved answers');
  cases++;
  return result;
};
for (const hint of [undefined, fixture.answers.possible_pathway_context, 'Juvenile expungement (§ 19-1-306)']) {
  for (const category of ['Other named excluded offense', 'Domestic violence', 'None of these', 'I am not sure']) {
    const answers = structuredClone({...fixture.answers, case_outcome: 'Misdemeanor conviction', state_exclusion_categories: [category]});
    if (hint === undefined) delete answers.possible_pathway_context;
    else answers.possible_pathway_context = hint;
    const result = evaluate(answers);
    if (category === 'Other named excluded offense' || category === 'Domestic violence') {
      assert.equal(result.resultCode, 'needs_review', `${category}: a misdemeanor category alone cannot erase section 8(b)`);
      assert.equal(result.paymentAllowed, false);
      assert.equal(result.reasons[0].code, 'co.state_exclusion_scope_unknown');
      assert.match(result.reasons[0].text, /Section 8\(b\).*consent.*hearing/);
      assert.match(result.reasons[0].text, /does not consent/);
    } else if (category === 'I am not sure') {
      assert.equal(result.resultCode, 'needs_review');
      assert.equal(result.paymentAllowed, false);
      assert.equal(result.reasons[0].code, 'co.state_exclusion_unknown');
    } else {
      // This control is not an eligibility witness: existing hint-free routing
      // selects JDF417 for this misdemeanor input and is separately reported.
      assert.ok(result.reasons.every(reason => !['co.state_exclusion_scope_unknown', 'co.state_exclusion_selected'].includes(reason.code)));
    }
  }
}
for (const outcome of ['Felony conviction', 'Juvenile adjudication or offense committed as a minor', 'Arrest or citation with no charge filed', 'I am not sure']) {
  const answers = structuredClone({...fixture.answers, case_outcome: outcome, state_exclusion_categories: ['Other named excluded offense']});
  delete answers.possible_pathway_context;
  const result = evaluate(answers);
  assert.equal(result.resultCode, 'likely_not_eligible', 'the misdemeanor change cannot alter another outcome');
  assert.equal(result.paymentAllowed, false);
  assert.equal(result.reasons[0].code, 'co.state_exclusion_selected');
}
assert.equal(cases, 16);
console.log('PASS CO section 8(b): 16 category, uncertainty, hint-independence and saved-answer cases');
