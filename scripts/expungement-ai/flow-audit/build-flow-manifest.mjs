#!/usr/bin/env node
// Enumerate every current Expungement.ai state x remedy path.
//
//   node scripts/expungement-ai/flow-audit/build-flow-manifest.mjs
//   node scripts/expungement-ai/flow-audit/build-flow-manifest.mjs --check
//
// The unit is: state x remedy x terminal outcome x materially distinct
// audience/payment mode.
//
// Every row is DERIVED, never asserted: the pathway universe comes from the
// repository's own sellable-pathway closure ledger, and each terminal outcome is
// produced by driving a deterministic synthetic participant through the real
// authoritative evaluator. Nothing here decides eligibility, changes a profile,
// or writes into product code.

import {
  ROOT_DIR, readJson, exists, read, gitSha, writeArtifact, stableJson,
  EVALUATOR_TODAY, CLEAR_RECORD, ANSWER_RULE,
  getProfileByJurisdiction, getAllJurisdictionProfiles, projectPublicProfile,
  deriveScreens, packetPlanForPathway, questionIndex, converge, sha256,
  evaluateAuthoritativeScreeningResult
} from "./lib/engine.mjs";
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/flow-manifest.json";

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const launchGraph = readJson("data/rcap-ledger/launch-graph.json");
const witnessFixtures = readJson("data/rcap-ledger/public-witness-fixtures.json");
const promotionSource = read("src/lib/rcap/state-promotion-manifest.ts");
const promotionRows = JSON.parse(
  promotionSource.match(/PROMOTION_MANIFEST_START\s\*\/\s*(\[[\s\S]*?\])\s*\/\*\s*PROMOTION_MANIFEST_END/)[1]
);
const promotionByCode = new Map(promotionRows.map((row) => [row.abbreviation, row]));
const launchRowByKey = new Map(launchGraph.rows.map((row) => [row.pathwayKey, row]));
const fixtureByKey = new Map(witnessFixtures.fixtures.map((row) => [row.pathwayKey, row]));

/* ------------------------------------------------------------------ */
/* Existing test coverage index                                        */
/* ------------------------------------------------------------------ */

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT_DIR, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walkFiles(rel, out);
    else if (/\.(mjs|js|ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const testFiles = walkFiles("scripts").filter((f) => /\/(verify|test|capture)-/.test(f));
const testCorpus = testFiles.map((file) => ({ file, text: read(file) }));

function coverageFor({ jurisdiction, pathwayId, slug }) {
  const jurisdictionHits = [];
  const pathwayHits = [];
  for (const { file, text } of testCorpus) {
    if (pathwayId && text.includes(pathwayId)) pathwayHits.push(file);
    else if (
      text.includes(`"${jurisdiction}"`) || text.includes(`'${jurisdiction}'`) ||
      text.includes(`${jurisdiction}:`) || (slug && text.includes(slug))
    ) jurisdictionHits.push(file);
  }
  return {
    pathwayNamedIn: pathwayHits.slice(0, 8),
    jurisdictionNamedIn: jurisdictionHits.slice(0, 8),
    browserCoverage: "none_before_this_audit",
    level: pathwayHits.length > 0 ? "pathway_named_in_static_verifier"
      : jurisdictionHits.length > 0 ? "jurisdiction_named_in_static_verifier"
        : "no_named_coverage"
  };
}

/* ------------------------------------------------------------------ */
/* Audience / payment / sponsorship classification                     */
/* ------------------------------------------------------------------ */

const PAYMENT_ELIGIBLE = new Set(["packet_ready", "packet_ready_with_caution"]);

/**
 * Checkout refuses some routes that the evaluator marks payment-allowed. Those
 * refusals are separate terminal outcomes a participant can actually reach, so
 * they are rows, not footnotes. The classification names are the product's own
 * (see src/app/api/expungement-ai/checkout/route.ts).
 */
function checkoutRefusalFor(closureRow, launchRow) {
  const treatments = closureRow?.classification?.evidence?.trackTreatments ?? [];
  const flat = treatments.map((t) => (typeof t === "string" ? t : t?.treatment ?? t?.kind ?? "")).join(",");
  if (/exact_supported_deferral/.test(flat)) return "exact_supported_deferral";
  if (/terminal_treatment_candidate/.test(flat)) return "terminal_treatment_candidate";
  if (/component_deferral/.test(flat)) return "component_deferral";
  if (launchRow && launchRow.paymentResult?.allowedAtTheEvaluator === true && launchRow.paymentResult?.sellableAtTheResolver === false) {
    return "packet_not_deliverable";
  }
  if (closureRow?.route && closureRow.route.sellable === false && closureRow.category === "paid_packet_intended") {
    return "packet_not_deliverable";
  }
  return null;
}

/**
 * Materially distinct audience/payment modes for a terminal.
 *
 * `dtc_paid` and `partner_sponsored` are separate rows only where money or
 * packet delivery actually differs — that is, on a payment-eligible terminal.
 * On every other terminal the two audiences differ by CTA label alone (one
 * shared component branch, see PARTNER_RESULT_LANES in ScreeningResult.tsx), so
 * the partner lane is carried as an attribute of the single row rather than
 * doubling the manifest. That choice is recorded in the manifest header.
 */
function modesFor({ resultCode, paymentAllowed, checkoutRefusal }) {
  if (PAYMENT_ELIGIBLE.has(resultCode) && paymentAllowed) {
    return checkoutRefusal
      ? ["dtc_payment_refused_at_checkout", "partner_sponsored_no_charge"]
      : ["dtc_paid", "partner_sponsored_no_charge"];
  }
  return ["dtc_no_payment"];
}

const PARTNER_LANE_BY_RESULT = {
  packet_ready: "Continue to packet builder",
  packet_ready_with_caution: "Continue to packet builder",
  needs_more_info: "Continue to my Briefcase",
  needs_review: "Continue to my Briefcase",
  guidance_only: "View my next steps",
  not_covered_yet: "View my next steps",
  not_yet: "View my Briefcase",
  likely_not_eligible: "View my Briefcase",
  hard_stop: "View my Briefcase"
};

const UNSUPPORTED_TERMINALS = new Set([
  "not_covered_yet", "hard_stop", "likely_not_eligible",
  "exact_supported_deferral", "terminal_treatment_candidate",
  "component_deferral", "packet_not_deliverable"
]);

const REFERRAL_TERMINALS = new Set(["guidance_only", "needs_review", "not_yet"]);

/* ------------------------------------------------------------------ */
/* Flow identity                                                       */
/* ------------------------------------------------------------------ */

function flowId({ jurisdiction, pathwayId, terminal, mode }) {
  const key = `${jurisdiction}::${pathwayId ?? "_no_pathway"}::${terminal}::${mode}`;
  return { flowKey: key, flowId: `EXPAI-${jurisdiction}-${sha256(key).slice(0, 10)}` };
}

/* ------------------------------------------------------------------ */
/* Non-pathway terminal probes (per jurisdiction)                      */
/* ------------------------------------------------------------------ */

/**
 * Terminals a participant reaches without ever resolving a remedy. These are
 * real flows with real screens, so they are enumerated per jurisdiction rather
 * than assumed identical.
 */
const NON_PATHWAY_PROBES = [
  {
    id: "not_my_own_record",
    entry: "Participant answers the ownership question with someone else's record.",
    overrides: { ownership_scope: "No" },
    seedFrom: "clear_record"
  },
  {
    id: "no_answers_supplied",
    entry: "Participant lands on the state's first screen and submits nothing.",
    overrides: {},
    seedFrom: "empty"
  },
  {
    id: "state_exclusion_selected",
    entry: "Participant selects a state exclusion category on the exclusion screen.",
    overrides: { __pickNonNoneExclusion: true },
    seedFrom: "clear_record"
  },
  {
    id: "inside_waiting_period",
    entry: "Participant's case resolved inside the shortest timing bucket the state offers.",
    overrides: { __pickFirstTimingBucket: true },
    seedFrom: "clear_record"
  },
  {
    id: "out_of_jurisdiction_case",
    entry: "Participant's case is not a state or local case in this jurisdiction.",
    overrides: { __pickNonStateJurisdiction: true },
    seedFrom: "clear_record"
  }
];

function resolveProbeOverrides(probe, questions) {
  const out = {};
  for (const [key, value] of Object.entries(probe.overrides)) {
    if (key === "__pickNonNoneExclusion") {
      const q = questions.get("state_exclusion_categories");
      const option = q?.options?.find((o) => !/^none/i.test(o));
      if (option) out.state_exclusion_categories = [option];
      continue;
    }
    if (key === "__pickFirstTimingBucket") {
      const q = questions.get("resolved_timing_bucket");
      const option = q?.options?.[0];
      if (option) out.resolved_timing_bucket = option;
      continue;
    }
    if (key === "__pickNonStateJurisdiction") {
      const q = questions.get("jurisdiction_scope");
      const option = q?.options?.find((o) => !/state or local/i.test(o));
      if (option) out.jurisdiction_scope = option;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

const profiles = getAllJurisdictionProfiles();
const jurisdictionCodes = profiles.map((p) => p.jurisdiction.code).sort();
const closureByJurisdiction = new Map();
for (const row of closure.pathways) {
  if (!closureByJurisdiction.has(row.jurisdiction)) closureByJurisdiction.set(row.jurisdiction, []);
  closureByJurisdiction.get(row.jurisdiction).push(row);
}

const flows = [];
const jurisdictionSummaries = [];
const unreachable = [];

for (const code of jurisdictionCodes) {
  const profile = getProfileByJurisdiction(code);
  const publicProfile = projectPublicProfile(profile);
  const screens = deriveScreens(publicProfile);
  const questions = questionIndex(publicProfile);
  const contextOptions = questions.get("possible_pathway_context")?.options ?? [];
  const promotion = promotionByCode.get(code) ?? null;
  const closureRows = (closureByJurisdiction.get(code) ?? []).slice().sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey));
  const compiledPathwayIds = new Set(profile.pathways.map((p) => p.id));
  const jurisdictionFlowIds = [];

  const sourceFiles = [
    `src/lib/rcap-engine/compiled/profiles/${code}-${profile.jurisdiction.slug}.json`,
    "src/lib/rcap-engine/compiled/all51.json",
    "src/lib/rcap-engine/public-profile-projection.ts",
    "src/lib/rcap-engine/evaluator.ts",
    "src/lib/rcap-engine/packet-planner.ts",
    "src/components/expungement-ai/screening/ScreeningFlow.tsx",
    "src/components/expungement-ai/screening/screens.ts",
    "src/components/expungement-ai/screening/QuestionField.tsx",
    "src/components/expungement-ai/screening/ScreeningResult.tsx",
    "src/lib/rcap/state-promotion-manifest.ts"
  ].filter((p) => exists(p));

  /* --- remedy flows ------------------------------------------------ */
  for (const closureRow of closureRows) {
    const pathway = profile.pathways.find((p) => p.id === closureRow.pathwayId) ?? null;
    const launchRow = launchRowByKey.get(closureRow.pathwayKey) ?? null;
    const recorded = fixtureByKey.get(closureRow.pathwayKey) ?? null;

    // Prefer the repository's own recorded fixture. Where none exists (every
    // non-paid category), derive one here with the identical pinned rule.
    let answers;
    let rounds;
    let terminal;
    let paymentAllowed;
    let landedPathwayId;
    let fixtureOrigin;
    let convergenceError = null;

    if (recorded) {
      answers = recorded.answers;
      rounds = recorded.rounds;
      terminal = recorded.expected.resultCode;
      paymentAllowed = recorded.expected.paymentAllowed === true;
      landedPathwayId = recorded.expected.pathwayId ?? null;
      fixtureOrigin = "data/rcap-ledger/public-witness-fixtures.json";
    } else {
      const context = contextOptions.find((option) => option === closureRow.pathwayLabel)
        ?? contextOptions.find((option) => typeof option === "string" && option.includes(closureRow.pathwayLabel))
        ?? null;
      const run = converge({
        jurisdiction: code,
        profile,
        questions,
        seedAnswers: { ...CLEAR_RECORD, ...(context ? { possible_pathway_context: context } : {}) }
      });
      answers = Object.fromEntries(Object.entries(run.answers).sort(([a], [b]) => a.localeCompare(b)));
      rounds = run.transcript;
      terminal = run.evaluation?.resultCode ?? "did_not_settle";
      paymentAllowed = run.evaluation?.paymentAllowed === true;
      landedPathwayId = run.evaluation?.pathwayId ?? null;
      convergenceError = run.error;
      fixtureOrigin = "derived_by_this_audit";
      if (run.error) unreachable.push({ pathwayKey: closureRow.pathwayKey, error: run.error });
    }

    const checkoutRefusal = PAYMENT_ELIGIBLE.has(terminal) && paymentAllowed
      ? checkoutRefusalFor(closureRow, launchRow)
      : null;
    const effectiveTerminal = checkoutRefusal ?? terminal;
    const plan = pathway ? packetPlanForPathway(profile, pathway.id) : undefined;

    for (const mode of modesFor({ resultCode: terminal, paymentAllowed, checkoutRefusal })) {
      const ids = flowId({ jurisdiction: code, pathwayId: closureRow.pathwayId, terminal: effectiveTerminal, mode });
      jurisdictionFlowIds.push(ids.flowId);
      flows.push({
        flowId: ids.flowId,
        flowKey: ids.flowKey,
        jurisdiction: code,
        jurisdictionName: profile.jurisdiction.name,
        jurisdictionSlug: profile.jurisdiction.slug,
        remedy: {
          kind: "compiled_pathway",
          pathwayId: closureRow.pathwayId,
          pathwayLabel: closureRow.pathwayLabel,
          closureCategory: closureRow.category,
          closureCategoryBasis: closureRow.categoryBasis,
          routeType: pathway?.routeType ?? null,
          automatic: pathway?.automatic ?? null,
          filingRequired: pathway?.filingRequired ?? null,
          compiledPathwayPresent: compiledPathwayIds.has(closureRow.pathwayId)
        },
        entryConditions: {
          publicRoute: `/expungement-ai/screening/${profile.jurisdiction.slug}`,
          entryPoints: [
            "/expungement-ai/screening (state picker)",
            "/expungement-ai/start",
            "/expungement-ai/check",
            `/expungement-ai/states/${profile.jurisdiction.slug}`,
            "/expungement-ai/screening/resume (emailed resume link)"
          ],
          requiresAuthenticationBeforeScreening: false,
          jurisdictionApprovedForExpungementAiChannel: promotion?.approvedChannels?.expungementAi === true,
          jurisdictionPromotionStatus: promotion?.promotionStatus ?? "unknown",
          profileVersion: profile.profileVersion
        },
        screeningFacts: Object.keys(answers).sort(),
        screeningScreenIds: screens.map((q) => q.id),
        packetFacts: plan?.requiredInputIds ?? profile.packetGenerator.requiredInputs ?? [],
        branchingConditions: {
          rounds,
          conditionalQuestionIdsExercised: [...new Set(rounds.flatMap((r) => r.requested ?? []))].sort(),
          droppedAsNotEvaluatorQuestions: [...new Set(rounds.flatMap((r) => r.droppedAsNotEvaluatorQuestions ?? []))].sort(),
          pathwayContextSteer: answers.possible_pathway_context ?? null,
          triggerFields: pathway?.triggerFields ?? [],
          caseOutcomes: pathway?.caseOutcomes ?? []
        },
        terminalOutcome: {
          resultCode: terminal,
          effectiveTerminal,
          landedOnRequestedPathway: landedPathwayId === closureRow.pathwayId,
          landedPathwayId,
          paymentAllowedAtEvaluator: paymentAllowed,
          checkoutRefusal,
          convergenceError
        },
        unsupportedOrReferralOutcome: UNSUPPORTED_TERMINALS.has(effectiveTerminal)
          ? { kind: "unsupported", terminal: effectiveTerminal }
          : REFERRAL_TERMINALS.has(effectiveTerminal)
            ? { kind: "referral", terminal: effectiveTerminal }
            : null,
        packetFamily: {
          mode: plan?.mode ?? null,
          formMappingStatus: plan?.formMappingStatus ?? null,
          packetFamilies: launchRow?.packetFamilies ?? [],
          packetSets: launchRow?.packetSets ?? [],
          registryTracks: launchRow?.registryTracks ?? [],
          registryGap: launchRow?.registryGap ?? null,
          renderer: launchRow?.renderer?.rendererKind ?? null,
          routeKind: launchRow?.renderer?.routeKind ?? closureRow.route?.routeKind ?? null
        },
        forms: {
          sourceFormIds: plan?.sourceFormIds ?? [],
          officialFormIdsNamed: launchRow?.sourceAssets?.officialFormIdsNamed ?? [],
          officialFormIdsHeldInThisRepository: launchRow?.sourceAssets?.officialFormIdsHeldInThisRepository ?? [],
          allNamedSourcesHeld: launchRow?.sourceAssets?.allNamedSourcesHeld ?? null
        },
        launchGovernance: {
          note: "Runtime checkout and launch governance are different gates. paymentMode describes what the deployed runtime would do; these fields describe whether the launch ledger considers the route sellable.",
          operationallySellable: launchRow?.operationallySellable ?? null,
          unmetOperationalGates: launchRow?.unmetOperationalGates ?? [],
          dtcDeliverable: launchRow?.dtcResult?.deliverable ?? null,
          rcapCreditConsumable: launchRow?.rcapResult?.creditConsumable ?? null,
          sellableAtTheResolver: launchRow?.paymentResult?.sellableAtTheResolver ?? null,
          ownerApprovedLegalStatus: launchRow?.ownerApprovedLegalStatus ?? null
        },
        paymentMode: mode.startsWith("dtc") ? mode : "not_applicable",
        sponsorshipMode: mode === "partner_sponsored_no_charge"
          ? "partner_sponsored_session_no_consumer_charge"
          : "none_direct_to_consumer",
        audience: mode === "partner_sponsored_no_charge" ? "partner_rcap_participant" : "direct_to_consumer",
        partnerLaneCta: PARTNER_LANE_BY_RESULT[terminal] ?? null,
        sourceFiles,
        fixture: {
          origin: fixtureOrigin,
          evaluatorToday: EVALUATOR_TODAY,
          answers,
          synthetic: true
        },
        currentTestCoverage: coverageFor({ jurisdiction: code, pathwayId: closureRow.pathwayId, slug: profile.jurisdiction.slug })
      });
    }
  }

  /* --- non-remedy terminal flows ---------------------------------- */
  for (const probe of NON_PATHWAY_PROBES) {
    const overrides = resolveProbeOverrides(probe, questions);
    const seed = probe.seedFrom === "empty" ? {} : { ...CLEAR_RECORD, ...overrides };
    // The blank-submission probe is a single evaluation with nothing supplied, not
    // a convergence: the whole point is the first terminal an empty answer set
    // produces. An earlier version ran one convergence round here, which recorded
    // the topped-up answers next to an un-measured default terminal — a fixture
    // and a terminal describing two different moments.
    const run = probe.seedFrom === "empty"
      ? (() => {
        try {
          const outcome = evaluateAuthoritativeScreeningResult({
            jurisdiction: code,
            profileVersion: profile.profileVersion,
            matterId: "expai-flow-audit",
            answers: {}
          });
          return { answers: {}, transcript: [], evaluation: outcome.evaluation, error: null };
        } catch (error) {
          return { answers: {}, transcript: [], evaluation: null, error: String(error?.message ?? error) };
        }
      })()
      : converge({ jurisdiction: code, profile, questions, seedAnswers: seed, overrides });

    const terminal = run.evaluation?.resultCode ?? "needs_more_info";
    const paymentAllowed = run.evaluation?.paymentAllowed === true;
    const resolvedPathwayId = run.evaluation?.pathwayId ?? null;
    const checkoutRefusal = null;
    for (const mode of modesFor({ resultCode: terminal, paymentAllowed, checkoutRefusal })) {
    const ids = flowId({ jurisdiction: code, pathwayId: `_probe_${probe.id}`, terminal, mode });
    jurisdictionFlowIds.push(ids.flowId);
    flows.push({
      flowId: ids.flowId,
      flowKey: ids.flowKey,
      jurisdiction: code,
      jurisdictionName: profile.jurisdiction.name,
      jurisdictionSlug: profile.jurisdiction.slug,
      remedy: {
        kind: "no_remedy_resolved",
        pathwayId: null,
        pathwayLabel: null,
        probeId: probe.id,
        probeResolvedARemedy: resolvedPathwayId !== null,
        probeResolvedPathwayId: resolvedPathwayId,
        closureCategory: null,
        closureCategoryBasis: null,
        routeType: null,
        automatic: null,
        filingRequired: null,
        compiledPathwayPresent: false
      },
      entryConditions: {
        publicRoute: `/expungement-ai/screening/${profile.jurisdiction.slug}`,
        entryPoints: ["/expungement-ai/screening (state picker)"],
        requiresAuthenticationBeforeScreening: false,
        jurisdictionApprovedForExpungementAiChannel: promotion?.approvedChannels?.expungementAi === true,
        jurisdictionPromotionStatus: promotion?.promotionStatus ?? "unknown",
        profileVersion: profile.profileVersion,
        narrative: probe.entry
      },
      screeningFacts: Object.keys(run.answers ?? {}).sort(),
      screeningScreenIds: screens.map((q) => q.id),
      packetFacts: [],
      branchingConditions: {
        rounds: run.transcript ?? [],
        conditionalQuestionIdsExercised: [...new Set((run.transcript ?? []).flatMap((r) => r.requested ?? []))].sort(),
        droppedAsNotEvaluatorQuestions: [],
        pathwayContextSteer: null,
        triggerFields: [],
        caseOutcomes: [],
        probeOverrides: overrides
      },
      terminalOutcome: {
        resultCode: terminal,
        effectiveTerminal: terminal,
        landedOnRequestedPathway: null,
        landedPathwayId: run.evaluation?.pathwayId ?? null,
        paymentAllowedAtEvaluator: paymentAllowed,
        checkoutRefusal: null,
        convergenceError: run.error ?? null
      },
      unsupportedOrReferralOutcome: UNSUPPORTED_TERMINALS.has(terminal)
        ? { kind: "unsupported", terminal }
        : REFERRAL_TERMINALS.has(terminal) ? { kind: "referral", terminal } : null,
      packetFamily: { mode: null, formMappingStatus: null, packetFamilies: [], packetSets: [], registryTracks: [], registryGap: null, renderer: null, routeKind: null },
      forms: { sourceFormIds: [], officialFormIdsNamed: [], officialFormIdsHeldInThisRepository: [], allNamedSourcesHeld: null },
      launchGovernance: { note: "No compiled pathway resolved, so no launch-ledger row applies.", operationallySellable: null, unmetOperationalGates: [], dtcDeliverable: null, rcapCreditConsumable: null, sellableAtTheResolver: null, ownerApprovedLegalStatus: null },
      paymentMode: mode.startsWith("dtc") ? mode : "not_applicable",
      sponsorshipMode: mode === "partner_sponsored_no_charge"
        ? "partner_sponsored_session_no_consumer_charge"
        : "none_direct_to_consumer",
      audience: mode === "partner_sponsored_no_charge" ? "partner_rcap_participant" : "direct_to_consumer",
      partnerLaneCta: PARTNER_LANE_BY_RESULT[terminal] ?? null,
      sourceFiles,
      fixture: { origin: "derived_by_this_audit", evaluatorToday: EVALUATOR_TODAY, answers: run.answers ?? {}, synthetic: true },
      currentTestCoverage: coverageFor({ jurisdiction: code, pathwayId: null, slug: profile.jurisdiction.slug })
    });
    }
  }

  jurisdictionSummaries.push({
    jurisdiction: code,
    name: profile.jurisdiction.name,
    slug: profile.jurisdiction.slug,
    profileVersion: profile.profileVersion,
    compiledPathways: profile.pathways.length,
    closurePathways: closureRows.length,
    consumerScreens: screens.length,
    publicQuestions: publicProfile.questions.length,
    packetRequiredInputs: (profile.packetGenerator.requiredInputs ?? []).length,
    orderedDecisionRules: (profile.orderedDecisionRules ?? []).length,
    waitingPeriodRules: (profile.waitingPeriodRules ?? []).length,
    exclusionRules: (profile.exclusionRules ?? []).length,
    flowIds: jurisdictionFlowIds,
    flowCount: jurisdictionFlowIds.length,
    promotionStatus: promotion?.promotionStatus ?? "unknown",
    expungementAiChannelApproved: promotion?.approvedChannels?.expungementAi === true
  });
}

/* --- one jurisdiction-independent flow: unknown jurisdiction ------- */
{
  const ids = flowId({ jurisdiction: "XX", pathwayId: "_probe_unknown_jurisdiction", terminal: "unsupported_jurisdiction", mode: "dtc_no_payment" });
  flows.push({
    flowId: ids.flowId,
    flowKey: ids.flowKey,
    jurisdiction: "XX",
    jurisdictionName: "Unregistered jurisdiction (territory / typo / crawler)",
    jurisdictionSlug: "_unregistered",
    remedy: { kind: "no_remedy_resolved", pathwayId: null, pathwayLabel: null, probeId: "unknown_jurisdiction", closureCategory: null, closureCategoryBasis: null, routeType: null, automatic: null, filingRequired: null, compiledPathwayPresent: false },
    entryConditions: {
      publicRoute: "/expungement-ai/screening/puerto-rico",
      entryPoints: ["direct URL", "stale link", "crawler"],
      requiresAuthenticationBeforeScreening: false,
      jurisdictionApprovedForExpungementAiChannel: false,
      jurisdictionPromotionStatus: "not_registered",
      profileVersion: null,
      narrative: "A jurisdiction with no registered profile. GET /api/expungement-ai/profiles/{state} answers 404 unsupported_jurisdiction and the flow renders the missing-profile screen."
    },
    screeningFacts: [],
    screeningScreenIds: [],
    packetFacts: [],
    branchingConditions: { rounds: [], conditionalQuestionIdsExercised: [], droppedAsNotEvaluatorQuestions: [], pathwayContextSteer: null, triggerFields: [], caseOutcomes: [] },
    terminalOutcome: { resultCode: "unsupported_jurisdiction", effectiveTerminal: "unsupported_jurisdiction", landedOnRequestedPathway: null, landedPathwayId: null, paymentAllowedAtEvaluator: false, checkoutRefusal: null, convergenceError: null },
    unsupportedOrReferralOutcome: { kind: "unsupported", terminal: "unsupported_jurisdiction" },
    packetFamily: { mode: null, formMappingStatus: null, packetFamilies: [], packetSets: [], registryTracks: [], registryGap: null, renderer: null, routeKind: null },
    forms: { sourceFormIds: [], officialFormIdsNamed: [], officialFormIdsHeldInThisRepository: [], allNamedSourcesHeld: null },
    launchGovernance: { note: "No registered jurisdiction, so no launch-ledger row applies.", operationallySellable: null, unmetOperationalGates: [], dtcDeliverable: null, rcapCreditConsumable: null, sellableAtTheResolver: null, ownerApprovedLegalStatus: null },
    paymentMode: "dtc_no_payment",
    sponsorshipMode: "none_direct_to_consumer",
    audience: "direct_to_consumer",
    partnerLaneCta: null,
    sourceFiles: ["src/app/api/expungement-ai/profiles/[state]/route.ts", "src/components/expungement-ai/screening/ScreeningFlow.tsx"],
    fixture: { origin: "derived_by_this_audit", evaluatorToday: EVALUATOR_TODAY, answers: {}, synthetic: true },
    currentTestCoverage: { pathwayNamedIn: [], jurisdictionNamedIn: [], browserCoverage: "none_before_this_audit", level: "no_named_coverage" }
  });
}

/**
 * Self-consistency. A manifest row asserts two things at once: this answer set,
 * and this terminal. If replaying the answer set does not reproduce the terminal,
 * the row is describing two different moments and nothing downstream — the
 * browser crawl least of all — can be held to it.
 */
for (const flow of flows) {
  if (flow.jurisdiction === "XX") { flow.fixture.reproducesTerminal = null; continue; }
  try {
    const replay = evaluateAuthoritativeScreeningResult({
      jurisdiction: flow.jurisdiction,
      profileVersion: flow.entryConditions.profileVersion,
      matterId: "expai-flow-audit-selfcheck",
      answers: flow.fixture.answers
    }).evaluation;
    flow.fixture.reproducesTerminal = replay.resultCode === flow.terminalOutcome.resultCode;
    flow.fixture.replayResultCode = replay.resultCode;
  } catch (error) {
    flow.fixture.reproducesTerminal = false;
    flow.fixture.replayResultCode = `error: ${String(error?.message ?? error).slice(0, 120)}`;
  }
}

flows.sort((a, b) => a.flowKey.localeCompare(b.flowKey));

/* ------------------------------------------------------------------ */
/* Totals                                                              */
/* ------------------------------------------------------------------ */

const terminalCounts = {};
for (const flow of flows) terminalCounts[flow.terminalOutcome.effectiveTerminal] = (terminalCounts[flow.terminalOutcome.effectiveTerminal] ?? 0) + 1;
const modeCounts = {};
for (const flow of flows) modeCounts[flow.paymentMode] = (modeCounts[flow.paymentMode] ?? 0) + 1;
const categoryCounts = {};
for (const flow of flows) {
  const key = flow.remedy.closureCategory ?? "no_remedy_resolved";
  categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
}

const duplicateIds = flows.map((f) => f.flowId).filter((id, index, all) => all.indexOf(id) !== index);

const manifest = {
  schemaVersion: "expai-flow-manifest/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-flow-manifest.mjs",
  baseSha: gitSha("origin/main"),
  evaluatorToday: EVALUATOR_TODAY,
  changesNoProductBehavior: true,
  flowUnit: "state x remedy x terminal outcome x materially distinct audience/payment mode",
  modeRule: "dtc_paid and partner_sponsored_no_charge are separate rows only on a payment-eligible terminal, where money and packet delivery genuinely differ. On every other terminal the two audiences differ by CTA label alone (one shared branch in ScreeningResult.tsx) and the partner lane is carried on the single row as partnerLaneCta.",
  determinism: { randomness: "none", answerRule: ANSWER_RULE, clearRecord: CLEAR_RECORD },
  authorities: {
    runtimeConsumerQuestionAuthority: "src/lib/rcap-engine/compiled/all51.json (designer public profiles) composed by src/lib/rcap-engine/public-profile-projection.ts and served by GET /api/expungement-ai/profiles/[state]",
    runtimeEligibilityAuthority: "src/lib/rcap-engine/compiled/profiles/*.json evaluated by src/lib/rcap-engine/evaluator.ts",
    bundledProfileRole: "src/lib/expungement-ai/frontend/profiles/all51.json is NOT the runtime flow source; it supplies the static jurisdiction index for the picker plus Spanish display translations merged in by the projection.",
    pathwayUniverse: "data/rcap-ledger/sellable-pathway-closure.json",
    recordedFixtures: "data/rcap-ledger/public-witness-fixtures.json"
  },
  totals: {
    jurisdictions: jurisdictionSummaries.length,
    jurisdictionsIncludingUnregisteredProbe: jurisdictionSummaries.length + 1,
    compiledPathways: closure.universe.compiledPathways,
    flows: flows.length,
    remedyFlows: flows.filter((f) => f.remedy.kind === "compiled_pathway").length,
    nonRemedyFlows: flows.filter((f) => f.remedy.kind === "no_remedy_resolved").length,
    supportedTerminals: flows.filter((f) => !f.unsupportedOrReferralOutcome).length,
    unsupportedTerminals: flows.filter((f) => f.unsupportedOrReferralOutcome?.kind === "unsupported").length,
    referralTerminals: flows.filter((f) => f.unsupportedOrReferralOutcome?.kind === "referral").length,
    terminalCounts,
    modeCounts,
    closureCategoryCounts: categoryCounts,
    duplicateFlowIds: duplicateIds,
    flowsWhoseFixtureReproducesTheirTerminal: flows.filter((flow) => flow.fixture.reproducesTerminal === true).length,
    flowsWhoseFixtureDoesNotReproduceTheirTerminal: flows.filter((flow) => flow.fixture.reproducesTerminal === false).map((flow) => ({ flowId: flow.flowId, recorded: flow.terminalOutcome.resultCode, replay: flow.fixture.replayResultCode })),
    runtimePaidFlows: flows.filter((f) => f.paymentMode === "dtc_paid").length,
    runtimePaidFlowsBlockedByLaunchGovernance: flows.filter((f) => f.paymentMode === "dtc_paid" && f.launchGovernance.operationallySellable === false).length,
    pathwaysThatDidNotSettle: unreachable
  },
  jurisdictions: jurisdictionSummaries,
  flows
};

const text = stableJson(manifest);
if (CHECK) {
  const current = read(OUT);
  if (current !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`flow manifest current and deterministic: ${flows.length} flow(s) across ${jurisdictionSummaries.length} jurisdictions.`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes, sha256 ${written.sha256.slice(0, 16)})`);
console.log(`  jurisdictions: ${jurisdictionSummaries.length}  flows: ${flows.length}`);
console.log(`  terminals: ${JSON.stringify(terminalCounts)}`);
console.log(`  modes: ${JSON.stringify(modeCounts)}`);
if (unreachable.length) console.log(`  did not settle: ${unreachable.length}`);
