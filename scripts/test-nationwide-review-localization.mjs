import assert from "node:assert/strict";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { reviewAnswerPresentation, displayVerificationAnswer } = await import("../src/components/expungement-ai/verification-summary.ts");
const { EXPUNGEMENT_COPY, resolveRuntimeText } = await import("../src/lib/expungement-ai/localization.ts");
const question = { id: "synthetic_fact", type: "text", prompt: "Synthetic question", translations: { es: { prompt: "Pregunta sintética" } }, options: null };
const project = (value, q = question, label = q.prompt) => reviewAnswerPresentation({ id: q.id, label, value }, q, "MS");
for (const value of ["yes", "no", "gt_10_years", "Missing", "None", "Calle Peña\nInformación"]) {
  assert.equal(displayVerificationAnswer(value, question), value, "English free text is also verbatim");
}
for (const value of ["Missing", "None", "Yes", "No", "Packet facts", "Review and confirm", "Calle Peña\nInformación del caso", ["Yes", "None"], { value: "Yes", unknown: false }]) {
  assert.deepEqual(project(value), { labelEs: "Pregunta sintética" }, "free text/list must never enter runtime translation");
}
assert.equal(project(null).valueEs, "Falta");
assert.equal(project({ value: "retained uncertain draft", unknown: true }).valueEs, "No estoy seguro");
const choice = { ...question, type: "single_choice", options: ["Yes", "No", "not_sure"], optionDisplay: { not_sure: { label: "Not sure", translations: { es: { label: "No estoy seguro" } } } } };
assert.equal(project("Yes", choice).valueEs, "Sí");
assert.equal(project(true, choice).valueEs, "Sí");
assert.equal(displayVerificationAnswer(true, choice), "Yes");
assert.equal(displayVerificationAnswer("not_sure", choice), "Not sure");
assert.equal(project("not_sure", choice).valueEs, "No estoy seguro");
assert.equal(project("Not a canonical choice", choice).valueEs, undefined);
assert.equal(project(["Yes", "No"], { ...choice, type: "multi_select" }).valueEs, "Sí, No");
assert.equal(project([], { ...choice, type: "multi_select" }).valueEs, "Ninguno");
assert.deepEqual(project("Yes", choice, "Historical different meaning"), {}, "same ID alone must not localize another meaning");
const changedDate = { ...question, id: "disposition_date", prompt: "A different date meaning", translations: undefined };
assert.equal(project("2000-01-01", changedDate).labelEs, changedDate.prompt, "dictionary ID alone cannot translate a changed English prompt");
const sensitive = { ...question, id: "social_security_number" };
for (const value of ["900-12-3456", { value: "900-12-3456", unknown: false }, "invalid legacy identifier"]) {
  const result = project(value, sensitive);
  assert.ok(!JSON.stringify(result).includes("900-12-3456"));
  assert.ok(!JSON.stringify(result).includes("invalid legacy identifier"));
}
const reviewed = Object.entries(EXPUNGEMENT_COPY).filter(([key]) => key.startsWith("packet.review.RVC-"));
assert.equal(reviewed.length, 58);
for (const [, pair] of reviewed) {
  assert.equal(resolveRuntimeText("en", pair.en), pair.en);
  assert.equal(resolveRuntimeText("es", pair.en), pair.es);
}
console.log("PASS:58 exact review copy pairs, typed display states and source-bound choices; free text, historical label mismatches and masked identifiers preserve boundaries.");
