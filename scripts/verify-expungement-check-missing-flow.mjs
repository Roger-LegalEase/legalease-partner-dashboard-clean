import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

const checkPage = read("src/app/expungement-ai/check/page.tsx");
const checkFlow = read("src/components/expungement-ai/CheckFlow.tsx");
const missingFields = read("src/lib/expungement-ai/missing-fields.ts");
const resultPanel = read("src/components/expungement-ai/ResultPanel.tsx");
const screeningResult = read("src/components/expungement-ai/screening/ScreeningResult.tsx");

assertIncludes(checkPage, "CheckFlow", "check page");
assert(!checkPage.includes('action="/expungement-ai/results"'), "Check page must not post generic answers directly to final results.");
assert(!checkPage.includes('1 of 1'), "Check page must not hardcode 1 of 1 progress.");

for (const marker of [
  "loadJurisdictionProfile",
  "evaluateScreening",
  "result.data.missingQuestionIds.length > 0",
  "data-missing-detail-step=\"active\"",
  "questionForMissingField",
  "friendlyMissingFieldLabel",
  "Start with the basics",
  "If your state&apos;s engine needs more details"
]) {
  assertIncludes(checkFlow, marker, "check flow");
}

for (const marker of [
  "How old were you when the case happened?",
  "Was this connected to human trafficking survivor relief?",
  "Have you received a pardon for this case?"
]) {
  assertIncludes(missingFields, marker, "missing-field friendly labels");
}

assert(!resultPanel.includes("missingInfo.join"), "ResultPanel must not render raw missingInfo keys with join().");
assertIncludes(resultPanel, "friendlyMissingFieldLabel(fieldId)", "ResultPanel friendly missing labels");
assertIncludes(screeningResult, "friendlyMissingFieldLabel(questionId)", "ScreeningResult friendly missing labels");
assertIncludes(missingFields, "safeUserFacingEngineText", "engine text sanitizer");
assertIncludes(missingFields, "source_question_", "source-question sanitizer");
assertIncludes(resultPanel, "safeUserFacingEngineText", "ResultPanel engine text sanitizer");
assertIncludes(screeningResult, "safeUserFacingEngineText", "ScreeningResult engine text sanitizer");

assertIncludes(
  resultPanel,
  'result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution")',
  "legacy payment gate"
);
assertIncludes(screeningResult, "isPaymentAllowed(evaluation)", "profile payment gate");
assertIncludes(checkFlow, "phase === \"missing\"", "missing detail phase");
assertIncludes(checkFlow, "setPhase(missingIds.length > 0 ? \"missing\" : \"generic\")", "Add missing details return");

for (const rawKey of ["age_at_offense", "trafficking_status", "pardon_status"]) {
  assertIncludes(missingFields, `${rawKey}:`, "friendly label fallback map");
}

if (failures.length) {
  console.error("Expungement.ai check missing-flow verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai check missing-flow verifier passed.");
console.log("Generic check evaluates first, missing engine fields become friendly follow-up questions, raw key rendering is blocked, and payment gates remain clamped.");
