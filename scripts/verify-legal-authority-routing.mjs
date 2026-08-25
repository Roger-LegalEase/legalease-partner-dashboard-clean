#!/usr/bin/env node
/**
 * Proves the approved legal route contracts reach the participant.
 *
 * verify-legal-authority-contracts.mjs checks the registry is well formed.
 * This checks the engine actually behaves as the registry says, in two layers:
 *
 *   1. every compiled profile carries what the contract says it carries, and
 *      carries nothing from another route — the regression test for the
 *      shared-waiting-rule defect, where Mississippi's eligible-felony route
 *      published all eighteen Mississippi waiting statements at once;
 *   2. named fixtures run through the real evaluator, with a positive case, a
 *      negative case either side of the clock, an exclusion case, and a
 *      no-checkout case for every route the authority closes.
 *
 * Fixtures are pinned to 2026-08-25 so a boundary result never depends on the
 * day the suite runs.
 */
import { register } from "node:module";
process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("./lib/ts-esm-loader.mjs", import.meta.url);
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const { LEGAL_AUTHORITY, routePaymentAuthority } = await import("@/lib/legal-authority/index");
const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { evaluateScreening } = await import("@/lib/rcap-engine/evaluator");

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

// ── Layer 1: the compiled profiles carry the contract, and only the contract ──

const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";
const profileByCode = new Map();
for (const file of readdirSync(PROFILE_DIR)) {
  if (!file.endsWith(".json")) continue;
  profileByCode.set(file.slice(0, file.indexOf("-")), JSON.parse(readFileSync(path.join(PROFILE_DIR, file), "utf8")));
}

/** Every duration figure a piece of text asserts, normalised to years. */
function durationsInYears(text) {
  const found = [];
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, thirty: 30, ninety: 90 };
  const pattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|thirty|ninety)[\s-]+(day|days|month|months|year|years)\b/gi;
  for (const match of text.matchAll(pattern)) {
    const raw = match[1].toLowerCase();
    const value = words[raw] ?? Number(raw);
    if (!Number.isFinite(value)) continue;
    const unit = match[2].toLowerCase();
    found.push(unit.startsWith("year") ? value : unit.startsWith("month") ? value / 12 : value / 365);
  }
  return found;
}

function contractYears(contract) {
  const { value, unit } = contract.timing;
  if (typeof value !== "number" || !unit) return undefined;
  return unit === "years" ? value : unit === "months" ? value / 12 : value / 365;
}

/**
 * Jurisdictions whose profile a governance control pins, mirrored from the
 * apply script. Named explicitly rather than inferred, so the exemption cannot
 * grow by accident: a second blocked state has to be added here, in the apply
 * script, and in STATUS_B.md before this file goes green again.
 */
const GOVERNANCE_BLOCKED = new Set(["MD"]);
const blockedInRegistry = LEGAL_AUTHORITY.routes.filter((route) => GOVERNANCE_BLOCKED.has(route.jurisdiction));
assert(blockedInRegistry.length === 1 && blockedInRegistry[0]?.routeKey === "MD:police-record-expungement-when-no-charge-was-filed-under-10-103",
  "only Maryland § 10-103 may remain profile-byte-pinned; evaluator runtime consumes that exact contract directly");

for (const contract of LEGAL_AUTHORITY.routes) {
  if (GOVERNANCE_BLOCKED.has(contract.jurisdiction)) continue;
  const profile = profileByCode.get(contract.jurisdiction);
  if (!profile) { assert(false, `${contract.routeKey}: no compiled profile`); continue; }
  const pathway = (profile.pathways ?? []).find((candidate) => candidate.id === contract.pathwayId);
  if (!pathway) { assert(false, `${contract.routeKey}: no compiled pathway`); continue; }

  assert(pathway.legalAuthority?.decisionId === contract.decisionId,
    `${contract.routeKey}: pathway does not carry decision ${contract.decisionId}`);
  assert(pathway.legalAuthority?.statute === contract.statute,
    `${contract.routeKey}: pathway statute is not ${contract.statute}`);

  // The shared-waiting-rule regression. Any duration the route publishes must
  // be its own: a route with a three-year clock must not also be publishing
  // twelve months, two years, five years and one year, which is exactly what
  // the grouped Mississippi statements did.
  const mine = contractYears(contract);
  const ownWords = [
    contract.timing.anchorText,
    contract.supersedes?.note ?? "",
    contract.supersedes?.value !== undefined ? `${contract.supersedes.value} ${contract.supersedes.unit}` : "",
    ...(contract.processingDeadlines ?? []).flatMap((deadline) => [deadline.label, deadline.note])
  ].join(" ");
  const allowed = new Set(durationsInYears(ownWords));
  if (mine !== undefined) allowed.add(mine);
  for (const value of new Set(durationsInYears((pathway.waitingRules ?? []).join(" ")))) {
    assert([...allowed].some((candidate) => Math.abs(candidate - value) < 0.01),
      `${contract.routeKey}: publishes a ${value.toFixed(2)}-year figure that belongs to another route`);
  }
  // The grouped Mississippi statements ran to eighteen lines on a single route.
  // A route may state its clock, its effective date, the rule it supersedes and
  // its processing deadlines — and nothing more.
  const maxLines = 2 + (contract.effectiveFrom ? 1 : 0) + (contract.processingDeadlines ?? []).length;
  assert((pathway.waitingRules ?? []).length <= maxLines,
    `${contract.routeKey}: publishes ${(pathway.waitingRules ?? []).length} waiting statements, at most ${maxLines} belong to this route`);

  const closed = routePaymentAuthority(contract) !== "packet_checkout";
  assert(pathway.filingRequired === !closed,
    `${contract.routeKey}: filingRequired must be ${!closed}`);
  const plan = (profile.packetGenerator?.pathways ?? []).find((candidate) => candidate.pathwayId === contract.pathwayId);
  assert(plan, `${contract.routeKey}: no packet plan`);
  if (plan && closed) {
    assert(plan.mode === "automatic_relief_verification_and_guidance",
      `${contract.routeKey}: a closed route must use the verification-and-guidance packet plan`);
  }

  // No event-triggered, lookback or filing-deadline route may publish an
  // elapsed duration on its compiled rule, where the evaluator would run it as
  // a wait the participant has to sit through.
  for (const rule of profile.orderedDecisionRules ?? []) {
    const isRouteRule = rule.when?.backendPathwayId === contract.pathwayId || rule.id === `route-${contract.pathwayId}`;
    if (!isRouteRule) continue;
    if (contract.timing.kind === "elapsed_eligibility_clock") {
      assert(rule.when?.duration?.value === contract.timing.value && rule.when?.duration?.unit === contract.timing.unit,
        `${contract.routeKey}: route rule duration is not ${contract.timing.value} ${contract.timing.unit}`);
    } else {
      assert(rule.when?.duration === undefined,
        `${contract.routeKey}: a ${contract.timing.kind} route must not publish an elapsed duration (found ${JSON.stringify(rule.when?.duration)})`);
    }
  }
}

// ── Layer 2: fixtures through the real evaluator ────────────────────────────

function evaluate(code, answers, label) {
  const profile = getProfileByJurisdiction(code);
  if (!profile) { assert(false, `${label}: no ${code} profile`); return undefined; }
  return evaluateScreening({
    jurisdiction: code,
    profileVersion: profile.profileVersion,
    matterId: `legal-authority-${label}`,
    answers
  });
}

const MS_BASE = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  court_requirements_completed: "yes",
  pending_cases: "No",
  financial_obligations: "Yes"
};

/**
 * Each fixture states the route it must land on and what must happen there.
 * `packet` means packet-ready with payment open; `not_yet` means the clock is
 * not satisfied; `closed` means guidance with no payment, whatever else is true.
 */
const FIXTURES = [
  // Mississippi eligible felony: the three-year rule in force since 2026-07-01.
  ["ms-felony-below-clock", "MS", { ...MS_BASE, case_outcome: "Felony conviction", offense_level: "Felony", possible_pathway_context: "Eligible felony-conviction expungement (§ 99-19-71)", resolved_timing_bucket: "years_1_to_2" }, "eligible-felony-conviction-expungement-99-19-71", "not_yet"],
  ["ms-felony-above-clock", "MS", { ...MS_BASE, case_outcome: "Felony conviction", offense_level: "Felony", possible_pathway_context: "Eligible felony-conviction expungement (§ 99-19-71)", resolved_timing_bucket: "years_3_to_5" }, "eligible-felony-conviction-expungement-99-19-71", "packet"],
  // The same case under the stale five-year rule would still be waiting. This
  // fixture is the proof the three-year rule is the one in use.
  ["ms-felony-between-three-and-five", "MS", { ...MS_BASE, case_outcome: "Felony conviction", offense_level: "Felony", possible_pathway_context: "Eligible felony-conviction expungement (§ 99-19-71)", resolved_timing_bucket: "years_3_to_5" }, "eligible-felony-conviction-expungement-99-19-71", "packet"],
  // Mississippi first-offense DUI: the only route that keeps five years.
  ["ms-dui-below-clock", "MS", { ...MS_BASE, case_outcome: "Misdemeanor conviction", offense_level: "Misdemeanor", possible_pathway_context: "First-offense DUI expungement", ms_successful_sentence_completion_date: "2022-01-01", resolved_timing_bucket: "years_3_to_5" }, "first-offense-dui-expungement", "not_yet"],
  ["ms-dui-above-clock", "MS", { ...MS_BASE, case_outcome: "Misdemeanor conviction", offense_level: "Misdemeanor", possible_pathway_context: "First-offense DUI expungement", ms_successful_sentence_completion_date: "2020-01-01", resolved_timing_bucket: "years_7_to_10" }, "first-offense-dui-expungement", "packet"],
  // DUI nonadjudication is an active-case referral. The five-year expungement
  // rule must never reach it, and it must never open checkout.
  ["ms-dui-nonadjudication-closed", "MS", { ...MS_BASE, case_outcome: "Diversion, deferred disposition, supervision, or similar program", offense_level: "Misdemeanor", possible_pathway_context: "DUI nonadjudication", resolved_timing_bucket: "gt_10_years" }, "dui-nonadjudication", "closed"],
  // Intervention-court completion: the statute clears the record, so the
  // automatic branch sells nothing however long ago it completed.
  ["ms-intervention-court-automatic-closed", "MS", { ...MS_BASE, case_outcome: "Diversion, deferred disposition, supervision, or similar program", offense_level: "Misdemeanor", possible_pathway_context: "Intervention-court completion expungement", resolved_timing_bucket: "gt_10_years" }, "intervention-court-completion-expungement", "closed"],
  // Stage splits resolve to their own routes rather than to the nearest
  // grouped route. Before the split, each of these landed on the non-conviction
  // dismissal packet — and the last one was sold one.
  ["ms-nonadjudication-admission-split", "MS", { ...MS_BASE, case_outcome: "Diversion, deferred disposition, supervision, or similar program", offense_level: "Misdemeanor", possible_pathway_context: "Nonadjudication under § 99-15-26 — admission while the case is active", resolved_timing_bucket: "still_open" }, "nonadjudication-99-15-26-active-case-admission", "closed"],
  ["ms-trafficking-vacatur-split", "MS", { ...MS_BASE, case_outcome: "Felony conviction", offense_level: "Felony", possible_pathway_context: "Human-trafficking survivor vacatur", resolved_timing_bucket: "gt_10_years" }, "human-trafficking-survivor-vacatur-97-3-54-6-5", "closed"],
  ["ms-justice-court-split", "MS", { ...MS_BASE, case_outcome: "Misdemeanor conviction", offense_level: "Misdemeanor", possible_pathway_context: "Additional justice-court misdemeanor relief", resolved_timing_bucket: "lt_1_year" }, "additional-justice-court-misdemeanor-relief-9-11-15-3", "closed"],
  // Exclusion: a pending case must stop a Mississippi felony petition even when
  // the three-year clock is long satisfied.
  ["ms-felony-pending-case", "MS", { ...MS_BASE, pending_cases: "Yes", case_outcome: "Felony conviction", offense_level: "Felony", possible_pathway_context: "Eligible felony-conviction expungement (§ 99-19-71)", resolved_timing_bucket: "gt_10_years" }, undefined, "no-payment"],
  // Unfinished court requirements must stop it too.
  ["ms-felony-requirements-open", "MS", { ...MS_BASE, court_requirements_completed: "no", case_outcome: "Felony conviction", offense_level: "Felony", possible_pathway_context: "Eligible felony-conviction expungement (§ 99-19-71)", resolved_timing_bucket: "gt_10_years" }, undefined, "no-payment"],
  // Unknown timing must never resolve to a packet.
  ["ms-felony-timing-unknown", "MS", { ...MS_BASE, case_outcome: "Felony conviction", offense_level: "Felony", possible_pathway_context: "Eligible felony-conviction expungement (§ 99-19-71)", resolved_timing_bucket: "not_sure" }, undefined, "no-payment"]
];

for (const [label, code, answers, expectedPathwayId, expectation] of FIXTURES) {
  const result = evaluate(code, answers, label);
  if (!result) continue;
  if (expectedPathwayId) {
    assert(result.pathwayId === expectedPathwayId,
      `${label}: resolved to ${result.pathwayId ?? "no pathway"}, expected ${expectedPathwayId}`);
  }
  if (expectation === "packet") {
    assert(["packet_ready", "packet_ready_with_caution"].includes(result.resultCode),
      `${label}: expected a packet-ready result, got ${result.resultCode}`);
    assert(result.paymentAllowed === true, `${label}: a satisfied clock on a ratified route should open payment`);
  } else if (expectation === "not_yet") {
    assert(result.resultCode === "not_yet", `${label}: expected not_yet, got ${result.resultCode}`);
    assert(result.paymentAllowed === false, `${label}: an unsatisfied clock must not open payment`);
  } else if (expectation === "closed") {
    assert(result.paymentAllowed === false, `${label}: this route must never open payment`);
    assert(!["packet_ready", "packet_ready_with_caution"].includes(result.resultCode),
      `${label}: this route must never reach a packet, got ${result.resultCode}`);
  } else if (expectation === "no-payment") {
    assert(result.paymentAllowed === false, `${label}: must not open payment, got ${result.resultCode}`);
  }
}

// Every route the authority closes must refuse payment on every fixture shape
// we can reach for it, not merely on the one we wrote a fixture for.
for (const contract of LEGAL_AUTHORITY.routes) {
  if (GOVERNANCE_BLOCKED.has(contract.jurisdiction)) continue;
  if (routePaymentAuthority(contract) === "packet_checkout") continue;
  const profile = profileByCode.get(contract.jurisdiction);
  const pathway = (profile?.pathways ?? []).find((candidate) => candidate.id === contract.pathwayId);
  if (!pathway) continue;
  assert(pathway.filingRequired === false || pathway.routeType === "automatic",
    `${contract.routeKey}: a closed route must be marked no-filing or automatic so the evaluator refuses payment structurally`);
}

if (failures.length) {
  console.error(`Legal authority routing verification failed: ${failures.length} problems`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Legal authority routing OK: ${LEGAL_AUTHORITY.routes.length - blockedInRegistry.length} routes bound (${blockedInRegistry.length} governance-blocked), ${FIXTURES.length} evaluator fixtures green.`);
