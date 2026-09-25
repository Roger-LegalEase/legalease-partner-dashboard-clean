import { MISSISSIPPI_SYNTHETIC_PACKET_FACTS } from "./rcap-ms-nonconviction-synthetic-facts.mjs";
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
const cleanPacketAnswers = MISSISSIPPI_SYNTHETIC_PACKET_FACTS;
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

// Run 36167663663: valid hashes do not make participant-delivery facts safe.
const packetAuthority = await import("../src/lib/expungement-ai/packet-information.ts");
const { mississippiParticipantDeliverySafety } = await import("../src/lib/expungement-ai/packet-route-safety.ts");
const { composablePacketSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { composeParticipantDeliveryPacket } = await import("../src/lib/rcap/grade-a/participant-packet.ts");
const { GradeAPacketCompositionError } = await import("../src/lib/rcap/grade-a/composer.ts");
const { createHash } = await import("node:crypto");
const routeKey = `MS:${PACKET_PATHWAY_ID}`;
const specification = composablePacketSpecificationFor(routeKey);
const canonicalFacts = Object.fromEntries(Object.entries(cleanPacketAnswers).map(([key,value]) => [key,typeof value === "object" ? value.value : value]));
const participantMatter = {routeKey,jurisdiction:"MS",pathwayId:PACKET_PATHWAY_ID,facts:canonicalFacts,
  verifiedAt:verified.protectedTransition.nextVerification.snapshot.verifiedAt,verificationHash:"a".repeat(64),generationPurpose:"participant_delivery"};
const validPacket = composeParticipantDeliveryPacket(specification,participantMatter);
assert.ok(validPacket.documents.length > 0);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
const hash = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const protectedWith = (changes, at=participantMatter.verifiedAt) => {
  const record=structuredClone(verified.protectedTransition.nextVerification);
  for(const snap of [record.snapshot,record.draftSnapshot]) {
    for(const [key,value] of Object.entries(changes)) {
      for(const map of ["screeningAnswers","prefilledAnswers","packetAnswers"]) delete snap[map][key];
      snap.packetAnswers[key]=value;
    }
  }
  record.snapshot.verifiedAt=at;
  record.hash=hash(record.snapshot);record.draftHash=hash(record.draftSnapshot);
  return record;
};
const mutations = [
  ["full SSN length",{social_security_number:"1234"}],
  ["last four length",{social_security_number_last_four:"125"}],
  ["SSN agreement",{social_security_number_last_four:"0123"}],
  ["protected MCIC channel",{mcic_identifier_delivery_method:"Public filing"}],
  ["court/clerk confirmation",{mcic_identifier_method_confirmation_source:"Hinds County Circuit Court"}],
  ["malformed date",{mcic_identifier_method_confirmation_source:"Confirmed by the Hinds County Circuit Clerk on 2026-02-30"}],
  ["future date",{mcic_identifier_method_confirmation_source:"Confirmed by the Hinds County Circuit Clerk on 2999-01-01"}],
  ["actual arrest",{actual_arrest:"No"}],
  ["release",{release_confirmed:"No"}],
  ["custodial arrest record",{record_type:"Citation only; no custodial arrest"}],
  ["unknown wrapper",{social_security_number:{value:"999-88-0125",unknown:true}}]
];
for(const [name,changes] of mutations) {
  assert.equal(mississippiParticipantDeliverySafety({...canonicalFacts,...changes},participantMatter.verifiedAt).safe,false,name);
  const saved=packetInformationPatch({existingItem:reviewMatter,protectedVerification:completed.protectedTransition.nextVerification,answers:changes,verify:true});
  assert.ok(!saved || !saved.readyToGenerate,`${name}: draft cannot verify`);
  assert.throws(()=>packetAuthority.requireCurrentPacketVerificationRecord(reviewMatter,protectedWith(changes)),packetAuthority.CurrentPacketVerificationRequiredError,`${name}: protected currentness`);
  assert.throws(()=>composeParticipantDeliveryPacket(specification,{...participantMatter,facts:{...canonicalFacts,...changes}}),GradeAPacketCompositionError,`${name}: composition`);
}
const badProtected = protectedWith({social_security_number:"25-CR-000123",social_security_number_last_four:"0123",
  mcic_identifier_method_confirmation_source:"Hinds County Circuit Court"});
assert.equal(badProtected.status,"verified");
assert.equal(hash(badProtected.snapshot),badProtected.hash);
const badModel=protectedPacketInformationModelFor(badProtected);
assert.ok(badModel,"unsafe protected facts remain available to correct, without rewriting history");
assert.equal(badModel.reviewSafety.safe,false);
assert.notEqual(badModel.stage,"ready_to_generate");
assert.equal(badModel.reviewedAt,null);
assert.throws(()=>packetAuthority.requireCurrentPacketVerificationRecord(reviewMatter,badProtected),packetAuthority.CurrentPacketVerificationRequiredError);
const { decorateBriefcaseItemForPresentationWithDependencies } = await import("../src/lib/expungement-ai/briefcase-presentation-authority.ts");
const badPresentation = await decorateBriefcaseItemForPresentationWithDependencies({consumerAuthUserId:USER_ID,item:reviewMatter}, {
  readProtectedVerification:async()=>({ok:true,value:badProtected}),
  readProtectedArtifact:async()=>({ok:true,value:null}),
  readPaymentAuthority:async()=>({valid:false}),
  readTrustedPendingSource:async()=>({ok:false,reason:"fixture source not needed"}),
  evaluateAuthoritative:evaluateAuthoritativeScreeningResult
});
assert.equal(badPresentation.verificationStatus,"invalidated");
assert.equal(badPresentation.packetDraft.reviewSafety.safe,false);
const React = require("react");
const clientActions = loadTsWithMocks("src/components/expungement-ai/packet-verification-client.ts",{});
const {PacketVerificationAction} = loadTsWithMocks("src/components/expungement-ai/PacketVerificationAction.tsx",{
  "next/navigation":{useRouter:()=>({refresh(){}})},
  "@/components/expungement-ai/LocalizationProvider":{useLocalization:()=>({text:x=>x})},
  "@/components/expungement-ai/packet-verification-client":clientActions,
  "@/app/expungement-ai/pay/ConsumerCheckoutButton":{ConsumerCheckoutButton:()=>{throw Error("unsafe facts exposed checkout");}},
  "@/components/expungement-ai/PacketGenerateButton":{PacketGenerateButton:()=>{throw Error("unsafe facts exposed generation");}}
});
const unsafeHtml = require("react-dom/server").renderToStaticMarkup(React.createElement(PacketVerificationAction,{
  itemId:reviewMatter.id,verificationAnswers:badModel.initialAnswers,initiallyVerified:false,
  canVerify:badModel.reviewSafety.safe,mode:"sponsored",
  commercialActions:{...badPresentation.commercialActions,fulfillmentAvailable:true}
}));
assert.doesNotMatch(unsafeHtml,/Verify and prepare clinic packet|I verified these packet facts/);

// Stored verifiedAt, not today's date, decides whether confirmation was future.
assert.throws(()=>packetAuthority.requireCurrentPacketVerificationRecord(reviewMatter,protectedWith({},"2026-08-14T23:59:59Z")),packetAuthority.CurrentPacketVerificationRequiredError);
// The prospective timestamp is exactly the one persisted in the final snapshot.
const RealDate=globalThis.Date;
try {
  globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:["2026-08-14T23:59:59Z"]));}};
  assert.equal(packetInformationPatch({existingItem:reviewMatter,protectedVerification:completed.protectedTransition.nextVerification,answers:{},verify:true}).readyToGenerate,false);
} finally {globalThis.Date=RealDate;}
for(const method of ["Confidential court-approved MCIC identifier addendum","Court-approved MCIC identifier sheet","Court-approved nonpublic certified copy","Court-approved signed-order identifier channel"]) {
  const facts={...canonicalFacts,mcic_identifier_delivery_method:method};
  assert.equal(mississippiParticipantDeliverySafety(facts,participantMatter.verifiedAt).safe,true);
  assert.ok(composeParticipantDeliveryPacket(specification,{...participantMatter,facts}).documents.length);
}
const internalFacts={...canonicalFacts,mcic_identifier_delivery_method:"internal review only",mcic_identifier_method_confirmation_source:"Not confirmed"};
assert.ok(composeParticipantDeliveryPacket(specification,{...participantMatter,generationPurpose:"internal_review",facts:internalFacts}));
assert.throws(()=>composeParticipantDeliveryPacket(specification,{...participantMatter,facts:internalFacts}),GradeAPacketCompositionError);
assert.throws(()=>composeParticipantDeliveryPacket(specification,{...participantMatter,generationPurpose:"internal_review",facts:{...internalFacts,social_security_number:"123"}}),GradeAPacketCompositionError);
const filingLater={...canonicalFacts,certified_disposition_exhibit_status:"To be obtained before filing",docket_sheet_exhibit_status:"To be obtained before filing",service_address_confirmation_status:"To be confirmed before filing or service"};
assert.equal(mississippiParticipantDeliverySafety(filingLater,participantMatter.verifiedAt).safe,true);
assert.ok(composeParticipantDeliveryPacket(specification,{...participantMatter,facts:filingLater}));

// Execute actual POST + generation function, with real currentness and inert external ports.
const calls={unexpected:[],artifactReads:0};
const importDoubles = relative => Object.fromEntries(ts.createSourceFile(relative,fs.readFileSync(path.join(rootDir,relative),"utf8"),ts.ScriptTarget.Latest,true).statements
  .filter(ts.isImportDeclaration).map(statement=>[statement.moduleSpecifier.text,new Proxy({}, {get:(_,key)=>()=>{calls.unexpected.push(String(key));throw new Error(`unexpected side effect ${String(key)}`);}})]));
const generationPath="src/lib/expungement-ai/packet-generation.ts";
const generationMocks=importDoubles(generationPath);
generationMocks["@/lib/expungement-ai/briefcase"]={getBriefcaseItem:async()=>reviewMatter};
generationMocks["@/lib/expungement-ai/verification-cas"]={readProtectedPacketArtifact:async()=>{calls.artifactReads++;return {ok:true,value:null};}};
generationMocks["@/lib/expungement-ai/packet-information"]={...packetAuthority,
  requireCurrentPacketVerification:async()=>packetAuthority.requireCurrentPacketVerificationRecord(reviewMatter,badProtected)};
const generation=loadTsWithMocks(generationPath,generationMocks);
const routePath="src/app/api/expungement-ai/packet/generate/route.ts";
const routeMocks=importDoubles(routePath);
routeMocks["next/server"]={NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}};
routeMocks["@/lib/expungement-ai/auth"]={requireConsumerBriefcaseSession:async()=>({userId:USER_ID})};
routeMocks["@/lib/expungement-ai/packet-generation"]=generation;
routeMocks["@/lib/expungement-ai/packet-information"]=packetAuthority;
routeMocks["@/lib/rcap/render/commercial-admission"]={CommercialAdmissionDeniedError:class extends Error{}};
const generateRoute=loadTsWithMocks(routePath,routeMocks);
const response=await generateRoute.POST({json:async()=>({briefcaseItemId:reviewMatter.id})});
assert.equal(response.status,409);
assert.deepEqual(await response.json(),{error:"Current final verification is required before packet generation."});
assert.equal(calls.artifactReads,1);
assert.deepEqual(calls.unexpected,[],"zero sponsorship resolution/consumption, composition, enqueue, artifact writes or finalization");
const {assembleParticipantPacket}=await import("../src/lib/rcap/render/participant-packet-assembly.ts");
const assembly=await assembleParticipantPacket(validPacket,{routeKey,specification,variant:"full",locale:"en",verifiedAt:participantMatter.verifiedAt,
  matter:{preparedFor:canonicalFacts.participant_full_legal_name,preparedOn:participantMatter.verifiedAt.slice(0,10),jurisdiction:"MS",courtOrAgency:canonicalFacts.court_name,caseOrMatter:canonicalFacts.case_number,remedy:specification.pathwayLabel,packetId:"local-ms-safety-parity"}});
assert.ok(assembly.bytes.length>1000 && assembly.guideAssembled);
console.log(`MS gate parity: ${mutations.length}/${mutations.length} draft/currentness/composer mutations; exact protected bad snapshot HTTP409; zero side-effect calls; full participant PDF ${assembly.bytes.length} bytes; sha256 ${createHash("sha256").update(assembly.bytes).digest("hex")}`);

// PostgreSQL jsonb may reorder every object's keys. Ordering changes must retain
// authority, while a changed fact with the same stored hash must still fail.
const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reverseKeys(value[key])]))
    : value;
const reorderedVerification = reverseKeys(verified.protectedTransition.nextVerification);
assert.ok(protectedPacketInformationModelFor(reorderedVerification), "final verification survives jsonb key reordering");
const modifiedVerification = structuredClone(reorderedVerification);
modifiedVerification.snapshot.packetAnswers.participant_full_legal_name = "Unverified changed name";
assert.equal(protectedPacketInformationModelFor(modifiedVerification), null, "key-order tolerance never authorizes changed facts");

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
      jsx: ts.JsxEmit.ReactJSX,
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
  // Brought forward on 2026-09-22 for task #52. This asserted that verification
  // alone exposed Checkout. That is exactly the defect #52 was commissioned to
  // remove: the participant CTA must follow server authority, not the
  // evaluator's own paymentAllowed. The assertion is therefore strengthened
  // rather than relaxed -- it now pins BOTH directions, so a regression that
  // re-widened checkout would fail here again.
  assert.deepEqual(packetVerificationActions({ verified: true, packetReady: false, mode: "consumer" }), {
    openPacket: false,
    checkout: false,
    generation: null
  }, "a verified consumer matter WITHOUT server checkout authority exposes no Checkout");
  assert.deepEqual(packetVerificationActions({
    verified: true, packetReady: false, mode: "consumer",
    commercialActions: { checkoutAllowed: true }
  }), {
    openPacket: false,
    checkout: true,
    generation: null
  }, "only server-granted checkout authority exposes Checkout");
  assert.deepEqual(packetVerificationActions({
    verified: true, packetReady: true, mode: "consumer",
    commercialActions: { checkoutAllowed: true }
  }), {
    openPacket: true,
    checkout: false,
    generation: null
  }, "an already-Ready consumer matter exposes the packet, never a second Checkout");
  // Also brought forward for #52: generation now follows server authority too,
  // so the no-authority case is pinned first and the granted case second.
  assert.deepEqual(packetVerificationActions({ verified: true, packetReady: true, mode: "paid" }), {
    openPacket: true,
    checkout: false,
    generation: null
  }, "paid Ready access stays open but offers no generation without server authority");
  assert.deepEqual(packetVerificationActions({
    verified: true, packetReady: true, mode: "paid",
    commercialActions: { generationAllowed: true }
  }), {
    openPacket: true,
    checkout: false,
    generation: { mode: "paid_durable", label: "Prepare updated packet" }
  }, "paid Ready access remains open while updated generation is explicit and server-granted");
  assert.deepEqual(packetVerificationActions({ verified: true, packetReady: true, mode: "sponsored" }), {
    openPacket: true,
    checkout: false,
    generation: null
  }, "sponsored Ready access does not spend another generation credit");
  assert.deepEqual(packetVerificationActions({ verified: true, packetReady: false, mode: "sponsored" }), {
    openPacket: false,
    checkout: false,
    generation: null
  }, "sponsored generation is not offered without server authority either");
  assert.deepEqual(packetVerificationActions({
    verified: true, packetReady: false, mode: "sponsored",
    commercialActions: { generationAllowed: true }
  }), {
    openPacket: false,
    checkout: false,
    generation: { mode: "sponsored_sync" }
  }, "verified sponsored generation remains separate from consumer Checkout, and still never exposes Checkout");

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
  // Brought forward for #52: the verification response now carries the
  // server-owned commercial authority block. It is pinned here rather than
  // loosened out of the equality, so a server that started handing back
  // permissive defaults would fail this control.
  assert.deepEqual(verificationResponse, {
    ok: true,
    readyToGenerate: true,
    reviewReason: null,
    missingInputIds: [],
    commercialActions: {
      checkoutAllowed: false,
      fulfillmentAvailable: false,
      generationAllowed: false
    }
  }, "verification returns server-owned authority, and it defaults closed when the server states nothing");
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
      readTrustedBriefcasePresentationSource: async () => ({ ok: false, reason: "not_expected_in_seeded_test" }),
      // Added for #52, which routes the response's commercial authority through
      // presentation. This seeded fixture has no Grade-A fulfillment record and
      // no entitlement, so the faithful stand-in is authority closed on every
      // axis -- the same refusal the real resolver returns with nothing to grant.
      // Stubbing it open would make every downstream assertion here meaningless.
      decorateBriefcaseItemForPresentation: async ({ item }) => ({
        ...item,
        commercialActions: { checkoutAllowed: false, fulfillmentAvailable: false, generationAllowed: false }
      })
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
