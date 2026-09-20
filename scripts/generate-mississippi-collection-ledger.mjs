#!/usr/bin/env node
/**
 * The Mississippi collection ledger: one row per required packet fact.
 *
 *   node scripts/generate-mississippi-collection-ledger.mjs [--check]
 *
 * MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal is
 * the reference route for the packet-information correction, and the route
 * where a grouped questionnaire could most easily look corrected without being
 * corrected. This ledger exists so that cannot happen: every fact is placed
 * against the authority that decides it, and the reason each one is or is not
 * required before payment is written down rather than inherited.
 *
 * The distinction the ledger is built to expose is this one:
 *
 *   "the packet specification requires this fact"
 *
 * is NOT
 *
 *   "the participant must answer this as an independent question before
 *    Checkout".
 *
 * The product contract this ledger is measured against is the existing one,
 * and it is deliberately NOT being changed:
 *
 *   free guided check -> authoritative result -> free Briefcase
 *   -> complete packet information -> second authoritative verification
 *   -> $50 Checkout -> packet generation
 *
 * Everything needed to GENERATE the packet, and everything needed to RECONFIRM
 * the route, is collected before payment. That is a promise to the participant,
 * not friction: we do not take $50 and then discover we cannot produce the
 * document. So this ledger never proposes moving a render fact after Checkout.
 *
 * What it does test is whether each fact has to be its own separate question.
 * Four things can make a fact required, and they are not the same thing:
 *
 *   A generate  - printed by a document in the purchased packet
 *   B reconfirm - determines or protects the route at the second verification
 *   C filing    - needed only later, before the participant files or serves
 *   D external  - filled later by the court, the prosecutor or a notary
 *
 * A and B are resolved before Checkout. C belongs to the filing-readiness
 * workflow and is not dragged into the prepayment builder merely because the
 * filing process eventually needs it. D never enters participant intake.
 *
 * Authority used, in order: the registered packet specification (its per-fact
 * `use` statements, its `fieldOwnership`, and which of its documents actually
 * print each fact), the evaluator's route-deciding fact set, the route's own
 * safety gate, and the published guided-check question set. No legal question
 * is asked or answered here.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { routeDecidingFactIds } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { routeSafetyGateFactIds } = await import("../src/lib/expungement-ai/packet-route-safety.ts");
const { resolvePacketCollection, PACKET_COLLECTION_SECTIONS } = await import("../src/lib/expungement-ai/packet-collection.ts");
const { routeCollectionOverrideFor, baselineCarriedFactIds } = await import("../src/lib/expungement-ai/packet-collection-overrides.ts");

const JURISDICTION = "MS";
const PATHWAY_ID = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const ROUTE_KEY = `${JURISDICTION}:${PATHWAY_ID}`;

const ARTIFACT = path.join(rootDir, "data/expungement-ai/reports/mississippi-collection-ledger.json");
const SUMMARY = path.join(rootDir, "docs/expungement-ai/MISSISSIPPI_COLLECTION_LEDGER.md");

const PREPAY_PHASES = new Set([
  "prepay_required",
  "prepay_route_splitter",
  "prepay_hard_disqualifier",
  "prepay_timing_gate",
  "prepay_soft_confidence"
]);

/**
 * Screening ids that carry a packet fact's answer, mirroring the crosswalk the
 * resolver uses. A fact is only "supplied by screening" when the guided check
 * actually PUBLISHES the question; the compiled profile also carries
 * research-corpus questions that no participant ever sees.
 */
const SCREENING_CARRY_SOURCES = {
  case_outcome: ["case_outcome"],
  offense_level: ["offense_level"],
  jurisdiction: ["jurisdiction_scope"],
  pending_cases: ["pending_cases"],
  prior_relief: ["prior_relief"],
  financial_obligations: ["financial_obligations", "court_requirements_completed"],
  sentence_completion_date: ["sentence_completion_date", "court_requirements_completed"],
  trafficking_status: ["trafficking_status"],
  criminal_history: ["criminal_history"],
  pardon_status: ["pardon_status"],
  arrest_date: ["arrest_date"],
  disposition_date: ["disposition_date"]
};

/** Mirrors the derivations in src/lib/expungement-ai/packet-collection.ts. */
const DERIVATIONS = {
  social_security_number_last_four: {
    from: ["social_security_number"],
    rule: "the last four digits of the number itself"
  },
  offense_category: { from: ["offense_level"], rule: "the charge level the participant chose, unless it is unsure" },
  charge_classification: { from: ["offense_level"], rule: "the charge level the participant chose, unless it is unsure" },
  filing_location: { from: ["county"], rule: "the county the court sits in" },
  age_at_offense: {
    from: ["date_of_birth", "offense_date"],
    rule: "whole years between the two dates; computes nothing unless both are real calendar dates"
  },
  court_type: { from: ["court"], rule: "the court type named inside the court's own name, when it names one" },
  court_name: { from: ["court"], rule: "the court answer itself, when it already is a full court name" },
  contact_information: {
    from: ["mailing_address", "phone_number", "email_address"],
    rule: "the three contact facts written out; composed, never guessed"
  }
};

/**
 * The structured interactions come from the resolver's own section model, so
 * the ledger and the runtime can never describe two different experiences.
 */
const STRUCTURED_BLOCKS = PACKET_COLLECTION_SECTIONS.map((section) => ({
  id: section.id,
  heading: section.heading,
  factIds: null
}));

const profile = getProfileByJurisdiction(JURISDICTION);
const pathway = profile.pathways.find((candidate) => candidate.id === PATHWAY_ID);
const plan = packetPlanForPathway(profile, PATHWAY_ID);
const specification = packetSpecificationFor(ROUTE_KEY);
const serverFacts = { jurisdiction: JURISDICTION, pathway_id: PATHWAY_ID };

const publishedScreeningIds = new Set(
  (projectPublicProfile(profile).questions ?? [])
    .filter((question) => PREPAY_PHASES.has(question.lifecyclePhase))
    .map((question) => question.id)
);

const decidingFactIds = new Set([
  ...routeDecidingFactIds(profile, pathway),
  ...routeSafetyGateFactIds(JURISDICTION, PATHWAY_ID)
]);
const safetyGateFactIds = new Set(routeSafetyGateFactIds(JURISDICTION, PATHWAY_ID));

/** Which facts a document in the purchased packet actually prints. */
const printedFactIds = new Set();
for (const document of specification.documents ?? []) {
  for (const section of document.sections ?? []) {
    for (const field of section.fields ?? []) printedFactIds.add(field);
    for (const assertion of section.assertions ?? []) {
      for (const fact of assertion.facts ?? []) printedFactIds.add(fact);
    }
  }
}

const specFactById = new Map((specification.requiredFacts ?? []).map((fact) => [fact.factId, fact]));
const externalActorById = new Map();
const OWNERSHIP_ACTORS = {
  participantAtSigningFields: "participant_at_signing",
  notaryOwnedFields: "notary",
  prosecutorOwnedFields: "prosecutor",
  courtOwnedFields: "court",
  participantAtServiceFields: "participant_at_service"
};
for (const [key, actor] of Object.entries(OWNERSHIP_ACTORS)) {
  for (const factId of specification.fieldOwnership?.[key] ?? []) externalActorById.set(factId, actor);
}

const resolution = resolvePacketCollection({
  jurisdiction: JURISDICTION,
  pathwayId: PATHWAY_ID,
  requiredInputIds: plan.requiredInputIds,
  serverFacts,
  screeningAnswers: {},
  specification,
  routeDecidingFactIds: decidingFactIds,
  baselineCarriedFactIds: baselineCarriedFactIds(ROUTE_KEY),
  override: routeCollectionOverrideFor(ROUTE_KEY)
});
const resolvedByFactId = new Map(resolution.facts.map((fact) => [fact.factId, fact]));

const FILING_ONLY = /filing-readiness gate|assembly and filing|prevents an unverified|court-approved channel|source and date of the court-specific|service recipient|service address/;

function structuredInputFor(factId) {
  const section = resolution.groupedParticipantSections.find((candidate) => candidate.factIds.includes(factId));
  if (!section) return null;
  return {
    id: section.id,
    heading: section.heading,
    withFacts: section.factIds.filter((other) => other !== factId)
  };
}

function screeningSupplies(factId) {
  if (publishedScreeningIds.has(factId)) return { supplies: true, via: factId };
  for (const id of SCREENING_CARRY_SOURCES[factId] ?? []) {
    if (publishedScreeningIds.has(id)) return { supplies: true, via: id };
  }
  return { supplies: false, via: null };
}

const rows = [];
for (const factId of plan.requiredInputIds) {
  const resolved = resolvedByFactId.get(factId);
  const specFact = specFactById.get(factId);
  const use = String(specFact?.use ?? "");
  const screening = screeningSupplies(factId);
  const derivation = DERIVATIONS[factId] ?? null;
  const actor = externalActorById.get(factId) ?? null;

  const serverOwned = factId in serverFacts;
  const decidesRoute = decidingFactIds.has(factId) || safetyGateFactIds.has(factId);
  const rendersPacket = printedFactIds.has(factId);
  // C is the narrow case: a fact NO document prints and that no route
  // decision reads. A fact the packet prints is needed to GENERATE the
  // packet, whatever else it is also a readiness state for, so it stays
  // before Checkout.
  const filingOnly = !rendersPacket && !decidesRoute && FILING_ONLY.test(use);

  const requirement = serverOwned
    ? "server"
    : actor
      ? "D_external_actor"
      : rendersPacket
        ? "A_required_to_generate_packet"
        : decidesRoute
          ? "B_required_to_reconfirm_route"
          : filingOnly
            ? "C_required_only_before_filing"
            : "A_required_to_generate_packet";

  const structured = structuredInputFor(factId);

  // The disposition says HOW this fact is obtained before Checkout. A and B
  // are both obtained before Checkout; the question is only whether either
  // needs its own separate question.
  const disposition = serverOwned
    ? "REUSE_EXISTING_MATTER"
    : actor
      ? "EXTERNAL_ACTOR"
      : screening.supplies
        ? "REUSE_SCREENING"
        : derivation
          ? "DERIVE_DETERMINISTICALLY"
          : filingOnly
            ? "FILING_READINESS_ONLY"
            : resolved?.collection === "conditional"
              ? "CONDITIONAL_INPUT"
              : structured
                ? "STRUCTURED_MULTI_FACT_INPUT"
                : "INDEPENDENT_PACKET_INPUT";

  const whyBeforeCheckout = serverOwned
    ? "not asked; the server owns this route fact"
    : actor
      ? `not asked; ${actor} supplies this field later`
      : filingOnly
        ? "not asked before Checkout; no document in the packet prints it and no route decision reads it, so it belongs to the filing-readiness workflow"
        : rendersPacket
          ? "a document in the purchased packet prints this fact, so the platform must hold it before it charges for that packet"
          : decidesRoute
            ? "the second authoritative verification reads this fact when reconfirming the route and whether it may be sold"
            : "no authority establishes why this is needed before Checkout";
  rows.push({
    factId,
    specificationRequiresItBecause: use || "(the profile requires this packet input; the specification makes no statement about it)",
    currentSource: serverOwned ? "server route fact" : "builder question",
    screeningAlreadySupplies: screening.supplies,
    screeningSuppliesVia: screening.via,
    existingMatterOrProfileSupplies: serverOwned,
    deterministicallyDerivable: Boolean(derivation),
    derivationRule: derivation ? `${derivation.rule} (from ${derivation.from.join(", ")})` : null,
    structuredMultiFactInput: structured?.id ?? null,
    structuredInteractionHeading: structured?.heading ?? null,
    structuredWithFacts: structured?.withFacts ?? [],
    conditional: resolved?.collection === "conditional",
    condition: resolved?.condition ? `${resolved.condition.factId} is affirmative` : null,
    requiredToGeneratePacket: rendersPacket,
    requiredToReconfirmRouteBeforePayment: decidesRoute,
    requiredOnlyBeforeFilingOrService: filingOnly,
    externalActorOwned: Boolean(actor),
    externalActor: actor,
    requirementClass: requirement,
    whyRequiredBeforeCheckout: whyBeforeCheckout,
    resolverClassToday: resolved?.collection ?? "(unresolved)",
    finalDisposition: disposition
  });
}

const participantRows = rows.filter((row) => !(row.factId in serverFacts));
const byDisposition = {};
for (const row of participantRows) byDisposition[row.finalDisposition] = (byDisposition[row.finalDisposition] ?? 0) + 1;
const byRequirement = {};
for (const row of participantRows) byRequirement[row.requirementClass] = (byRequirement[row.requirementClass] ?? 0) + 1;

/** Facts the participant still has to supply themselves before Checkout. */
const asked = participantRows.filter((row) => (
  row.finalDisposition === "STRUCTURED_MULTI_FACT_INPUT"
  || row.finalDisposition === "INDEPENDENT_PACKET_INPUT"
  || row.finalDisposition === "CONDITIONAL_INPUT"
  || row.finalDisposition === "UNRESOLVED"
));

/**
 * The number that matters: coherent participant interactions before Checkout.
 *
 * A structured block the participant fills in once counts once, however many
 * facts it carries, because that is what the participant actually does. A fact
 * belonging to no block is its own interaction.
 */
const blocksTouched = new Map();
let standaloneInteractions = 0;
for (const row of asked) {
  if (row.structuredMultiFactInput) {
    const bucket = blocksTouched.get(row.structuredMultiFactInput) ?? [];
    bucket.push(row.factId);
    blocksTouched.set(row.structuredMultiFactInput, bucket);
  } else standaloneInteractions += 1;
}
const interactions = [...blocksTouched.entries()].map(([id, factIds]) => ({
  id,
  heading: STRUCTURED_BLOCKS.find((block) => block.id === id)?.heading ?? id,
  factIds
}));
const participantInteractions = interactions.length + standaloneInteractions;

const conditionalRows = participantRows.filter((row) => row.conditional);
const filingOnlyRows = participantRows.filter((row) => row.requiredOnlyBeforeFilingOrService);
const unresolvedRows = participantRows.filter((row) => row.finalDisposition === "UNRESOLVED");

const baselineScreens = participantRows.length;

const artifact = {
  schemaVersion: "expungement-ai/mississippi-collection-ledger/v2",
  generatedBy: "scripts/generate-mississippi-collection-ledger.mjs",
  routeKey: ROUTE_KEY,
  specificationId: specification.specificationId,
  specificationVersion: specification.specificationVersion,
  productContract: "free guided check -> authoritative result -> free Briefcase -> complete packet information -> second authoritative verification -> $50 Checkout -> packet generation. Everything needed to generate the packet and to reconfirm the route is collected BEFORE payment, and this ledger proposes no change to that.",
  totals: {
    requiredFacts: rows.length,
    serverOwned: rows.length - participantRows.length,
    participantFacts: participantRows.length,
    publishedGuidedCheckQuestions: publishedScreeningIds.size,
    factsPrintedBySomeDocument: printedFactIds.size
  },
  byRequirementClass: byRequirement,
  byDisposition,
  participantWorkload: {
    note: "Effort, not page count. A structured block counts as one interaction however many facts it carries, because that is what the participant does.",
    underlyingRequiredPacketFacts: rows.length,
    reusedFromScreening: byDisposition.REUSE_SCREENING ?? 0,
    reusedFromSavedContext: byDisposition.REUSE_EXISTING_MATTER ?? 0,
    deterministicallyDerived: byDisposition.DERIVE_DETERMINISTICALLY ?? 0,
    collectedThroughStructuredInputs: byDisposition.STRUCTURED_MULTI_FACT_INPUT ?? 0,
    conditionalFactsAskedOnlyWhenApplicable: conditionalRows.length,
    independentManualInputs: byDisposition.INDEPENDENT_PACKET_INPUT ?? 0,
    filingReadinessOnlyRemovedFromGenerationQuestionnaire: filingOnlyRows.length,
    filingReadinessOnlyFactIds: filingOnlyRows.map((row) => row.factId),
    externalActorFacts: byDisposition.EXTERNAL_ACTOR ?? 0,
    duplicateAsksEliminated: (byDisposition.REUSE_SCREENING ?? 0) + (byDisposition.DERIVE_DETERMINISTICALLY ?? 0),
    unresolved: unresolvedRows.length,
    baselineParticipantScreensBeforeCheckout: baselineScreens,
    participantInteractionsBeforeCheckout: participantInteractions,
    interactions
  },
  everyFactStillCollectedBeforeCheckout: participantRows.length - filingOnlyRows.length - (byDisposition.EXTERNAL_ACTOR ?? 0),
  rows
};

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

const w = artifact.participantWorkload;

const rowTable = participantRows.map((row) => [
  `| \`${row.factId}\``,
  row.requirementClass.replace(/^[A-D]_/, ""),
  row.screeningAlreadySupplies ? `screening (\`${row.screeningSuppliesVia}\`)` : row.deterministicallyDerivable ? "derived" : row.structuredMultiFactInput ? `\`${row.structuredMultiFactInput}\`` : "participant",
  row.conditional ? row.condition : "—",
  `\`${row.finalDisposition}\` |`
].join(" | ")).join("\n");

const summary = [
  "# Mississippi collection ledger",
  "",
  "Generated by `scripts/generate-mississippi-collection-ledger.mjs`. Do not edit by hand.",
  "",
  `Route: \`${ROUTE_KEY}\`  `,
  `Specification: \`${specification.specificationId}\` \`${specification.specificationVersion}\``,
  "",
  "## The contract this is measured against",
  "",
  artifact.productContract,
  "",
  "The question is not whether a fact is required — the specification requires all of them —",
  "but whether it has to be its own separate question.",
  "",
  "## Requirement class",
  "",
  "| Class | Facts |",
  "| --- | ---: |",
  ...Object.entries(byRequirement).sort().map(([name, count]) => `| \`${name}\` | ${count} |`),
  "",
  "## How each fact is obtained before Checkout",
  "",
  "| Disposition | Facts |",
  "| --- | ---: |",
  ...Object.entries(byDisposition).sort((left, right) => right[1] - left[1]).map(([name, count]) => `| \`${name}\` | ${count} |`),
  "",
  "## Participant workload before Checkout",
  "",
  `- Underlying required packet facts: **${w.underlyingRequiredPacketFacts}**`,
  `- Reused from the guided check: **${w.reusedFromScreening}**`,
  `- Reused from saved matter context: **${w.reusedFromSavedContext}**`,
  `- Deterministically derived: **${w.deterministicallyDerived}**`,
  `- Collected through structured multi-fact interactions: **${w.collectedThroughStructuredInputs}**`,
  `- Conditional, asked only when applicable: **${w.conditionalFactsAskedOnlyWhenApplicable}**`,
  `- Independent manual inputs: **${w.independentManualInputs}**`,
  `- Filing-readiness only, removed from the generation questionnaire: **${w.filingReadinessOnlyRemovedFromGenerationQuestionnaire}**`,
  `- External-actor facts, never asked: **${w.externalActorFacts}**`,
  `- Duplicate asks eliminated: **${w.duplicateAsksEliminated}**`,
  `- Unresolved: **${w.unresolved}**`,
  "",
  `**Participant screens before: ${w.baselineParticipantScreensBeforeCheckout}. Coherent participant interactions after: ${w.participantInteractionsBeforeCheckout}.**`,
  "",
  "### The interactions",
  "",
  ...w.interactions.map((interaction) => `- **${interaction.heading}** — ${interaction.factIds.length} fact(s): ${interaction.factIds.join(", ")}`),
  "",
  "## Fact by fact",
  "",
  "| Fact | Requirement | Obtained from | Condition | Disposition |",
  "| --- | --- | --- | --- | --- |",
  rowTable,
  ""
].join("\n");

if (process.argv.includes("--check")) {
  const current = (() => { try { return readFileSync(ARTIFACT, "utf8"); } catch { return null; } })();
  const currentSummary = (() => { try { return readFileSync(SUMMARY, "utf8"); } catch { return null; } })();
  if (current !== serialized || currentSummary !== summary) {
    console.error("MISSISSIPPI COLLECTION LEDGER is out of date — run: node scripts/generate-mississippi-collection-ledger.mjs");
    process.exit(1);
  }
  console.log(`mississippi collection ledger current — ${artifact.totals.requiredFacts} facts, ${w.participantInteractionsBeforeCheckout} participant interactions`);
} else {
  mkdirSync(path.dirname(ARTIFACT), { recursive: true });
  mkdirSync(path.dirname(SUMMARY), { recursive: true });
  writeFileSync(ARTIFACT, serialized);
  writeFileSync(SUMMARY, summary);
  console.log(`wrote ${path.relative(rootDir, ARTIFACT)} and ${path.relative(rootDir, SUMMARY)}`);
  console.log(`facts ${w.underlyingRequiredPacketFacts}: reuse ${w.reusedFromScreening + w.reusedFromSavedContext}, derive ${w.deterministicallyDerived}, structured ${w.collectedThroughStructuredInputs}, conditional ${w.conditionalFactsAskedOnlyWhenApplicable}, independent ${w.independentManualInputs}, filing-only ${w.filingReadinessOnlyRemovedFromGenerationQuestionnaire}, external ${w.externalActorFacts}, unresolved ${w.unresolved}`);
  console.log(`participant screens ${w.baselineParticipantScreensBeforeCheckout} -> interactions ${w.participantInteractionsBeforeCheckout}`);
}
