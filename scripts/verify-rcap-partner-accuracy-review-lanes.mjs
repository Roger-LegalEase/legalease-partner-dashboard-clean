import fs from "node:fs";
import path from "node:path";

// Proves the partner flow shows an accuracy-review step before the result and
// that the result uses the four partner lane labels, while DTC behavior (last
// question -> evaluate; $50 packet gate) is preserved.

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const flow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const result = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
const localization = read("src/lib/expungement-ai/localization.ts");

// 1. Accuracy review is a real phase, partner-only, before evaluation.
assert(/type Phase =[^\n]*"review"/.test(flow), "ScreeningFlow must add a 'review' phase.");
assert(
  flow.includes("} else if (isPartnerSession) {") && flow.includes('setPhase("review");'),
  "The last question in partner mode must go to the review step."
);
// DTC path is unchanged: last question still runs evaluation directly.
assert(
  /} else if \(isPartnerSession\) \{\s*\/\/[^\n]*\s*setPhase\("review"\);\s*} else \{\s*void runEvaluation\(\);/.test(flow),
  "DTC last question must still call runEvaluation directly (accuracy review is partner-only)."
);

// 2. Review renders the required heading, summary, and CTAs, and confirm runs the evaluation.
assert(flow.includes('if (phase === "review")'), "ScreeningFlow must render a review block.");
assert(flow.includes('translate("review.title", "Let\'s make sure we have this right.")'), "Review must show the accuracy-review heading.");
assert(flow.includes('translate("review.confirm", "Yes, this looks right.")'), "Review must show the 'Yes, this looks right.' confirm CTA.");
assert(flow.includes('translate("review.edit", "Edit my answers")'), "Review must offer an 'Edit my answers' secondary CTA.");
const reviewBlock = flow.slice(flow.indexOf('if (phase === "review")'), flow.indexOf('if (phase === "result"'));
assert(reviewBlock.includes("void runEvaluation()"), "The review confirm CTA must run the evaluation.");
assert(reviewBlock.includes("goToQuestions("), "The review must allow editing answers.");

// 3. Result uses the four partner lanes; DTC $50 is preserved.
for (const [key, label] of [
  ["result.lane_packet_builder", "Continue to packet builder"],
  ["result.lane_more_info", "Continue to my Briefcase"],
  ["result.lane_next_steps", "View my next steps"],
  ["result.lane_briefcase", "View my Briefcase"]
]) {
  assert(result.includes(`"${key}"`) && result.includes(`"${label}"`), `Result must define partner lane ${key} => ${label}.`);
  assert(localization.includes(`"${key}"`), `localization.ts must define ${key} (EN + ES).`);
}
assert(result.includes("PARTNER_RESULT_LANES[evaluation.resultCode]"), "Partner CTA must pick its lane by result code.");
assert(result.includes('translate("payment.generate_packet", "Generate my packet - $50")'), "DTC $50 packet CTA must be preserved.");

// 4. Bilingual: every new review/lane key has a Spanish value.
for (const key of [
  "result.lane_packet_builder", "result.lane_more_info", "result.lane_next_steps", "result.lane_briefcase",
  "review.title", "review.subtitle", "review.confirm", "review.edit", "review.not_sure", "review.not_answered"
]) {
  const entry = new RegExp(`"${key.replace(/[.]/g, "\\.")}": \\{ en: "[^"]+", es: "[^"]+" \\}`);
  assert(entry.test(localization), `${key} must have both English and Spanish values.`);
}

if (failures.length > 0) {
  console.error("RCAP partner accuracy-review / result-lanes verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner accuracy-review / result-lanes verifier passed.");
console.log("Partner mode shows 'Let's make sure we have this right' before the result and uses the four lane labels; DTC keeps last-question->evaluate and the $50 gate.");
