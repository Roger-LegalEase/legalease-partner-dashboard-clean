#!/usr/bin/env node
/**
 * The nationwide packet-collection audit.
 *
 *   node scripts/generate-packet-collection-audit.mjs            # write
 *   node scripts/generate-packet-collection-audit.mjs --check    # fail on drift
 *
 * For every route that publishes a packet plan, this resolves each required
 * fact to exactly one collection class and records the reconciliation:
 *
 *   BEFORE_REQUIRED_FACTS
 *     = already_known + derived + prepay_confirmation + render_required
 *     + conditional + filing_readiness + external_actor + unresolved
 *
 * with the exact fact ids on both sides. A route where those do not reconcile
 * is a failure, not a warning: it means a required fact has no disposition.
 *
 * THE DENOMINATOR. Prose in docs/ still says "51 paid jurisdictions, 97 paid
 * routes". No machine-readable source in this repository yields 97, and the
 * figure conflates the 51-profile universe with the 38-jurisdiction
 * packet_checkout contract count. Rather than pick one number and hide the
 * others, every denominator this repository actually defines is reported side
 * by side, and the correction itself is applied to every route with a packet
 * plan — which is a superset of all of them, so no denominator is left out.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { routeDecidingFactIds } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { resolvePacketCollection, prepayGateFactIds, PACKET_COLLECTION_CLASSES } = await import(
  "../src/lib/expungement-ai/packet-collection.ts"
);
const { routeSafetyGateFactIds } = await import("../src/lib/expungement-ai/packet-route-safety.ts");
const { routeCollectionOverrideFor, baselineCarriedFactIds } = await import("../src/lib/expungement-ai/packet-collection-overrides.ts");

const ARTIFACT = path.join(rootDir, "data/expungement-ai/reports/packet-collection-audit.json");
const SUMMARY = path.join(rootDir, "docs/expungement-ai/PACKET_COLLECTION_AUDIT.md");

/** The product budgets this correction is measured against. */
const PREPAY_TARGET = 8;
const PREPAY_CAP = 12;

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(rootDir, relativePath), "utf8"));
  } catch {
    return null;
  }
}

/**
 * Every denominator this repository defines, measured rather than quoted.
 * Each entry says where the number comes from so a future reader can tell
 * which one their question is actually about.
 */
function denominators(profiles) {
  const compiled = [];
  const packetCheckout = [];
  for (const profile of profiles) {
    for (const pathway of profile.pathways ?? []) {
      const routeKey = `${profile.jurisdiction.code}:${pathway.id}`;
      compiled.push(routeKey);
      if (pathway.legalAuthority?.paymentAuthority === "packet_checkout") packetCheckout.push(routeKey);
    }
  }
  const ratification = readJson("data/record-clearing/legal-decisions/route-ratification-registry.json");
  const ratified = (ratification?.routes ?? [])
    .filter((route) => route.status === "ratified_deployable")
    .map((route) => route.routeKey);
  const productMetadata = readJson("data/expungement-ai/route-product-metadata.json");
  const paidNow = Object.entries(productMetadata?.routes ?? {})
    .filter(([, value]) => value?.paymentProductEligible === true)
    .map(([routeKey]) => routeKey);
  const gradeA = readJson("data/rcap-grade-a/fulfillment-authority-projection.json");
  const commerciallyEligible = (gradeA?.routes ?? [])
    .filter((route) => route.commercialStatus === "commercially_eligible")
    .map((route) => route.routeId);

  const count = (routeKeys) => ({
    routes: routeKeys.length,
    jurisdictions: new Set(routeKeys.map((key) => key.split(":")[0])).size,
    routeKeys: [...routeKeys].sort()
  });

  return {
    note: "Five different questions, five different numbers. The 97 in docs/ matches none of them.",
    compiledPathways: { source: "src/lib/rcap-engine/compiled/profiles/*.json", ...count(compiled) },
    packetCheckoutLegalAuthority: {
      source: "pathways[].legalAuthority.paymentAuthority === 'packet_checkout'",
      note: "The metric the stale 97 was originally taken from.",
      ...count(packetCheckout)
    },
    counselRatifiedDeployable: {
      source: "data/record-clearing/legal-decisions/route-ratification-registry.json",
      ...count(ratified)
    },
    productPaidNow: { source: "data/expungement-ai/route-product-metadata.json", ...count(paidNow) },
    gradeACommerciallyEligible: {
      source: "data/rcap-grade-a/fulfillment-authority-projection.json",
      note: "AGENTS.md: commercial authority comes from a Grade-A fulfillment record and from nothing else.",
      ...count(commerciallyEligible)
    }
  };
}

/**
 * Whether this route's own screening can settle a fact before packet
 * information begins: the profile publishes a question under that id, or under
 * a screening id the collection policy already carries forward from.
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

/**
 * What the guided check actually asks.
 *
 * NOT `profile.questions` — the compiled profile carries research-corpus
 * questions (`source_question_*`) that the public projection never publishes,
 * and counting those as reuse would credit the correction with answers the
 * participant was never asked for. The published prepay set is the guided
 * check, and it is the only thing a packet fact can legitimately be reused
 * from.
 */
const PREPAY_PHASES = new Set([
  "prepay_required",
  "prepay_route_splitter",
  "prepay_hard_disqualifier",
  "prepay_timing_gate",
  "prepay_soft_confidence"
]);

const screeningIdCache = new Map();

function screeningQuestionIds(profile) {
  const code = profile.jurisdiction.code;
  if (!screeningIdCache.has(code)) {
    const published = projectPublicProfile(profile).questions ?? [];
    screeningIdCache.set(code, new Set(
      published.filter((question) => PREPAY_PHASES.has(question.lifecyclePhase)).map((question) => question.id)
    ));
  }
  return screeningIdCache.get(code);
}

function screeningCanAnswer(profile, factId) {
  const ids = screeningQuestionIds(profile);
  if (ids.has(factId)) return true;
  return (SCREENING_CARRY_SOURCES[factId] ?? []).some((id) => ids.has(id));
}

/**
 * What the baseline builder hid.
 *
 * Before this correction the builder rendered one screen per required input
 * the server did not own, with exactly one pre-existing exception: the
 * Mississippi non-conviction route carried two facts forward from screening
 * and filtered the charge level it had carried them from. Naming those here
 * keeps the before/after comparison honest — the baseline gets credit for the
 * reduction it already made.
 */
const BASELINE_HIDDEN_FACT_IDS = {
  "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal": [
    "offense_category",
    "sentence_completion_date",
    "offense_level"
  ]
};

/**
 * Facts a derivation can settle on this route: every input the derivation
 * reads is itself a required fact of this route, so it will be available.
 * Structural, so no answer is simulated and no default is invented.
 */
function derivableFactIds(resolution, requiredInputIds) {
  const required = new Set(requiredInputIds);
  return resolution.facts
    .filter((fact) => fact.collection !== "already_known" && fact.collection !== "external_actor")
    .map((fact) => fact.factId)
    .filter((factId) => {
      const sources = DERIVATION_SOURCES[factId];
      return Array.isArray(sources) && sources.length > 0 && sources.every((id) => required.has(id));
    });
}

/** Mirrors the derivations declared in src/lib/expungement-ai/packet-collection.ts. */
const DERIVATION_SOURCES = {
  social_security_number_last_four: ["social_security_number"],
  contact_information: ["mailing_address", "phone_number", "email_address"],
  offense_category: ["offense_level"],
  charge_classification: ["offense_level"],
  filing_location: ["county"],
  court_type: ["court"],
  court_name: ["court"]
};

function auditRoute(profile, pathway) {
  const jurisdiction = profile.jurisdiction.code;
  const plan = packetPlanForPathway(profile, pathway.id);
  if (!plan) {
    return { excluded: { routeKey: `${jurisdiction}:${pathway.id}`, reason: "no_packet_plan", detail: "the profile publishes no packet-generator entry for this pathway, so no packet-information model exists" } };
  }
  if (plan.requiredInputIds.length === 0) {
    return {
      excluded: {
        routeKey: `${jurisdiction}:${pathway.id}`,
        reason: "no_required_packet_inputs",
        planMode: plan.mode,
        detail: plan.mode === "automatic_relief_verification_and_guidance"
          ? "relief on this route is state-initiated, so there is no participant-filed packet and the plan publishes no required inputs; the route never reaches Checkout and never renders a packet-information model"
          : "the packet plan publishes no required inputs, so there is nothing for the collection policy to resolve"
      }
    };
  }

  const routeKey = `${jurisdiction}:${pathway.id}`;
  const serverFacts = { jurisdiction, pathway_id: pathway.id };
  const specification = packetSpecificationFor(routeKey) ?? null;

  const decidingFactIds = new Set([
    ...routeDecidingFactIds(profile, pathway),
    ...routeSafetyGateFactIds(jurisdiction, pathway.id)
  ]);

  // Which of this route's required facts the participant's own screening
  // already answers, by the fact's id or by a screening id that carries the
  // same answer. The prepayment budget is about ADDITIONAL confirmation, so a
  // fact screening already settled is not counted against it.
  const screeningAnswerableIds = new Set(
    plan.requiredInputIds.filter((factId) => screeningCanAnswer(profile, factId))
  );

  // The audit resolves with no participant answers, which is the honest
  // worst case: nothing is carried forward and nothing is derived, so every
  // count below is the MOST this route could ever ask. A real matter asks the
  // same or fewer.
  const resolution = resolvePacketCollection({
    jurisdiction,
    pathwayId: pathway.id,
    requiredInputIds: plan.requiredInputIds,
    serverFacts,
    screeningAnswers: {},
    specification,
    routeDecidingFactIds: decidingFactIds,
    baselineCarriedFactIds: baselineCarriedFactIds(routeKey),
    override: routeCollectionOverrideFor(routeKey)
  });

  const byClass = Object.fromEntries(PACKET_COLLECTION_CLASSES.map((name) => [name, []]));
  for (const fact of resolution.facts) byClass[fact.collection].push(fact.factId);

  const beforeFactIds = [...new Set(plan.requiredInputIds)].sort();
  const afterFactIds = resolution.facts.map((fact) => fact.factId).sort();
  const accountedFor = beforeFactIds.length === afterFactIds.length
    && beforeFactIds.every((factId, index) => factId === afterFactIds[index]);

  const gate = prepayGateFactIds(resolution);
  const sections = resolution.groupedParticipantSections;
  const additionalConfirmation = resolution.prepayQuestions.filter((factId) => !screeningAnswerableIds.has(factId));

  // ---- participant workload, which is the metric that actually matters ----
  const baselineHidden = new Set(BASELINE_HIDDEN_FACT_IDS[routeKey] ?? []);
  const participantRequired = plan.requiredInputIds.filter((id) => !(id in serverFacts));
  // What the baseline builder asked: one screen per required input it did not
  // already hide.
  const baselineEnteredFacts = participantRequired.filter((id) => !baselineHidden.has(id));

  const reusableFromScreening = gate.filter((factId) => screeningAnswerableIds.has(factId));
  // Facts the resolver settled by derivation. They are already outside the
  // gate, so they are counted from the resolution rather than filtered by it.
  const derivable = resolution.facts.filter((fact) => fact.collection === "derived").map((fact) => fact.factId);
  const conditionalFacts = resolution.facts.filter((fact) => fact.collection === "conditional");
  const externalActor = resolution.externalActorFields.map((entry) => entry.factId);

  // Facts the participant must still type, once reuse and derivation have run.
  // The gate already excludes what the server owns, what is derived, what
  // another actor fills and what a condition retires. What remains that the
  // guided check can supply is reuse, so the facts the participant must
  // actually type are the rest.
  const enteredAfter = gate.filter((factId) => !reusableFromScreening.includes(factId));
  const workloadDelta = baselineEnteredFacts.length - enteredAfter.length;
  const screensDelta = participantRequired.length - sections.length;
  // Pages collapsed but work did not. A route that packs the same number of
  // answers onto fewer pages has not been corrected, it has been repackaged.
  const uxNotActuallyReduced = screensDelta > 0
    && baselineEnteredFacts.length > 0
    && workloadDelta < Math.max(1, Math.ceil(baselineEnteredFacts.length * 0.1));
  // A flag with no explanation is an accusation. Where the reduction is small,
  // say what is holding it there, so the difference between "not corrected"
  // and "cannot be reduced without weakening the packet or lengthening the
  // guided check" is visible rather than inferred.
  const specificationOnlyFacts = resolution.facts.filter(
    (fact) => fact.source === "packet_specification_required_fact" || fact.source === "packet_specification_use"
  ).length;
  const reductionLimitedBy = !uxNotActuallyReduced
    ? null
    : specificationOnlyFacts >= Math.ceil(baselineEnteredFacts.length * 0.5)
      ? `the registered packet specification requires ${specificationOnlyFacts} route-specific facts that the guided check does not collect; reducing further would mean weakening the specification or moving friction into screening, and both are forbidden`
      : "few facts are reusable from this route's guided check and few are deterministically derivable";

  return {
    routeKey,
    jurisdiction,
    pathwayId: pathway.id,
    pathwayLabel: pathway.label ?? null,
    planMode: plan.mode,
    fulfillmentReady: isPacketPlanFulfillmentReady(plan),
    hasRegisteredSpecification: Boolean(specification),
    before: { requiredFacts: beforeFactIds.length, factIds: beforeFactIds },
    after: {
      alreadyKnown: byClass.already_known,
      derived: byClass.derived,
      prepayConfirmation: byClass.prepay_confirmation,
      renderRequired: byClass.render_required,
      conditional: byClass.conditional,
      filingReadiness: byClass.filing_readiness,
      externalActor: byClass.external_actor,
      unresolved: byClass.unresolved
    },
    counts: Object.fromEntries(PACKET_COLLECTION_CLASSES.map((name) => [name, byClass[name].length])),
    reconciliation: {
      beforeCount: beforeFactIds.length,
      afterCount: afterFactIds.length,
      accountedFor,
      droppedFactIds: beforeFactIds.filter((factId) => !afterFactIds.includes(factId)),
      inventedFactIds: afterFactIds.filter((factId) => !beforeFactIds.includes(factId))
    },
    participantExperience: {
      // What the builder used to render: one screen per unresolved required
      // input, which is where "question 4 of 54" came from.
      screensBefore: participantRequired.length,
      // What it renders now: one screen per section that has anything to ask.
      screensAfter: sections.length,
      sections: sections.map((section) => ({ id: section.id, factIds: section.factIds }))
    },
    participantWorkload: {
      note: "Reuse and derivation are measured structurally, from what this route's own screening publishes and from derivations whose inputs are themselves required facts. No answer is simulated and no default is invented.",
      currentVisibleScreens: participantRequired.length,
      newVisibleSections: sections.length,
      currentParticipantEnteredFacts: baselineEnteredFacts.length,
      newParticipantEnteredFacts: enteredAfter.length,
      factsReusedFromScreening: reusableFromScreening.length,
      factsReusedFromScreeningIds: reusableFromScreening,
      factsPrefilledFromExistingMatterOrProfile: 0,
      factsDeterministicallyDerived: derivable.length,
      factsDeterministicallyDerivedIds: derivable,
      duplicateAsksEliminated: reusableFromScreening.length,
      conditionalFacts: conditionalFacts.length,
      conditionalFactsSuppressedWhenIrrelevant: conditionalFacts.map((fact) => fact.factId),
      filingReadinessFactsStillRequiredBeforeCheckout: resolution.filingReadinessItems.length,
      externalActorFieldsNeverAsked: externalActor.length,
      totalAdditionalParticipantInteractionsAfterScreening: enteredAfter.length,
      // What the participant experiences as discrete steps after screening.
      // Related facts sit together in one section, so this is the number of
      // coherent things they deal with rather than the number of fields.
      coherentParticipantInteractionsAfterScreening: sections.length,
      participantEnteredFactsDelta: workloadDelta,
      uxNotActuallyReduced,
      reductionLimitedBy
    },
    prepayBudget: {
      // Every fact that confirms the paid route...
      confirmationFacts: resolution.prepayQuestions.length,
      // ...and the subset screening does not already settle, which is what the
      // product budget for ADDITIONAL prepayment confirmation is about.
      additionalConfirmationFacts: additionalConfirmation.length,
      additionalFactIds: additionalConfirmation,
      target: PREPAY_TARGET,
      cap: PREPAY_CAP,
      withinTarget: additionalConfirmation.length <= PREPAY_TARGET,
      withinCap: additionalConfirmation.length <= PREPAY_CAP
    },
    externalActorFields: resolution.externalActorFields,
    unresolvedRequiredFacts: resolution.unresolvedRequiredFacts,
    hardBlockers: resolution.hardBlockers
  };
}

const profiles = getAllJurisdictionProfiles();
const routes = [];
const excludedRoutes = [];
let compiledPathwayCount = 0;
for (const profile of profiles) {
  for (const pathway of profile.pathways ?? []) {
    compiledPathwayCount += 1;
    const audited = auditRoute(profile, pathway);
    if (audited?.excluded) excludedRoutes.push(audited.excluded);
    else if (audited) routes.push(audited);
  }
}
excludedRoutes.sort((left, right) => left.routeKey.localeCompare(right.routeKey));
routes.sort((left, right) => left.routeKey.localeCompare(right.routeKey));

const screensBefore = routes.map((route) => route.participantExperience.screensBefore);
const screensAfter = routes.map((route) => route.participantExperience.screensAfter);
const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};
const average = (values) => (values.length === 0 ? 0 : Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)));

const unreconciled = routes.filter((route) => !route.reconciliation.accountedFor);
const overCap = routes.filter((route) => !route.prepayBudget.withinCap);
const overTarget = routes.filter((route) => !route.prepayBudget.withinTarget);
const withUnresolved = routes.filter((route) => route.unresolvedRequiredFacts.length > 0);
const withExternalActorAsk = routes.filter((route) => route.externalActorFields.length > 0);

const workload = (key) => routes.map((route) => route.participantWorkload[key]);
const sum = (values) => values.reduce((total, value) => total + value, 0);
const notReduced = routes.filter((route) => route.participantWorkload.uxNotActuallyReduced);

const artifact = {
  schemaVersion: "expungement-ai/packet-collection-audit/v1",
  generatedBy: "scripts/generate-packet-collection-audit.mjs",
  note: "Resolved with no participant answers, so every count is the maximum this route could ask.",
  denominators: denominators(profiles),
  // Every compiled pathway is either audited or explicitly excluded with a
  // deterministic reason. There is no unexplained remainder.
  denominatorReconciliation: {
    compiledPathways: compiledPathwayCount,
    auditedRoutes: routes.length,
    excludedRoutes: excludedRoutes.length,
    reconciles: compiledPathwayCount === routes.length + excludedRoutes.length,
    excluded: excludedRoutes
  },
  totals: {
    routesWithAPacketPlan: routes.length,
    jurisdictions: new Set(routes.map((route) => route.jurisdiction)).size,
    requiredFactsBefore: routes.reduce((sum, route) => sum + route.before.requiredFacts, 0),
    requiredFactsAccountedFor: routes.reduce((sum, route) => sum + route.reconciliation.afterCount, 0),
    droppedRequiredFacts: routes.reduce((sum, route) => sum + route.reconciliation.droppedFactIds.length, 0),
    unaccountedRoutes: unreconciled.length,
    routesWithUnresolvedFacts: withUnresolved.length,
    routesAskingExternalActorFields: withExternalActorAsk.length,
    routesWithinPrepayTarget: routes.length - overTarget.length,
    routesOverPrepayTarget: overTarget.length,
    routesWithinPrepayCap: routes.length - overCap.length,
    routesOverPrepayCap: overCap.length
  },
  participantExperience: {
    screensBefore: { max: Math.max(0, ...screensBefore), median: median(screensBefore), average: average(screensBefore) },
    screensAfter: { max: Math.max(0, ...screensAfter), median: median(screensAfter), average: average(screensAfter) }
  },
  participantWorkload: {
    note: "Page count is not the metric. These are the facts a participant must actually type after screening.",
    totalParticipantEnteredFactsBefore: sum(workload("currentParticipantEnteredFacts")),
    totalParticipantEnteredFactsAfter: sum(workload("newParticipantEnteredFacts")),
    totalFactsReusedFromScreening: sum(workload("factsReusedFromScreening")),
    totalFactsDeterministicallyDerived: sum(workload("factsDeterministicallyDerived")),
    totalDuplicateAsksEliminated: sum(workload("duplicateAsksEliminated")),
    totalConditionalFacts: sum(workload("conditionalFacts")),
    totalFilingReadinessFactsBeforeCheckout: sum(workload("filingReadinessFactsStillRequiredBeforeCheckout")),
    totalExternalActorFieldsNeverAsked: sum(workload("externalActorFieldsNeverAsked")),
    enteredFactsBefore: {
      max: Math.max(0, ...workload("currentParticipantEnteredFacts")),
      median: median(workload("currentParticipantEnteredFacts")),
      average: average(workload("currentParticipantEnteredFacts"))
    },
    enteredFactsAfter: {
      max: Math.max(0, ...workload("newParticipantEnteredFacts")),
      median: median(workload("newParticipantEnteredFacts")),
      average: average(workload("newParticipantEnteredFacts"))
    },
    routesFlaggedUxNotActuallyReduced: notReduced.length
  },
  exceptions: {
    unreconciledRoutes: unreconciled.map((route) => ({
      routeKey: route.routeKey,
      dropped: route.reconciliation.droppedFactIds,
      invented: route.reconciliation.inventedFactIds
    })),
    routesOverPrepayCap: overCap.map((route) => ({
      routeKey: route.routeKey,
      additionalConfirmationFacts: route.prepayBudget.additionalConfirmationFacts,
      factIds: route.prepayBudget.additionalFactIds
    })),
    routesWithUnresolvedFacts: withUnresolved.map((route) => ({
      routeKey: route.routeKey,
      factIds: route.unresolvedRequiredFacts
    })),
    uxNotActuallyReduced: notReduced.map((route) => ({
      routeKey: route.routeKey,
      currentParticipantEnteredFacts: route.participantWorkload.currentParticipantEnteredFacts,
      newParticipantEnteredFacts: route.participantWorkload.newParticipantEnteredFacts,
      screens: `${route.participantWorkload.currentVisibleScreens} -> ${route.participantWorkload.newVisibleSections}`,
      reductionLimitedBy: route.participantWorkload.reductionLimitedBy
    }))
  },
  routes
};

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

const summary = [
  "# Packet collection audit",
  "",
  "Generated by `scripts/generate-packet-collection-audit.mjs`. Do not edit by hand.",
  "",
  "Every required packet fact of every route with a packet plan, resolved to exactly one",
  "collection class. Counts are taken with no participant answers supplied, so each one is",
  "the maximum that route could ever ask; a real matter asks the same or fewer.",
  "",
  "## Which denominator",
  "",
  "Prose in `docs/` still says 51 paid jurisdictions and 97 paid routes. No machine-readable",
  "source in this repository yields 97. These are the denominators that actually exist:",
  "",
  "| Denominator | Routes | Jurisdictions |",
  "| --- | ---: | ---: |",
  `| Compiled pathways | ${artifact.denominators.compiledPathways.routes} | ${artifact.denominators.compiledPathways.jurisdictions} |`,
  `| \`packet_checkout\` legal authority | ${artifact.denominators.packetCheckoutLegalAuthority.routes} | ${artifact.denominators.packetCheckoutLegalAuthority.jurisdictions} |`,
  `| Counsel-ratified deployable | ${artifact.denominators.counselRatifiedDeployable.routes} | ${artifact.denominators.counselRatifiedDeployable.jurisdictions} |`,
  `| Product \`paid_now\` | ${artifact.denominators.productPaidNow.routes} | ${artifact.denominators.productPaidNow.jurisdictions} |`,
  `| Grade-A commercially eligible | ${artifact.denominators.gradeACommerciallyEligible.routes} | ${artifact.denominators.gradeACommerciallyEligible.jurisdictions} |`,
  "",
  "The correction is applied to every route with a packet plan, which is a superset of all of them.",
  "",
  "## Totals",
  "",
  `- Routes with a packet plan: **${artifact.totals.routesWithAPacketPlan}** across **${artifact.totals.jurisdictions}** jurisdictions`,
  `- Required facts before: **${artifact.totals.requiredFactsBefore}**`,
  `- Required facts with a disposition after: **${artifact.totals.requiredFactsAccountedFor}**`,
  `- Dropped required facts: **${artifact.totals.droppedRequiredFacts}**`,
  `- Routes whose facts do not reconcile: **${artifact.totals.unaccountedRoutes}**`,
  `- Routes still asking an external-actor field: **${artifact.totals.routesAskingExternalActorFields}**`,
  `- Routes with an unresolved fact: **${artifact.totals.routesWithUnresolvedFacts}**`,
  "",
  "## Participant experience",
  "",
  "| Screens | Max | Median | Average |",
  "| --- | ---: | ---: | ---: |",
  `| Before | ${artifact.participantExperience.screensBefore.max} | ${artifact.participantExperience.screensBefore.median} | ${artifact.participantExperience.screensBefore.average} |`,
  `| After | ${artifact.participantExperience.screensAfter.max} | ${artifact.participantExperience.screensAfter.median} | ${artifact.participantExperience.screensAfter.average} |`,
  "",
  "## Prepayment confirmation budget",
  "",
  `- Within the target of ${PREPAY_TARGET}: **${artifact.totals.routesWithinPrepayTarget}**`,
  `- Over the target: **${artifact.totals.routesOverPrepayTarget}**`,
  `- Over the hard cap of ${PREPAY_CAP}: **${artifact.totals.routesOverPrepayCap}**`,
  "",
  artifact.exceptions.routesOverPrepayCap.length === 0
    ? "No route exceeds the hard cap."
    : ["Routes over the cap:", "", ...artifact.exceptions.routesOverPrepayCap.map(
      (route) => `- \`${route.routeKey}\` — ${route.additionalConfirmationFacts}: ${route.factIds.join(", ")}`
    )].join("\n"),
  ""
].join("\n");

if (process.argv.includes("--check")) {
  const currentArtifact = (() => { try { return readFileSync(ARTIFACT, "utf8"); } catch { return null; } })();
  const currentSummary = (() => { try { return readFileSync(SUMMARY, "utf8"); } catch { return null; } })();
  const problems = [];
  if (currentArtifact !== serialized) problems.push(`${path.relative(rootDir, ARTIFACT)} is out of date`);
  if (currentSummary !== summary) problems.push(`${path.relative(rootDir, SUMMARY)} is out of date`);
  if (artifact.totals.unaccountedRoutes > 0) problems.push(`${artifact.totals.unaccountedRoutes} route(s) do not reconcile`);
  if (artifact.totals.droppedRequiredFacts > 0) problems.push(`${artifact.totals.droppedRequiredFacts} required fact(s) dropped`);
  if (artifact.totals.routesAskingExternalActorFields > 0) {
    problems.push(`${artifact.totals.routesAskingExternalActorFields} route(s) ask an external-actor field`);
  }
  if (problems.length > 0) {
    console.error("PACKET COLLECTION AUDIT FAILED");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("  run: node scripts/generate-packet-collection-audit.mjs");
    process.exit(1);
  }
  console.log(`packet collection audit current — ${artifact.totals.routesWithAPacketPlan} route(s), 0 facts dropped`);
} else {
  mkdirSync(path.dirname(ARTIFACT), { recursive: true });
  mkdirSync(path.dirname(SUMMARY), { recursive: true });
  writeFileSync(ARTIFACT, serialized);
  writeFileSync(SUMMARY, summary);
  console.log(`wrote ${path.relative(rootDir, ARTIFACT)} and ${path.relative(rootDir, SUMMARY)}`);
  console.log(`routes ${artifact.totals.routesWithAPacketPlan}; facts ${artifact.totals.requiredFactsBefore} -> ${artifact.totals.requiredFactsAccountedFor}; dropped ${artifact.totals.droppedRequiredFacts}`);
  console.log(`screens max ${artifact.participantExperience.screensBefore.max} -> ${artifact.participantExperience.screensAfter.max}; median ${artifact.participantExperience.screensBefore.median} -> ${artifact.participantExperience.screensAfter.median}`);
}
