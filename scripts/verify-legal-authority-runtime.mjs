#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { register } from "node:module";

const requestedDate = process.argv.find((arg) => arg.startsWith("--date="))?.slice(7) ?? "2026-08-25";
process.env.RCAP_EVALUATOR_TODAY = requestedDate;
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { LEGAL_AUTHORITY, routePaymentAuthority, SUPERSEDED_ROUTE_CONTRACTS } = await import("@/lib/legal-authority/index");
const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { evaluateScreening } = await import("@/lib/rcap-engine/evaluator");

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const decisionRouteKeys = new Set(LEGAL_AUTHORITY.decisions.flatMap((decision) => decision.routeKeys));

/**
 * An accounted baseline, not a magic number.
 *
 * A bare `=== 127` tells a reader that the count moved and nothing about
 * whether it was allowed to. Every departure from the recorded baseline has to
 * be named here with the batch that caused it, so the arithmetic is the
 * evidence and an unexplained drift still fails.
 */
const CONTRACT_BASELINE = {
  recorded: 127,
  recordedDecisionRouteKeys: 113,
  additions: [
    {
      batch: "NATIONAL-2026-08-28",
      contracts: 4,
      decisionRouteKeys: 4,
      note: "GA § 42-8-66, MO § 311.326, ND § 12-60.1-05 and SC diversion, from the National Legal Decision Report of 2026-08-28."
    }
  ],
  departures: [
    {
      batch: "NATIONAL-2026-08-28",
      contracts: 1,
      decisionRouteKeys: 1,
      note: "The MO § 311.326 contract and its route key already existed under the P0 batch; the national report supersedes that contract rather than adding a second one for the same routeKey."
    }
  ]
};
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
const expectedContracts = CONTRACT_BASELINE.recorded
  + sum(CONTRACT_BASELINE.additions, "contracts") - sum(CONTRACT_BASELINE.departures, "contracts");
const expectedDecisionRouteKeys = CONTRACT_BASELINE.recordedDecisionRouteKeys
  + sum(CONTRACT_BASELINE.additions, "decisionRouteKeys") - sum(CONTRACT_BASELINE.departures, "decisionRouteKeys");
assert(LEGAL_AUTHORITY.routes.length === expectedContracts, `expected ${expectedContracts} legal contracts, found ${LEGAL_AUTHORITY.routes.length}`);
assert(decisionRouteKeys.size === expectedDecisionRouteKeys, `expected ${expectedDecisionRouteKeys} approved decision route keys, found ${decisionRouteKeys.size}`);
// The departure is only real if the supersession actually happened.
assert(SUPERSEDED_ROUTE_CONTRACTS.length === sum(CONTRACT_BASELINE.departures, "contracts"),
  `baseline records ${sum(CONTRACT_BASELINE.departures, "contracts")} superseded contract(s); the registry reports ${SUPERSEDED_ROUTE_CONTRACTS.length}`);

for (const contract of LEGAL_AUTHORITY.routes) {
  const profile = getProfileByJurisdiction(contract.jurisdiction);
  const pathway = profile?.pathways.find((candidate) => candidate.id === contract.pathwayId);
  assert(pathway, `${contract.routeKey}: contract has no runtime pathway`);
  assert(pathway?.legalAuthority?.decisionId === contract.decisionId, `${contract.routeKey}: runtime pathway does not consume its legal contract`);
  const publicIds = new Set(profile ? projectPublicProfile(profile).questions.map((question) => question.id) : []);
  for (const factId of contract.screeningFactIds ?? []) {
    assert(publicIds.has(factId), `${contract.routeKey}: approved screening fact ${factId} is not a public question`);
  }
}

for (const routeKey of decisionRouteKeys) {
  assert(LEGAL_AUTHORITY.routes.some((contract) => contract.routeKey === routeKey), `${routeKey}: approved route key has no runtime contract`);
}

function evaluate(code, answers, label) {
  const profile = getProfileByJurisdiction(code);
  if (!profile) throw new Error(`${code} profile missing`);
  return evaluateScreening({ jurisdiction: code, profileVersion: profile.profileVersion, matterId: `legal-runtime-${label}`, answers });
}

const MS_BASE = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Felony conviction",
  offense_level: "Felony",
  possible_pathway_context: "Eligible felony-conviction expungement (§ 99-19-71)",
  court_requirements_completed: "yes",
  pending_cases: "No",
  financial_obligations: "Yes"
};

if (requestedDate === "2026-08-25") {
  const laterAnchor = evaluate("MS", {
    ...MS_BASE,
    resolved_timing_bucket: "gt_10_years",
    sentence_completion_actual_date: "2020-01-01",
    discharge_date: "2025-01-01"
  }, "later-anchor");
  assert(laterAnchor.resultCode === "not_yet", `MS later-of anchor must use the later approved date; got ${laterAnchor.resultCode}`);
  assert(laterAnchor.paymentAllowed === false, "MS later-of anchor must keep checkout closed before three years from the later date");

  const trafficking = evaluate("MS", {
    ...MS_BASE,
    possible_pathway_context: "Human-trafficking survivor vacatur",
    resolved_timing_bucket: "gt_10_years"
  }, "attorney-review");
  assert(trafficking.resultCode === "needs_review", `attorney-review packet must route to needs_review, got ${trafficking.resultCode}`);
  assert(trafficking.reasons.some((reason) => reason.code.endsWith(".legal_authority_attorney_review_required")), "attorney-review route must identify the legal-authority review gate");
  assert(trafficking.paymentAllowed === false, "attorney-review route must keep checkout closed");

  const mo = getProfileByJurisdiction("MO");
  const moPathway = mo?.pathways.find((pathway) => pathway.id === "state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141");
  assert(moPathway?.legalAuthority?.effectiveFrom === "2026-08-28", "Missouri § 610.141 automatic route must exist with the exact 2026-08-28 effective date");
  const moPublic = mo ? projectPublicProfile(mo) : undefined;
  assert(moPublic?.questions.find((question) => question.id === "possible_pathway_context")?.options?.includes(moPathway?.label), "Missouri § 610.141 route must be selectable in the public flow");
  // The § 311.326 clock is published as a threshold, not a birth date. Both
  // halves are asserted: the approximate question is there, and the exact
  // identity date is not, because anonymous screening may not collect one.
  assert(moPublic?.questions.some((question) => question.id === "mo_at_least_twenty_two" && question.lifecyclePhase === "prepay_timing_gate"), "Missouri MIP route must publish its approved approximate age threshold");
  // Against the screening selection, not the catalogue. `moPublic.questions` is
  // every question Missouri defines, prepay and postpay together; the birth
  // date is correctly in it as a packet field. What must not contain it is what
  // free screening actually asks — in any context, including one that names the
  // § 311.326 route.
  const { selectScreeningQuestionIds } = await import("@/lib/rcap-engine/screening-question-selection");
  const moAsked = new Set([
    ...selectScreeningQuestionIds(mo, moPublic, {}),
    ...mo.pathways.flatMap((pathway) => selectScreeningQuestionIds(mo, moPublic, { possible_pathway_context: pathway.label }))
  ]);
  assert(!moAsked.has("twenty_first_birthday") && !moAsked.has("date_of_birth"), "Missouri free screening must not ask for a birth date");
  assert(moAsked.has("mo_at_least_twenty_two"), "Missouri free screening must still be able to answer the § 311.326 threshold");
  const msPublic = projectPublicProfile(getProfileByJurisdiction("MS"));
  assert(msPublic.questions.some((question) => question.id === "arrest_date" && question.lifecyclePhase === "prepay_timing_gate"), "Mississippi no-charge route must publish its approved arrest-date timing anchor");
  const mdPublic = projectPublicProfile(getProfileByJurisdiction("MD"));
  // This assertion used to require the exact arrest date in free screening.
  // An arrest date is an exact record date, and anonymous screening does not
  // collect one, so what it required was a boundary violation. Maryland now
  // carries the date as a packet field behind the claim, and the deadline is
  // evaluated once the date exists.
  //
  // KNOWN GAP, recorded not fixed here: `mdPoliceRecordDeadlineSafetyGate`
  // returns undefined when no arrest date is present, so free screening cannot
  // tell a participant whose incident is plainly older than eight years that
  // the § 10-103 window has closed. Closing that needs an approximate Maryland
  // threshold question, which is Maryland work and not this batch.
  assert(mdPublic.questions.every((question) => question.id !== "arrest_date" || question.lifecyclePhase !== "prepay_timing_gate"),
    "Maryland must not publish an exact arrest date as a free-screening timing gate");
  assert(mdPublic.questions.some((question) => question.lifecyclePhase === "prepay_timing_gate"),
    "Maryland free screening must still offer an answerable timing gate");
}

if (requestedDate === "2026-06-30") {
  const superseded = evaluate("MS", { ...MS_BASE, resolved_timing_bucket: "years_3_to_5" }, "superseded-clock");
  assert(superseded.resultCode === "not_yet", `pre-effective Mississippi filing must use superseded five-year clock, got ${superseded.resultCode}`);
  assert(superseded.paymentAllowed === false, "pre-effective Mississippi filing must not open checkout inside the superseded five-year clock");
}

const closures = [
  "MS:dui-nonadjudication",
  "MS:intervention-court-completion-expungement",
  "MS:human-trafficking-survivor-vacatur-and-expungement",
  "MS:additional-justice-or-municipal-court-misdemeanor-relief",
  "NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1",
  "RI:path-f-marijuana-possession-expungement",
  "MT:deferred-sentence-dismissal-or-confidentiality-route"
];
for (const routeKey of closures) {
  const contract = LEGAL_AUTHORITY.routes.find((candidate) => candidate.routeKey === routeKey);
  assert(contract && routePaymentAuthority(contract) !== "packet_checkout", `${routeKey}: authorized checkout closure is not enforced by the legal contract`);
}

const evaluatorSource = fs.readFileSync("src/lib/rcap-engine/evaluator.ts", "utf8");
assert(evaluatorSource.includes("legalRouteContract"), "evaluator runtime does not consume legal route contracts");
assert(evaluatorSource.includes("legal_authority_attorney_review_required"), "evaluator runtime does not enforce attorney-review authority");

if (!process.argv.includes("--child")) {
  const child = spawnSync(process.execPath, ["scripts/verify-legal-authority-runtime.mjs", "--child", "--date=2026-06-30"], {
    cwd: process.cwd(), encoding: "utf8", env: { ...process.env, RCAP_EVALUATOR_TODAY: "2026-06-30" }
  });
  if (child.status !== 0) failures.push(`pre-effective child proof failed:\n${child.stdout ?? ""}${child.stderr ?? ""}`);
}

if (failures.length) {
  console.error(`verify-legal-authority-runtime FAILED: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`Legal authority runtime OK: ${LEGAL_AUTHORITY.routes.length}/${expectedContracts} contracts and ${decisionRouteKeys.size}/${expectedDecisionRouteKeys} approved route keys affect evaluator/public runtime.`);
