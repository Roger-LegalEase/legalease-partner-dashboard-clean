import assert from 'node:assert/strict';
import { register, createRequire } from 'node:module';
register('./lib/question-capability-loader.mjs', import.meta.url);
const { nyCasePreparationQuestions, NY_COURT_DIRECTION_CASES_ID: id } = await import('../src/lib/expungement-ai/ny-16059-case-questions.ts');
const { NY_CASE_RECORDS_ID } = await import('../src/lib/expungement-ai/ny-16059-case-records.ts');
const { profileQuestionSchema } = await import('../src/lib/expungement-ai/frontend/schemas.ts');
const { questionAnswerState } = await import('../src/lib/expungement-ai/question-answer-state.ts');
const { blocksContinue } = await import('../src/components/expungement-ai/screening/answers.ts');
const { missingRequiredInputs } = await import('../src/lib/expungement-ai/packet-information.ts');
const { QuestionField } = await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const { caNyQuestionCapabilityScenarios, caNyQuestionPrerequisiteWitness } = await import('./lib/ca-ny-question-capability-witnesses.mjs');
const require = createRequire(import.meta.url), { createElement } = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const field = raw => nyCasePreparationQuestions({ [NY_CASE_RECORDS_ID]: raw }).find(q => q.id === id);
const render = (question, value, state = 'NY') => renderToStaticMarkup(createElement(QuestionField, { question, stateCode: state, value, error: 'Synthetic unresolved-case notice', onChange() { throw new Error('Rendering must not fabricate an answer'); } }));
const waiting = 'First add the court cases';
let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS ' + name); }
for (const raw of [undefined, null, '', []]) check('Actual unanswered case records show prerequisites ' + JSON.stringify(raw), () => {
  const q = field(raw), html = render(q);
  assert.equal(q.awaitingNyCaseRecords, true); assert(profileQuestionSchema.safeParse(q).success);
  assert(html.includes(waiting)); assert(html.includes('Synthetic unresolved-case notice'));
  assert(!html.includes('We could not show this required question'));
  assert(!/<(?:input|textarea|select)\b/.test(html));
  assert.equal(q.required, true); assert.equal(q.contextOnly, false);
  assert.notEqual(questionAnswerState(q, undefined), 'known_valid'); assert(blocksContinue(q, undefined));
  assert(missingRequiredInputs([id], {}, {}, new Map([[id, q]])).includes(id));
});
for (const raw of [['{}'], {}, { unknown: true, value: [] }, ['malformed'], [null]]) check('Malformed source is not a waiting state ' + JSON.stringify(raw), () => {
  const q = field(raw), html = render(q);
  assert.equal(q.awaitingNyCaseRecords, undefined);
  assert(!html.includes(waiting)); assert(html.includes('We could not show this required question'));
});
const scenario = caNyQuestionCapabilityScenarios().find(row => row.id === id), active = scenario.question;
check('Actual entered cases render existing choices and remain answerable', () => {
  assert.equal(active.awaitingNyCaseRecords, undefined);
  assert.equal(questionAnswerState(active, scenario.valid), 'known_valid');
  assert(render(active, scenario.valid).includes('type="checkbox"'));
  assert(!render(active, scenario.valid).includes(waiting));
});
const blank = field(undefined);
for (const value of [['case:earlier'], 'case:earlier', { unknown: true, value: ['case:earlier'] }]) check('Retained stale selections preserve recovery ' + JSON.stringify(value), () => {
  const html = render(blank, value); assert(!html.includes(waiting)); assert(html.includes('We could not show this required question'));
  assert.notEqual(questionAnswerState(blank, value), 'known_valid');
});
for (const mutation of [{ id: id + '-suffix' }, { type: 'single_choice' }, { answerContract: 'ny_16059_case_records_v2' }, { options: null }, { optionDisplay: undefined }, { optionDisplay: null }, { optionDisplay: { 'case:old': { label: 'Earlier case' } } }]) check('Scoped metadata rejects malformed or unrelated display ' + JSON.stringify(mutation), () => {
  const q = { ...blank, ...mutation }; assert(!profileQuestionSchema.safeParse(q).success);
  assert(!render(q).includes(waiting));
});
check('Another jurisdiction cannot use the NY waiting display', () => assert(!render(blank, undefined, 'CA').includes(waiting)));
for (const options of [[], null, [active.options[0], {}], [active.options[0], active.options[0]]]) check('Corrupted active options are not a prerequisite descriptor ' + JSON.stringify(options), () => {
  const q = { ...active, options };
  assert.equal(caNyQuestionPrerequisiteWitness('NY', q), null);
  assert(!render(q).includes(waiting)); assert(blocksContinue(q, undefined));
});
for (const row of caNyQuestionCapabilityScenarios().filter(row => row.state === 'NY' && row.question.type === 'single_choice')) {
  for (const options of [[], null, [row.question.options[0], {}], [row.question.options[0], row.question.options[0]]]) check(row.id + ' malformed/duplicate radios recover ' + JSON.stringify(options), () => {
    const q = { ...row.question, options }, html = render(q);
    assert(html.includes('We could not show this required question')); assert(!html.includes('type="radio"'));
    assert.equal(caNyQuestionPrerequisiteWitness('NY', q), null);
    assert(blocksContinue(q, undefined));
  });
}
console.log(`${checks}/${checks} NY dependency display controls passed; source/UI definition evidence only, no applicant eligibility or delivery claim.`);
