import fs from "node:fs";
import path from "node:path";

// Proves the partner result uses the four clean lane labels by result code, that
// every lane routes forward without a price, and that DTC keeps the $50 gate.
// (The accuracy-review step is intentionally NOT added to the shared screening
// flow — the frozen-flow guard verify-expungement-dtc-flow-unchanged requires the
// shared ScreeningFlow to stay free of partner-only phases; a review step needs an
// isolated partner flow, tracked separately.)

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const result = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
const localization = read("src/lib/expungement-ai/localization.ts");

// 1. The four lanes are defined by result code with the required labels.
for (const [key, label] of [
  ["result.lane_packet_builder", "Continue to packet builder"],
  ["result.lane_more_info", "Continue to my Briefcase"],
  ["result.lane_next_steps", "View my next steps"],
  ["result.lane_briefcase", "View my Briefcase"]
]) {
  assert(result.includes(`"${key}"`) && result.includes(`"${label}"`), `Result must define partner lane ${key} => ${label}.`);
  const entry = new RegExp(`"${key.replace(/[.]/g, "\\.")}": \\{ en: "[^"]+", es: "[^"]+" \\}`);
  assert(entry.test(localization), `${key} must have both English and Spanish values.`);
}
assert(result.includes("PARTNER_RESULT_LANES[evaluation.resultCode]"), "Partner CTA must pick its lane by result code.");

// 2. Every result code maps to a lane (no dead-end).
const laneBlock = result.slice(result.indexOf("const PARTNER_RESULT_LANES"), result.indexOf("const TONE_ACCENT"));
for (const code of [
  "packet_ready", "packet_ready_with_caution", "needs_more_info", "needs_review",
  "guidance_only", "not_covered_yet", "not_yet", "likely_not_eligible", "hard_stop"
]) {
  assert(new RegExp(`\\b${code}:`).test(laneBlock), `PARTNER_RESULT_LANES must map result code ${code}.`);
}

// 3. Partner CTA branch never renders a price; DTC $50 stays behind showPacketAction.
const partnerCtaBranch = result.slice(
  result.indexOf("{hasScreeningSession ? ("),
  result.indexOf(") : showPacketAction ? (")
);
assert(partnerCtaBranch.length > 0 && !partnerCtaBranch.includes("$50"), "Partner CTA branch must never render the $50 label.");
assert(result.includes('translate("payment.generate_packet", "Generate my packet - $50")'), "DTC $50 packet CTA must be preserved.");

if (failures.length > 0) {
  console.error("RCAP partner result-lanes verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner result-lanes verifier passed.");
console.log("Partner results use the four lane labels (no dead-ends, no price); DTC keeps the $50 gate.");
