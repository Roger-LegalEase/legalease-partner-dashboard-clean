// Focused, no-network behavior checks for the approved free-Briefcase flow.
//
// This imports the real save policy, in-memory Briefcase adapter, and protected
// packet-information helpers. The builder route is loaded with deterministic
// auth/storage doubles so its unpaid DTC CAS transition is exercised without
// Supabase or Stripe; sponsored save/payment posture is checked separately.

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
  listBriefcaseItems,
  saveScreeningResultToBriefcase
} = await import("../src/lib/expungement-ai/briefcase.ts");
const {
  buildSaveInput,
  findItemForSession,
  resolveSavePaymentAllowed,
  statusForResultCode
} = await import("../src/lib/expungement-ai/save-result-policy.ts");
const {
  packetInformationPatch,
  protectedPacketDraftSeedFromAuthoritative,
  protectedPacketInformationModelFor
} = await import("../src/lib/expungement-ai/packet-information.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");

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

// Protected packet drafts, not participant commercialFlow JSON, now own the
// first-open/save/resume/final-verification lifecycle.
const reviewScreeningAnswers = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  offense_level: "Misdemeanor",
  possible_pathway_context: PACKET_PATHWAY_LABEL,
  resolved_timing_bucket: "gt_10_years",
  court_requirements_completed: "yes"
};
const authoritativeReview = evaluateAuthoritativeScreeningResult({
  jurisdiction: "MS",
  profileVersion: "2026-06-19-source-conversion-1",
  matterId: "screening-review-ms",
  answers: reviewScreeningAnswers
});
const msRequired = authoritativeReview.evaluation.packetPlan.requiredInputIds;
const cleanPacketAnswers = {
  age_at_offense: { value: "30", unknown: false },
  actual_arrest: "Yes",
  agency_case_or_citation_number: "HPD-2014-00125",
  agency_case_number: "HPD-2014-00125",
  aliases: "None",
  arrest_date: "2014-01-10",
  arrest_location: "Jackson, Mississippi",
  arrest_or_citation_date: "2014-01-10",
  arresting_agency: "Hinds County Sheriff's Office",
  arresting_or_citing_agency: "Hinds County Sheriff's Office",
  case_caption_defendant_name: "Acceptance Consumer",
  case_caption_plaintiff_name: "State of Mississippi",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  case_number: "25-CI-00125",
  charge: { value: "Synthetic misdemeanor charge", unknown: false },
  charge_classification: "Misdemeanor",
  charge_legal_citation: "Synthetic test citation",
  contact_information: "100 Acceptance Way, Jackson, MS 39201",
  county: { value: "Hinds County", unknown: false },
  court: { value: "Hinds County Circuit Court", unknown: false },
  court_name: "Hinds County Circuit Court",
  court_type: "Circuit Court",
  date_of_birth: "1990-04-12",
  disposition_date: { value: "2015-01-15", unknown: false },
  disposition_record_wording: "Charges dropped",
  email_address: "acceptance.consumer@example.test",
  filing_location: "Hinds County",
  financial_obligations: "Yes",
  indictment_record: "No indictment was returned.",
  mcic_identifier_delivery_method: "Confidential court-approved MCIC identifier addendum",
  mcic_identifier_method_confirmation_source: "Confirmed by the Hinds County Circuit Clerk on 2026-08-15",
  mailing_address: "100 Acceptance Way, Jackson, MS 39201",
  name_used_at_arrest: "Acceptance Consumer",
  nonadjudication_or_diversion: "No",
  offense_category: { value: "Misdemeanor", unknown: false },
  offense_date: "2014-01-01",
  offense_level: "Misdemeanor",
  open_co_defendant_matter: "No",
  other_recordkeeping_agencies: "Mississippi Criminal Information Center",
  participant_full_legal_name: "Acceptance Consumer",
  personal_impact_confirmed: "No",
  personal_impact_statement: "Not provided",
  pending_cases: "No",
  phone_number: "601-555-0125",
  prior_relief: "No",
  prosecuting_authority_name: "Hinds County District Attorney's Office",
  prosecuting_authority_service_address: "P.O. Box 22747, Jackson, MS 39225",
  race: "Not stated in synthetic test",
  record_type: "Arrest or charge",
  release_confirmed: "Yes",
  release_date_or_record_source: "Synthetic release record dated 2014-01-10",
  residency_or_location: { value: "Jackson, Mississippi", unknown: false },
  sentence_completion_date: "Yes",
  service_address_confirmation_status: "Confirmed by court or prosecutor",
  sex: "Not stated in synthetic test",
  social_security_number: "999-88-0125",
  social_security_number_last_four: "0125",
  statutory_disposition_category: "Charges dropped",
  trafficking_status: "No",
  certified_disposition_exhibit_status: "Attached as Exhibit A",
  docket_sheet_exhibit_status: "Inserted as Exhibit B"
};
const reviewMatter = {
  ...packetRetry,
  state: "MS",
  pathwayLabel: PACKET_PATHWAY_LABEL,
  resultCode: authoritativeReview.evaluation.resultCode,
  paymentAllowed: authoritativeReview.evaluation.paymentAllowed,
  packetType: authoritativeReview.packetType,
  selectedTrackId: authoritativeReview.selectedTrackId,
  treatmentClassification: authoritativeReview.evaluation.treatmentClassification ?? null,
  deferralComponentIds: authoritativeReview.evaluation.deferralComponentIds ?? [],
  artifactRefs: {
    commercialFlow: {
      screening: {
        profileVersion: "2026-06-19-source-conversion-1",
        screeningMatterId: "screening-review-ms",
        pathwayId: PACKET_PATHWAY_ID,
        pathwayLabel: PACKET_PATHWAY_LABEL,
        resultCode: authoritativeReview.evaluation.resultCode,
        paymentAllowed: authoritativeReview.evaluation.paymentAllowed,
        packetType: authoritativeReview.packetType,
        packetPlan: authoritativeReview.evaluation.packetPlan,
        answers: reviewScreeningAnswers
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
const draftSeed = protectedPacketDraftSeedFromAuthoritative({
  authoritative: authoritativeReview,
  screeningAnswers: reviewScreeningAnswers,
  dependencies: {
    commercialFlowVersion: 1,
    entitlementSource: "consumer_payment",
    productId: PRODUCT_ID
  },
  capturedAt: "2026-08-26T00:00:00.000Z"
});
assert.ok(draftSeed, "server-authoritative claim inputs must initialize the protected packet draft");
const initialProtected = {
  status: "unverified",
  reason: "final_verification_not_completed",
  revision: 0,
  draftHash: draftSeed.hash,
  draftSnapshot: draftSeed.snapshot
};
const firstOpenModel = protectedPacketInformationModelFor(initialProtected);
assert.ok(firstOpenModel, "first-open packet builder must come from the protected draft");
assert.equal(firstOpenModel.builderQuestions.some((question) => question.id === "offense_level"), false, "protected screening charge level is not asked again");
assert.ok(!firstOpenModel.questions.some((question) => question.id === "jurisdiction" || question.id === "pathway_id"), "protected server facts never become browser questions");

const partial = packetInformationPatch({
  existingItem: { ...reviewMatter, artifactRefs: {} },
  protectedVerification: initialProtected,
  answers: { court: cleanPacketAnswers.court },
  verify: false
});
assert.ok(partial, "a protected first fact save must produce one CAS transition");
assert.equal(partial.readyToGenerate, false);
const resumedModel = protectedPacketInformationModelFor(partial.protectedTransition.nextVerification);
assert.ok(resumedModel);
assert.deepEqual(resumedModel.packetAnswers.court, cleanPacketAnswers.court, "protected progress must resume without commercialFlow JSON");

const completed = packetInformationPatch({
  existingItem: { ...reviewMatter, artifactRefs: {} },
  protectedVerification: partial.protectedTransition.nextVerification,
  answers: cleanPacketAnswers,
  verify: false
});
assert.ok(completed);
assert.equal(completed.readyToGenerate, false, "saving the last protected fact must not silently verify");
assert.deepEqual(completed.missingInputIds, []);
const verified = packetInformationPatch({
  existingItem: { ...reviewMatter, artifactRefs: {} },
  protectedVerification: completed.protectedTransition.nextVerification,
  answers: {},
  verify: true
});
assert.ok(verified);
assert.equal(verified.readyToGenerate, true);
assert.equal(verified.protectedTransition.nextVerification.status, "verified");
assert.equal(verified.protectedTransition.nextVerification.draftHash, completed.protectedTransition.nextVerification.draftHash, "explicit verification promotes the same protected draft");

const reviewPageSource = fs.readFileSync(path.join(rootDir, "src/app/briefcase/[packetId]/review/page.tsx"), "utf8");
if (reviewPageSource.includes("decorateBriefcaseItemForPresentation")) {
  assert.ok(reviewPageSource.includes('item?.packetDraft.status === "available"'), "review must require the protected packet draft");
  assert.ok(reviewPageSource.includes("<PacketVerificationAction"), "review actions must cross the explicit protected verification client boundary");
  assert.ok(!reviewPageSource.includes("packetInformationModelFor(storedItem)"), "review cannot fall back to raw participant packet information");
} else {
  const presentationAuthoritySource = fs.readFileSync(path.join(rootDir, "src/lib/expungement-ai/briefcase-presentation-authority.ts"), "utf8");
  assert.ok(presentationAuthoritySource.includes("protectedPacketInformationModelFor"), "server presentation must derive packet facts from protected authority before UI integration");
}
assert.ok(reviewPageSource.includes("packet-information?edit="), "every review row must route to its exact editable field");

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

// Exercise the real protected builder route boundary with local doubles. An
// authenticated owner may save an unpaid DTC packet through one CAS transition.
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

const verificationClientPath = "src/components/expungement-ai/packet-verification-client.ts";
if (fs.existsSync(path.join(rootDir, verificationClientPath))) {
  const { packetVerificationActions, requestPacketVerification } = loadTsWithMocks(verificationClientPath, {});
  assert.deepEqual(packetVerificationActions({ verified: false, packetReady: false, mode: "consumer" }), {
    openPacket: false,
    checkout: false,
    generation: null
  }, "unverified protected matters expose no commerce or generation action");
  assert.deepEqual(packetVerificationActions({ verified: true, packetReady: false, mode: "consumer" }), {
    openPacket: false,
    checkout: true,
    generation: null
  }, "only a verified consumer matter without Ready access exposes Checkout");
  assert.deepEqual(packetVerificationActions({ verified: true, packetReady: true, mode: "paid" }), {
    openPacket: true,
    checkout: false,
    generation: { mode: "paid_durable", label: "Prepare updated packet" }
  }, "paid Ready access remains open while updated generation is explicit");
  assert.deepEqual(packetVerificationActions({ verified: true, packetReady: true, mode: "sponsored" }), {
    openPacket: true,
    checkout: false,
    generation: null
  }, "sponsored Ready access does not spend another generation credit");
  assert.deepEqual(packetVerificationActions({ verified: true, packetReady: false, mode: "sponsored" }), {
    openPacket: false,
    checkout: false,
    generation: { mode: "sponsored_sync" }
  }, "verified sponsored generation remains separate from consumer Checkout");

  let verificationRequest = null;
  const verificationResponse = await requestPacketVerification({
    itemId: "matter/client-contract",
    answers: { court: "Hinds County Circuit Court" },
    fetchImpl: async (url, init) => {
      verificationRequest = { url, init };
      return new Response(JSON.stringify({ readyToGenerate: true, reviewReason: null, missingInputIds: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });
  assert.equal(verificationRequest.url, "/api/expungement-ai/briefcase/matter%2Fclient-contract/packet-information");
  assert.equal(verificationRequest.init.method, "POST");
  assert.deepEqual(JSON.parse(verificationRequest.init.body), {
    answers: { court: "Hinds County Circuit Court" },
    verify: true
  }, "the real protected client sends the exact explicit-verification payload");
  assert.deepEqual(verificationResponse, {
    ok: true,
    readyToGenerate: true,
    reviewReason: null,
    missingInputIds: []
  });
}

async function exerciseBuilderRoute(item, protectedVerification) {
  const transitions = [];
  const route = loadTsWithMocks("src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts", {
    "@/lib/rcap/briefcase/auth": {
      getRcapBriefcaseAuthState: async () => ({ isAuthenticated: true, isVerified: true, userId: "route-owner" })
    },
    "@/lib/expungement-ai/briefcase": {
      getBriefcaseItem: async (userId, itemId) => userId === "route-owner" && itemId === item.id ? item : null
    },
    "@/lib/expungement-ai/briefcase-presentation-authority": {
      protectedPacketVerificationSeedFromTrustedSource: () => null,
      readTrustedBriefcasePresentationSource: async () => ({ ok: false, reason: "not_expected_in_seeded_test" })
    },
    "@/lib/expungement-ai/packet-information": { packetInformationPatch, protectedPacketInformationModelFor },
    "@/lib/expungement-ai/verification-cas": {
      readProtectedPacketVerification: async () => ({
        ok: true,
        value: protectedVerification
      }),
      persistProtectedPacketVerification: async ({ transition }) => {
        transitions.push(transition);
        return { ok: true, value: transition.nextVerification };
      }
    }
  });
  const response = await route.POST(new Request(`https://local.test/api/expungement-ai/briefcase/${item.id}/packet-information`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers: { court: "Test court" }, verify: false })
  }), { params: Promise.resolve({ itemId: item.id }) });
  return { response, body: await response.json(), transitions };
}

const unpaidRouteResult = await exerciseBuilderRoute({ ...savedByResult.get("packet_ready"), artifactRefs: {} }, initialProtected);
assert.equal(unpaidRouteResult.response.status, 200, "unpaid owner must be able to save packet information");
assert.equal(unpaidRouteResult.transitions.length, 1);
assert.ok(unpaidRouteResult.body.reviewPath.endsWith("/review"));

console.log("Expungement.ai commercial-flow contract verification passed.");
console.log("- Every authoritative result lane saves to the free Briefcase; multiple packet matters stay independently unpaid and undeliverable.");
console.log("- Protected packet drafts initialize, preserve progress, resume without commercialFlow JSON, and verify through one CAS transition.");
console.log("- Review and builder routes consume the protected presentation/draft contracts; partner saves remain outside consumer Checkout.");
