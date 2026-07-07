// Regression: the screening result CTA must match the flow the user arrived through, and partner
// mode must be detected from the ?session= UUID even when the server render did not carry the prop.
//
// - Direct-to-consumer (no ?session=): the result keeps the "$50" pay CTA.
// - Partner/session mode (a valid ?session= UUID, from the prop OR read from the URL on the client):
//   the result must NOT show "$50", must offer a Briefcase action, and must route to /briefcase —
//   never the DTC /expungement-ai/pay payment gate.
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

function renderResultWithCode(resultCode, hasScreeningSession, paymentAllowed) {
  return renderToStaticMarkup(
    React.createElement(ScreeningResult, {
      evaluation: {
        ...baseEvaluation,
        resultCode,
        paymentAllowed,
        packetPlan: paymentAllowed ? baseEvaluation.packetPlan : undefined
      },
      stateName: "Mississippi",
      questionPromptById: {},
      onEditAnswers: () => {},
      onPacketAction: () => {},
      hasScreeningSession
    })
  );
}

// Partner result lanes: each result code maps to exactly one forward CTA and never a price.
const PARTNER_LANES = [
  { code: "packet_ready", label: "Continue to packet builder", pay: true },
  { code: "needs_more_info", label: "Continue to my Briefcase", pay: false },
  { code: "guidance_only", label: "View my next steps", pay: false },
  { code: "not_yet", label: "View my Briefcase", pay: false }
];
for (const lane of PARTNER_LANES) {
  const partnerHtml = renderResultWithCode(lane.code, true, lane.pay);
  assert(partnerHtml.includes(lane.label), `Partner lane ${lane.code} must render "${lane.label}".`);
  assert(!partnerHtml.includes("$50"), `Partner lane ${lane.code} must never render a price.`);
  const dtcHtml = renderResultWithCode(lane.code, false, lane.pay);
  assert(!dtcHtml.includes(lane.label), `DTC must never render the partner lane label "${lane.label}".`);
}

// 1) A valid ?session= read from the URL (no server prop) must NOT show "$50" — it is partner mode.
const fromUrl = renderForUrlSession(VALID_SESSION);
assert(!fromUrl.includes("$50"), "URL ?session=<valid uuid> must NOT render '$50' (partner mode).");
assert(fromUrl.includes("Continue to packet builder"), "URL ?session=<valid uuid> must render the partner packet-builder lane CTA.");
assert(
  fromUrl.includes("This screening started through a partner program. You will not be asked to pay here."),
  "URL ?session=<valid uuid> must render the no-charge partner helper text."
);

// 2) No session must still show the DTC "$50" CTA.
const noSession = renderForUrlSession(null);
assert(noSession.includes("Generate my packet - $50"), "No session must render the DTC 'Generate my packet - $50' CTA.");
assert(!noSession.includes("Continue to packet builder"), "No session must not render a partner lane CTA.");

// 3) Invalid / non-v1-5 session query must NOT trigger partner mode (stays DTC "$50").
for (const bad of [GARBAGE_SESSION, V7_SESSION, ""]) {
  assert(renderForUrlSession(bad).includes("Generate my packet - $50"), `Invalid session ${JSON.stringify(bad)} must stay DTC ($50).`);
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
// The packet action now runs through handlePacketAction: partner mode saves the result then opens
// Briefcase; DTC saves the result and routes to the payment gate. (Persistence asserted in
// verify-rcap-briefcase-result-persistence.)
assert(flowSrc.includes("onPacketAction={() => void handlePacketAction()}"), "ScreeningFlow must route the packet action through handlePacketAction.");
assert(flowSrc.includes('/api/expungement-ai/screening/save-result'), "DTC packet action must save the completed result before payment.");
assert(flowSrc.includes('router.push(`/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(result.itemId)}`)'), "DTC packet action must route to the payment gate with the saved Briefcase item.");
assert(flowSrc.includes('next: "/expungement-ai/pay"'), "Anonymous DTC pending handoff must preserve the payment gate as next.");
assert(!flowSrc.includes('/expungement-ai/packet-ready"'), "DTC packet action must not bypass payment to packet-ready.");
assert(flowSrc.includes("router.push(BRIEFCASE_PATH)"), "Partner mode must open Briefcase after saving.");

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
console.log("verify-rcap-partner-result-cta: OK (URL ?session= -> Briefcase CTA; no/invalid session -> DTC $50 payment gate; save-progress sessionId stays DTC; route force-dynamic + session-keyed)");
