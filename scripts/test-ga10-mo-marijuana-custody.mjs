// Original GA10 Q-0e8995bbf2169178cd18. Staged source/factual helper only;
// current evaluator and protected owners are intentionally NOT claimed fixed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { MO_MARIJUANA_STATUS_ROUTE: route, MO_MARIJUANA_CUSTODY_FACT: fact, MO_MARIJUANA_STATUS_QUESTIONS: questions,
  isMissouriMarijuanaStatusContract: contract, missouriMarijuanaCustodyContext: context,
  missouriMarijuanaStatusQuestionApplies: applies } = await import('../src/lib/rcap-engine/missouri-marijuana-status-facts.ts');
const profile = getProfileByJurisdiction('MO');
const inventory = JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json'));
assert(inventory.originalMissingWitnesses.some(row => row.questionRecordId === 'Q-0e8995bbf2169178cd18' && row.routeKey === 'MO:' + route));
const memo = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MO.memo.json')).tracks.find(t => t.trackId === 'mo-art-xiv-marijuana');
assert(memo.controllingAuthority.citations.includes('Mo. Const. art. XIV, § 2'));
assert.equal(memo.outputStrategy, 'composed');
assert(memo.participantInputs.find(q => q.key === 'custodyPosture').question.includes('three situations'));
for (const key of ['weight', 'offenseGrade', 'exclusionScreen', 'alreadyExpunged', 'currentLawEquivalent']) assert(memo.participantInputs.some(q => q.key === key));
assert(!memo.participantInputs.some(q => /financial|fine|restitution/i.test(q.key)));
assert(memo.legalDesignDecision.limitations.some(x => x.statement.includes('Mandatory attorney handoff') && x.statement.includes('under supervision')));
assert(memo.legalDesignDecision.limitations.some(x => x.statement.includes('must not represent that relief already occurred')));
assert(memo.legalDesignDecision.limitations.some(x => x.statement.includes('never asserted by LegalEase')));
assert(contract(profile, route));

const cases = [
  ['incarcerated', 'incarcerated_attorney_handoff', true],
  ['probation_or_parole', 'supervision_attorney_handoff', false],
  ['incarceration_and_supervision_complete', 'completed_status_check', false],
  ['unknown', 'unknown', true], [undefined, 'unknown', true], ['', 'unknown', true],
  ['Yes', 'unknown', true], ['No', 'unknown', true],
  [{ value: 'incarceration_and_supervision_complete', unknown: false }, 'unknown', true],
  [['incarceration_and_supervision_complete'], 'unknown', true]
];
for (const [value, expected, financialApplies] of cases) {
  for (const financial of ['Yes', 'No', 'I am not sure', undefined]) {
    // Unrelated legacy/raw facts remain exactly supplied; none becomes a
    // quantity, exclusion, custody, eligibility or completed-relief answer.
    const answers = { sentence_completion_date: 'Yes', possible_pathway_context: profile.pathways.find(p => p.id === route).label,
      financial_obligations: financial, [fact]: value, charge: { value: '', unknown: true },
      state_exclusion_categories: ['I am not sure'], record_documents: 'I am not sure',
      historicalCustodyProse: 'Finished a case long ago; details not confirmed' };
    if (value === undefined) delete answers[fact];
    if (financial === undefined) delete answers.financial_obligations;
    const before = structuredClone(answers);
    assert.equal(context(profile, route, answers), expected);
    assert.equal(applies('MO', route, answers, 'financial_obligations', profile), financialApplies);
    for (const id of [fact, 'charge', 'state_exclusion_categories', 'record_documents', 'sentence_completion_date', 'offense_level']) {
      assert.equal(applies('MO', route, answers, id, profile), true);
    }
    assert.deepEqual(answers, before);
  }
}
const completed = { [fact]: 'incarceration_and_supervision_complete' };
for (const state of ['KS', 'LA', 'ME', 'NE', 'GA']) assert(applies(state, route, completed, 'financial_obligations', profile));
assert(applies('MO', route, completed, 'financial_obligations'));
for (const other of profile.pathways.filter(p => p.id !== route)) {
  assert.equal(context(profile, other.id, completed), 'not_applicable');
  assert(applies('MO', other.id, completed, 'financial_obligations', profile));
}
for (const path of [null, undefined, 'incarcerated-marijuana-petition']) assert(applies('MO', path, completed, 'financial_obligations', profile));
const guards = [
  ['jurisdiction', p => p.jurisdiction.code = 'GA'], ['version', p => p.profileVersion = 'changed'],
  ['source', p => p.source.sourceCorpusSha256 = 'changed'],
  ...Object.entries({ decisionId: 'changed', ruleId: 'changed', stage: 'petition', outcomeMode: 'packet_assembly', paymentAuthority: 'open' })
    .map(([key, value]) => [key, p => p.pathways.find(v => v.id === route).legalAuthority[key] = value]),
  ['filing', p => p.pathways.find(v => v.id === route).filingRequired = true],
  ['route type', p => p.pathways.find(v => v.id === route).routeType = 'court_filing'],
  ['mode', p => p.packetGenerator.pathways.find(v => v.pathwayId === route).mode = 'court_packet'],
  ['mapping', p => p.packetGenerator.pathways.find(v => v.pathwayId === route).formMappingStatus = 'source_candidate_identified'],
  ['source refs', p => p.packetGenerator.pathways.find(v => v.pathwayId === route).sourceRuleRefs.push('other')],
  ['petition form', p => p.packetGenerator.pathways.find(v => v.pathwayId === route).formCandidates.push({ relativePath: 'CR375.pdf', sha256: 'other' })]
];
for (const [name, mutate] of guards) {
  const altered = structuredClone(profile); mutate(altered);
  assert.equal(contract(altered, route), false, name);
  assert.equal(context(altered, route, completed), 'not_applicable', name);
  assert.equal(applies('MO', route, completed, 'financial_obligations', altered), true, name);
}
assert.equal(questions.length, 1); const question = questions[0];
assert.equal(question.id, fact); assert.equal(question.doesNotSelectPathway, true);
assert.deepEqual(question.options, ['incarcerated', 'probation_or_parole', 'incarceration_and_supervision_complete', 'unknown']);
for (const value of question.options) assert(question.optionDisplay[value].label && question.optionDisplay[value].translations.es.label);
assert(question.prompt.includes('for this') || question.prompt.includes('For this'));
assert(question.helperText.includes('does not establish eligibility'));
assert(question.translations.es.helperText.includes('no establece'));
console.log(JSON.stringify({ status: 'PASS_STAGED_MO_ARTICLE_XIV_CUSTODY_HELPER', source: 'LD-MO-03;MO.memo:mo-art-xiv-marijuana;Mo.Const.art.XIV,2(7)-(8)', custodyCases: cases.length,
  sourceGuards: guards.length, notClaimed: ['Consumer integration', 'Authenticated acceptance', 'Legal eligibility', 'Completed relief', 'Qualified Spanish acceptance'],
  remains: ['Public and protected factual collection', 'Current custody and source-fact routing', 'Historical answer recovery', 'Independent consumer and owner acceptance'] }));
