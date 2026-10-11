import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { questionAnswerState, toggleMultiSelect, normalizeQuestionChoices, answerValueIsKnown } = await import("../src/lib/expungement-ai/question-answer-state.ts");
const { hasAnswer, blocksContinue, readOrUnknown, toScreeningAnswers } = await import("../src/components/expungement-ai/screening/answers.ts");
const { QuestionField } = await import("../src/components/expungement-ai/screening/QuestionField.tsx");
const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { requiredMissingPublicQuestionIds } = await import("../src/lib/rcap-engine/answer-normalization.ts");
const { missingRequiredInputs } = await import("../src/lib/expungement-ai/packet-information.ts");
const { southDakotaEscalationStageReached, southDakotaRemedyStillNeeded } = await import("../src/lib/rcap-engine/south-dakota-23a-27-17-escalation.ts");

const q = (id, type, options = null) => ({ id, type, options, prompt: id, stage: "packet_information", required: true, contextOnly: false });
const dob = q("date_of_birth", "date");
assert.equal(blocksContinue(dob, undefined), true, "required date cannot silently pass an unsupported control");
for (const value of ["2001-02-29", "2000-02-30", "2020-13-01", "2020-01-32", "03/04/05", "2001-02-", "-02-03", "0000-01-01", "2026-10-12"]) {
  assert.equal(questionAnswerState(dob, value, "2026-10-11"), "invalid", `invalid or ambiguous date ${value}`);
}
for (const value of ["2000-02-29", "1900-02-28", "1890-12-31", "2026-10-11"]) assert.equal(questionAnswerState(dob, value, "2026-10-11"), "known_valid");
assert.equal(hasAnswer(q("future_required", "unsupported"), "anything"), false);
assert.equal(blocksContinue({ ...q("optional", "unsupported"), required: false }, undefined), false);
assert.equal(blocksContinue({ ...dob, contextOnly: true }, undefined), false);

assert.deepEqual(readOrUnknown("2001-02-03"), { value: "2001-02-03", unknown: false });
assert.deepEqual(readOrUnknown(0), { value: "0", unknown: false });
assert.deepEqual(readOrUnknown({ value: 0 }), { value: "0", unknown: false });
assert.deepEqual(readOrUnknown({ unexpected: "not an answer" }), { value: undefined, unknown: false });
assert.deepEqual(toScreeningAnswers({ birth: readOrUnknown("2001-02-03"), count: readOrUnknown(0) }), { birth: "2001-02-03", count: "0" });
assert.equal(questionAnswerState(q("count", "number_or_range"), 0), "known_valid");
assert.equal(questionAnswerState(q("explanation", "text"), "I was unsure which office held the record."), "known_valid");
for (const value of ["Unsure", "I am not sure", "unknown", "Prefer not to say", { unknown: true }]) {
  assert.equal(answerValueIsKnown(value), false);
  assert.deepEqual(missingRequiredInputs(["actual_arrest"], {}, { actual_arrest: value }), ["actual_arrest"]);
}
assert.equal(answerValueIsKnown("No"), true);
assert.equal(answerValueIsKnown(0), true);
assert.equal(questionAnswerState(q("actual_arrest", "single_choice", ["Yes", "No", "Unsure"]), "Unsure"), "uncertain");
assert.equal(hasAnswer(q("actual_arrest", "single_choice", ["Yes", "No", "Unsure"]), "Unsure"), true, "uncertainty permits navigation without creating knowledge");

let exclusionStates = 0;
for (const profile of getAllJurisdictionProfiles()) {
  const projected = projectPublicProfile(profile);
  const question = projected.questions.find((entry) => entry.id === "state_exclusion_categories");
  if (!question) continue;
  exclusionStates++;
  assert.deepEqual(question.exclusiveOptions, ["None of these", "I am not sure"]);
  const substantive = question.options.find((option) => !question.exclusiveOptions.includes(option));
  assert.deepEqual(toggleMultiSelect([substantive], "None of these", question.exclusiveOptions), ["None of these"]);
  assert.deepEqual(toggleMultiSelect(["None of these"], substantive, question.exclusiveOptions), [substantive]);
  assert.equal(questionAnswerState(question, [substantive, "None of these"]), "invalid");
  const required = { ...projected, questions: [{ ...question, required: true, lifecyclePhase: "prepay_required" }] };
  assert.ok(requiredMissingPublicQuestionIds(required, { state_exclusion_categories: [substantive, "None of these"] }).includes("state_exclusion_categories"), "server must not accept contradictory values");
}
assert.equal(exclusionStates, 21, "all current exclusion-definition jurisdictions are exercised");

const sd = projectPublicProfile(getProfileByJurisdiction("SD"));
const sdQuestions = [...sd.questions, ...Object.values(sd.postPaymentPacketCompletion ?? {}).flat()];
const stage = sdQuestions.find((question) => question.id === "sd_sis_record_correction_stage");
assert.deepEqual(stage.options, ["request_not_yet_made", "request_made_record_corrected", "request_made_record_not_corrected"]);
for (const [value, escalation, remedy] of [["request_not_yet_made", false, true], ["request_made_record_corrected", false, false], ["request_made_record_not_corrected", true, true]]) {
  assert.ok(stage.optionDisplay[value].label);
  assert.ok(stage.optionDisplay[value].translations.es.label);
  assert.equal(questionAnswerState(stage, value), "known_valid");
  assert.equal(southDakotaEscalationStageReached({ [stage.id]: value }), escalation);
  assert.equal(southDakotaRemedyStillNeeded({ [stage.id]: value }), remedy);
}
assert.equal(normalizeQuestionChoices([{ value: "x" }]).options, null, "malformed choices are not guessed");
assert.equal(normalizeQuestionChoices(["x", "x"]).options, null);

const html = renderToStaticMarkup(createElement(QuestionField, { question: dob, stateCode: "MO", value: "2000-02-29", onChange() {}, headingLevel: 3 }));
assert.match(html, /<select/);
assert.match(html, /value="2000"/);
assert.doesNotMatch(html, /reviewer will follow up|could not show/i);
const malformed = renderToStaticMarkup(createElement(QuestionField, { question: q("broken", "unsupported"), stateCode: "MO", onChange() {}, headingLevel: 3 }));
assert.match(malformed, /<h3/);
assert.doesNotMatch(malformed, /<h1|reviewer will follow up|You can continue/);
console.log(`PASS: calendar/legacy/uncertainty/required-control regressions; ${exclusionStates} exclusion jurisdictions; all three SD wire values; actual React render. Protected/browser acceptance is separate.`);
