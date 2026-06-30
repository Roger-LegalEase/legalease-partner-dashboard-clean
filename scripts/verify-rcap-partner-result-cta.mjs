// Regression: the screening result CTA must match the flow the user arrived through, and partner
// mode must be detected from the ?session= UUID even when the server render did not carry the prop.
//
// - Direct-to-consumer (no ?session=): the result keeps the "$50" pay-and-generate CTA.
// - Partner/session mode (a valid ?session= UUID, from the prop OR read from the URL on the client):
//   the result must NOT show "$50", must offer a Briefcase action, and must route to /briefcase —
//   never the DTC /expungement-ai/packet-ready page (which would dead-end at "Packet is not ready").
//
// Renders the real ScreeningResult; drives `hasScreeningSession` through the same
// resolvePartnerSessionId() the client flow uses; and checks the route/flow wiring in source.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { ScreeningResult } = await import("../src/components/expungement-ai/screening/ScreeningResult.tsx");
const { resolvePartnerSessionId, isSafeSessionId } = await import("../src/components/expungement-ai/screening/partner-session.ts");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

// A real v4 session id (the one from the production bug report) and some non-qualifying values.
const VALID_SESSION = "5fd840f9-e562-4201-8eb0-ae67e71ec8f2";
const V7_SESSION = "5fd840f9-e562-7201-8eb0-ae67e71ec8f2"; // version 7 -> outside the v1-5 gate
const GARBAGE_SESSION = "not-a-uuid-1234";

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

// Render exactly how ScreeningFlow decides the mode: no server prop, only the URL ?session= value.
function renderForUrlSession(urlSessionId) {
  const isPartnerSession = Boolean(resolvePartnerSessionId(undefined, urlSessionId));
  return renderResult(isPartnerSession);
}

// 1) A valid ?session= read from the URL (no server prop) must NOT show "$50" — it is partner mode.
const fromUrl = renderForUrlSession(VALID_SESSION);
assert(!fromUrl.includes("$50"), "URL ?session=<valid uuid> must NOT render '$50' (partner mode).");
assert(fromUrl.includes("Save this result to Briefcase"), "URL ?session=<valid uuid> must render the Briefcase CTA.");
assert(
  fromUrl.includes("This screening started through a partner program. You will not be asked to pay here."),
  "URL ?session=<valid uuid> must render the no-charge partner helper text."
);

// 2) No session must still show the DTC "$50" CTA.
const noSession = renderForUrlSession(null);
assert(noSession.includes("Generate my packet ($50)"), "No session must render the DTC 'Generate my packet ($50)' CTA.");
assert(!noSession.includes("Save this result to Briefcase"), "No session must not render the Briefcase CTA.");

// 3) Invalid / non-v1-5 session query must NOT trigger partner mode (stays DTC "$50").
for (const bad of [GARBAGE_SESSION, V7_SESSION, ""]) {
  assert(renderForUrlSession(bad).includes("Generate my packet ($50)"), `Invalid session ${JSON.stringify(bad)} must stay DTC ($50).`);
  assert(resolvePartnerSessionId(undefined, bad) === undefined, `resolvePartnerSessionId must reject invalid session ${JSON.stringify(bad)}.`);
}

// Direct helper checks (prop path + validation).
assert(resolvePartnerSessionId(undefined, VALID_SESSION) === VALID_SESSION, "URL session should resolve when the prop is absent.");
assert(resolvePartnerSessionId(VALID_SESSION, null) === VALID_SESSION, "Server prop session should resolve when the URL has none.");
assert(isSafeSessionId(VALID_SESSION) === true, "isSafeSessionId must accept a valid v4 session.");
assert(isSafeSessionId(V7_SESSION) === false, "isSafeSessionId must reject a v7 session.");
assert(isSafeSessionId(null) === false, "isSafeSessionId must reject null.");

// 4) A DTC save-progress-created sessionId must NOT flip the user into partner mode. Partner mode is
//    resolved only from (server prop, URL) — never the live sessionId state — so a later sessionId is
//    irrelevant. Helper-level proof: with neither prop nor URL session, the result stays undefined.
assert(resolvePartnerSessionId(undefined, null) === undefined, "No arrival session => DTC, regardless of any later live sessionId.");

// Source wiring: ScreeningFlow derives partner mode from the prop-or-URL session, not the live state.
const flowSrc = readFileSync(path.join(process.cwd(), "src/components/expungement-ai/screening/ScreeningFlow.tsx"), "utf8");
assert(/import \{ useRouter, useSearchParams \} from "next\/navigation";/.test(flowSrc), "ScreeningFlow must import useSearchParams.");
assert(
  /const effectiveInitialSessionId = resolvePartnerSessionId\(initialSessionId, searchParams\.get\("session"\)\);/.test(flowSrc),
  "ScreeningFlow must resolve the effective session from the prop OR the URL ?session=."
);
assert(/const isPartnerSession = Boolean\(effectiveInitialSessionId\);/.test(flowSrc), "Partner mode must derive from effectiveInitialSessionId.");
assert(/useState<string \| undefined>\(effectiveInitialSessionId\)/.test(flowSrc), "sessionId state must initialize from effectiveInitialSessionId.");
assert(!/isPartnerSession = Boolean\(initialSessionId\)/.test(flowSrc), "Partner mode must no longer be prop-only.");
assert(!/isPartnerSession = Boolean\(sessionId\)/.test(flowSrc), "Partner mode must NOT derive from the live sessionId state.");
assert(flowSrc.includes('const BRIEFCASE_PATH = "/briefcase"'), "ScreeningFlow must define BRIEFCASE_PATH = '/briefcase'.");
assert(flowSrc.includes("hasScreeningSession={isPartnerSession}"), "ScreeningFlow must pass hasScreeningSession to ScreeningResult.");
assert(
  /onPacketAction=\{\(\)\s*=>\s*router\.push\(isPartnerSession \? BRIEFCASE_PATH : PACKET_PATH\)\}/.test(flowSrc),
  "ScreeningFlow must route the packet action to BRIEFCASE_PATH in partner mode and PACKET_PATH only for DTC."
);

// Source wiring: the route is dynamic and keyed by session mode so partner/DTC never share an instance.
const pageSrc = readFileSync(path.join(process.cwd(), "src/app/expungement-ai/screening/[state]/page.tsx"), "utf8");
assert(/export const dynamic = "force-dynamic";/.test(pageSrc), "Screening route must be force-dynamic so ?session= is always available.");
assert(/key=\{`\$\{state\}:\$\{initialSessionId \?\? "dtc"\}`\}/.test(pageSrc), "ScreeningFlow key must include the session mode.");
assert(pageSrc.includes("isSafeSessionId"), "Screening route must validate the session with the shared isSafeSessionId.");

if (failures.length) {
  console.error(`verify-rcap-partner-result-cta: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("verify-rcap-partner-result-cta: OK (URL ?session= -> Briefcase CTA; no/invalid session -> DTC $50; save-progress sessionId stays DTC; route force-dynamic + session-keyed)");
