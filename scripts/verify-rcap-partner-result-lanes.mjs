import fs from "node:fs";
import path from "node:path";

// Proves the partner result uses the four clean lane labels by result code, that
// every lane routes forward without a price, and that DTC keeps the approved
// save-before-payment disclosure without leaking it into the RCAP branch.
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
const packetGenerationRoute = read("src/app/api/expungement-ai/packet/generate/route.ts");

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

// 3. Partner CTA branch never renders a price; DTC retains its matter-level
// price disclosure and saves the result before the later review pay gate.
const partnerBranchStart = result.indexOf("{hasScreeningSession ? (");
const partnerBranchEnd = result.indexOf(") : (", partnerBranchStart);
const partnerCtaBranch = result.slice(partnerBranchStart, partnerBranchEnd);
assert(partnerBranchStart >= 0 && partnerBranchEnd > partnerBranchStart, "Partner CTA branch must be structurally identifiable.");
assert(!/\$50|stripe|checkout/i.test(partnerCtaBranch), "Partner CTA branch must never render $50, Stripe, or Checkout copy.");
assert(result.includes('fallback: "Save this matter and continue"'), "DTC result must save the exact matter before the later review pay gate.");
assert(result.includes("$50 one time when you are ready to generate this packet"), "DTC packet-ready result must retain the approved $50 disclosure.");

// 4. A sponsored packet failure must stay in the partner vocabulary. The same
// endpoint still preserves its consumer payment-required and post-payment copy
// for DTC matters, but neither message may be returned for a verified sponsor.
assert(
  packetGenerationRoute.includes("return packetErrorResponse(error, isPartnerSponsored);"),
  "Packet generation errors must retain the server-authoritative sponsored classification."
);
assert(
  packetGenerationRoute.includes("Partner packet coverage could not be confirmed for this matter."),
  "A sponsored entitlement failure must use partner-coverage copy instead of payment copy."
);
assert(
  packetGenerationRoute.includes("We could not prepare your partner-covered packet right now. Try again or contact support."),
  "A sponsored render failure must use partner-covered copy instead of confirmed-payment copy."
);
assert(
  packetGenerationRoute.includes("Payment confirmation is required before packet generation.") &&
    packetGenerationRoute.includes("We couldn’t finish preparing your packet. You haven’t been charged again, and your information is still saved. Try again or contact support."),
  "DTC packet error recovery copy must remain intact."
);

if (failures.length > 0) {
  console.error("RCAP partner result-lanes verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner result-lanes verifier passed.");
console.log("Partner results use four no-price lanes; DTC keeps save-before-payment and its $50 disclosure.");
