// Regression: the screening result CTA must match the flow the user arrived through.
//
// - Direct-to-consumer (no ?session=): the result keeps the "$50" pay-and-generate CTA.
// - Partner/session mode (arrived via a partner intake with a valid ?session= UUID): the result
//   must NOT show "$50", must offer a Briefcase action instead, and must route to /briefcase —
//   never the DTC /expungement-ai/packet-ready page (which would dead-end at "Packet is not ready").
//
// Assertions 1-2 render the real ScreeningResult component; assertion 3 verifies the routing wiring
// in ScreeningFlow (which owns the router.push target).
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { ScreeningResult } = await import("../src/components/expungement-ai/screening/ScreeningResult.tsx");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const baseEvaluation = {
  jurisdiction: "MS",
  profileVersion: "test",
  matterId: "matter-test",
  pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
  resultCode: "packet_ready",
  userLabel: "A source-defined packet pathway may be available.",
  reasons: [],
  missingQuestionIds: [],
  cautions: [],
  nextSteps: [],
  paymentAllowed: true,
  packetPlan: {
    pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
    mode: "state_specific_custom_packet_from_source_rules",
    formMappingStatus: "custom_or_manual_mapping_required",
    sourceFormIds: [],
    requiredInputIds: ["arrest_date", "court"],
    sourceRuleRefs: ["pathways:15-155"]
  }
};

function renderResult(hasScreeningSession) {
  return renderToStaticMarkup(
    React.createElement(ScreeningResult, {
      evaluation: baseEvaluation,
      stateName: "Mississippi",
      questionPromptById: {},
      onEditAnswers: () => {},
      onPacketAction: () => {},
      hasScreeningSession
    })
  );
}

// 1) DTC mode keeps the $50 consumer CTA.
const dtc = renderResult(false);
assert(dtc.includes("Generate my packet ($50)"), "DTC result must render the 'Generate my packet ($50)' CTA.");
assert(!dtc.includes("Save this result to Briefcase"), "DTC result must not render the Briefcase CTA.");
assert(!dtc.includes("started through a partner program"), "DTC result must not render the partner helper text.");

// 2) Partner/session mode: no $50, Briefcase CTA, and the no-charge helper text.
const partner = renderResult(true);
assert(!partner.includes("$50"), "Partner/session result must NOT render '$50'.");
assert(!partner.includes("Generate my packet"), "Partner/session result must NOT render the DTC 'Generate my packet' CTA.");
assert(partner.includes("Save this result to Briefcase"), "Partner/session result must render the 'Save this result to Briefcase' CTA.");
assert(
  partner.includes("This screening started through a partner program. You will not be asked to pay here."),
  "Partner/session result must render the no-charge partner helper text."
);

// 3) Routing: ScreeningFlow sends partner/session mode to /briefcase, not the DTC packet-ready page.
const flowSrc = readFileSync(path.join(process.cwd(), "src/components/expungement-ai/screening/ScreeningFlow.tsx"), "utf8");
assert(flowSrc.includes('const BRIEFCASE_PATH = "/briefcase"'), "ScreeningFlow must define BRIEFCASE_PATH = '/briefcase'.");
assert(/const isPartnerSession = Boolean\(initialSessionId\)/.test(flowSrc), "Partner mode must be keyed to initialSessionId.");
assert(flowSrc.includes("hasScreeningSession={isPartnerSession}"), "ScreeningFlow must pass hasScreeningSession to ScreeningResult.");
assert(
  /onPacketAction=\{\(\)\s*=>\s*router\.push\(isPartnerSession \? BRIEFCASE_PATH : PACKET_PATH\)\}/.test(flowSrc),
  "ScreeningFlow must route the packet action to BRIEFCASE_PATH in partner mode and PACKET_PATH only for DTC."
);

if (failures.length) {
  console.error(`verify-rcap-partner-result-cta: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("verify-rcap-partner-result-cta: OK (DTC keeps $50; partner/session mode shows Briefcase CTA + no-charge note and routes to /briefcase)");
