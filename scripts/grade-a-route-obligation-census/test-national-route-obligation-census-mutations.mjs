#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  collectFailures,
  loadVerificationContext,
} from "./verify-national-route-obligation-census.mjs";

const clone = (value) => structuredClone(value);

const MUTABLE_OUTPUT_KEYS = [
  "canonical",
  "candidates",
  "worklist",
  "reviewQueue",
  "duplicateReport",
  "summary",
  "docs",
];

function cloneMutationContext(baseline, options = {}) {
  const context = { ...baseline };
  for (const key of MUTABLE_OUTPUT_KEYS) context[key] = clone(baseline[key]);
  if (options.cloneIndependent) context.independent = clone(baseline.independent);
  if (options.cloneExpected) context.expected = clone(baseline.expected);
  return context;
}

function mutationFingerprint(context, options = {}) {
  const selected = Object.fromEntries(MUTABLE_OUTPUT_KEYS.map((key) => [key, context[key]]));
  if (options.cloneIndependent) selected.independent = context.independent;
  if (options.cloneExpected) selected.expected = context.expected;
  return JSON.stringify(selected);
}

function mustFind(values, predicate, label) {
  const value = values.find(predicate);
  assert.ok(value, `mutation fixture missing: ${label}`);
  return value;
}

function mustFirst(values, label) {
  assert.ok(values.length > 0, `mutation fixture missing: ${label}`);
  return values[0];
}

function worklistAssociation(context, routeKey, label = routeKey) {
  const family = mustFind(context.worklist.packetFamilies, (row) => row.routeKeys.includes(routeKey), `${label} worklist family`);
  const route = mustFind(family.routes, (row) => row.routeKey === routeKey, `${label} worklist route`);
  return { family, route };
}

function syncReusableDeliverableField(family, field) {
  const entries = [...new Set((family.routes ?? []).flatMap((route) =>
    route.deliverable?.[field]?.status === "recorded" ? route.deliverable[field].entries : []))].sort();
  family.reusableFamilyDeliverable[field] = entries.length
    ? { status: "recorded", entries }
    : { status: "not_recorded", entries: ["not recorded"] };
}

function expectMutationFailure(label, baseline, mutate, expectedPattern, options = {}) {
  const context = cloneMutationContext(baseline, options);
  const before = mutationFingerprint(context, options);
  mutate(context);
  assert.notEqual(mutationFingerprint(context, options), before, `${label}: mutation made no observable change`);
  const failures = collectFailures(context);
  assert.ok(
    failures.some((failure) => expectedPattern.test(failure)),
    `${label}: expected ${expectedPattern}, received:\n${failures.join("\n")}`,
  );
  return label;
}

function expectMutationPass(label, baseline, mutate, options = {}) {
  const context = cloneMutationContext(baseline, options);
  const before = mutationFingerprint(context, options);
  mutate(context);
  assert.notEqual(mutationFingerprint(context, options), before, `${label}: accepted mutation made no observable change`);
  const failures = collectFailures(context);
  assert.deepEqual(failures, [], `${label}: expected no verifier failures, received:\n${failures.join("\n")}`);
  return label;
}

const baseline = loadVerificationContext();
const baselineFailures = collectFailures(baseline);
assert.deepEqual(baselineFailures, [], `baseline census failed:\n${baselineFailures.join("\n")}`);

assert.equal(baseline.independent.routeKindAdjudicationRows.length, 40, "baseline must contain exactly 40 route-kind adjudications");
const baselinePendingAlias = mustFind(
  baseline.independent.pendingAliasInstructions,
  (row) => row.aliasRouteKey === "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months",
  "pending Mississippi route-key alias instruction",
);
assert.equal(baselinePendingAlias.canonicalRouteKey, "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59");
assert.equal(baselinePendingAlias.decisionId, "LD-MS-01");
assert.equal(baselinePendingAlias.registryStatus, "PENDING_NOT_REGISTERED");

const utAutomaticTraffic = mustFind(
  baseline.candidates.routes,
  (candidate) => candidate.trackId === "ut_auto_traffic"
    && candidate.runtimePathwayId === "path-i-traffic-offense-expungement-or-deletion",
  "Utah automatic-traffic track/runtime edge",
);
assert.equal(utAutomaticTraffic.possibleCategory, "B_LEGITIMATE_EXCLUSION", "automatic Utah track inherited its sibling petition treatment");
assert.equal(utAutomaticTraffic.possibleCategoryBReason, "AUTOMATIC", "automatic Utah track lost the exact automatic reason");
assert.equal(utAutomaticTraffic.participantCanInitiate, false, "automatic Utah track became participant-initiatable through a sibling mapping");
assert.equal(utAutomaticTraffic.currentOutputStrategy, "process_guidance", "automatic Utah track inherited a sibling official-form strategy");
assert.equal(utAutomaticTraffic.packetSetId, "ut_auto_traffic-set", "automatic Utah track lost its exact process-guidance packet-set identity");

const kentuckyNonconviction = mustFind(
  baseline.candidates.routes,
  (candidate) => candidate.trackId === "ky_nonconviction_expungement",
  "Kentucky AOC-497/AOC-497.2 obligation",
);
const kentuckyNonconvictionWork = mustFind(
  baseline.worklist.packetFamilies.flatMap((family) => family.routes),
  (route) => route.routeKey === kentuckyNonconviction.routeKey,
  "Kentucky AOC-497/AOC-497.2 worklist row",
);
assert.ok(
  kentuckyNonconvictionWork.workTypes.includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED"),
  "partial custody for AOC-497 must not suppress acquisition of unaccounted AOC-497.2",
);

const kansasDiversion = mustFind(
  baseline.candidates.routes,
  (candidate) => candidate.trackId === "ks-21-6614-diversion",
  "Kansas diversion obligation",
);
assert.ok(
  kansasDiversion.existingArtifactIds.every((artifactId) => !/arrest-record|offender-registration/i.test(artifactId)),
  "generic Kansas Judicial Council landing-page URLs contaminated diversion custody with unrelated artifacts",
);

for (const family of baseline.worklist.packetFamilies) {
  for (const route of family.routes) {
    if (!route.workTypes.includes("PARTICIPANT_AGENCY_APPLICATION")) continue;
    const candidate = mustFind(baseline.candidates.routes, (row) => row.routeKey === route.routeKey, `candidate for ${route.routeKey}`);
    assert.equal(
      candidate.currentOutputStrategy,
      "participant_agency_application",
      `${route.routeKey} inferred agency-application work from process actor without an explicit agency-application strategy`,
    );
  }
}

for (const family of baseline.worklist.packetFamilies) {
  for (const route of family.routes) {
    for (const [field, evidence] of Object.entries(route.deliverable ?? {})) {
      assert.ok(
        (evidence.entries ?? []).every((entry) => !String(entry).split("\n").some((line) => /^\s*\d+\s*$/.test(line))),
        `${route.routeKey} ${field} contains a numeric map-index sentinel`,
      );
    }
  }
}

const mutations = [];
const acceptedVariants = [];

mutations.push(expectMutationFailure(
  "compiled pathway omitted",
  baseline,
  (context) => {
    const pathwayRow = mustFind(context.canonical.routeEntities, (row) => row.entityType === "runtime_pathway", "runtime pathway source row");
    context.canonical.routeEntities = context.canonical.routeEntities.filter((row) => row.routeKey !== pathwayRow.routeKey);
    context.candidates.routes = context.candidates.routes.filter((row) => row.routeKey !== pathwayRow.routeKey);
  },
  /compiled pathway.*unaccounted|runtime pathway set mismatch/i,
));

mutations.push(expectMutationFailure(
  "runtime universe pruned to paid 260 subset",
  baseline,
  (context) => {
    const paidKeys = new Set(context.expected.inputs.closure.pathways
      .filter((row) => row.category === "paid_packet_intended")
      .map((row) => `pathway:${row.jurisdiction}:${row.pathwayId}`));
    const removed = new Set(context.canonical.routeEntities
      .filter((row) => row.entityType === "runtime_pathway" && !paidKeys.has(row.routeKey))
      .map((row) => row.routeKey));
    context.canonical.routeEntities = context.canonical.routeEntities.filter((row) => !removed.has(row.routeKey));
    context.candidates.routes = context.candidates.routes.filter((row) => !removed.has(row.routeKey));
  },
  /pruned to the 260 paid subset|compiled pathway.*unaccounted|typed universe count drift/i,
));

mutations.push(expectMutationFailure(
  "typed universe counter drift",
  baseline,
  (context) => {
    context.canonical.counts.totalRuntimeRoutes -= 1;
  },
  /canonical typed count|stale counter.*totalRuntimeRoutes/i,
));

mutations.push(expectMutationFailure(
  "approved legal track omitted",
  baseline,
  (context) => {
    const trackRow = mustFind(context.canonical.routeEntities, (row) => row.entityType === "legal_track", "legal track source row");
    context.canonical.routeEntities = context.canonical.routeEntities.filter((row) => row.routeKey !== trackRow.routeKey);
    context.candidates.routes = context.candidates.routes.filter((row) => row.routeKey !== trackRow.routeKey);
  },
  /approved legal track.*unaccounted|legal track set mismatch/i,
));

mutations.push(expectMutationFailure(
  "explicit unit omitted",
  baseline,
  (context) => {
    const unitRow = mustFind(context.canonical.routeEntities, (row) => row.entityType === "legal_track_unit", "legal track unit source row");
    context.canonical.routeEntities = context.canonical.routeEntities.filter((row) => row.routeKey !== unitRow.routeKey);
    context.candidates.routes = context.candidates.routes.filter((row) => row.routeKey !== unitRow.routeKey);
  },
  /explicit unit.*unaccounted|legal track unit set mismatch/i,
));

mutations.push(expectMutationFailure(
  "service branch omitted",
  baseline,
  (context) => {
    const branch = mustFind(context.canonical.routeEntities, (row) => row.entityType === "service_branch", "service branch source row");
    context.canonical.routeEntities = context.canonical.routeEntities.filter((row) => row.routeKey !== branch.routeKey);
    context.candidates.routes = context.candidates.routes.filter((row) => row.routeKey !== branch.routeKey);
  },
  /service branch.*unaccounted|service branch set mismatch/i,
));

mutations.push(expectMutationFailure(
  "failure disposition omitted",
  baseline,
  (context) => {
    const disposition = mustFind(context.canonical.routeEntities, (row) => row.entityType === "failure_disposition", "failure disposition source row");
    context.canonical.routeEntities = context.canonical.routeEntities.filter((row) => row.routeKey !== disposition.routeKey);
    context.candidates.routes = context.candidates.routes.filter((row) => row.routeKey !== disposition.routeKey);
  },
  /failure disposition.*unaccounted|failure disposition set mismatch/i,
));

mutations.push(expectMutationFailure(
  "unattached decision route omitted",
  baseline,
  (context) => {
    const row = mustFind(context.canonical.routeEntities, (candidate) => candidate.entityType === "unattached_decision_route", "unattached decision route source row");
    context.canonical.routeEntities = context.canonical.routeEntities.filter((candidate) => candidate.routeKey !== row.routeKey);
  },
  /unattached decision route.*unaccounted|unattached decision route set mismatch/i,
));

mutations.push(expectMutationFailure(
  "research decision route omitted",
  baseline,
  (context) => {
    const row = mustFind(context.canonical.routeEntities, (candidate) => candidate.entityType === "research_decision_route", "research decision route source row");
    context.canonical.routeEntities = context.canonical.routeEntities.filter((candidate) => candidate.routeKey !== row.routeKey);
  },
  /research decision route.*unaccounted|research decision route set mismatch/i,
));

mutations.push(expectMutationFailure(
  "research decision exact canonical merge broken",
  baseline,
  (context) => {
    const mapping = mustFind(
      context.canonical.sourceToCanonicalMappings,
      (candidate) => candidate.sourceRouteKey === "research-decision-route:AK:ak-set-aside",
      "Alaska set-aside research source mapping",
    );
    const wrongTarget = mustFind(
      context.canonical.canonicalObligations,
      (candidate) => candidate.jurisdiction === "AK"
        && candidate.routeKey !== "obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085",
      "wrong Alaska canonical target",
    );
    mapping.canonicalObligationKeys = [wrongTarget.routeKey];
  },
  /research decision ak-set-aside is not merged into its exact preexisting canonical obligation/i,
));

mutations.push(expectMutationFailure(
  "Alaska cannabis 2028 temporal branch loses future-effective treatment",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:unattached-decision-route:AK:ak-cannabis-seal:automatic_nondisclosure_from_2028",
      "Alaska 2028 automatic nondisclosure branch",
    );
    row.possibleCategoryBReason = "AUTOMATIC";
  },
  /Alaska cannabis decision is not split into exact 2027 participant-request and 2028 automatic FUTURE_EFFECTIVE branches/i,
));

mutations.push(expectMutationFailure(
  "Alaska record-correction appeal loses attorney handoff",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:unattached-decision-route:AK:ak-correct-record:final_adverse_superior_court_appeal_handoff",
      "Alaska final-adverse Superior Court appeal handoff",
    );
    row.possibleCategoryBReason = "COURT_INITIATED";
  },
  /Alaska record correction lacks its exact agency-request branch plus final-adverse Superior Court attorney-handoff exclusion/i,
));

mutations.push(expectMutationFailure(
  "Alabama uncertain appeal promoted to fulfillment",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey.includes(":AL:al-uncharged-arrest:de_novo_court_review_after_final_denial"),
      "Alabama de novo appeal review branch",
    );
    row.possibleCategory = "A_MUST_FULFILL";
    row.possibleCategoryBReason = null;
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
    row.currentOutputStrategy = "custom_pleading";
  },
  /Alabama uncharged-arrest judicial appeal decision branch is missing or misclassified/i,
));

mutations.push(expectMutationFailure(
  "West Virginia pardon petition collapsed to guidance exclusion",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:WV:wv_pardon_expungement:pardon-based-expungement",
      "West Virginia pardon-expungement participant petition",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "PROSECUTOR_CONTROLLED";
    row.participantCanInitiate = false;
    row.currentOutputStrategy = "process_guidance";
    row.packetSetId = null;
  },
  /West Virginia pardon-expungement participant petition is incorrectly treated as guidance or Category B/i,
));

mutations.push(expectMutationFailure(
  "North Dakota professional handoff mislabeled court-initiated",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-only:ND:nd-dna-profile-removal-routing",
      "North Dakota DNA professional-handoff route",
    );
    row.possibleCategoryBReason = "COURT_INITIATED";
    row.processActor = "clerk";
  },
  /North Dakota professional-handoff route nd-dna-profile-removal-routing is not preserved as B \/ UNSUITABLE_FOR_SELF_HELP/i,
));

mutations.push(expectMutationFailure(
  "Kentucky mixed-stage route collapsed to automatic exclusion",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:KY:ky_juvenile_record_expungement:juvenile-automatic-dismissal",
      "Kentucky juvenile mixed-stage route",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "AUTOMATIC";
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
    row.participantCanInitiate = false;
  },
  /Kentucky juvenile mixed automatic-dismissal and AOC-JV-30 petition route is not preserved/i,
));

mutations.push(expectMutationFailure(
  "Montana mixed-stage route collapsed to agency exclusion",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:MT:mt_nonconviction_removal:non-conviction-criminal-history-removal-through-criss",
      "Montana CRISS mixed-stage route",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "AGENCY_CONTROLLED";
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
    row.participantCanInitiate = false;
  },
  /Montana mixed automatic CRISS-removal and participant correction-request route is not preserved/i,
));

mutations.push(expectMutationFailure(
  "Rhode Island exact participant form collapsed to referral",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:RI:ri_decriminalized:path-g-decriminalized-offense-expungement",
      "Rhode Island decriminalized-offense route",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "UNSUITABLE_FOR_SELF_HELP";
    row.participantCanInitiate = false;
    row.currentOutputStrategy = "process_guidance";
  },
  /Rhode Island decriminalized-offense participant filing is not preserved as exact-track Category A/i,
));

mutations.push(expectMutationFailure(
  "Georgia post-effective agency branch inherits prosecutor actor",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:service-branch:GA:retroactive-first-offender-treatment-under-42-8-66:order_already_granted_post_2026_07_01",
      "Georgia post-effective agency service branch",
    );
    row.processActor = "prosecutor";
    row.participantFacingInstrument = "no participant filing — prosecutor review";
    row.destination = "prosecutor";
  },
  /Georgia post-2026 agency implementation service-branch actor, instrument, destination, or classification drifted/i,
));

mutations.push(expectMutationFailure(
  "Missouri referral branch inherits participant petition",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:service-branch:MO:first-minor-in-possession-alcohol-expungement-under-311-326:judgment_ambiguous",
      "Missouri ambiguous-judgment referral service branch",
    );
    row.processActor = "participant";
    row.participantFacingInstrument = "petition";
    row.destination = "court";
  },
  /Missouri judgment_ambiguous referral service-branch actor, instrument, destination, or classification drifted/i,
));

mutations.push(expectMutationFailure(
  "North Dakota automatic branch inherits participant filing",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:service-branch:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:post_effective_date_automatic",
      "North Dakota post-effective automatic service branch",
    );
    row.processActor = "participant";
    row.participantFacingInstrument = "petition";
    row.destination = "clerk";
  },
  /North Dakota post-effective automatic closing service-branch actor, instrument, destination, or classification drifted/i,
));

mutations.push(expectMutationFailure(
  "Category B failure disposition exposes raw status token as instrument",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey.startsWith("obligation:failure-disposition:") && candidate.possibleCategory === "B_LEGITIMATE_EXCLUSION",
      "Category B failure disposition",
    );
    row.participantFacingInstrument = "partner_handoff";
  },
  /Category B failure disposition does not use an explicit no-participant-filing status instrument/i,
));

mutations.push(expectMutationFailure(
  "North Dakota juvenile filing-scope conflict collapsed to court-initiated exclusion",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-only:ND:nd-juvenile-records-routing",
      "North Dakota juvenile early-destruction review route",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "COURT_INITIATED";
    row.participantCanInitiate = false;
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /North Dakota juvenile early-destruction filing-scope conflict is not preserved as a narrow participant-filing legal-review question/i,
));

mutations.push(expectMutationFailure(
  "Nebraska pardon filing-scope conflict collapsed to agency exclusion",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-only:NE:ne-pardon-routing",
      "Nebraska pardon application review route",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "AGENCY_CONTROLLED";
    row.participantCanInitiate = false;
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /Nebraska pardon application and mayoral-variant filing-scope conflict is not preserved as a narrow participant-filing legal-review question/i,
));

mutations.push(expectMutationFailure(
  "Nebraska postconviction filing-scope conflict collapsed to professional handoff",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-only:NE:ne-postconviction-routing",
      "Nebraska postconviction verified-motion review route",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "UNSUITABLE_FOR_SELF_HELP";
    row.participantCanInitiate = false;
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /Nebraska postconviction verified-motion filing-scope conflict is not preserved as a narrow participant-filing legal-review question/i,
));

mutations.push(expectMutationFailure(
  "New Mexico cannabis mixed stages collapsed to automatic exclusion",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:NM:nm_cannabis:cannabis-expungement",
      "New Mexico cannabis mixed-stage review route",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "AUTOMATIC";
    row.participantCanInitiate = false;
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /New Mexico cannabis automatic-expungement and participant AOC-application stages are not preserved as an exact mixed-stage legal-review conflict/i,
));

mutations.push(expectMutationFailure(
  "Louisiana conditional automated process mislabeled currently automatic",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:LA:la-985-2-automated-expungement:automated-expungement-status-verification-art-985-2",
      "Louisiana article 985.2 future-effective route",
    );
    row.possibleCategoryBReason = "AUTOMATIC";
  },
  /LA la-985-2-automated-expungement does not preserve its exact source-backed B \/ FUTURE_EFFECTIVE reason/i,
));

mutations.push(expectMutationFailure(
  "Tennessee trafficking professional handoff mislabeled court-initiated",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-only:TN:tn_trafficking_40_32_105",
      "Tennessee trafficking professional-handoff route",
    );
    row.possibleCategoryBReason = "COURT_INITIATED";
    row.processActor = "court";
  },
  /TN tn_trafficking_40_32_105 is not preserved as an exact source-required professional handoff/i,
));

mutations.push(expectMutationFailure(
  "Michigan pre-2015 CSC-IV handoff mislabeled court-initiated",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-only:MI:mi_setaside_csc4_pre2015",
      "Michigan pre-2015 CSC-IV professional-handoff route",
    );
    row.possibleCategoryBReason = "COURT_INITIATED";
    row.processActor = "court";
  },
  /MI mi_setaside_csc4_pre2015 is not preserved as an exact source-required professional handoff/i,
));

mutations.push(expectMutationFailure(
  "Texas discretionary expunction handoff mislabeled prosecutor-controlled",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-only:TX:tx_exp_discretionary",
      "Texas discretionary-expunction professional-handoff route",
    );
    row.possibleCategoryBReason = "PROSECUTOR_CONTROLLED";
    row.processActor = "prosecutor";
  },
  /TX tx_exp_discretionary is not preserved as an exact source-required professional handoff/i,
));

mutations.push(expectMutationFailure(
  "Minnesota combined automatic and Board route collapsed before contradiction adoption",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:MN:mn_auto_cannabis_nonfelony:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06",
      "Minnesota combined automatic and Board-review route",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "AUTOMATIC";
    row.participantCanInitiate = false;
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /Minnesota combined automatic\/Board cannabis pathway is not preserved as legal review/i,
));

mutations.push(expectMutationFailure(
  "Minnesota review overwrites current service disposition",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:MN:mn_auto_cannabis_nonfelony:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06",
      "Minnesota combined automatic and Board-review route",
    );
    row.currentServiceDisposition = "non_filing_guidance";
  },
  /Minnesota combined automatic\/Board cannabis pathway is not preserved as legal review while retaining its current paid_packet_intended service disposition/i,
));

mutations.push(expectMutationFailure(
  "South Carolina PTI participant application collapsed to prosecutor-controlled exclusion",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:SC:sc_pti_17_22_150:diversion-or-program-completion-expungement",
      "South Carolina PTI participant-application conflict",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "PROSECUTOR_CONTROLLED";
    row.participantCanInitiate = false;
    row.processActor = "prosecutor";
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /South Carolina PTI participant-signed solicitor application conflict is not preserved as legal review/i,
));

mutations.push(expectMutationFailure(
  "South Carolina PTI review overwrites current service disposition",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:SC:sc_pti_17_22_150:diversion-or-program-completion-expungement",
      "South Carolina PTI participant-application conflict",
    );
    row.currentServiceDisposition = "paid_packet_intended";
  },
  /South Carolina PTI participant-signed solicitor application conflict is not preserved as legal review with the current non_filing_guidance service disposition unchanged/i,
));

mutations.push(expectMutationFailure(
  "Rhode Island deferred-sentence procedural stage collapsed to court-initiated exclusion",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:unit:RI:ri_deferred_sentence:ri-deferred-sentence-stage-3-notice-hearing-and-certified-copies",
      "Rhode Island deferred-sentence stage-3 participant branch",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "COURT_INITIATED";
    row.participantCanInitiate = false;
    row.processActor = "court";
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /Rhode Island deferred-sentence stage 3 is not preserved as a hidden participant filing\/hearing\/delivery legal-review branch/i,
));

mutations.push(expectMutationFailure(
  "Utah section 402 participant motion collapsed to professional handoff",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-only:UT:ut_adj_reduction_402",
      "Utah section 76-3-402 motion conflict",
    );
    row.possibleCategory = "B_LEGITIMATE_EXCLUSION";
    row.possibleCategoryBReason = "UNSUITABLE_FOR_SELF_HELP";
    row.participantCanInitiate = false;
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /Utah section 76-3-402 participant-motion and professional-handoff conflict is not preserved as a narrow participant-filing legal-review question/i,
));

mutations.push(expectMutationFailure(
  "route has no category",
  baseline,
  (context) => {
    mustFirst(context.candidates.routes, "candidate route").possibleCategory = null;
  },
  /no category candidate|invalid category/i,
));

mutations.push(expectMutationFailure(
  "required candidate field deleted",
  baseline,
  (context) => {
    delete mustFirst(context.candidates.routes, "candidate for required-field deletion").statuteOrAuthority;
  },
  /missing required field statuteOrAuthority/i,
));

mutations.push(expectMutationFailure(
  "classification confidence outside enum",
  baseline,
  (context) => {
    mustFirst(context.candidates.routes, "candidate for confidence mutation").classificationConfidence = "certain";
  },
  /invalid classification confidence/i,
));

mutations.push(expectMutationFailure(
  "typed legal decision overjoined across tracks",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.trackId === "sd_sis_sealing", "South Dakota SIS candidate for scoped-decision mutation");
    row.legalDecisionRecordIds.push("report-question:Q-029");
  },
  /overjoins unrelated legal decision report-question:Q-029/i,
));

mutations.push(expectMutationFailure(
  "participant initiation has invalid type",
  baseline,
  (context) => {
    mustFirst(context.candidates.routes, "candidate for participant initiation mutation").participantCanInitiate = "maybe";
  },
  /participantCanInitiate must be boolean or null/i,
));

mutations.push(expectMutationFailure(
  "Category B uses unauthorized reason",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "B_LEGITIMATE_EXCLUSION", "Category B candidate");
    row.possibleCategoryBReason = "MISSING_FORM";
  },
  /unauthorized Category B reason/i,
));

mutations.push(expectMutationFailure(
  "Category B reason is null",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "B_LEGITIMATE_EXCLUSION", "Category B candidate for null reason");
    row.possibleCategoryBReason = null;
  },
  /unauthorized Category B reason/i,
));

mutations.push(expectMutationFailure(
  "Category B controlled reason contradicts process actor",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.possibleCategoryBReason === "AGENCY_CONTROLLED",
      "agency-controlled Category B candidate",
    );
    row.processActor = "participant";
  },
  /Category B agency-controlled reason contradicts processActor/i,
));

mutations.push(expectMutationFailure(
  "missing source treated as Category B",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "B_LEGITIMATE_EXCLUSION", "Category B candidate for missing source contradiction");
    row.missingImplementationWork = ["Official source not held"];
    row.participantCanInitiate = true;
    row.participantFacingInstrument = "Participant petition";
  },
  /missing implementation evidence.*Category B|missing form or source.*Category B/i,
));

mutations.push(expectMutationFailure(
  "staged participant branch hidden",
  baseline,
  (context) => {
    const row = mustFind(context.canonical.canonicalObligations, (candidate) => candidate.hiddenParticipantBranch === true, "hidden canonical participant branch");
    context.canonical.canonicalObligations = context.canonical.canonicalObligations.filter((candidate) => candidate.routeKey !== row.routeKey);
    context.candidates.routes = context.candidates.routes.filter((candidate) => candidate.routeKey !== row.routeKey);
  },
  /hidden participant.*unaccounted|staged route hides|South Carolina summary-court hidden enforcement-motion branch/i,
));

mutations.push(expectMutationFailure(
  "decision-derived hidden branch omitted",
  baseline,
  (context) => {
    const row = mustFind(
      context.canonical.canonicalObligations,
      (candidate) => candidate.hiddenParticipantBranch === true
        && candidate.routeKey.includes(":SD:sd_sis_sealing:written_implementation_request"),
      "South Dakota decision-derived hidden implementation request",
    );
    context.canonical.canonicalObligations = context.canonical.canonicalObligations.filter((candidate) => candidate.routeKey !== row.routeKey);
    context.candidates.routes = context.candidates.routes.filter((candidate) => candidate.routeKey !== row.routeKey);
  },
  /South Dakota SIS hidden written implementation-request branch|hidden participant.*unaccounted|candidate route set mismatch/i,
));

mutations.push(expectMutationFailure(
  "duplicate typed route key",
  baseline,
  (context) => {
    context.canonical.routeEntities.push(clone(mustFirst(context.canonical.routeEntities, "typed source entity")));
  },
  /duplicate route key/i,
));

mutations.push(expectMutationFailure(
  "unacknowledged duplicate identity",
  baseline,
  (context) => {
    const original = mustFirst(context.canonical.canonicalObligations, "canonical obligation");
    const duplicate = clone(original);
    duplicate.routeKey = `${duplicate.routeKey}:copy`;
    context.canonical.canonicalObligations.push(duplicate);
    const matchingCandidate = mustFind(context.candidates.routes, (candidate) => candidate.routeKey === original.routeKey, "candidate matching cloned canonical obligation");
    context.candidates.routes.push({ ...clone(matchingCandidate), routeKey: duplicate.routeKey });
  },
  /same route identity.*explicit alias|duplicate semantic identity/i,
));

mutations.push(expectMutationFailure(
  "collapsed distinct remedies",
  baseline,
  (context) => {
    const unitRows = context.canonical.routeEntities.filter((row) => row.entityType === "legal_track_unit");
    assert.ok(unitRows.length >= 2, "mutation fixture missing: two legal track unit rows");
    unitRows[1].sourceIdentity = unitRows[0].sourceIdentity;
  },
  /improperly collapses distinct remedies|source identity collision/i,
));

mutations.push(expectMutationFailure(
  "Category A missing output strategy",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "A_MUST_FULFILL", "Category A candidate for output strategy");
    row.currentOutputStrategy = null;
  },
  /Category A.*exact output strategy/i,
));

mutations.push(expectMutationFailure(
  "Category A uses an invented output strategy",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "A_MUST_FULFILL", "Category A candidate for invalid output strategy");
    row.currentOutputStrategy = "banana";
  },
  /invalid output strategy|Category A.*exact output strategy/i,
));

mutations.push(expectMutationFailure(
  "Category A missing packet treatment",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "A_MUST_FULFILL", "Category A candidate for packet treatment");
    row.packetFamilyId = null;
    row.packetSetId = null;
    row.currentOutputStrategy = "official_pdf_fill";
  },
  /Category A.*packet-family|Category A.*packet treatment/i,
));

acceptedVariants.push(expectMutationPass(
  "participant-facing instrument copy may be clarified without changing treatment identity",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.possibleCategory === "A_MUST_FULFILL"
        && candidate.participantFacingInstrument !== "not recorded",
      "Category A candidate with participant-facing instrument",
    );
    row.participantFacingInstrument = `${row.participantFacingInstrument} — participant copy clarified`;
  },
));

mutations.push(expectMutationFailure(
  "contract-labeled official treatment suppresses missing identity work",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.possibleCategory === "A_MUST_FULFILL"
        && candidate.currentOutputStrategy === "official_pdf_fill"
        && candidate.packetFamilyId?.startsWith("census-pending-family:")
        && candidate.packetSetId === null
        && candidate.currentImplementationEvidence.some((item) => item.startsWith("route-contract-packet-family-label:")),
      "Category A contract-labeled official-form candidate for missing-work mutation",
    );
    row.missingImplementationWork = ["Generate the route output."];
  },
  /census-pending packet family.*source\/map\/wiring work|contract-labeled official-form treatment omits source, map, or packet-identity wiring work/i,
));

mutations.push(expectMutationFailure(
  "packet family label masquerades as a stable identity",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.packetFamilyId !== null, "candidate with exact packet family identity");
    row.packetFamilyId = "identified";
  },
  /packetFamilyId.*stable|invalid packet family identity/i,
));

mutations.push(expectMutationFailure(
  "Category A missing work list",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "A_MUST_FULFILL", "Category A candidate for missing work");
    row.missingImplementationWork = null;
  },
  /Category A.*enumerated missing-work/i,
));

mutations.push(expectMutationFailure(
  "jurisdiction absent",
  baseline,
  (context) => {
    const jurisdiction = mustFirst(context.summary.jurisdictions, "jurisdiction summary row").jurisdiction;
    context.summary.jurisdictions = context.summary.jurisdictions.filter((row) => row.jurisdiction !== jurisdiction);
  },
  /jurisdiction set mismatch|jurisdiction.*absent/i,
));

mutations.push(expectMutationFailure(
  "candidate route missing",
  baseline,
  (context) => {
    context.candidates.routes.pop();
  },
  /candidate route set mismatch/i,
));

mutations.push(expectMutationFailure(
  "orphan candidate route",
  baseline,
  (context) => {
    context.candidates.routes.push({ ...clone(mustFirst(context.candidates.routes, "candidate route for orphan mutation")), routeKey: "obligation:track-only:ZZ:invented" });
  },
  /candidate route set mismatch|orphan candidate/i,
));

mutations.push(expectMutationFailure(
  "Category A missing worklist membership",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "A_MUST_FULFILL", "Category A worklist candidate");
    for (const family of context.worklist.packetFamilies) {
      family.routeKeys = family.routeKeys.filter((routeKey) => routeKey !== row.routeKey);
    }
  },
  /Category A.*worklist/i,
));

mutations.push(expectMutationFailure(
  "review row missing from queue",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "NEEDS_LEGAL_REVIEW", "legal-review candidate");
    context.reviewQueue.routes = context.reviewQueue.routes.filter((candidate) => candidate.routeKey !== row.routeKey);
  },
  /legal-review queue.*mismatch|review row.*queue/i,
));

mutations.push(expectMutationFailure(
  "legal-review flags and question incoherent",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.possibleCategory === "NEEDS_LEGAL_REVIEW", "legal-review candidate for coherence");
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /legal-review candidate lacks one narrow review question/i,
));

mutations.push(expectMutationFailure(
  "worklist deliverable dimension deleted",
  baseline,
  (context) => {
    const family = mustFirst(context.worklist.packetFamilies, "worklist family for dimension deletion");
    const route = mustFirst(family.routes, "worklist route for dimension deletion");
    delete route.deliverable.filingFee;
  },
  /worklist dimension filingFee is missing or malformed/i,
));

mutations.push(expectMutationFailure(
  "invented approval flag",
  baseline,
  (context) => {
    mustFirst(context.candidates.routes, "candidate for approval flag").approvedForLive = true;
  },
  /invented approval|prohibited authority flag/i,
));

mutations.push(expectMutationFailure(
  "invented runtime flag",
  baseline,
  (context) => {
    mustFirst(context.candidates.routes, "candidate for runtime flag").runtimeEnabled = true;
  },
  /invented runtime|prohibited authority flag/i,
));

mutations.push(expectMutationFailure(
  "invalid work type",
  baseline,
  (context) => {
    mustFirst(context.worklist.packetFamilies, "worklist family").workTypes.push("BUILD_PACKET_NOW");
  },
  /unauthorized work type/i,
));

mutations.push(expectMutationFailure(
  "source acquisition removed without custody proof",
  baseline,
  (context) => {
    const family = mustFind(
      context.worklist.packetFamilies,
      (candidate) => candidate.workTypes.includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED"),
      "family requiring official source acquisition",
    );
    family.workTypes = family.workTypes.filter((workType) => workType !== "OFFICIAL_SOURCE_ACQUISITION_REQUIRED");
    for (const route of family.routes) route.workTypes = route.workTypes.filter((workType) => workType !== "OFFICIAL_SOURCE_ACQUISITION_REQUIRED");
    context.worklist.counts.officialSourceAcquisitionTasks -= 1;
    context.summary.counts.officialSourceAcquisitionTasks -= 1;
  },
  /source custody.*acquisition|required source[- ]acquisition|lacks custody for every exact required source/i,
));

mutations.push(expectMutationFailure(
  "parent-unit integrity broken",
  baseline,
  (context) => {
    const unit = mustFind(context.canonical.routeEntities, (row) => row.entityType === "legal_track_unit", "unit for parent-integrity mutation");
    unit.parentRouteKey = "track:ZZ:missing";
  },
  /parent-unit integrity|missing parent/i,
));

mutations.push(expectMutationFailure(
  "unit parent-expansion mode removed",
  baseline,
  (context) => {
    const mapping = mustFind(
      context.canonical.sourceToCanonicalMappings,
      (candidate) => candidate.accountingRelation === "parent_expansion_without_unit_assignment",
      "runtime pathway mapping with explicit parent-expansion mode",
    );
    mapping.accountingRelation = "exact_source_to_terminal_representation";
  },
  /unit-parent expansion.*lacks the explicit parent_expansion_without_unit_assignment accounting mode/i,
));

mutations.push(expectMutationFailure(
  "crosswalk accounting broken",
  baseline,
  (context) => {
    context.canonical.representationEdges.pop();
  },
  /crosswalk.*accounting|representation edge set mismatch/i,
));

mutations.push(expectMutationFailure(
  "shared-form-only crosswalk conflict collapsed",
  baseline,
  (context) => {
    const pathwayMapping = mustFind(
      context.canonical.sourceToCanonicalMappings,
      (mapping) => mapping.sourceRouteKey === "pathway:SC:juvenile-expungement",
      "South Carolina juvenile pathway mapping",
    );
    const summaryMapping = mustFind(
      context.canonical.sourceToCanonicalMappings,
      (mapping) => mapping.sourceRouteKey === "track:SC:sc_17_22_950_summary",
      "South Carolina summary track mapping",
    );
    pathwayMapping.canonicalObligationKeys = [mustFirst(summaryMapping.canonicalObligationKeys, "South Carolina summary obligation")];
  },
  /shared-form-only.*collapse|shared-form-only runtime route.*collapsed/i,
));

mutations.push(expectMutationFailure(
  "South Carolina juvenile conflict inherits adult SCCA-223E packet",
  baseline,
  (context) => {
    const pathwayMapping = mustFind(
      context.canonical.sourceToCanonicalMappings,
      (mapping) => mapping.sourceRouteKey === "pathway:SC:juvenile-expungement",
      "South Carolina juvenile pathway mapping for inheritance mutation",
    );
    const row = mustFind(
      context.candidates.routes,
      (candidate) => pathwayMapping.canonicalObligationKeys.includes(candidate.routeKey),
      "South Carolina juvenile fidelity-review candidate",
    );
    row.requiredSourceIds.push("official-form:SCCA-223E");
  },
  /shared-form-only runtime route.*improperly inherits.*SCCA-223E/i,
));

mutations.push(expectMutationFailure(
  "decision fidelity conflict record omitted",
  baseline,
  (context) => {
    context.canonical.decisionFidelityConflicts = context.canonical.decisionFidelityConflicts.filter(
      (row) => row.jurisdiction !== "NY",
    );
  },
  /decision fidelity conflict.*set mismatch|decision fidelity conflict records disagree/i,
));

mutations.push(expectMutationFailure(
  "Oregon Lawrence source fingerprint corrupted",
  baseline,
  (context) => {
    const conflict = mustFind(
      context.canonical.decisionFidelityConflicts,
      (row) => row.jurisdiction === "OR",
      "Oregon Lawrence decision-fidelity conflict",
    );
    conflict.sourceSha256 = "sha256:corrupted";
  },
  /Oregon Lawrence subsection\/packet-scope conflict lacks exact source fingerprint\/provenance/i,
));

mutations.push(expectMutationFailure(
  "Oregon Lawrence conflict promoted out of legal review",
  baseline,
  (context) => {
    const conflict = mustFind(
      context.canonical.decisionFidelityConflicts,
      (row) => row.jurisdiction === "OR",
      "Oregon Lawrence decision-fidelity conflict for category mutation",
    );
    for (const routeKey of conflict.canonicalObligationKeys) {
      const row = mustFind(context.candidates.routes, (candidate) => candidate.routeKey === routeKey, "Oregon conflict candidate");
      row.possibleCategory = "A_MUST_FULFILL";
      row.possibleCategoryBReason = null;
      row.requiresLegalReview = false;
      row.legalReviewQuestion = null;
    }
  },
  /Oregon Lawrence subsection\/packet-scope conflict lacks exact source fingerprint\/provenance or a legal-review candidate/i,
));

mutations.push(expectMutationFailure(
  "packet specification source accounting removed",
  baseline,
  (context) => {
    const coverage = mustFirst(context.canonical.packetSpecificationCoverage, "packet specification coverage row");
    assert.ok(coverage.canonicalObligationKeys.length > 0, "mutation fixture requires a packet specification joined to a canonical obligation");
    context.canonical.packetSpecificationCoverage = context.canonical.packetSpecificationCoverage.filter(
      (row) => row.specificationIdentity !== coverage.specificationIdentity,
    );
  },
  /packet specification.*accounting|packet specification.*coverage/i,
));

mutations.push(expectMutationFailure(
  "packet specification target corrupted with generator co-drift",
  baseline,
  (context) => {
    const coverage = mustFirst(context.canonical.packetSpecificationCoverage, "packet specification target row");
    const originalTargets = new Set(coverage.canonicalObligationKeys);
    const replacement = mustFind(
      context.canonical.canonicalObligations,
      (obligation) => obligation.jurisdiction === coverage.jurisdiction && !originalTargets.has(obligation.routeKey),
      "unrelated same-jurisdiction packet target",
    );
    for (const route of context.candidates.routes.filter((candidate) => originalTargets.has(candidate.routeKey))) {
      route.currentImplementationEvidence = route.currentImplementationEvidence.filter((item) => !item.startsWith(`packet-specification:${coverage.specificationIdentity}:`));
    }
    const replacementCandidate = mustFind(context.candidates.routes, (candidate) => candidate.routeKey === replacement.routeKey, "replacement packet target candidate");
    replacementCandidate.currentImplementationEvidence.push(`packet-specification:${coverage.specificationIdentity}:historical=false`);
    coverage.canonicalObligationKeys = [replacement.routeKey];
    const generatorExpectedCoverage = mustFind(
      context.expected.json["canonical-route-universe.json"].packetSpecificationCoverage,
      (row) => row.specificationIdentity === coverage.specificationIdentity,
      "generator-expected packet coverage row",
    );
    generatorExpectedCoverage.canonicalObligationKeys = [replacement.routeKey];
  },
  /packet specification.*target mapping.*exact track\/pathway source identities/i,
  { cloneExpected: true },
));

mutations.push(expectMutationFailure(
  "duplicate exact service/failure selector representation",
  baseline,
  (context) => {
    const serviceMapping = mustFind(
      context.canonical.sourceToCanonicalMappings,
      (mapping) => mapping.sourceRouteKey.endsWith(":judgment_ambiguous") && mapping.sourceRouteKey.startsWith("service-branch:MO:"),
      "Missouri judgment-ambiguous service representation",
    );
    const failureMapping = mustFind(
      context.canonical.sourceToCanonicalMappings,
      (mapping) => mapping.sourceRouteKey.endsWith(":mo_311_326_judgment_ambiguous"),
      "Missouri judgment-ambiguous failure representation",
    );
    const replacement = mustFind(
      context.canonical.canonicalObligations,
      (obligation) => obligation.jurisdiction === "MO" && !serviceMapping.canonicalObligationKeys.includes(obligation.routeKey),
      "second Missouri obligation for selector duplication",
    );
    failureMapping.canonicalObligationKeys = [replacement.routeKey];
  },
  /exact selector representations were double-counted/i,
));

mutations.push(expectMutationFailure(
  "stale output counters",
  baseline,
  (context) => {
    context.summary.counts.possibleCategoryA += 1;
  },
  /stale.*counter|summary counter mismatch/i,
));

mutations.push(expectMutationFailure(
  "stale output hash",
  baseline,
  (context) => {
    context.candidates.metadata.sourceFingerprint = "sha256:stale";
  },
  /source fingerprint mismatch|stale.*hash/i,
));

mutations.push(expectMutationFailure(
  "source fingerprints disagree across outputs",
  baseline,
  (context) => {
    context.worklist.metadata.sourceFingerprint = "sha256:disagrees";
  },
  /source fingerprint agreement failure|source fingerprint mismatch/i,
));

mutations.push(expectMutationFailure(
  "contract supersession record removed",
  baseline,
  (context) => {
    assert.equal(context.duplicateReport.supersededRouteContracts.length, 3, "mutation fixture requires three contract replacements");
    context.duplicateReport.supersededRouteContracts.pop();
  },
  /superseded route-contract count drift|supersession integrity drift/i,
));

mutations.push(expectMutationFailure(
  "superseded runtime text record removed",
  baseline,
  (context) => {
    assert.equal(context.duplicateReport.supersededRuntimeTextRows.length, 1, "mutation fixture requires one superseded-runtime-text row");
    context.duplicateReport.supersededRuntimeTextRows.pop();
  },
  /superseded-runtime-text integrity drift|supersession integrity drift/i,
));

for (const [jurisdiction, pathwayId, branchId] of [
  ["DE", "juvenile-expungement-under-10-del-c-1017-1019-1017a", "section_1017a_automatic_program"],
  ["ME", "juvenile-sealing", "serious_or_oui_three_year_petition"],
  ["UT", "path-m-juvenile-expungement", "favorable_outcome_branch"],
  ["WA", "juvenile-record-sealing-under-rcw-13-50-260", "participant_motion_branch"],
]) {
  mutations.push(expectMutationFailure(
    `${jurisdiction} mixed runtime cohort branch removed`,
    baseline,
    (context) => {
      const key = `obligation:runtime-contract-cohort:${jurisdiction}:${pathwayId}:${branchId}`;
      mustFind(context.candidates.routes, (row) => row.routeKey === key, `${jurisdiction} exact cohort branch`);
      context.candidates.routes = context.candidates.routes.filter((row) => row.routeKey !== key);
    },
    /does not enumerate every exact automatic\/participant\/favorable terminal cohort|exact effective-contract cohort filing posture/i,
  ));
}

mutations.push(expectMutationFailure(
  "Louisiana approved-track versus participant-contract conflict silently promoted",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:track-pathway:LA:la-985-3-immediate-expungement:immediate-expungement-after-successful-court-program-completion-art-985-3",
      "Louisiana Article 985.3 exact mechanism conflict",
    );
    row.possibleCategory = "A_MUST_FULFILL";
    row.requiresLegalReview = false;
    row.legalReviewQuestion = null;
  },
  /silently resolves an exact no-filing\/current-stage track versus participant-contract mechanism conflict/i,
));

mutations.push(expectMutationFailure(
  "Georgia held presentation edge accepted for canonicalization",
  baseline,
  (context) => {
    const edge = mustFind(
      context.canonical.representationEdges,
      (row) => row.edgeId === "GA:ga-seal-m<->youthful-first-offender-restriction-route",
      "Georgia held presentation crosswalk edge",
    );
    edge.canonicalizationDisposition = "REPRESENTATION_LINK_ACCEPTED_FOR_SOURCE_ACCOUNTING";
  },
  /held presentation edge.*disposition inconsistent/i,
));

mutations.push(expectMutationFailure(
  "route-kind adjudication duplicated in both reports",
  baseline,
  (context) => {
    const row = clone(mustFirst(context.canonical.routeKindAdjudicationFindings, "route-kind finding"));
    context.canonical.routeKindAdjudicationFindings.push(row);
    context.duplicateReport.routeKindAdjudicationFindings.push(clone(row));
  },
  /route-kind adjudication findings disagree|route-kind adjudication.*exact/i,
));

mutations.push(expectMutationFailure(
  "pending Mississippi alias instruction duplicated",
  baseline,
  (context) => {
    const row = clone(mustFirst(context.duplicateReport.pendingAliasInstructions, "pending alias instruction"));
    context.duplicateReport.pendingAliasInstructions.push(row);
  },
  /pending route-key alias instruction coverage drift/i,
));

mutations.push(expectMutationFailure(
  "legal-track-without-runtime finding duplicated",
  baseline,
  (context) => {
    context.duplicateReport.legalTracksWithoutRuntime.push(clone(mustFirst(context.duplicateReport.legalTracksWithoutRuntime, "legal track gap")));
  },
  /legal tracks without runtime identity findings drift/i,
));

mutations.push(expectMutationFailure(
  "runtime-without-track finding duplicated",
  baseline,
  (context) => {
    context.duplicateReport.runtimeWithoutCurrentLegalDesignTrack.push(clone(mustFirst(context.duplicateReport.runtimeWithoutCurrentLegalDesignTrack, "runtime gap")));
  },
  /runtime pathways without a current legal-design track drift/i,
));

mutations.push(expectMutationFailure(
  "Nationwide inventory absence metadata invented as available",
  baseline,
  (context) => {
    context.canonical.metadata.sourceInventoryAvailability.presentInWorktree = true;
  },
  /Nationwide source-inventory availability metadata disagrees/i,
));

mutations.push(expectMutationFailure(
  "census-pending packet-family identity removed",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.packetFamilyId?.startsWith("census-pending-family:"), "census-pending family candidate");
    row.packetFamilyId = null;
  },
  /census-pending packet family.*lacks|census-pending packet family.*mismatch/i,
));

mutations.push(expectMutationFailure(
  "owner authority queue loses one of the exact 57 families",
  baseline,
  (context) => {
    const scoped = context.independent.ownerQueueRecord.decisionScope.completedOutputPacketFamilies;
    assert.equal(scoped.length, 57, "mutation fixture requires the exact 57-family owner scope");
    scoped.pop();
  },
  /decision-owner completed-output authority scope is not the exact.*57-family/i,
  { cloneIndependent: true },
));

mutations.push(expectMutationFailure(
  "owner-approved Wisconsin route opts out by nulling family identity",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.trackId === "wi_exp_certificate_of_discharge_followup",
      "owner-approved Wisconsin certificate follow-up",
    );
    assert.equal(row.packetFamilyId, "rcap-wi-custom-pleading", "mutation fixture requires the raw manifest family");
    row.packetFamilyId = null;
  },
  /exact owner-approved track\/treatment scope.*raw manifest packet-family identity/i,
));

mutations.push(expectMutationFailure(
  "owner-decision evidence duplicates approved family and route",
  baseline,
  (context) => {
    for (const evidence of [context.canonical.ownerLegalDecisionEvidence, context.duplicateReport.ownerLegalDecisionEvidence]) {
      evidence.approvedPacketFamilyIds.push(evidence.approvedPacketFamilyIds[0]);
      evidence.approvedCandidateRoutes.push(clone(evidence.approvedCandidateRoutes[0]));
    }
  },
  /decision-owner completed-output approval evidence.*incomplete/i,
));

mutations.push(expectMutationFailure(
  "effective runtime contract loses its sole exact candidate authority association",
  baseline,
  (context) => {
    const contractRouteKey = "MS:human-trafficking-survivor-expungement-97-3-54-6-6";
    const row = mustFind(context.candidates.routes, (candidate) => candidate.routeContractId === contractRouteKey, "Mississippi trafficking-survivor contract candidate");
    const association = mustFind(context.independent.runtimeAuthorityDecisionAssociations, (item) => item.contractRouteKey === contractRouteKey, "Mississippi runtime authority association");
    row.routeContractId = null;
    row.legalDecisionRecordIds = row.legalDecisionRecordIds.filter((id) => id !== association.authorityDecisionId);
    row.currentImplementationEvidence = row.currentImplementationEvidence.filter((item) => !item.startsWith("runtime-authority-decision:"));
  },
  /exact candidate association\/gap disposition is missing or vacuous/i,
));

mutations.push(expectMutationFailure(
  "runtime authority candidate carries an extra fake decision for the same contract",
  baseline,
  (context) => {
    const contractRouteKey = "MS:human-trafficking-survivor-expungement-97-3-54-6-6";
    const row = mustFind(context.candidates.routes, (candidate) => candidate.routeContractId === contractRouteKey, "Mississippi trafficking-survivor contract candidate");
    row.currentImplementationEvidence.push(`runtime-authority-decision:FAKE-OTHER:route=${contractRouteKey}:association=EXACT_AUTHORITY_ROUTE_KEY_ASSOCIATION:output-mode=fake:effective-note=fake`);
  },
  /missing exact runtime-authority|missing, extra, sibling, or otherwise non-exact runtime-authority evidence/i,
));

mutations.push(expectMutationFailure(
  "runtime authority association row duplicated",
  baseline,
  (context) => {
    const row = clone(mustFirst(context.canonical.runtimeAuthorityDecisionAssociations, "runtime authority association"));
    context.canonical.runtimeAuthorityDecisionAssociations.push(row);
    context.duplicateReport.runtimeAuthorityDecisionAssociations.push(clone(row));
  },
  /runtime authority decision association set disagrees/i,
));

mutations.push(expectMutationFailure(
  "runtime authority contract-candidate gap duplicated",
  baseline,
  (context) => {
    const row = clone(mustFirst(context.canonical.runtimeAuthorityContractCandidateGaps, "runtime authority candidate gap"));
    context.canonical.runtimeAuthorityContractCandidateGaps.push(row);
    context.duplicateReport.runtimeAuthorityContractCandidateGaps.push(clone(row));
  },
  /runtime-authority effective-contract-without-candidate gap identity set drift/i,
));

mutations.push(expectMutationFailure(
  "Kentucky partial source custody suppresses acquisition work",
  baseline,
  (context) => {
    const candidate = mustFind(context.candidates.routes, (row) => row.trackId === "ky_nonconviction_expungement", "Kentucky AOC-497 and AOC-497.2 candidate");
    const { family, route } = worklistAssociation(context, candidate.routeKey, "Kentucky partial-custody route");
    candidate.missingImplementationWork = candidate.missingImplementationWork.filter((item) => !/acquire.*(?:official[- ]source|source custody)|official[- ]source custody/i.test(item));
    route.missingImplementationWork = route.missingImplementationWork.filter((item) => !/acquire.*(?:official[- ]source|source custody)|official[- ]source custody/i.test(item));
    route.workTypes = route.workTypes.filter((item) => item !== "OFFICIAL_SOURCE_ACQUISITION_REQUIRED");
    family.workTypes = [...new Set(family.routes.flatMap((item) => item.workTypes))].sort();
  },
  /lacks custody for every exact required source|source-acquisition work is absent/i,
));

mutations.push(expectMutationFailure(
  "recorded unknown sentinel masquerades as service evidence",
  baseline,
  (context) => {
    const key = "obligation:track-only:CT:ct-cannabis-petition";
    const { family, route } = worklistAssociation(context, key, "Connecticut cannabis petition");
    route.deliverable.serviceMethod = { status: "recorded", entries: ["No service method was established by the source review."] };
    syncReusableDeliverableField(family, "serviceMethod");
  },
  /serviceMethod marks unresolved\/unknown(?:\/unstated)? evidence as recorded/i,
));

mutations.push(expectMutationFailure(
  "attachment dimension reuses a structured serve-party action",
  baseline,
  (context) => {
    const key = "obligation:service-branch:MO:first-minor-in-possession-alcohol-expungement-under-311-326:state_311_325_conviction";
    const candidate = mustFind(context.candidates.routes, (row) => row.routeKey === key, "Missouri state-law petition candidate");
    const track = mustFind(context.independent.trackRows, (row) => row.jurisdiction === "MO" && row.trackId === candidate.trackId, "Missouri source track");
    const action = mustFind(track.packetSet.participantActionRequired, (row) => row.kind === "serve_party", "Missouri serve-party action");
    const { family, route } = worklistAssociation(context, key, "Missouri state-law petition");
    route.deliverable.requiredParticipantAttachments = { status: "recorded", entries: [action.description] };
    syncReusableDeliverableField(family, "requiredParticipantAttachments");
  },
  /requiredParticipantAttachments reuses a non-obtain_document participant action/i,
));

mutations.push(expectMutationFailure(
  "attachment dimension reuses a filing action containing only service and proposed-order components",
  baseline,
  (context) => {
    const key = "obligation:track-pathway:CA:ca-prop64:prop-64-completed-sentence-application-11361-8";
    const track = mustFind(context.independent.trackRows, (row) => row.jurisdiction === "CA" && row.trackId === "ca-prop64", "California Prop 64 source track");
    const action = mustFind(track.packetSet.participantActionRequired, (row) => row.kind === "file" && /CR-401 proof of service.*CR-403 order/i.test(String(row.description)), "California filing/service/order action");
    const { family, route } = worklistAssociation(context, key, "California Prop 64 completed-sentence route");
    route.deliverable.requiredParticipantAttachments = { status: "recorded", entries: [action.description] };
    syncReusableDeliverableField(family, "requiredParticipantAttachments");
  },
  /requiredParticipantAttachments reuses a non-obtain_document participant action/i,
));

mutations.push(expectMutationFailure(
  "service method reuses a structured confirm-answer action",
  baseline,
  (context) => {
    const key = "obligation:track-only:CT:ct-cannabis-petition";
    const track = mustFind(context.independent.trackRows, (row) => row.jurisdiction === "CT" && row.trackId === "ct-cannabis-petition", "Connecticut cannabis source track");
    const action = mustFind(track.packetSet.participantActionRequired, (row) => row.kind === "confirm_answer", "Connecticut confirm-answer action");
    const { family, route } = worklistAssociation(context, key, "Connecticut cannabis petition");
    route.deliverable.serviceMethod = { status: "recorded", entries: [action.description] };
    syncReusableDeliverableField(family, "serviceMethod");
  },
  /serviceMethod reuses a non-service participant action/i,
));

mutations.push(expectMutationFailure(
  "destination-only filing text masquerades as filing method",
  baseline,
  (context) => {
    const key = "obligation:track-only:AK:ak-tf800";
    const { family, route } = worklistAssociation(context, key, "Alaska TF-800 route");
    route.deliverable.filingMethod = { status: "recorded", entries: ["File the request with the local trial court."] };
    syncReusableDeliverableField(family, "filingMethod");
  },
  /filingMethod contains.*instead of an explicit participant submission action/i,
));

mutations.push(expectMutationFailure(
  "non-filing DOJ record request charge becomes filing fee",
  baseline,
  (context) => {
    const route = mustFind(context.worklist.packetFamilies.flatMap((family) => family.routes), (row) => row.trackId && row.deliverable.filingFee.status === "not_recorded", "track worklist row without filing fee");
    const { family } = worklistAssociation(context, route.routeKey, "record-request fee mutation");
    route.deliverable.filingFee = { status: "recorded", entries: ["The participant pays $25 for a DOJ record request."] };
    syncReusableDeliverableField(family, "filingFee");
  },
  /filingFee contains a prerequisite or non-filing charge/i,
));

mutations.push(expectMutationFailure(
  "custom-pleading strategy loses composed work type",
  baseline,
  (context) => {
    const candidate = mustFind(context.candidates.routes, (row) => row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "custom_pleading", "Category A custom-pleading route");
    const { family, route } = worklistAssociation(context, candidate.routeKey, "custom-pleading strategy route");
    route.workTypes = route.workTypes.filter((item) => item !== "COMPOSED_PLEADING");
    family.workTypes = [...new Set(family.routes.flatMap((item) => item.workTypes))].sort();
  },
  /composed-pleading work type does not exactly match its explicit output strategy/i,
));

mutations.push(expectMutationFailure(
  "official-form strategy gains incompatible composed work type",
  baseline,
  (context) => {
    const candidate = mustFind(context.candidates.routes, (row) => row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "official_pdf_fill", "Category A official-form route");
    const { family, route } = worklistAssociation(context, candidate.routeKey, "official-form strategy route");
    route.workTypes.push("COMPOSED_PLEADING");
    route.workTypes.sort();
    family.workTypes = [...new Set(family.routes.flatMap((item) => item.workTypes))].sort();
  },
  /composed-pleading work type does not exactly match its explicit output strategy/i,
));

mutations.push(expectMutationFailure(
  "agency-application strategy loses agency work type",
  baseline,
  (context) => {
    const candidate = mustFind(context.candidates.routes, (row) => row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "participant_agency_application", "Category A agency-application route");
    const { family, route } = worklistAssociation(context, candidate.routeKey, "agency-application strategy route");
    route.workTypes = route.workTypes.filter((item) => item !== "PARTICIPANT_AGENCY_APPLICATION");
    family.workTypes = [...new Set(family.routes.flatMap((item) => item.workTypes))].sort();
  },
  /participant-agency-application work type does not exactly match its explicit output strategy/i,
));

mutations.push(expectMutationFailure(
  "agency application with an official form loses additive map work",
  baseline,
  (context) => {
    const candidate = mustFind(
      context.candidates.routes,
      (row) => row.possibleCategory === "A_MUST_FULFILL"
        && row.currentOutputStrategy === "participant_agency_application"
        && row.requiredSourceIds.some((sourceId) => sourceId.startsWith("official-form:")),
      "agency application with exact official form",
    );
    const { family, route } = worklistAssociation(context, candidate.routeKey, "agency official-form route");
    route.workTypes = route.workTypes.filter((item) => item !== "OFFICIAL_FORM_MAP_REQUIRED");
    family.workTypes = [...new Set(family.routes.flatMap((item) => item.workTypes))].sort();
  },
  /official-form mapping work does not match its exact required official forms/i,
));

mutations.push(expectMutationFailure(
  "explicit unit imports sibling petition component",
  baseline,
  (context) => {
    const key = "obligation:unit:UT:ut_pet_acquittal:ut_pet_acquittal-bci-certificate";
    const { family, route } = worklistAssociation(context, key, "Utah BCI-certificate unit");
    route.deliverable.primaryOfficialFormOrComposedPleading.entries.push("petition: 1000EX");
    route.deliverable.primaryOfficialFormOrComposedPleading.entries.sort();
    syncReusableDeliverableField(family, "primaryOfficialFormOrComposedPleading");
  },
  /imports parent or sibling-stage evidence not explicitly associated with this unit/i,
));

mutations.push(expectMutationFailure(
  "research-decision mapping reciprocally overjoins an unrelated obligation",
  baseline,
  (context) => {
    const sourceKey = "research-decision-route:CO:co_mistaken_identity_expungement";
    const mapping = mustFind(context.canonical.sourceToCanonicalMappings, (row) => row.sourceRouteKey === sourceKey, "Colorado research decision mapping");
    const unrelated = mustFind(context.canonical.canonicalObligations, (row) => row.routeKey === "obligation:runtime-only:CO:juvenile-expungement-19-1-306", "unrelated Colorado juvenile obligation");
    mapping.canonicalObligationKeys.push(unrelated.routeKey);
    mapping.canonicalObligationKeys.sort();
    unrelated.sourceEntityKeys.push(sourceKey);
    unrelated.sourceEntityKeys.sort();
  },
  /research decision CO:co_mistaken_identity_expungement.*exact branch target set/i,
));

mutations.push(expectMutationFailure(
  "North Carolina DNA-expunction hidden branch removed",
  baseline,
  (context) => {
    const key = "obligation:track-branch:NC:nc_146_dismissal_petition:dna-expunction-application-15a-146-b1";
    mustFind(context.candidates.routes, (row) => row.routeKey === key, "North Carolina DNA-expunction branch");
    context.candidates.routes = context.candidates.routes.filter((row) => row.routeKey !== key);
  },
  /North Carolina.*DNA expunction application is missing|separate G\.S\. 15A-146\(b1\)/i,
));

mutations.push(expectMutationFailure(
  "mandatory Kansas hearing treatment deleted",
  baseline,
  (context) => {
    const key = "obligation:track-only:KS:ks-21-6614-diversion";
    const { family, route } = worklistAssociation(context, key, "Kansas diversion hearing route");
    route.deliverable.uncontestedHearingTreatment = { status: "not_recorded", entries: ["not recorded"] };
    route.missingImplementationWork.push("Record uncontestedHearingTreatment; current evidence is not recorded.");
    route.missingImplementationWork.sort();
    syncReusableDeliverableField(family, "uncontestedHearingTreatment");
  },
  /omits exact routine or mandatory uncontested-hearing treatment/i,
));

mutations.push(expectMutationFailure(
  "Connecticut participant pardon application demoted to review",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.trackId === "ct-provisional-pardon", "Connecticut provisional pardon route");
    row.possibleCategory = "NEEDS_LEGAL_REVIEW";
    row.requiresLegalReview = true;
    row.legalReviewQuestion = "Invented review question";
  },
  /Connecticut|CT ct-provisional-pardon participant-request evidence.*Category A/i,
));

mutations.push(expectMutationFailure(
  "Ohio prosecutor-only route promoted to participant filing",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.trackId === "oh_2953_39_prosecutor", "Ohio prosecutor-only route");
    row.possibleCategory = "A_MUST_FULFILL";
    row.possibleCategoryBReason = null;
    row.participantCanInitiate = true;
  },
  /Ohio prosecutor-only.*B \/ PROSECUTOR_CONTROLLED/i,
));

mutations.push(expectMutationFailure(
  "exact professional-only route left as generic legal review",
  baseline,
  (context) => {
    const row = mustFind(context.candidates.routes, (candidate) => candidate.trackId === "nm_cannabis_sentence", "New Mexico cannabis-sentence professional route");
    row.possibleCategory = "NEEDS_LEGAL_REVIEW";
    row.possibleCategoryBReason = null;
    row.participantCanInitiate = null;
    row.requiresLegalReview = true;
    row.legalReviewQuestion = "Invented review question";
  },
  /NM nm_cannabis_sentence.*B \/ UNSUITABLE_FOR_SELF_HELP/i,
));

mutations.push(expectMutationFailure(
  "automatic New Jersey route gains participant actor",
  baseline,
  (context) => {
    const row = mustFind(
      context.candidates.routes,
      (candidate) => candidate.routeKey === "obligation:runtime-only:NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1",
      "New Jersey automatic marijuana/hashish route",
    );
    row.processActor = "participant";
  },
  /Category B automatic reason contradicts a participant processActor/i,
));

mutations.push(expectMutationFailure(
  "service recipients reuse confirm-answer agency prose",
  baseline,
  (context) => {
    const key = "obligation:track-only:CT:ct-cannabis-petition";
    const track = mustFind(context.independent.trackRows, (row) => row.jurisdiction === "CT" && row.trackId === "ct-cannabis-petition", "Connecticut cannabis source track");
    const action = mustFind(track.packetSet.participantActionRequired, (row) => row.kind === "confirm_answer", "Connecticut confirm-answer action for recipients");
    const { family, route } = worklistAssociation(context, key, "Connecticut service-recipient route");
    route.deliverable.serviceRecipients = { status: "recorded", entries: [action.description] };
    syncReusableDeliverableField(family, "serviceRecipients");
  },
  /serviceRecipients reuses a non-service participant action/i,
));

mutations.push(expectMutationFailure(
  "service method reuses filing-by-mail action",
  baseline,
  (context) => {
    const fixture = context.worklist.packetFamilies.flatMap((family) => family.routes.map((route) => ({ family, route }))).find(({ route }) => {
      const candidate = context.candidates.routes.find((row) => row.routeKey === route.routeKey);
      const track = context.independent.trackRows.find((row) => row.jurisdiction === candidate?.jurisdiction && row.trackId === candidate?.trackId);
      return track?.packetSet?.participantActionRequired?.some((action) => action.kind === "file" && /\bby mail\b|\bmail(?:ed|ing)?\b/i.test(String(action.description)));
    });
    assert.ok(fixture, "mutation fixture missing: file-by-mail action");
    const candidate = mustFind(context.candidates.routes, (row) => row.routeKey === fixture.route.routeKey, "file-by-mail candidate");
    const track = mustFind(context.independent.trackRows, (row) => row.jurisdiction === candidate.jurisdiction && row.trackId === candidate.trackId, "file-by-mail source track");
    const action = mustFind(track.packetSet.participantActionRequired, (row) => row.kind === "file" && /\bby mail\b|\bmail(?:ed|ing)?\b/i.test(String(row.description)), "file-by-mail source action");
    fixture.route.deliverable.serviceMethod = { status: "recorded", entries: [action.description] };
    syncReusableDeliverableField(fixture.family, "serviceMethod");
  },
  /serviceMethod reuses a non-service participant action/i,
));

mutations.push(expectMutationFailure(
  "service timing reuses an unrelated processing clock",
  baseline,
  (context) => {
    const route = mustFind(context.worklist.packetFamilies.flatMap((family) => family.routes), (row) => row.deliverable.serviceTiming.status === "not_recorded", "route without service timing");
    const { family } = worklistAssociation(context, route.routeKey, "non-service timing route");
    route.deliverable.serviceTiming = { status: "recorded", entries: ["The court must issue its order within 30 days after filing."] };
    syncReusableDeliverableField(family, "serviceTiming");
  },
  /serviceTiming contains a non-service timing statement/i,
));

mutations.push(expectMutationFailure(
  "filing deadline reuses a court processing deadline",
  baseline,
  (context) => {
    const route = mustFind(context.worklist.packetFamilies.flatMap((family) => family.routes), (row) => row.deliverable.filingDeadline.status === "not_recorded", "route without filing deadline");
    const { family } = worklistAssociation(context, route.routeKey, "court-processing deadline route");
    route.deliverable.filingDeadline = { status: "recorded", entries: ["The court must enter the order within 30 days after filing."] };
    syncReusableDeliverableField(family, "filingDeadline");
  },
  /filingDeadline contains a non-participant, obsolete, or processing deadline/i,
));

mutations.push(expectMutationFailure(
  "filing destination falls back to contract mechanism",
  baseline,
  (context) => {
    const candidate = mustFind(context.candidates.routes, (row) => row.possibleCategory === "A_MUST_FULFILL" && row.routeContractId, "Category A route-contract candidate");
    const contract = mustFind(context.independent.effectiveContractRows, ({ contract: row }) => row.routeKey === candidate.routeContractId, "effective contract for destination mutation").contract;
    assert.ok(contract.mechanism, "mutation fixture requires contract mechanism");
    contract.destination = null;
    const { family, route } = worklistAssociation(context, candidate.routeKey, "mechanism-as-destination route");
    route.deliverable.filingDestination = { status: "recorded", entries: [contract.mechanism] };
    syncReusableDeliverableField(family, "filingDestination");
  },
  /filingDestination improperly falls back to the route mechanism label/i,
  { cloneIndependent: true },
));

mutations.push(expectMutationFailure(
  "post-filing instructions reuse prefiling packet prose",
  baseline,
  (context) => {
    const fixture = context.worklist.packetFamilies.flatMap((family) => family.routes.map((route) => ({ family, route }))).find(({ route }) => {
      const candidate = context.candidates.routes.find((row) => row.routeKey === route.routeKey);
      const track = context.independent.trackRows.find((row) => row.jurisdiction === candidate?.jurisdiction && row.trackId === candidate?.trackId);
      return track?.packetInstructions?.some((line) => !/after|post[- ]filing|once filed|following filing|hearing|order entered|decision issued/i.test(String(line)));
    });
    assert.ok(fixture, "mutation fixture missing: prefiling packet instruction");
    const candidate = mustFind(context.candidates.routes, (row) => row.routeKey === fixture.route.routeKey, "prefiling-instruction candidate");
    const track = mustFind(context.independent.trackRows, (row) => row.jurisdiction === candidate.jurisdiction && row.trackId === candidate.trackId, "prefiling-instruction source track");
    const line = mustFind(track.packetInstructions, (item) => !/after|post[- ]filing|once filed|following filing|hearing|order entered|decision issued/i.test(String(item)), "prefiling packet instruction");
    fixture.route.deliverable.postFilingInstructions = { status: "recorded", entries: [line] };
    syncReusableDeliverableField(fixture.family, "postFilingInstructions");
  },
  /postFilingInstructions reuses prefiling packet instructions/i,
));

mutations.push(expectMutationFailure(
  "uncontested hearing field accepts unrelated prose",
  baseline,
  (context) => {
    const route = mustFirst(context.worklist.packetFamilies.flatMap((family) => family.routes), "worklist route for hearing mutation");
    const { family } = worklistAssociation(context, route.routeKey, "uncontested hearing mutation route");
    route.deliverable.uncontestedHearingTreatment = { status: "recorded", entries: ["Obtain a certified criminal-history report before filing."] };
    syncReusableDeliverableField(family, "uncontestedHearingTreatment");
  },
  /uncontestedHearingTreatment lacks hearing\/proceeding semantics/i,
));

mutations.push(expectMutationFailure(
  "contested hearing field accepts prior-denial waiting prose",
  baseline,
  (context) => {
    const route = mustFirst(context.worklist.packetFamilies.flatMap((family) => family.routes), "worklist route for contested-hearing mutation");
    const { family } = worklistAssociation(context, route.routeKey, "contested hearing mutation route");
    route.deliverable.contestedHearingOrOppositionHandoff = { status: "recorded", entries: ["A prior denial starts a two-year refiling wait."] };
    syncReusableDeliverableField(family, "contestedHearingOrOppositionHandoff");
  },
  /contestedHearingOrOppositionHandoff contains an unrelated professional boundary/i,
));

mutations.push(expectMutationFailure(
  "owner-approved route wrongly reopens completed-output legal approval",
  baseline,
  (context) => {
    const key = "obligation:track-only:WI:wi_exp_certificate_of_discharge_followup";
    const candidate = mustFind(context.candidates.routes, (row) => row.routeKey === key, "owner-approved Wisconsin route");
    const { family, route } = worklistAssociation(context, key, "owner-approved Wisconsin worklist route");
    const text = "Obtain completed-output legal approval for the exact packet family and route scope; the census creates no approval.";
    candidate.missingImplementationWork.push(text);
    candidate.missingImplementationWork.sort();
    route.missingImplementationWork.push(text);
    route.missingImplementationWork.sort();
    route.workTypes.push("OUTPUT_LEGAL_APPROVAL_REQUIRED");
    route.workTypes.sort();
    family.workTypes = [...new Set(family.routes.flatMap((item) => item.workTypes))].sort();
  },
  /exact owner-approved family\/track scope.*incorrectly retains legal-approval work/i,
));

mutations.push(expectMutationFailure(
  "unapproved route loses completed-output legal approval work",
  baseline,
  (context) => {
    const ownerApproved = new Set(context.canonical.ownerLegalDecisionEvidence.approvedCandidateRoutes.map((row) => row.routeKey));
    const candidate = mustFind(
      context.candidates.routes,
      (row) => row.possibleCategory === "A_MUST_FULFILL" && !ownerApproved.has(row.routeKey),
      "unapproved Category A route",
    );
    const { family, route } = worklistAssociation(context, candidate.routeKey, "unapproved route");
    candidate.missingImplementationWork = candidate.missingImplementationWork.filter((item) => !/completed-output legal approval/i.test(item));
    route.missingImplementationWork = route.missingImplementationWork.filter((item) => !/completed-output legal approval/i.test(item));
    route.workTypes = route.workTypes.filter((item) => item !== "OUTPUT_LEGAL_APPROVAL_REQUIRED");
    family.workTypes = [...new Set(family.routes.flatMap((item) => item.workTypes))].sort();
  },
  /outside exact owner-approved family\/track scope.*lacks completed-output legal-approval work/i,
));

mutations.push(expectMutationFailure(
  "owner approval wrongly waives artifact review",
  baseline,
  (context) => {
    const key = "obligation:track-only:WI:wi_exp_certificate_of_discharge_followup";
    const { family, route } = worklistAssociation(context, key, "owner-approved artifact-review route");
    route.workTypes = route.workTypes.filter((item) => item !== "ARTIFACT_REVIEW_REQUIRED");
    family.workTypes = [...new Set(family.routes.flatMap((item) => item.workTypes))].sort();
  },
  /lacks artifact review; decision-owner legal approval does not waive/i,
));

console.log(`PASS national route obligation census mutation suite (${mutations.length} rejected mutations, ${acceptedVariants.length} accepted variants)`);
for (const mutation of mutations) console.log(`  - ${mutation}`);
for (const variant of acceptedVariants) console.log(`  - accepted: ${variant}`);
