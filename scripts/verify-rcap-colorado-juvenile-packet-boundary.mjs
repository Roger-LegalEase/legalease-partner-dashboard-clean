#!/usr/bin/env node

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY || "2026-08-25";

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "data/rcap-ledger/public-witness-fixtures.json"), "utf8")).fixtures;

const { evaluateExpungementAiMatter } = await import("../src/lib/rcap-engine/expungement-ai-adapter.ts");
const { evaluateRcapMatter } = await import("../src/lib/rcap-engine/rcap-adapter.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
const { clinicReviewTreatmentFor } = await import("../src/lib/clinic-mode/result-follow-up.ts");
const { unavailablePacketRouteFor, routeMustFailClosed } = await import("../src/lib/rcap-engine/unavailable-packet-routes.ts");
const { ScreeningResult } = await import("../src/components/expungement-ai/screening/ScreeningResult.tsx");

const failures = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

const unavailablePathway = "juvenile-expungement-19-1-306";
const supportedPathway = "petition-based-non-conviction-sealing-jdf-417-24-72-704";
const convictionPathway = "petition-based-conviction-sealing-jdf-612-24-72-706";

const unavailable = fixtureFor(unavailablePathway);
const unavailableRequest = requestFor(unavailable, "co-juvenile-no-packet");
const rawUnavailable = evaluateScreening(unavailableRequest);
check(
  rawUnavailable.resultCode === "packet_ready_with_caution",
  `control: raw evaluator changed unexpectedly (${rawUnavailable.resultCode})`
);
check(rawUnavailable.pathwayId === unavailablePathway, "the Colorado juvenile flow is not reachable");

const consumerUnavailable = evaluateExpungementAiMatter(unavailableRequest);
const partnerUnavailable = evaluateRcapMatter({ ...unavailableRequest, caseId: "co-juvenile-clinic" }).evaluation;
for (const [surface, evaluation] of [["consumer", consumerUnavailable], ["clinic/partner", partnerUnavailable]]) {
  check(evaluation.resultCode === "guidance_only", `${surface}: unavailable JDF 302 route returned ${evaluation.resultCode}`);
  check(evaluation.paymentAllowed === false, `${surface}: unavailable JDF 302 route allowed payment`);
  check(evaluation.packetPlan === undefined, `${surface}: unavailable JDF 302 route retained a packet plan`);
  check(
    evaluation.cautions.some((text) => /JDF 302|packet mapping|renderer/i.test(text)),
    `${surface}: unavailable JDF 302 route did not explain the packet boundary`
  );
}

for (const device of ["desktop", "mobile"]) {
  const partnerHtml = renderToStaticMarkup(React.createElement(ScreeningResult, {
    evaluation: partnerUnavailable,
    stateName: "Colorado",
    questionPromptById: {},
    onEditAnswers: () => {},
    onPacketAction: () => {},
    hasScreeningSession: true
  }));
  check(partnerHtml.includes("View my next steps"), `${device}: clinic guidance CTA is absent`);
  check(!partnerHtml.includes("Continue to packet builder"), `${device}: packet-builder CTA remains visible`);
  check(!/packet has started/i.test(partnerHtml), `${device}: product copy still says a packet has started`);
  check(/cannot.*safely generate|required.*packet mapping|JDF 302/i.test(partnerHtml), `${device}: safe packet-unavailable explanation is absent`);
}

const unavailableRoute = resolvePacketRoute({ state: "CO", pathway: unavailablePathway });
check(unavailableRoute.routeKind === "guidance_only", `unavailable route resolved as ${unavailableRoute.routeKind}`);
check(packetRouteCanRender(unavailableRoute) === false, "unavailable route can render");
check(unavailableRoute.sellable === false, "unavailable route is sellable");
check(unavailableRoute.creditConsumable === false, "unavailable route can consume packet credit");
const renderAttempt = buildRenderJobSpec({
  packetId: "00000000-0000-4000-8000-000000000302",
  state: "CO",
  pathway: unavailablePathway,
  packetFields: {}
});
check(renderAttempt.spec === null, "unavailable route created a render job or artifact specification");

const unavailableRecord = unavailablePacketRouteFor("CO", unavailablePathway);
check(Boolean(unavailableRecord), "Colorado juvenile registry-gap runtime record is absent");
check(routeMustFailClosed(unavailableRecord), "registryGap + renderer=none did not fail closed");
check(routeMustFailClosed({ registryGap: true, renderer: "none" }), "generic registry-gap invariant is not enforced");

const followUp = clinicReviewTreatmentFor(partnerUnavailable);
check(followUp?.queueStatus === "attorney_review", "Clinic case is not routed to attorney review");
check(followUp?.routeDisposition === "referral", "Clinic case is not routed to referral treatment");
check(/matter is saved/i.test(followUp?.participantSafeMessage ?? ""), "Clinic follow-up does not preserve the participant matter");
check(/no payment|no packet credit/i.test(followUp?.participantSafeMessage ?? ""), "Clinic follow-up does not disclose the zero-charge treatment");

// Ordering, restated against the Product Contract.
//
// This used to require the Clinic follow-up to run BEFORE the matter was
// durable, and a follow-up failure to roll the claim back. Contract SS4 and SS7
// invert that: the ownership transaction stands alone, and "analytics and
// follow-up creation occur only after the ownership transaction succeeds and
// must be idempotent". The old shape was also the anti-pattern the contract
// names directly -- it wrote the Briefcase item first and then tried to mark the
// pending result claimed.
//
// The safety property is unchanged and is what these checks now measure: a
// Colorado juvenile matter never loses its required attorney-review follow-up.
// It is attempted after the claim, on every replay, idempotently, and an
// unmet obligation is written to the append-only claim audit rather than
// disappearing with the request that dropped it.
const claimRouteSource = fs.readFileSync(path.join(root, "src/app/api/expungement-ai/screening/pending/claim/route.ts"), "utf8");
const claimServiceSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/claim/claim-service.ts"), "utf8");
const claimIndex = claimRouteSource.indexOf("claimPendingScreeningResult(");
const followUpIndex = claimRouteSource.lastIndexOf("createClinicReviewFollowUpForSavedMatter");
check(claimIndex >= 0 && followUpIndex > claimIndex, "Clinic follow-up must run after the atomic ownership transaction");
check(
  claimServiceSource.includes('supabase.rpc("claim_pending_screening_result"'),
  "the claim must be one atomic database transaction, not a sequence of writes"
);
check(
  !claimRouteSource.includes('error: "clinic_follow_up_failed"'),
  "a Clinic follow-up failure must not be reported as a failed claim once the matter is owned"
);
check(
  claimRouteSource.includes("recordOutstandingClinicFollowUp"),
  "an unmet Clinic follow-up obligation must be recorded durably"
);
check(
  fs.readFileSync(path.join(root, "src/lib/expungement-ai/claim/claim-obligations.ts"), "utf8")
    .includes('event: "clinic_follow_up_outstanding"'),
  "the outstanding obligation must land in the append-only claim audit"
);
// The follow-up sits outside the `outcome === "claimed"` guard, so a replay --
// what a returning participant produces -- retries it.
const replayGuardIndex = claimRouteSource.indexOf('claim.outcome === "claimed"');
check(
  replayGuardIndex > followUpIndex,
  "the Clinic follow-up must be retried on claim replay, not gated behind the first claim only"
);

const followUpSource = fs.readFileSync(path.join(root, "src/lib/clinic-mode/result-follow-up.ts"), "utf8");
for (const marker of ["clinic_upsert_case", 'p_queue_status: treatment.queueStatus', 'p_route_disposition: treatment.routeDisposition', '.from("clinic_follow_ups").upsert', "stableUuid"]) {
  check(followUpSource.includes(marker), `Clinic follow-up implementation is missing ${marker}`);
}

const supported = fixtureFor(supportedPathway);
const supportedEvaluation = evaluateExpungementAiMatter(requestFor(supported, "co-jdf-417-control"));
check(
  supportedEvaluation.resultCode === "packet_ready" || supportedEvaluation.resultCode === "packet_ready_with_caution",
  `nearest Colorado packet boundary regressed to ${supportedEvaluation.resultCode}`
);
check(supportedEvaluation.packetPlan !== undefined, "nearest Colorado packet boundary lost its packet plan");
const supportedRoute = resolvePacketRoute({ state: "CO", pathway: supportedPathway });
check(supportedRoute.routeKind === "factory_v2", `nearest Colorado packet boundary resolved as ${supportedRoute.routeKind}`);
check(packetRouteCanRender(supportedRoute) === true, "nearest Colorado packet boundary cannot render");

const conviction = fixtureFor(convictionPathway);
const convictionEvaluation = evaluateExpungementAiMatter(requestFor(conviction, "co-jdf-612-control"));
check(convictionEvaluation.resultCode === "needs_review", `Colorado JDF 612 boundary regressed to ${convictionEvaluation.resultCode}`);
const convictionRoute = resolvePacketRoute({ state: "CO", pathway: convictionPathway });
check(convictionRoute.routeKind === "factory_v2", `Colorado JDF 612 boundary resolved as ${convictionRoute.routeKind}`);
check(packetRouteCanRender(convictionRoute) === true, "Colorado JDF 612 boundary cannot render");

const sourceRegistry = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/source-artifact-registry.json"), "utf8"));
const jdf302 = sourceRegistry.artifacts.find((artifact) => artifact.jurisdiction === "CO" && artifact.fileName === "JDF302.pdf");
check(Boolean(jdf302?.inventorySha256), "JDF 302 inventory identity is absent");
check(jdf302?.presence !== "present", "release correction unexpectedly found a current JDF 302 source");
check(jdf302?.measuredSha256 == null, "release correction unexpectedly found a current measured JDF 302 hash");
check(jdf302?.provenance == null, "release correction unexpectedly found approved JDF 302 provenance");

const factoryRegistry = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/factory-v2-route-registry.json"), "utf8"));
const factoryRecord = factoryRegistry.routes.find((route) => route.pathwayKey === `CO:${unavailablePathway}`);
check(factoryRecord?.factoryV2Resolves === false, "JDF 302 unexpectedly has a deterministic renderer");
check(factoryRecord?.buildInputs?.exactPacketSet === false, "JDF 302 unexpectedly has an exact packet set");
check(factoryRecord?.buildInputs?.packetSpecification === false, "JDF 302 unexpectedly has a packet specification");
check(factoryRecord?.separateGates?.ownerApprovedLegalDesign === false, "JDF 302 unexpectedly has current independent approval");

if (failures.length > 0) {
  console.error(`FAIL: Colorado juvenile packet boundary (${failures.length}/${checks})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: Colorado juvenile packet boundary (${checks}/${checks})`);
console.log("JDF 302 existing approved chain: no (current source/hash, packet set, renderer, provenance, visual approval, and generation approval are incomplete)");
console.log("EXPAI-CO-8c67627ae3: guidance_only; payment=false; packet plan absent; render=false; credit=false");
console.log("nearest Colorado JDF 417 boundary: packet outcome preserved; deterministic factory renderer present");

function fixtureFor(pathwayId) {
  const fixture = fixtures.find((candidate) => candidate.jurisdiction === "CO" && candidate.pathwayId === pathwayId);
  if (!fixture) throw new Error(`Missing public witness fixture for CO:${pathwayId}`);
  return fixture;
}

function requestFor(fixture, matterId) {
  return {
    jurisdiction: fixture.jurisdiction,
    profileVersion: fixture.profileVersion,
    matterId,
    answers: fixture.answers
  };
}
