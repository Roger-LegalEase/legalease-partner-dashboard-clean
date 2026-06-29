// Regression: the RCAP screening evaluator must only treat *rendered public* questions as
// ambiguity sources. The full engine profile carries hidden internal `source_question_*`
// questions that the frontend never renders and never answers; previously `ambiguityReason()`
// scanned the full profile, so every completed screening for a state with hidden questions was
// forced into `needs_review / source_fact_unknown` before real eligibility logic could run.
//
// This test imports the real TypeScript evaluator (no re-implementation) via a small ESM loader.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening, InvalidAnswerError } = await import("../src/lib/rcap-engine/evaluator.ts");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

// Build a complete, internally-consistent set of answers for ONLY the public (rendered) questions,
// mirroring what the frontend submits. Hidden `source_question_*` questions are intentionally absent.
function completePublicAnswers(pub) {
  const answers = {};
  for (const question of pub.questions) {
    const id = question.id;
    if (id === "ownership_scope") { answers[id] = "Yes"; continue; }
    if (id === "jurisdiction_scope") { answers[id] = "State or local"; continue; }
    if (id === "case_outcome") { answers[id] = "Dismissed, no-billed, nolle prosequi, or not prosecuted"; continue; }
    if (id === "offense_level") { answers[id] = "Misdemeanor"; continue; }
    if (id === "possible_pathway_context") {
      answers[id] = (question.options || []).find((opt) => !/none of these|i am not sure/i.test(opt)) || "";
      continue;
    }
    if (id === "state_exclusion_categories") { answers[id] = ["None of these"]; continue; }
    if (id === "sentence_completion_date") { answers[id] = "Yes"; continue; }
    if (id === "disposition_date" || id === "arrest_date") { answers[id] = "2015-01-01"; continue; }
    if (question.type === "yes_no_unsure") { answers[id] = "No"; continue; }
    if (Array.isArray(question.options) && question.options.length) {
      answers[id] = question.options.find((opt) => !/i am not sure|unknown|prefer not|none of these/i.test(opt)) || question.options[0];
      continue;
    }
    answers[id] = id.includes("date") ? "2015-01-01" : "N/A";
  }
  return answers;
}

const hiddenQuestionStates = [];
for (const profile of getAllJurisdictionProfiles()) {
  if (profile.questions.some((question) => question.id.startsWith("source_question"))) {
    hiddenQuestionStates.push(profile.jurisdiction.code);
  }
}
assert(hiddenQuestionStates.includes("MS"), "Expected MS to carry hidden source_question_* fixtures for this regression.");

// 1) A completed public screening must NOT be forced into needs_review/source_fact_unknown just
//    because hidden internal source_question_* answers are missing. Checked across every state that
//    actually carries hidden questions (the population the bug affected), and MS specifically.
for (const code of hiddenQuestionStates) {
  const profile = getProfileByJurisdiction(code);
  const pub = projectPublicProfile(profile);
  const evaluation = evaluateScreening({ jurisdiction: code, profileVersion: profile.profileVersion, answers: completePublicAnswers(pub) });
  const sourceFactUnknown = evaluation.reasons.some((reason) => reason.code.endsWith("source_fact_unknown"));
  assert(!sourceFactUnknown, `${code}: completed public screening must not return source_fact_unknown from missing hidden questions (got ${evaluation.resultCode} / ${evaluation.reasons.map((r) => r.code).join("|")}).`);
}

// 2) An explicit "I am not sure" on a *rendered* public question must still surface
//    needs_review / source_fact_unknown.
for (const code of ["TX", "GA", "CA"]) {
  const profile = getProfileByJurisdiction(code);
  const pub = projectPublicProfile(profile);
  const target = pub.questions.find((question) =>
    question.type === "yes_no_unsure" && question.contextOnly !== true && question.stage !== "case_details" && question.stage !== "record_readiness");
  assert(Boolean(target), `${code}: expected a rendered yes_no_unsure legal question for the explicit-unknown case.`);
  if (!target) continue;
  const answers = completePublicAnswers(pub);
  answers[target.id] = "I am not sure";
  const evaluation = evaluateScreening({ jurisdiction: code, profileVersion: profile.profileVersion, answers });
  assert(evaluation.resultCode === "needs_review", `${code}: explicit "I am not sure" on ${target.id} must yield needs_review (got ${evaluation.resultCode}).`);
  assert(evaluation.reasons.some((reason) => reason.code.endsWith("source_fact_unknown")), `${code}: explicit "I am not sure" on ${target.id} must yield source_fact_unknown.`);
}

// 3) Invalid question-id validation must remain unchanged: an answer keyed to a non-existent
//    (or hidden, non-public) question id is rejected before evaluation.
{
  const profile = getProfileByJurisdiction("TX");
  const pub = projectPublicProfile(profile);
  let threw = false;
  try {
    evaluateScreening({
      jurisdiction: "TX",
      profileVersion: profile.profileVersion,
      answers: { ...completePublicAnswers(pub), source_question_not_a_real_public_id: "x" }
    });
  } catch (error) {
    threw = error instanceof InvalidAnswerError && error.invalidQuestionIds.includes("source_question_not_a_real_public_id");
  }
  assert(threw, "Answer with an unknown/hidden question id must throw InvalidAnswerError (validation unchanged).");
}

if (failures.length) {
  console.error(`verify-rcap-evaluator-public-ambiguity: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`verify-rcap-evaluator-public-ambiguity: OK (${hiddenQuestionStates.length} hidden-question states checked, explicit-unknown + invalid-id cases verified)`);
