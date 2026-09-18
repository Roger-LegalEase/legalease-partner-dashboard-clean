#!/usr/bin/env node
/**
 * The collection-policy control.
 *
 * `packetInformationModelFor` used to turn every required packet fact into its
 * own mandatory question. The collection policy decides instead HOW each fact
 * is obtained. That is a change to presentation and to sourcing, and it is
 * allowed to change neither the packet nor the route nor the payment boundary.
 * This proves it does not.
 *
 * The assertions are invariants, not implementation shapes. None of them says
 * "there are N builder questions"; a future grouping may change every count
 * here and still pass, which is the point.
 *
 * Controlling authority: docs/PRODUCT_CONTRACT.md. Stage 6 names the sections
 * and requires screening facts to prefill; section 13 forbids drifting copies
 * of one governed fact; Stages 8 and 9 keep final verification authoritative
 * and payment server-owned.
 */

import { readFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { routeDecidingFactIds } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const {
  PACKET_COLLECTION_SECTIONS,
  PACKET_SECTION_STATUSES,
  resolvePacketCollection,
  prepayGateFactIds
} = await import("../src/lib/expungement-ai/packet-collection.ts");
const { routeSafetyGateFactIds } = await import("../src/lib/expungement-ai/packet-route-safety.ts");
const { routeCollectionOverrideFor, baselineCarriedFactIds } = await import("../src/lib/expungement-ai/packet-collection-overrides.ts");
const packetInformation = await import("../src/lib/expungement-ai/packet-information.ts");
const presentation = await import("../src/lib/expungement-ai/briefcase-presentation-authority.ts");
const { renderPreflight } = await import("../src/lib/expungement-ai/render-preflight.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

// ---------------------------------------------------------------------------
// 1. The sections are the contract's, in both languages.
// ---------------------------------------------------------------------------

const contract = readFileSync(path.join(rootDir, "docs/PRODUCT_CONTRACT.md"), "utf8");
const stage6 = /### Stage 6 — Packet-information completion\s+Sections:([^]*?)\n\n/.exec(contract);
const contractSectionNames = (stage6?.[1] ?? "")
  .replace(/\s+/g, " ")
  .split("·")
  .map((name) => name.replace(/\.$/, "").trim())
  .filter(Boolean);
check(contractSectionNames.length > 0, "the Product Contract's Stage 6 section list is readable");

const ourHeadings = PACKET_COLLECTION_SECTIONS.map((section) => section.heading);
const missingFromOurs = contractSectionNames.filter((name) => !ourHeadings.includes(name));
const extraInOurs = ourHeadings.filter((name) => !contractSectionNames.includes(name));
check(
  missingFromOurs.length === 0 && extraInOurs.length === 0,
  `the collection sections are exactly the contract's Stage 6 sections`
    + (missingFromOurs.length ? ` (missing: ${missingFromOurs.join(", ")})` : "")
    + (extraInOurs.length ? ` (not in the contract: ${extraInOurs.join(", ")})` : "")
);

check(
  PACKET_COLLECTION_SECTIONS.every((section) =>
    section.translations?.es?.heading?.trim()
    && section.translations.es.description?.trim()
    && section.translations.es.heading !== section.heading),
  "every section ships a Spanish heading and description that are not the English ones"
);

check(
  PACKET_SECTION_STATUSES.join(",") === "not_started,in_progress,complete,needs_attention",
  "the section statuses are the contract's four: Not started, In progress, Complete, Needs attention"
);

const localization = readFileSync(path.join(rootDir, "src/lib/expungement-ai/localization.ts"), "utf8");
check(
  ["packet.section.not_started", "packet.section.in_progress", "packet.section.complete",
    "packet.section.needs_attention", "packet.saving", "packet.saved"]
    .every((key) => new RegExp(`"${key.replace(/\./g, "\\.")}":\\s*\\{[^}]*es:`).test(localization)),
  "the section-status and autosave copy carry Spanish in the runtime catalog"
);

const builder = readFileSync(path.join(rootDir, "src/components/expungement-ai/PacketInformationBuilder.tsx"), "utf8");
check(
  /setSavedAt\(Date\.now\(\)\);/.test(builder)
    && builder.indexOf("setMissing(payload.missingInputIds") < builder.indexOf("setSavedAt(Date.now())"),
  "\"Saved\" is set only after the server's response is read, never from a client-side state update"
);

// ---------------------------------------------------------------------------
// 2. Nationwide: every required fact keeps exactly one disposition.
// ---------------------------------------------------------------------------

const resolutions = [];
let compiledPathways = 0;
let excluded = 0;
for (const profile of getAllJurisdictionProfiles()) {
  for (const pathway of profile.pathways ?? []) {
    compiledPathways += 1;
    const plan = packetPlanForPathway(profile, pathway.id);
    if (!plan || plan.requiredInputIds.length === 0) { excluded += 1; continue; }
    const jurisdiction = profile.jurisdiction.code;
    const routeKey = `${jurisdiction}:${pathway.id}`;
    resolutions.push({
      routeKey,
      requiredInputIds: plan.requiredInputIds,
      resolution: resolvePacketCollection({
        jurisdiction,
        pathwayId: pathway.id,
        requiredInputIds: plan.requiredInputIds,
        serverFacts: { jurisdiction, pathway_id: pathway.id },
        screeningAnswers: {},
        specification: packetSpecificationFor(routeKey) ?? null,
        routeDecidingFactIds: new Set([
          ...routeDecidingFactIds(profile, pathway),
          ...routeSafetyGateFactIds(jurisdiction, pathway.id)
        ]),
        baselineCarriedFactIds: baselineCarriedFactIds(routeKey),
        override: routeCollectionOverrideFor(routeKey)
      })
    });
  }
}

check(compiledPathways === resolutions.length + excluded, `every compiled pathway is audited or excluded (${compiledPathways} = ${resolutions.length} + ${excluded})`);

const unreconciled = resolutions.filter(({ requiredInputIds, resolution }) => {
  const before = [...new Set(requiredInputIds)].sort();
  const after = resolution.facts.map((fact) => fact.factId).sort();
  return before.length !== after.length || before.some((id, index) => id !== after[index]);
});
check(unreconciled.length === 0, `every required fact resolves to exactly one disposition on every route (${unreconciled.length} route(s) do not reconcile)`);

const withUnresolved = resolutions.filter(({ resolution }) => resolution.unresolvedRequiredFacts.length > 0);
check(withUnresolved.length === 0, `no route has a required fact the existing authority cannot classify (${withUnresolved.length})`);

// ---------------------------------------------------------------------------
// 3. No participant is ever asked for a field another actor owns.
// ---------------------------------------------------------------------------

const leakedExternalActor = resolutions.filter(({ routeKey, resolution }) => {
  const specification = packetSpecificationFor(routeKey);
  const ownership = specification?.fieldOwnership ?? {};
  const externallyOwned = new Set([
    ...(ownership.participantAtSigningFields ?? []),
    ...(ownership.participantAtServiceFields ?? []),
    ...(ownership.notaryOwnedFields ?? []),
    ...(ownership.prosecutorOwnedFields ?? []),
    ...(ownership.courtOwnedFields ?? [])
  ]);
  return prepayGateFactIds(resolution).some((factId) => externallyOwned.has(factId));
});
check(leakedExternalActor.length === 0, `no route asks the participant for a judge, clerk, prosecutor, notary or service-time field (${leakedExternalActor.length})`);

// ---------------------------------------------------------------------------
// 4. ROUTE DRIFT. The collection policy writes values the authoritative
//    re-evaluation reads. Adding a fact the evaluator consumes could change the
//    route, the result or payment authority. It must not.
// ---------------------------------------------------------------------------

const MS_PATHWAY = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const msProfile = getProfileByJurisdiction("MS");
const msPublic = projectPublicProfile(msProfile);
const chosen = [
  ["Are you asking about your own record?", "Yes"],
  ["Did this case happen in Mississippi (not a federal case)?", "State or local"],
  ["How did the case end?", "The case was dropped or thrown out"],
  ["What kind of charge was it?", "Misdemeanor"],
  ["Do any of these sound like your situation?", "Non-conviction expungement for dismissal, no disposition, or acquittal"],
  ["About how long ago did this case end or get resolved?", "More than 10 years ago"],
  ["Have you completed everything the court ordered in this case?", "Yes"]
];
const msAnswers = {};
for (const [prompt, desired] of chosen) {
  const question = msPublic.questions.find((entry) => entry.prompt === prompt);
  const option = (question?.options ?? []).find((candidate) => {
    const label = question.optionDisplay?.[candidate]?.label ?? candidate;
    return label.toLowerCase().startsWith(desired.toLowerCase());
  });
  if (question && option) msAnswers[question.id] = option;
}
check(Object.keys(msAnswers).length === chosen.length, "the Mississippi screening answers resolve against the published guided check");

const evaluateWith = (extra) => {
  const seeded = presentation.protectedPacketVerificationSeedFromTrustedSource({
    jurisdiction: "MS",
    profileVersion: msProfile.profileVersion,
    matterId: "11111111-1111-4111-8111-111111111111",
    answers: { ...msAnswers, ...extra },
    product: "expungement_ai_dtc",
    sourceSessionId: "44444444-4444-4444-8444-444444444444",
    claimedAt: "2026-09-16T12:00:00.000Z",
    partnerBenefitActive: false,
    partnerSlug: null
  });
  const evaluation = seeded?.authoritative?.evaluation;
  return evaluation
    ? {
      pathwayId: evaluation.pathwayId ?? null,
      resultCode: evaluation.resultCode,
      paymentAllowed: evaluation.paymentAllowed,
      packetType: seeded.authoritative.packetType ?? null,
      selectedTrackId: seeded.authoritative.selectedTrackId ?? null,
      treatmentClassification: evaluation.treatmentClassification ?? null,
      packetPlan: JSON.stringify(evaluation.packetPlan ?? null)
    }
    : null;
};

const screeningOnly = evaluateWith({});
check(Boolean(screeningOnly) && screeningOnly.paymentAllowed === true, `the screening answers alone reach a payable route (${screeningOnly?.resultCode ?? "none"})`);

/**
 * The baseline is what the ACCEPTED system carried, not nothing. Mississippi's
 * non-conviction route always carried `offense_category` from the charge level
 * and `sentence_completion_date` from an explicit "yes" to everything the court
 * ordered, and those values already reached the evaluator. Comparing the new
 * behaviour against no carry at all would measure a baseline that never
 * existed; the question is whether the collection policy feeds the evaluator
 * anything the accepted system did not.
 */
const baselineCarry = {};
const offenseLevel = String(msAnswers.offense_level ?? "").trim();
if (offenseLevel && !/not sure/i.test(offenseLevel)) baselineCarry.offense_category = offenseLevel;
if (String(msAnswers.court_requirements_completed ?? "").trim().toLowerCase() === "yes") {
  baselineCarry.sentence_completion_date = "Yes";
}
const baselineEvaluation = evaluateWith(baselineCarry);

const carried = packetInformation.carriedForwardPacketAnswers("MS", MS_PATHWAY, msAnswers, {});
const withCarried = evaluateWith(carried);
check(
  JSON.stringify(baselineEvaluation) === JSON.stringify(withCarried),
  "the collection policy feeds the evaluator nothing the accepted baseline did not: route, result code, payment authority, packet type, track, treatment and packet plan are identical"
);
check(
  Object.keys(baselineCarry).every((factId) => carried[factId] === baselineCarry[factId]),
  "every fact the accepted baseline carried is still carried, with the same value"
);

// The guard that makes the line above true by construction rather than by luck.
const msPathway = msProfile.pathways.find((pathway) => pathway.id === MS_PATHWAY);
const msDeciding = new Set([
  ...routeDecidingFactIds(msProfile, msPathway),
  ...routeSafetyGateFactIds("MS", MS_PATHWAY)
]);
const msBaseline = baselineCarriedFactIds(`MS:${MS_PATHWAY}`);
const synthesizedRouteFacts = Object.keys(carried).filter(
  (factId) => msDeciding.has(factId) && !msBaseline.has(factId) && !(factId in msAnswers)
);
check(
  synthesizedRouteFacts.length === 0,
  `no fact the evaluator reads is synthesized from a different answer outside the accepted baseline (${synthesizedRouteFacts.join(", ") || "none"})`
);

// ---------------------------------------------------------------------------
// 5. Saved builder answers never retire a question, so an answered fact stays
//    editable in the builder rather than vanishing from it.
// ---------------------------------------------------------------------------

const msPlan = packetPlanForPathway(msProfile, MS_PATHWAY);
const msServerFacts = { jurisdiction: "MS", pathway_id: MS_PATHWAY };
const resolveMs = (extra) => resolvePacketCollection({
  jurisdiction: "MS",
  pathwayId: MS_PATHWAY,
  requiredInputIds: msPlan.requiredInputIds,
  serverFacts: msServerFacts,
  screeningAnswers: msAnswers,
  specification: packetSpecificationFor(`MS:${MS_PATHWAY}`),
  routeDecidingFactIds: msDeciding,
  baselineCarriedFactIds: msBaseline,
  override: routeCollectionOverrideFor(`MS:${MS_PATHWAY}`),
  ...extra
});
const beforeAnswering = prepayGateFactIds(resolveMs({}));
const afterAnswering = prepayGateFactIds(resolveMs({ savedAnswers: { county: "Hinds County", court: "Hinds County Circuit Court" } }));
check(
  beforeAnswering.includes("county") && afterAnswering.includes("county"),
  "answering a question in the builder does not remove it from the builder"
);

// ---------------------------------------------------------------------------
// 6. The Mississippi reference route, as an invariant rather than a count.
// ---------------------------------------------------------------------------

const msResolution = resolveMs({});
const msSections = msResolution.groupedParticipantSections;
check(msSections.length > 0 && msSections.length < msPlan.requiredInputIds.length,
  `the reference route collects ${msPlan.requiredInputIds.length} facts through ${msSections.length} sections rather than one screen each`);
check(
  msSections.every((section) => PACKET_COLLECTION_SECTIONS.some((known) => known.id === section.id)),
  "every section the reference route renders is one of the contract's sections"
);
const msGate = new Set(prepayGateFactIds(msResolution));
const msAccountedFor = msResolution.facts.length;
check(msAccountedFor === new Set(msPlan.requiredInputIds).size, "the reference route accounts for every required fact exactly once");
check(
  msResolution.filingReadinessItems.every((factId) => msGate.has(factId)),
  "filing-readiness facts stay inside the pre-Checkout gate, where the contract's Stage 6 puts them"
);

// ---------------------------------------------------------------------------
// 6b. EXISTING MATTERS. A matter saved before this change carries a prefilled
//     map derived by the old rules. It must still resolve, still account for
//     every fact, and never lose a saved answer.
// ---------------------------------------------------------------------------

// The old shape: only what the accepted baseline carried, plus whatever the
// participant had already typed into the builder.
const legacyPrefilled = { offense_category: "Misdemeanor", sentence_completion_date: "Yes" };
const legacySaved = { county: "Hinds County", court: "Hinds County Circuit Court", case_number: "25-CR-000123" };
const legacyResolution = resolveMs({ prefilledAnswers: legacyPrefilled, savedAnswers: legacySaved });
check(
  legacyResolution.facts.length === new Set(msPlan.requiredInputIds).size,
  "a matter saved under the old rules still accounts for every required fact"
);
const legacyGate = new Set(prepayGateFactIds(legacyResolution));
check(
  Object.keys(legacySaved).every((factId) => legacyGate.has(factId)),
  "answers the participant already saved stay in the builder, editable, rather than disappearing"
);
check(
  Object.keys(legacyPrefilled).every((factId) => !legacyGate.has(factId)),
  "facts the old rules had already carried forward are not asked again"
);
check(
  legacyResolution.unresolvedRequiredFacts.length === 0,
  "an existing matter needs no migration to resolve: nothing about it is unclassifiable"
);

// ---------------------------------------------------------------------------
// 7. Render preflight fails closed.
// ---------------------------------------------------------------------------

const specification = packetSpecificationFor(`MS:${MS_PATHWAY}`);
const completeFacts = Object.fromEntries(
  specification.requiredFacts.map((fact) => [fact.factId, factValueFor(fact.factId)])
);
/**
 * A fixture that satisfies the route's own rules, not merely its fact list.
 * The composer validates Mississippi's route-specific facts — the arrest and
 * release confirmations, the identifier match between the full Social Security
 * number and its last four, the exhibit statuses, and a court-approved MCIC
 * identifier channel confirmed on or before the verification date — so a
 * preflight fixture that ignored those would be proving nothing.
 */
function factValueFor(factId) {
  if (factId === "social_security_number") return "123-45-6789";
  if (factId === "social_security_number_last_four") return "6789";
  if (factId === "mcic_identifier_delivery_method") return "Confidential court-approved MCIC identifier addendum";
  if (factId === "mcic_identifier_method_confirmation_source") return "Confirmed by the Hinds County Circuit Court on 2026-01-05";
  if (factId === "certified_disposition_exhibit_status") return "Attached as Exhibit A";
  if (factId === "docket_sheet_exhibit_status") return "Inserted as Exhibit B";
  if (factId === "service_address_confirmation_status") return "Confirmed by court or prosecutor";
  if (/_date$/.test(factId) || factId === "date_of_birth") return "2015-01-15";
  if (factId === "statutory_disposition_category") return "Charges dropped";
  if (factId === "disposition_record_wording") return "Charges dropped";
  if (factId === "actual_arrest" || factId === "release_confirmed") return "Yes";
  if (factId === "personal_impact_confirmed") return "No";
  if (factId === "record_type") return "Court case";
  if (["pending_cases", "trafficking_status", "prior_relief", "nonadjudication_or_diversion", "open_co_defendant_matter"].includes(factId)) return "No";
  return "Acceptance value";
}
const snapshot = {
  schemaVersion: "expungement-ai/final-verification/v1",
  verifiedAt: "2026-09-16T12:00:00.000Z",
  jurisdiction: "MS",
  pathwayId: MS_PATHWAY,
  selectedTrackId: specification.trackId,
  screeningAnswers: {},
  prefilledAnswers: {},
  packetAnswers: completeFacts,
  serverFacts: msServerFacts
};

const complete = renderPreflight({ snapshot, verificationHash: "hash-complete", facts: { ...completeFacts, ...msServerFacts } });
check(complete.ready === true, `the preflight passes when every render-required fact is present (${complete.ready ? "ready" : complete.reason})`);

const withoutOne = { ...completeFacts };
delete withoutOne.case_number;
const incomplete = renderPreflight({ snapshot, verificationHash: "hash-incomplete", facts: { ...withoutOne, ...msServerFacts } });
check(incomplete.ready === false && incomplete.missingFactIds.includes("case_number"),
  "the preflight refuses, naming the missing fact, when a render-required fact is absent");

const wrongTrack = renderPreflight({
  snapshot: { ...snapshot, selectedTrackId: "some-other-track" },
  verificationHash: "hash-complete",
  facts: { ...completeFacts, ...msServerFacts }
});
check(wrongTrack.ready === false, "the preflight refuses a specification that does not name this matter's own track");

const changedFact = renderPreflight({
  snapshot,
  verificationHash: "hash-complete",
  facts: { ...completeFacts, case_number: "different-case-number", ...msServerFacts }
});
check(
  changedFact.ready === true && changedFact.renderInputHash !== complete.renderInputHash,
  "the render-input hash changes when a fact changes, so a stale input cannot pass for a current one"
);

const differentVerification = renderPreflight({ snapshot, verificationHash: "hash-other", facts: { ...completeFacts, ...msServerFacts } });
check(
  differentVerification.renderInputHash !== complete.renderInputHash,
  "the render-input hash is bound to the verification it was proven against"
);

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error(`PACKET COLLECTION CONTROL FAILED — ${failures.length} invariant(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`packet collection control passed — ${resolutions.length} route(s), every required fact accounted for, no route drift, preflight fails closed.`);
