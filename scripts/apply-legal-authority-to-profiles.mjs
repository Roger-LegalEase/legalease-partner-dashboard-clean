#!/usr/bin/env node
/**
 * Writes the approved legal route contracts into the compiled engine profiles.
 *
 * The contracts in src/lib/legal-authority are the record of what legal
 * decided. This script is the only thing that turns them into engine
 * behaviour, so that a correction to a decision is a one-line data edit plus a
 * rerun rather than a hand-edit spread across thirty-five profiles.
 *
 * It is idempotent: running it twice produces byte-identical profiles, and
 * running it after a contract changes rewrites exactly the fields the contract
 * owns and nothing else.
 *
 * What it writes, per contract:
 *
 *   - `pathway.legalAuthority` — the decision, statute, mechanism, stage,
 *     timing, required facts, exclusions and packet family, so a reviewer can
 *     see the governing rule on the route itself.
 *   - `pathway.waitingRules` — replaced with the route's own statement. This
 *     is the fix for the defect the authority names: Mississippi's eligible-
 *     felony route carried all eighteen Mississippi waiting statements at once,
 *     including the 12-month, 2-year and 1-year rules that belong to other
 *     routes.
 *   - `pathway.filingRequired` / `pathway.automatic` — false and true
 *     respectively wherever the participant files nothing, which is the signal
 *     `routeIsAutomaticOrNoFiling` in the evaluator already reads to refuse a
 *     packet and refuse payment.
 *   - the pathway's compiled route rule — the exact duration, the clock anchor,
 *     and the approved condition wording, so the timing the participant is
 *     shown comes from the decision rather than from whichever prose rule the
 *     selector happened to reach.
 *   - `profile.waitingPeriodRules` — one `authority-<pathway>` entry per elapsed
 *     clock, carrying the statute as its rule text.
 *   - the packet plan mode for closed routes.
 *
 * Run with --check to fail instead of writing when anything is out of date.
 */
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const {
  LEGAL_AUTHORITY,
  routePaymentAuthority,
  routeIsAutomaticOrNoFiling
} = await import("@/lib/legal-authority/index");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");

const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";

/**
 * Jurisdictions whose compiled profile a governance control currently pins.
 * Maryland's 2026-08-25 approval explicitly covers the final legal-contract
 * profile bytes and retains before/after evidence, so LD-MD-03 is no longer
 * exempt from runtime profile binding.
 */
const BLOCKED_JURISDICTIONS = {};
const checkOnly = process.argv.includes("--check");

const profilePaths = new Map();
for (const file of readdirSync(PROFILE_DIR)) {
  if (!file.endsWith(".json")) continue;
  profilePaths.set(file.slice(0, file.indexOf("-")), path.join(PROFILE_DIR, file));
}

/** Route types that describe how the route reaches its decision-maker. */
function routeTypeFor(contract, current) {
  if (contract.outcomeMode === "automatic_relief") return "automatic";
  if (contract.outcomeMode === "guidance_status") return "automatic_guidance";
  if (contract.outcomeMode === "agency_application") return "administrative";
  if (contract.outcomeMode === "referral") return "review";
  // A packet-bearing route keeps whatever court classification it already had;
  // this script is not in the business of reclassifying a court filing.
  return current ?? "court_filing";
}

/**
 * The route's own waiting statement, and nothing else.
 *
 * Effective-date and superseded-rule notes ride along because a participant
 * reading "three years" on a Mississippi felony needs to know that number is
 * the post-July-2026 rule and that the five-year figure elsewhere is stale.
 */
function waitingRulesFor(contract) {
  const lines = [contract.timing.anchorText];
  if (contract.effectiveFrom) {
    lines.push(`This rule governs filings on or after ${contract.effectiveFrom}.`);
  }
  if (contract.supersedes) {
    const duration = typeof contract.supersedes.value === "number"
      ? `${contract.supersedes.value} ${contract.supersedes.unit}: `
      : "";
    lines.push(`Supersedes ${duration}${contract.supersedes.note}.`);
  }
  for (const deadline of contract.processingDeadlines ?? []) {
    lines.push(`${deadline.label} — ${deadline.note}.`);
  }
  return lines;
}

function legalAuthorityBlock(contract) {
  return {
    decisionId: contract.decisionId,
    ruleId: contract.ruleId,
    mechanism: contract.mechanism,
    statute: contract.statute,
    stage: contract.stage,
    outcomeMode: contract.outcomeMode,
    paymentAuthority: routePaymentAuthority(contract),
    timing: contract.timing,
    ...(contract.processingDeadlines ? { processingDeadlines: contract.processingDeadlines } : {}),
    requiredFacts: contract.requiredFacts,
    ...(contract.screeningFactIds ? { screeningFactIds: contract.screeningFactIds } : {}),
    ...(contract.exclusions ? { exclusions: contract.exclusions } : {}),
    packetFamily: contract.packetFamily,
    ...(contract.packetComponents ? { packetComponents: contract.packetComponents } : {}),
    ...(contract.effectiveFrom ? { effectiveFrom: contract.effectiveFrom } : {}),
    ...(contract.supersedes ? { supersedes: contract.supersedes } : {}),
    // The delivery fields. Projected here and nowhere else: a page or an API
    // that reconstructed a precondition, a gate or a branch from its own
    // reading of the contract would be a second legal engine, and the two would
    // disagree the first time one of them was updated.
    ...(contract.packetReleasePreconditions ? { packetReleasePreconditions: contract.packetReleasePreconditions } : {}),
    ...(contract.deliveryGates ? { deliveryGates: contract.deliveryGates } : {}),
    ...(contract.serviceBranches ? { serviceBranches: contract.serviceBranches } : {}),
    ...(contract.effectiveDateGate ? { effectiveDateGate: contract.effectiveDateGate } : {}),
    ...(contract.artifactApprovalRequired !== undefined ? { artifactApprovalRequired: contract.artifactApprovalRequired } : {}),
    ...(contract.failureDisposition ? { failureDisposition: contract.failureDisposition } : {}),
    ...(contract.commercialPosture ? { commercialPosture: contract.commercialPosture } : {}),
    ...(contract.notes ? { notes: contract.notes } : {})
  };
}

/**
 * A pathway created for a stage split the approved decision requires but the
 * compiled profile never had. Appended, never inserted: `selectPathway` scans
 * `profile.pathways` in order and takes the first label match, so inserting
 * would silently re-route flows that resolve correctly today.
 */
/**
 * Contracts allowed to create a compiled pathway that does not exist yet.
 *
 * An allowlist rather than a blanket rule. Creating a pathway adds a row to the
 * closure ledger, the witness answer sets, the launch graph and the factory
 * registry, so a mistyped pathwayId in a contract would otherwise conjure a
 * route nobody decided on and it would look like coverage.
 *
 * Mississippi is grandfathered: its stage splits created several pathways
 * before this list existed, and narrowing it now would delete them.
 */
const MAY_CREATE_PATHWAY = new Set([
  // O.C.G.A. § 42-8-66 is a different statutory mechanism from the § 42-8-62.1
  // restriction the legacy Georgia pathway carries. It needs its own route
  // rather than a conditional inside one that already names another statute.
  "GA:retroactive-first-offender-treatment-under-42-8-66",
  // The two Kansas municipal mechanisms. K.S.A. 12-4516 and 12-4516a are
  // municipal-court routes; all four compiled Kansas pathways are district-court
  // routes under K.S.A. 21-6614 and its neighbours, so neither municipal route
  // has an existing pathway to attach to and mapping one onto a 21-6614 pathway
  // would be a false identity rather than a translation.
  "KS:municipal-conviction-or-diversion-expungement-under-12-4516",
  "KS:municipal-arrest-record-expungement-under-12-4516a",
  // Five proven packet families whose obligation resolved to no runtime route
  // at all. In each one the registry track's operative citation is unique in
  // its jurisdiction and no compiled pathway carries it, so there is no
  // existing route to attach to and attaching one would be a false identity:
  //   A.R.S. Sec 13-4051 is a notation of clearance, distinct from the Sec 13-911
  //   sealing, the Sec 13-905 set-aside and the Sec 36-2862 marijuana expungement;
  //   Cal. Penal Code Sec 1203.4a is the no-probation branch, distinct from the
  //   Sec 1203.4 probation branch the legacy "Tool 1" pathway carries;
  //   C.G.S. Sec 54-142v is the cannabis petition branch, which the E4-R2
  //   crosswalk resolution adjudication holds is NOT represented by the
  //   automatic Sec 54-142u pathway CT:cannabis-conviction-erasure;
  //   KRS 218A.276 void-and-seal is once in a lifetime and offence-limited,
  //   distinct from the KRS 431.078 and KRS 431.073 expungements;
  //   NRS 179A.160 is an agency repository removal, distinct from the NRS
  //   179.245 and NRS 179.255 court sealing petitions.
  "AZ:notation-of-clearance-after-a-wrongful-arrest-under-13-4051",
  "CA:dismissal-and-set-aside-without-probation-under-penal-code-1203-4a",
  "CT:petition-for-erasure-of-cannabis-conviction-records-under-54-142v",
  "KY:void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276",
  "NV:removal-of-a-record-from-the-central-repository-after-a-favourable-disposition-under-179a-160"
]);

function newPathway(contract) {
  const closed = routePaymentAuthority(contract) !== "packet_checkout";
  return {
    id: contract.pathwayId,
    label: contract.mechanism,
    summary: `${contract.mechanism} under ${contract.statute}. ${contract.timing.anchorText}.`,
    sourceRef: `legal-authority:${contract.decisionId}`,
    sourceEvidenceRefs: [`legal-authority:${contract.decisionId}`, `statute:${contract.statute}`],
    ruleClauses: [contract.timing.anchorText],
    triggerFields: contract.screeningFactIds ?? ["case_outcome"],
    caseOutcomes: [],
    automatic: contract.stage === "automatic",
    filingRequired: !closed,
    routeType: routeTypeFor(contract, undefined),
    suggestedResultCode: closed ? "guidance_only" : "packet_ready_with_caution",
    waitingRules: waitingRulesFor(contract),
    exclusionRules: contract.exclusions ?? [],
    frontendBranch: closed ? "save_state_guidance_no_checkout" : "show_cautions_then_allow_packet_checkout"
  };
}

/**
 * The compiled route rule for a pathway, created only when the profile has
 * none. 324 of 325 pathways already carry one, so this is the exception; the
 * common case is correcting the rule that exists.
 */
function newRouteRule(contract) {
  return {
    id: `route-${contract.pathwayId}`,
    priority: 10,
    stage: "pathway_routing",
    when: { backendPathwayId: contract.pathwayId, fieldsReferenced: [], sourceConditionText: contract.timing.anchorText },
    then: {
      suggestedResultCode: "packet_ready_with_caution",
      frontendAction: "show_cautions_then_allow_packet_checkout"
    },
    sourceRef: `legal-authority:${contract.decisionId}`,
    candidatePathwayIds: [contract.pathwayId]
  };
}

function ensureRecoveredMissouriAutomaticRoute(profile) {
  const pathwayId = "state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141";
  const label = "State-initiated automatic expungement of eligible drug offenses under § 610.141";
  const sourceRef = "recovered-authority:data/record-clearing/legal-design-track-registry.json#mo-610-141-automatic-drug";
  if (!profile.pathways.some((pathway) => pathway.id === pathwayId)) {
    profile.pathways.push({
      id: pathwayId,
      label,
      summary: "Automatic record closure for the four qualifying Missouri drug-possession or paraphernalia statutes, effective 2026-08-28 and operational only when technically feasible for both state bodies; the participant files nothing.",
      sourceRef,
      sourceEvidenceRefs: [sourceRef],
      ruleClauses: ["No participant filing; state implementation is required and has not been independently represented as operating."],
      triggerFields: ["case_outcome", "offense_level", "possible_pathway_context"],
      caseOutcomes: ["convicted_misdemeanor", "convicted_felony", "convicted_other"],
      automatic: true,
      filingRequired: false,
      routeType: "automatic",
      suggestedResultCode: "guidance_only",
      waitingRules: ["The section is effective 2026-08-28, but operates only when technically feasible for both state bodies and no later than 2027-01-01; no participant waiting period or filing applies."],
      exclusionRules: ["Only the four statutes and conditions recorded in the recovered authority apply; do not infer eligibility from a generic drug-offense label."],
      frontendBranch: "save_state_guidance_no_checkout",
      legalAuthority: {
        decisionId: "LD-MO-02",
        ruleId: "MO-610.141-AUTOMATIC-DRUG-2026",
        mechanism: label,
        statute: "Mo. Rev. Stat. § 610.141 (enacted 2026)",
        stage: "automatic",
        outcomeMode: "automatic_relief",
        paymentAuthority: "closed",
        timing: { kind: "event_trigger", anchorText: "automatic only after the statute is in force and the state systems are technically operational" },
        requiredFacts: ["Exact statute of conviction", "Offense level", "Final disposition", "Intervening convictions", "Outstanding arrests or pending charges", "Prior Missouri expungements", "Electronic-record status", "Operational status"],
        screeningFactIds: ["case_outcome", "offense_level"],
        packetFamily: null,
        effectiveFrom: "2026-08-28",
        notes: "Recovered authority requires guidance only, no checkout, and no claim that the state process is operating until independently verified."
      }
    });
    summary.created += 1;
  }
  if (!profile.orderedDecisionRules.some((rule) => rule.when?.backendPathwayId === pathwayId)) {
    profile.orderedDecisionRules.push({
      id: `route-${pathwayId}`,
      priority: 10,
      stage: "pathway_routing",
      when: { backendPathwayId: pathwayId, requiredFields: ["case_outcome", "offense_level"], fieldsReferenced: ["case_outcome", "offense_level"], sourceConditionText: "automatic § 610.141 guidance route; never a participant filing" },
      then: { suggestedResultCode: "guidance_only", frontendAction: "save_state_guidance_no_checkout", paymentAllowed: false },
      sourceRef,
      candidatePathwayIds: [pathwayId],
      legalAuthority: { decisionId: "LD-MO-02", ruleId: "MO-610.141-AUTOMATIC-DRUG-2026", statute: "Mo. Rev. Stat. § 610.141 (enacted 2026)", mechanism: label }
    });
  }
  const plans = profile.packetGenerator?.pathways;
  if (Array.isArray(plans) && !plans.some((plan) => plan.pathwayId === pathwayId)) {
    plans.push({ pathwayId, pathwayLabel: label, mode: "automatic_relief_verification_and_guidance", formCandidates: [], formMappingStatus: "not_required", sourceRuleRefs: [sourceRef], requiredInputIds: [], noPacketWhen: ["participant files nothing", "state implementation is not verified"], packetReadyWhen: [] });
  }
}

/**
 * The facts a rule may gate on.
 *
 * `fieldsPresentOrInternal` drops a rule whose public fields are unanswered, and
 * a dropped route rule takes its approved clock with it: the evaluator then
 * falls back to whichever prose rule matches, which is how a route ends up
 * timed by another route's number. Mississippi's first-offense DUI route rule
 * listed `sentence_completion_date` — a published but optional question — so in
 * an ordinary flow the 5-year rule was never reachable at all.
 *
 * So a route rule gates only on facts the flow guarantees: the contract's own
 * screening facts, narrowed to questions this profile publishes AS REQUIRED.
 * The remaining approved facts are not discarded; they stay on the pathway's
 * `legalAuthority.requiredFacts`, where they are visible without silently
 * disabling the rule that carries the timing.
 */
function gatingFactsFor(contract, requiredPublicIds) {
  return (contract.screeningFactIds ?? []).filter((id) => requiredPublicIds.has(id));
}

function applyToRule(rule, contract, requiredPublicIds) {
  const when = { ...rule.when };
  when.sourceConditionText = contract.timing.anchorText;
  const gating = gatingFactsFor(contract, requiredPublicIds);
  when.requiredFields = gating;
  when.fieldsReferenced = gating;
  if (contract.timing.kind === "elapsed_eligibility_clock") {
    when.duration = {
      value: contract.timing.value,
      unit: contract.timing.unit,
      raw: `${contract.timing.value} ${contract.timing.unit}`
    };
  } else {
    // An event-triggered, lookback or filing-deadline route must not publish an
    // elapsed duration: the evaluator would read it as a wait the participant
    // has to sit through. Lookbacks and deadlines live in `legalAuthority.timing`.
    delete when.duration;
  }
  if (contract.timing.anchorFactId) {
    when.timingAnchorFactId = contract.timing.anchorFactId;
    if (contract.timing.anchorAlternates?.length) {
      when.timingAnchorAlternateFactIds = contract.timing.anchorAlternates;
    } else {
      delete when.timingAnchorAlternateFactIds;
    }
  } else {
    delete when.timingAnchorFactId;
    delete when.timingAnchorAlternateFactIds;
  }
  const then = { ...rule.then };
  if (routeIsAutomaticOrNoFiling(contract) || routePaymentAuthority(contract) !== "packet_checkout") {
    if (then.frontendAction === "show_cautions_then_allow_packet_checkout") {
      then.frontendAction = "save_state_guidance_no_checkout";
    }
  }
  return {
    ...rule,
    when,
    then,
    legalAuthority: {
      decisionId: contract.decisionId,
      ruleId: contract.ruleId,
      statute: contract.statute,
      mechanism: contract.mechanism
    }
  };
}

const summary = { profiles: 0, pathways: 0, created: 0, rules: 0, waitRules: 0, packetPlans: 0, downgraded: 0 };
const stale = [];
const unmatched = [];
const blocked = [];

const byJurisdiction = new Map();
for (const contract of LEGAL_AUTHORITY.routes) {
  if (!byJurisdiction.has(contract.jurisdiction)) byJurisdiction.set(contract.jurisdiction, []);
  byJurisdiction.get(contract.jurisdiction).push(contract);
}

for (const [code, contracts] of [...byJurisdiction].sort(([a], [b]) => a.localeCompare(b))) {
  if (BLOCKED_JURISDICTIONS[code]) {
    blocked.push(`${code} (${contracts.length} contracts): ${BLOCKED_JURISDICTIONS[code]}`);
    continue;
  }
  const filePath = profilePaths.get(code);
  if (!filePath) { unmatched.push(`${code}: no compiled profile`); continue; }
  const original = readFileSync(filePath, "utf8");
  const profile = JSON.parse(original);
  profile.pathways ??= [];
  profile.orderedDecisionRules ??= [];
  profile.waitingPeriodRules ??= [];
  const requiredPublicIds = new Set(
    projectPublicProfile(profile).questions.filter((question) => question.required === true).map((question) => question.id)
  );

  for (const contract of contracts) {
    let pathway = profile.pathways.find((candidate) => candidate.id === contract.pathwayId);
    if (!pathway) {
      if (!MAY_CREATE_PATHWAY.has(contract.routeKey) && code !== "MS") {
        unmatched.push(`${contract.routeKey}: no compiled pathway`);
        continue;
      }
      pathway = newPathway(contract);
      profile.pathways.push(pathway);
      summary.created += 1;
    }
    const closed = routePaymentAuthority(contract) !== "packet_checkout";
    pathway.routeType = routeTypeFor(contract, pathway.routeType);
    pathway.automatic = contract.stage === "automatic";
    pathway.filingRequired = !closed;
    pathway.waitingRules = waitingRulesFor(contract);
    pathway.legalAuthority = legalAuthorityBlock(contract);
    summary.pathways += 1;

    const exact = profile.orderedDecisionRules.filter(
      (rule) => rule.when?.backendPathwayId === contract.pathwayId || rule.id === `route-${contract.pathwayId}`
    );
    if (exact.length === 0) {
      profile.orderedDecisionRules.push(applyToRule(newRouteRule(contract), contract, requiredPublicIds));
      summary.rules += 1;
    } else {
      for (const rule of exact) {
        const index = profile.orderedDecisionRules.indexOf(rule);
        profile.orderedDecisionRules[index] = applyToRule(rule, contract, requiredPublicIds);
        summary.rules += 1;
      }
    }

    // One structured waiting-period rule per elapsed clock, carrying the statute
    // as its text so the source of the number is legible where it is used.
    const waitId = `authority-${contract.pathwayId}`;
    const existingWaitIndex = profile.waitingPeriodRules.findIndex((rule) => rule.id === waitId);
    if (contract.timing.kind === "elapsed_eligibility_clock") {
      const waitRule = {
        id: waitId,
        ruleText: `${contract.statute} — ${contract.timing.anchorText}`,
        duration: { value: contract.timing.value, unit: contract.timing.unit, raw: `${contract.timing.value} ${contract.timing.unit}` },
        anchor: contract.timing.anchorFactId ?? null,
        fieldsReferenced: contract.screeningFactIds ?? []
      };
      if (existingWaitIndex >= 0) profile.waitingPeriodRules[existingWaitIndex] = waitRule;
      else profile.waitingPeriodRules.push(waitRule);
      summary.waitRules += 1;
    } else if (existingWaitIndex >= 0) {
      profile.waitingPeriodRules.splice(existingWaitIndex, 1);
    }

    // Packet plan: a closed route is verification-and-guidance, which the
    // evaluator reads structurally when it refuses payment.
    const plans = profile.packetGenerator?.pathways;
    if (Array.isArray(plans)) {
      let plan = plans.find((candidate) => candidate.pathwayId === contract.pathwayId);
      if (!plan) {
        // A pathway created for a stage split needs its own plan: the engine
        // requires one plan per pathway, and a missing plan would leave the new
        // route without the no-packet conditions that keep it fail-closed.
        plan = {
          pathwayId: contract.pathwayId,
          pathwayLabel: pathway.label,
          mode: "state_specific_custom_packet_from_source_rules",
          formCandidates: [],
          formMappingStatus: "custom_or_manual_mapping_required",
          sourceRuleRefs: [`legal-authority:${contract.decisionId}`],
          selectionRule: "Use only the source documents and assembly rules tied to the backend-returned jurisdiction pathway. Never substitute another state or an old MVP generator.",
          packetReadyWhen: [
            "backend result is packet_ready or packet_ready_with_caution",
            "every source-defined pathway fact is answered",
            "all waiting and completion conditions are satisfied",
            "no exclusion, ambiguity, or required-review flag remains",
            "the selected form revision and filing location pass source-freshness checks"
          ],
          noPacketWhen: [
            "automatic or no-filing route",
            "needs_more_info",
            "not_yet",
            "needs_review",
            "likely_not_eligible",
            "hard_stop"
          ]
        };
        plans.push(plan);
      }
      if (closed && plan.mode !== "automatic_relief_verification_and_guidance") {
        plan.mode = "automatic_relief_verification_and_guidance";
        summary.packetPlans += 1;
      }
    }
  }

  if (code === "MO") ensureRecoveredMissouriAutomaticRoute(profile);

  // A rule whose candidate pathways are now ALL closed must not still declare a
  // packet or a checkout action. Closing a route by `filingRequired` alone would
  // leave the prose rules that name it advertising a packet — which is how an
  // automatic route reaches checkout in the first place. Recomputed from the
  // written profile so it uses exactly the definition the no-checkout verifier
  // uses: routeType, filingRequired, or the verification-and-guidance plan mode.
  const planModes = new Map((profile.packetGenerator?.pathways ?? []).map((plan) => [plan.pathwayId, plan.mode]));
  const closedPathwayIds = new Set(
    profile.pathways
      .filter((candidate) => candidate.routeType === "automatic"
        || candidate.filingRequired === false
        || planModes.get(candidate.id) === "automatic_relief_verification_and_guidance")
      .map((candidate) => candidate.id)
  );
  for (const rule of profile.orderedDecisionRules) {
    const candidates = rule.candidatePathwayIds ?? [];
    if (candidates.length === 0 || !candidates.every((id) => closedPathwayIds.has(id))) continue;
    const code = rule.then?.suggestedResultCode;
    if (code === "packet_ready" || code === "packet_ready_with_caution") {
      rule.then.suggestedResultCode = "guidance_only";
      summary.downgraded += 1;
    }
    if (rule.then?.frontendAction === "show_cautions_then_allow_packet_checkout") {
      rule.then.frontendAction = "save_state_guidance_no_checkout";
    }
  }

  const next = `${JSON.stringify(profile, null, 2)}\n`;
  if (next !== original) {
    if (checkOnly) stale.push(code);
    else writeFileSync(filePath, next);
    summary.profiles += 1;
  }
}

for (const entry of blocked) console.warn(`SKIPPED, governance-blocked: ${entry}`);
if (unmatched.length) {
  console.error("Contracts with no compiled target:");
  for (const entry of unmatched) console.error(`  - ${entry}`);
  process.exit(1);
}
if (checkOnly && stale.length) {
  console.error(`Compiled profiles are out of date with the approved contracts: ${stale.join(", ")}`);
  console.error("Regenerate with: node scripts/apply-legal-authority-to-profiles.mjs");
  process.exit(1);
}
console.log(
  checkOnly
    ? "Compiled profiles match the approved legal route contracts."
    : `Applied ${LEGAL_AUTHORITY.routes.length} contracts: ${summary.profiles} profiles written, `
      + `${summary.pathways} pathways (${summary.created} created), ${summary.rules} route rules, `
      + `${summary.waitRules} waiting rules, ${summary.packetPlans} packet plans closed, `
      + `${summary.downgraded} rules downgraded off checkout.`
);
