import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-20';
const {evaluateExpungementAiMatter} = await import('../src/lib/rcap-engine/expungement-ai-adapter.ts');
const {resolveRuntimeText} = await import('../src/lib/expungement-ai/localization.ts');
const {getProfileByJurisdiction} = await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile} = await import('../src/lib/rcap-engine/public-profile-projection.ts');
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
const profile = getProfileByJurisdiction('CO');
const questions = projectPublicProfile(profile).questions;
const convictionHint = profile.pathways.find(pathway => pathway.id === fixture.pathwayId).label;
const approvedCopy = JSON.parse(fs.readFileSync(new URL('../src/lib/expungement-ai/frontend/reviewed-result-display-copy.json', import.meta.url)))
  .entries.find(entry => entry.id === 'CO-SECTION8B-REVIEW-01');
// Acceptance's counterexample uses CO's actual public wires, not the synthetic
// Misdemeanor conviction value retained in the older controls below.
for (const outcome of ['Other conviction or adjudication', 'Felony conviction'])
  for (const level of ['Misdemeanor', 'Felony', 'Traffic or driving matter', 'I am not sure'])
    for (const category of ['Domestic violence', 'DUI/DWI or serious traffic', 'Other named excluded offense', 'I am not sure'])
      for (const hint of [undefined, convictionHint]) {
        for (const [id, value] of [['case_outcome', outcome], ['offense_level', level], ['state_exclusion_categories', category]])
          assert.ok(questions.find(question => question.id === id).options.includes(value), `${id}: not a public option`);
        const answers = structuredClone({...fixture.answers, case_outcome: outcome,
          offense_level: level, state_exclusion_categories: [category]});
        if (hint === undefined) delete answers.possible_pathway_context;
        else answers.possible_pathway_context = hint;
        const result = evaluate(answers);
        const scopedReview = outcome === 'Other conviction or adjudication'
          && (level === 'Misdemeanor' || level === 'Traffic or driving matter' && category === 'DUI/DWI or serious traffic');
        const uncertain = category === 'I am not sure';
        assert.equal(result.resultCode, scopedReview || uncertain ? 'needs_review' : 'likely_not_eligible',
          `${outcome}/${level}/${category}/${hint}`);
        assert.equal(result.paymentAllowed, false);
        assert.equal(result.reasons[0].code, uncertain ? 'co.state_exclusion_unknown'
          : scopedReview ? 'co.state_exclusion_scope_unknown' : 'co.state_exclusion_selected');
        if (scopedReview && !uncertain) {
          assert.equal(result.reasons[0].text, approvedCopy.en);
          assert.equal(resolveRuntimeText('es', result.reasons[0].text), approvedCopy.es);
        }
      }
for (const category of ['Domestic violence', 'Other named excluded offense']) {
  const result = evaluate({...fixture.answers, case_outcome: 'Other conviction or adjudication',
    offense_level: 'Traffic or driving matter', state_exclusion_categories: ['DUI/DWI or serious traffic', category]});
  assert.equal(result.resultCode, 'likely_not_eligible', 'the Traffic-only grant does not broaden other selected categories');
  assert.equal(result.paymentAllowed, false);
}
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
      assert.match(result.reasons[0].text, /does not consent.*clear and convincing evidence/);
      assert.equal(resolveRuntimeText('en', result.reasons[0].text), result.reasons[0].text);
      assert.equal(resolveRuntimeText('es', result.reasons[0].text), 'Esta categoría por sí sola no determina si se pueden sellar los registros de su condena por un delito menor. La sección 8(b) del formulario JDF 612 contempla el consentimiento del fiscal de distrito o una audiencia y, si el fiscal de distrito no da su consentimiento, exige que usted demuestre ciertos requisitos con pruebas claras y convincentes. Revise la condena y ese procedimiento antes de continuar; esto no significa que se haya determinado que usted cumple los requisitos.');
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
assert.equal(cases, 82);
console.log('PASS CO section 8(b): 82 cases, including 66 real-public-option and mixed-category controls; saved answers preserved');
