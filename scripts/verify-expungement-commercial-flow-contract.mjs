// Focused, no-network behavior checks for the approved free-Briefcase flow.
//
// This imports the real save policy, in-memory Briefcase adapter, packet-
// information model/patch helpers, and human-facing state mapper. The builder
// route is loaded with deterministic auth/storage doubles so its unpaid DTC and
// sponsored access decisions are exercised without Supabase or Stripe.

import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { register } from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Force the adapters onto their documented deterministic fallback. This test
// must never inspect a hosted project even when a developer shell has env set.
for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
]) {
  delete process.env[name];
}

const {
  getBriefcaseItem,
  listBriefcaseItems,
  mergeBriefcaseArtifactRefs,
  saveScreeningResultToBriefcase
} = await import("../src/lib/expungement-ai/briefcase.ts");
const {
  buildSaveInput,
  findItemForSession,
  resolveSavePaymentAllowed,
  statusForResultCode
} = await import("../src/lib/expungement-ai/save-result-policy.ts");
const {
  packetInformationModelFor,
  packetInformationPatch,
  packetInformationReviewSafety
} = await import("../src/lib/expungement-ai/packet-information.ts");
const { humanMatterState } = await import("../src/lib/expungement-ai/frontend/briefcase-presentation.ts");

const USER_ID = "commercial-flow-contract-user";
const PRODUCT_ID = "expungement_packet";
const PACKET_PATHWAY_ID = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const PACKET_PATHWAY_LABEL = "Non-conviction expungement for dismissal, no disposition, or acquittal";

const RESULT_CASES = [
  ["packet_ready", "packet_ready", true, "unpaid"],
  ["packet_ready_with_caution", "packet_ready", true, "unpaid"],
  ["guidance_only", "guidance_saved", false, "not_applicable"],
  ["not_covered_yet", "guidance_saved", false, "not_applicable"],
  ["needs_more_info", "needs_info", false, "not_applicable"],
  ["needs_review", "needs_review", false, "not_applicable"],
  ["not_yet", "waiting", false, "not_applicable"],
  ["likely_not_eligible", "not_eligible", false, "not_applicable"],
  ["hard_stop", "hard_stop", false, "not_applicable"]
];

function commercialArtifact(entitlementSource = "consumer_payment") {
  return {
    retainedRenderRef: { marker: "must-survive-builder-saves" },
    productId: PRODUCT_ID,
    commercialFlow: {
      version: 1,
      entitlementSource,
      productId: PRODUCT_ID,
      screening: {
        profileVersion: "1.3.0",
        screeningMatterId: "screening-matter-ms",
        pathwayId: PACKET_PATHWAY_ID,
        pathwayLabel: PACKET_PATHWAY_LABEL,
        resultCode: "packet_ready",
        paymentAllowed: entitlementSource === "consumer_payment",
        packetType: "custom_pleading",
        packetPlan: {
          pathwayId: PACKET_PATHWAY_ID,
          mode: "state_specific_custom_packet_from_source_rules",
          formMappingStatus: "custom_or_manual_mapping_required",
          sourceFormIds: [],
          requiredInputIds: ["jurisdiction", "county", "court", "case_number"],
          sourceRuleRefs: ["commercial-flow-contract"]
        },
        answers: { county: "Hinds County" }
      },
      packetInformation: {
        stage: "not_started",
        requiredInputIds: ["jurisdiction", "county", "court", "case_number"],
        serverFacts: {
          jurisdiction: "MS",
          pathway_id: PACKET_PATHWAY_ID
        },
        prefilledAnswers: { county: "Hinds County" },
        answers: {},
        missingInputIds: ["court", "case_number"],
        updatedAt: null,
        reviewedAt: null
      }
    }
  };
}

function savePayload(resultCode, index, overrides = {}) {
  const packetResult = resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";
  return {
    userId: USER_ID,
    jurisdiction: "MS",
    resultCode,
    pathwayLabel: packetResult ? PACKET_PATHWAY_LABEL : `Saved ${resultCode} result`,
    packetType: packetResult ? "custom_pleading" : resultCode === "guidance_only" ? "guidance_packet" : undefined,
    paymentAllowed: packetResult,
    summary: `Authoritative ${resultCode} result`,
    nextSteps: [`Next step for ${resultCode}`],
    sourceSessionId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    ...overrides
  };
}

// Every authoritative result lane is a storable free Briefcase value. Payment
// posture is attached only to packet results; creation never makes one paid or
// delivery-ready.
const savedByResult = new Map();
for (const [index, [resultCode, expectedStatus, paymentAllowed, paymentStatus]] of RESULT_CASES.entries()) {
  const input = buildSaveInput(savePayload(resultCode, index), { isPartnerSession: false });
  assert.equal(statusForResultCode(resultCode), expectedStatus);
  assert.equal(input.status, expectedStatus);
  assert.equal(input.paymentAllowed, paymentAllowed);
  assert.equal(input.paymentStatus, paymentStatus);
  if (resultCode === "packet_ready") input.artifactRefs = commercialArtifact();

  const saved = await saveScreeningResultToBriefcase(input);
  savedByResult.set(resultCode, saved);
  assert.equal(saved.paymentStatus, paymentStatus);
  assert.notEqual(saved.packetStatus, "ready");
  assert.notEqual(saved.packetStatus, "downloaded");
  assert.equal(saved.checkoutSessionId, undefined);
}

const allSaved = await listBriefcaseItems(USER_ID);
assert.equal(allSaved.length, RESULT_CASES.length, "all result lanes must persist as independent free matters");
for (const [, expectedStatus] of RESULT_CASES) {
  assert.ok(allSaved.some((item) => item.status === expectedStatus), `missing saved matter status ${expectedStatus}`);
}

// A retry for one pending result reuses its matter, while another screening can
// add a second unpaid packet matter without inheriting the first one's state.
const packetInput = buildSaveInput(savePayload("packet_ready", 0), { isPartnerSession: false });
packetInput.artifactRefs = commercialArtifact();
const packetRetry = await saveScreeningResultToBriefcase(packetInput);
assert.equal(packetRetry.id, savedByResult.get("packet_ready").id);
assert.equal((await listBriefcaseItems(USER_ID)).length, RESULT_CASES.length, "same-session retry must not duplicate a matter");
assert.equal(findItemForSession(allSaved, packetInput.sourceSessionId)?.id, packetRetry.id);

const secondPacketInput = buildSaveInput(savePayload("packet_ready", 20, {
  jurisdiction: "PA",
  pathwayLabel: "Path A: Non-conviction expungement"
}), { isPartnerSession: false });
const secondPacket = await saveScreeningResultToBriefcase(secondPacketInput);
const afterSecondPacket = await listBriefcaseItems(USER_ID);
const unpaidPackets = afterSecondPacket.filter((item) => item.paymentAllowed && item.paymentStatus === "unpaid");
assert.ok(unpaidPackets.length >= 3, "one user must be able to hold multiple independent unpaid packet matters");
assert.notEqual(secondPacket.id, packetRetry.id);
assert.equal(packetRetry.paymentStatus, "unpaid");
assert.equal(secondPacket.paymentStatus, "unpaid");
for (const item of unpaidPackets) {
  assert.equal(item.checkoutSessionId, undefined, "saving an unpaid matter must not create Checkout");
  assert.ok(item.packetStatus !== "ready" && item.packetStatus !== "downloaded", "an unpaid matter must not be delivery eligible");
}

// The real packet-information model is available before payment. It prefills
// safe screening facts, hides server facts from the questionnaire, tracks what
// remains, and survives save/leave/resume via the real nested artifact merge.
let packetMatter = await getBriefcaseItem(USER_ID, packetRetry.id);
assert.ok(packetMatter);
let model = packetInformationModelFor(packetMatter);
assert.ok(model, "unpaid packet matter must expose its packet-information builder");
assert.equal(packetMatter.paymentStatus, "unpaid");
assert.equal(model.stage, "not_started");
assert.equal(model.initialAnswers.county, "Hinds County", "safe screening answer must prefill the builder");
assert.ok(!model.questions.some((question) => question.id === "jurisdiction"), "server facts must not be asked again");
assert.deepEqual(model.missingInputIds, ["court", "case_number"]);

const partial = packetInformationPatch({
  existingItem: packetMatter,
  answers: { court: "Hinds County Circuit Court" },
  reviewed: false
});
assert.ok(partial);
assert.equal(partial.readyToGenerate, false);
assert.deepEqual(partial.missingInputIds, ["case_number"]);
packetMatter = await mergeBriefcaseArtifactRefs(USER_ID, packetMatter.id, partial.patch);
assert.ok(packetMatter);
assert.equal(packetMatter.artifactRefs.retainedRenderRef.marker, "must-survive-builder-saves", "builder save must preserve unrelated artifact refs");

model = packetInformationModelFor(packetMatter);
assert.equal(model.stage, "in_progress");
assert.equal(model.initialAnswers.county, "Hinds County");
assert.equal(model.initialAnswers.court, "Hinds County Circuit Court", "saved progress must reload on resume");
assert.deepEqual(model.missingInputIds, ["case_number"], "missing information must remain explicit after resume");
assert.equal(humanMatterState(packetMatter), "Packet details in progress");

const reviewed = packetInformationPatch({
  existingItem: packetMatter,
  answers: { case_number: "25-CR-000123" },
  reviewed: true
});
assert.ok(reviewed);
assert.equal(reviewed.readyToGenerate, false, "a synthetic matter without authoritative screening context must fail closed at review");
assert.deepEqual(reviewed.missingInputIds, []);
packetMatter = await mergeBriefcaseArtifactRefs(USER_ID, packetMatter.id, reviewed.patch);
model = packetInformationModelFor(packetMatter);
assert.equal(model.stage, "in_progress");
assert.equal(model.initialAnswers.court, "Hinds County Circuit Court", "final save must retain earlier answers");
assert.equal(model.initialAnswers.case_number, "25-CR-000123");
assert.equal(model.reviewedAt, null);
assert.equal(humanMatterState(packetMatter), "Packet details in progress");
assert.equal(packetMatter.paymentStatus, "unpaid", "accuracy review must not mark the matter paid");
assert.equal(packetMatter.checkoutSessionId, undefined, "accuracy review must not create a Checkout Session");
assert.ok(packetMatter.packetStatus !== "ready" && packetMatter.packetStatus !== "downloaded");

// Builder facts that can contradict the Mississippi route are re-evaluated at
// final review. Dates are ISO dates, and the ordinary non-conviction fixture
// uses neutral answers rather than exercising unrelated legal routes.
const msRequired = [
  "age_at_offense", "case_outcome", "charge", "contact_information", "county", "court",
  "disposition_date", "financial_obligations", "jurisdiction", "offense_category", "offense_level",
  "participant_full_legal_name", "pathway_id", "pending_cases", "prior_relief", "record_type",
  "residency_or_location", "sentence_completion_date", "trafficking_status"
];
const cleanPacketAnswers = {
  age_at_offense: { value: "30", unknown: false },
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  charge: { value: "Synthetic misdemeanor charge", unknown: false },
  contact_information: "100 Acceptance Way, Jackson, MS 39201",
  county: { value: "Hinds County", unknown: false },
  court: { value: "Hinds County Circuit Court", unknown: false },
  disposition_date: { value: "2015-01-15", unknown: false },
  financial_obligations: "Yes",
  offense_category: { value: "Misdemeanor", unknown: false },
  offense_level: "Misdemeanor",
  participant_full_legal_name: "Acceptance Consumer",
  pending_cases: "No",
  prior_relief: "No",
  record_type: "Arrest or charge",
  residency_or_location: { value: "Jackson, Mississippi", unknown: false },
  sentence_completion_date: "Yes",
  trafficking_status: "No"
};
const reviewMatter = {
  ...packetMatter,
  state: "MS",
  pathwayLabel: PACKET_PATHWAY_LABEL,
  artifactRefs: {
    commercialFlow: {
      screening: {
        profileVersion: "2026-06-19-source-conversion-1",
        screeningMatterId: "screening-review-ms",
        pathwayId: PACKET_PATHWAY_ID,
        pathwayLabel: PACKET_PATHWAY_LABEL,
        packetPlan: {
          pathwayId: PACKET_PATHWAY_ID,
          mode: "state_specific_custom_packet_from_source_rules",
          formMappingStatus: "custom_or_manual_mapping_required",
          sourceFormIds: [], requiredInputIds: msRequired, sourceRuleRefs: ["pathways:15-155"]
        },
        answers: {
          ownership_scope: "Yes", jurisdiction_scope: "State or local",
          case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
          offense_level: "Misdemeanor",
          possible_pathway_context: PACKET_PATHWAY_LABEL,
          resolved_timing_bucket: "gt_10_years",
          court_requirements_completed: "yes"
        }
      },
      packetInformation: {
        stage: "ready_to_generate", requiredInputIds: msRequired,
        serverFacts: { jurisdiction: "MS", pathway_id: PACKET_PATHWAY_ID },
        prefilledAnswers: {}, answers: cleanPacketAnswers, missingInputIds: [],
        updatedAt: "2026-08-15T00:00:00.000Z", reviewedAt: "2026-08-15T00:00:00.000Z"
      }
    }
  }
};
assert.deepEqual(packetInformationReviewSafety(reviewMatter), { safe: true, reason: "authoritative_route_confirmed" });
assert.equal(packetInformationReviewSafety(reviewMatter, { disposition_date: { value: "25-CR-000123", unknown: false } }).reason, "invalid_date:disposition_date");
assert.equal(packetInformationReviewSafety(reviewMatter, { pending_cases: "Yes" }).reason, "route_changing_answer:pending_cases");
assert.equal(packetInformationReviewSafety(reviewMatter, { trafficking_status: "Yes" }).reason, "route_changing_answer:trafficking_status");

// Accepted packet matters created before commercialFlow metadata existed are
// reconciled with server-owned state/pathway facts. Those facts must persist in
// the first builder save so a later partial merge cannot make review
// permanently incomplete or ask the browser to supply route identity.
const legacyPaMatter = {
  ...secondPacket,
  state: "PA",
  pathwayLabel: "Path A — Non-conviction expungement",
  resultCode: "packet_ready",
  paymentAllowed: true,
  paymentStatus: "unpaid",
  artifactRefs: undefined
};
const legacyPaModel = packetInformationModelFor(legacyPaMatter);
assert.ok(legacyPaModel, "accepted legacy PA packet matter must reconcile into the shared builder");
assert.ok(!legacyPaModel.questions.some((question) => question.id === "jurisdiction" || question.id === "pathway_id"), "legacy server facts must not become browser questions");
const legacyPaPatch = packetInformationPatch({
  existingItem: legacyPaMatter,
  answers: {},
  reviewed: false
});
assert.ok(legacyPaPatch);
assert.equal(legacyPaPatch.patch.commercialFlow.packetInformation.serverFacts.jurisdiction, "PA");
assert.equal(legacyPaPatch.patch.commercialFlow.packetInformation.serverFacts.pathway_id, legacyPaModel.pathwayId);
assert.deepEqual(legacyPaPatch.patch.commercialFlow.packetInformation.requiredInputIds, legacyPaModel.requiredInputIds);
assert.ok(!legacyPaPatch.missingInputIds.includes("jurisdiction") && !legacyPaPatch.missingInputIds.includes("pathway_id"), "server-owned legacy route facts must satisfy review without browser input");
const partiallyReconciledPa = {
  ...legacyPaMatter,
  artifactRefs: {
    commercialFlow: {
      screening: legacyPaPatch.patch.commercialFlow.screening,
      packetInformation: {
        stage: "in_progress",
        requiredInputIds: legacyPaModel.requiredInputIds,
        answers: {},
        missingInputIds: legacyPaModel.requiredInputIds
      }
    }
  }
};
const partiallyReconciledModel = packetInformationModelFor(partiallyReconciledPa);
assert.ok(partiallyReconciledModel);
assert.ok(!partiallyReconciledModel.questions.some((question) => question.id === "jurisdiction" || question.id === "pathway_id"), "a partial legacy merge must still derive route identity from server-owned state/pathway data");
assert.ok(!partiallyReconciledModel.missingInputIds.includes("jurisdiction") && !partiallyReconciledModel.missingInputIds.includes("pathway_id"));

// Partner sponsorship is a separate entitlement posture. It uses the shared
// packet-information model but can never be converted to consumer payment by
// the save policy.
assert.equal(resolveSavePaymentAllowed(true, true), false);
assert.equal(resolveSavePaymentAllowed(false, true), true);
const sponsoredInput = buildSaveInput(savePayload("packet_ready", 30, {
  userId: "commercial-flow-sponsored-user",
  paymentAllowed: true
}), { isPartnerSession: true });
sponsoredInput.artifactRefs = commercialArtifact("partner_sponsorship");
const sponsoredMatter = await saveScreeningResultToBriefcase(sponsoredInput);
assert.equal(sponsoredMatter.paymentAllowed, false);
assert.equal(sponsoredMatter.paymentStatus, "not_applicable");
assert.equal(sponsoredMatter.checkoutSessionId, undefined);
assert.ok(packetInformationModelFor(sponsoredMatter), "partner-covered packet must retain shared builder access");

// Exercise the real builder route boundary with local doubles. An authenticated
// owner may save an unpaid DTC packet; a verified sponsored packet may use the
// same endpoint without consumer payment; a guidance matter is refused.
function loadTsWithMocks(relPath, mocks) {
  const resolved = path.join(rootDir, relPath);
  const transpiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const mod = new Module(resolved);
  mod.filename = `${resolved}.cjs`;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (specifier) => (specifier in mocks ? mocks[specifier] : require(specifier));
  mod._compile(transpiled, mod.filename);
  return mod.exports;
}

async function exerciseBuilderRoute(item, sponsored) {
  const merges = [];
  const route = loadTsWithMocks("src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts", {
    "@/lib/rcap/briefcase/auth": {
      getRcapBriefcaseAuthState: async () => ({ isAuthenticated: true, userId: "route-owner" })
    },
    "@/lib/expungement-ai/briefcase": {
      getBriefcaseItem: async (userId, itemId) => userId === "route-owner" && itemId === item.id ? item : null,
      isPartnerSponsoredPacketItem: async () => sponsored,
      mergeBriefcaseArtifactRefs: async (...args) => {
        merges.push(args);
        return item;
      }
    },
    "@/lib/expungement-ai/packet-information": { packetInformationPatch }
  });
  const response = await route.POST(new Request(`https://local.test/api/expungement-ai/briefcase/${item.id}/packet-information`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers: { court: "Test court" }, reviewed: false })
  }), { params: Promise.resolve({ itemId: item.id }) });
  return { response, body: await response.json(), merges };
}

const unpaidRouteResult = await exerciseBuilderRoute({ ...savedByResult.get("packet_ready"), artifactRefs: commercialArtifact() }, false);
assert.equal(unpaidRouteResult.response.status, 200, "unpaid owner must be able to save packet information");
assert.equal(unpaidRouteResult.merges.length, 1);
assert.ok(unpaidRouteResult.body.reviewPath.endsWith("/review"));

const sponsoredRouteResult = await exerciseBuilderRoute(sponsoredMatter, true);
assert.equal(sponsoredRouteResult.response.status, 200, "verified sponsored owner must use the shared builder without Stripe");
assert.equal(sponsoredRouteResult.merges.length, 1);

const guidanceRouteResult = await exerciseBuilderRoute(savedByResult.get("guidance_only"), false);
assert.equal(guidanceRouteResult.response.status, 403, "guidance-only matter must not acquire a packet builder");
assert.equal(guidanceRouteResult.merges.length, 0);

console.log("Expungement.ai commercial-flow contract verification passed.");
console.log("- Every authoritative result lane saves to the free Briefcase; multiple packet matters stay independently unpaid and undeliverable.");
console.log("- The real builder model prefills, preserves progress, reports missing fields, and reaches review without Checkout.");
console.log("- Verified partner sponsorship stays outside consumer payment while retaining the shared packet-information builder.");
