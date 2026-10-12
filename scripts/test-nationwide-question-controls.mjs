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
const packet = await import("../src/lib/expungement-ai/packet-information.ts");
const { missingRequiredInputs } = packet;
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const { buildMsNonConvictionVerification } = await import("./lib/rcap-ms-nonconviction-fixture.mjs");
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
// Old shapes remain untouched by viewing. Incompatible saved answers are explained,
// cannot satisfy a required fact, and are never stringified into participant inputs.
const legacyText = q("legacy_text", "text_or_unknown");
for (const value of [["old answer"], { value: { nested: "old answer" } }, JSON.parse('{"__proto__":{"value":"old answer"}}'), { value: "old answer", unknown: "false" }]) {
  const before = JSON.stringify(value);
  const markup = renderToStaticMarkup(createElement(QuestionField, { question: legacyText, stateCode: "MS", value, onChange() { assert.fail("viewing must not change an answer"); } }));
  assert.match(markup, /data-saved-answer-clarification/);
  assert.match(markup, /aria-describedby="q-legacy_text-saved-shape"/);
  assert.match(markup, /Viewing this page does not change that answer/);
  assert.doesNotMatch(markup, /\[object Object\]|__proto__|&quot;nested&quot;/);
  assert.equal(questionAnswerState(legacyText, value), "invalid");
  assert.deepEqual(missingRequiredInputs([legacyText.id], {}, { [legacyText.id]: value }, new Map([[legacyText.id, legacyText]])), [legacyText.id]);
  assert.equal(JSON.stringify(value), before);
}
for (const value of [undefined, null, "", {}, { unknown: false }, "old answer", 0, { value: 0 }, { unknown: true }, { value: "retained", unknown: true }]) {
  const markup = renderToStaticMarkup(createElement(QuestionField, { question: legacyText, stateCode: "MS", value, onChange() {} }));
  assert.doesNotMatch(markup, /data-saved-answer-clarification/);
}
const protectedNotice = { ...legacyText, savedAnswerNeedsClarification: true };
for (const value of [undefined, "new explicit answer", { value: "new explicit answer", unknown: false }]) {
  const markup = renderToStaticMarkup(createElement(QuestionField, { question: protectedNotice, stateCode: "MS", value, onChange() {} }));
  assert.match(markup, /data-saved-answer-clarification/);
  if (value !== undefined) assert.match(markup, /value="new explicit answer"/, "a protected notice must not blank the participant's new draft");
  assert.doesNotMatch(markup, /\[object Object\]/);
}
for (const value of [true, false]) {
  const markup = renderToStaticMarkup(createElement(QuestionField, { question: q("legacy_choice", "yes_no_unsure"), stateCode: "MS", value, onChange() {} }));
  assert.match(markup, new RegExp(`checked="" value="${value ? "Yes" : "No"}"`), "historically supported booleans display the accepted choice");
  assert.doesNotMatch(markup, /data-saved-answer-clarification/);
}
const unknownInDateOnly = { value: "2000-02-29", unknown: true };
const unknownDateMarkup = renderToStaticMarkup(createElement(QuestionField, { question: dob, stateCode: "MO", value: unknownInDateOnly, onChange() {} }));
assert.match(unknownDateMarkup, /data-saved-answer-clarification/);
assert.doesNotMatch(unknownDateMarkup, /\sdisabled(?:[=>\s])|choose the unsure option/);
assert.equal(questionAnswerState(dob, unknownInDateOnly), "invalid");
assert.deepEqual(unknownInDateOnly, { value: "2000-02-29", unknown: true });
assert.equal(questionAnswerState(q("explanation", "text"), "I was unsure which office held the record."), "known_valid");
const exactUncertaintyTokens = ["Unsure", "I am not sure", "I'm not sure", "I’m not sure", "unknown", "Prefer not to say"];
for (const value of [...exactUncertaintyTokens, { unknown: true }]) {
  assert.equal(answerValueIsKnown(value), false);
  assert.deepEqual(missingRequiredInputs(["actual_arrest"], {}, { actual_arrest: value }), ["actual_arrest"]);
}
for (const type of ["text", "textarea", "text_or_unknown"]) {
  const question = q("explanation", type);
  for (const value of exactUncertaintyTokens) {
    assert.equal(questionAnswerState(question, value), value === "Prefer not to say" ? "declined" : "uncertain");
    assert.equal(hasAnswer(question, value), true, "a recorded uncertain answer permits navigation");
    assert.deepEqual(missingRequiredInputs([question.id], {}, { [question.id]: value }, new Map([[question.id, question]])), [question.id]);
  }
  assert.equal(questionAnswerState(question, "I’m not sure which office held the record, but this is the address on it."), "known_valid", "ordinary prose is not an exact uncertainty token");
}
assert.equal(answerValueIsKnown("No"), true);
assert.equal(answerValueIsKnown(0), true);
assert.equal(questionAnswerState(q("actual_arrest", "single_choice", ["Yes", "No", "Unsure"]), "Unsure"), "uncertain");
assert.equal(hasAnswer(q("actual_arrest", "single_choice", ["Yes", "No", "Unsure"]), "Unsure"), true, "uncertainty permits navigation without creating knowledge");

// Exercise the verification boundary, not only the field classifier. All data
// stays in memory; this creates no account, payment, database row or document.
const fixture = buildMsNonConvictionVerification({
  ...packet,
  evaluateAuthoritativeScreeningResult,
  matterId: "synthetic-question-uncertainty-regression",
  capturedAt: "2026-10-11T12:00:00.000Z"
});
packet.requireCurrentPacketVerificationRecord(fixture.item, fixture.verification);
for (const id of ["participant_full_legal_name", "mailing_address", "residency_or_location"]) {
  for (const value of exactUncertaintyTokens) {
    const edited = packet.packetInformationPatch({ existingItem: fixture.item, answers: { [id]: value }, protectedVerification: fixture.verification });
    const savedRecord = edited.protectedTransition.nextVerification;
    const reopened = packet.protectedPacketInformationModelFor(savedRecord);
    assert.equal(reopened.initialAnswers[id], value, "save/reopen must preserve the exact supplied answer");
    assert.ok(reopened.missingInputIds.includes(id), `${id} remains unresolved for ${value}`);
    assert.equal(edited.readyToGenerate, false);
    assert.throws(() => packet.requireCurrentPacketVerificationRecord(fixture.item, savedRecord));
    const verify = packet.packetInformationPatch({ existingItem: fixture.item, answers: {}, verify: true, protectedVerification: savedRecord });
    assert.equal(verify.readyToGenerate, false);
    assert.notEqual(verify.protectedTransition.nextVerification.status, "verified", "final confirmation cannot turn uncertainty into a known fact");
    const repaired = packet.packetInformationPatch({ existingItem: fixture.item, answers: { [id]: fixture.answers[id] }, verify: true, protectedVerification: verify.protectedTransition.nextVerification });
    assert.equal(repaired.readyToGenerate, true, "supplying the known fact permits verification again");
    packet.requireCurrentPacketVerificationRecord(fixture.item, repaired.protectedTransition.nextVerification);
  }
}

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
