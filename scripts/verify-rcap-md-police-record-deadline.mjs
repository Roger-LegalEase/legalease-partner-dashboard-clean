#!/usr/bin/env node

import assert from "node:assert/strict";
import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { evaluateScreening } = await import("@/lib/rcap-engine/evaluator");
const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { legalRouteContract } = await import("@/lib/legal-authority/index");

const PATHWAY_ID = "police-record-expungement-when-no-charge-was-filed-under-10-103";
const ROUTE_KEY = `MD:${PATHWAY_ID}`;
const profile = getProfileByJurisdiction("MD");
const pathway = profile.pathways.find((candidate) => candidate.id === PATHWAY_ID);
const contract = legalRouteContract("MD", PATHWAY_ID);

assert.ok(pathway, "Maryland police-record pathway exists");
assert.equal(contract?.decisionId, "LD-MD-03", "LD-MD-03 contract exists");
assert.equal(contract?.timing.kind, "filing_deadline", "the eight years is a deadline, not a wait");
assert.equal(contract?.timing.anchorFactId, "arrest_date", "deadline anchor is arrest_date");
assert.equal(pathway.legalAuthority?.decisionId, "LD-MD-03", "compiled Maryland pathway consumes LD-MD-03");

const arrestQuestion = projectPublicProfile(profile).questions.find((question) => question.id === "arrest_date");
assert.equal(arrestQuestion?.lifecyclePhase, "prepay_timing_gate", "arrest_date is collected before checkout");

const BASE = {
  ownership_scope: "yes",
  jurisdiction_scope: "yes",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  possible_pathway_context: pathway.label,
  offense_level: "Misdemeanor",
  age_at_offense: "adult",
  prior_relief: "no",
  sentence_completion_date: "years_3_to_5",
  financial_obligations: "yes",
  pending_cases: "no",
  state_exclusion_categories: "None of these",
  pardon_status: "no"
};

function evaluate(id, patch) {
  return evaluateScreening({
    jurisdiction: "MD",
    profileVersion: profile.profileVersion,
    matterId: `md-police-record-${id}`,
    answers: { ...BASE, ...patch }
  });
}

const missing = evaluate("missing", {});
assert.equal(missing.pathwayId, PATHWAY_ID, "missing-date case stays on the police-record route");
assert.equal(missing.resultCode, "needs_more_info", "missing arrest date asks for information");
assert.equal(missing.paymentAllowed, false, "missing arrest date keeps checkout closed");
assert.ok(missing.missingQuestionIds.includes("arrest_date"), "missing-date result asks for arrest_date");

const within = evaluate("within", { arrest_date: "2020-08-25" });
assert.equal(within.pathwayId, PATHWAY_ID, "within-deadline case stays on the police-record route");
assert.ok(["packet_ready", "packet_ready_with_caution"].includes(within.resultCode), "within eight years reaches the agency-request packet");
assert.equal(within.paymentAllowed, true, "within eight years opens approved agency-application checkout");

const boundary = evaluate("boundary", { arrest_date: "2018-08-25" });
assert.ok(["packet_ready", "packet_ready_with_caution"].includes(boundary.resultCode), "exact eight-year boundary remains timely");
assert.equal(boundary.paymentAllowed, true, "exact eight-year boundary remains checkout eligible");

const expired = evaluate("expired", { arrest_date: "2018-08-24" });
assert.equal(expired.pathwayId, PATHWAY_ID, "expired case stays on the police-record route");
assert.equal(expired.resultCode, "likely_not_eligible", "after eight years is a filing bar, not not_yet");
assert.equal(expired.paymentAllowed, false, "expired filing deadline keeps checkout closed");
assert.ok(expired.reasons.some((reason) => reason.code.endsWith("md_police_record_deadline_not_eligible")), "expired case names the § 10-103 deadline bar");

console.log("verify-rcap-md-police-record-deadline: GREEN (missing, within, boundary, expired)");
