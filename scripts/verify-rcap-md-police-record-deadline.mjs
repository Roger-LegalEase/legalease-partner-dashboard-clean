#!/usr/bin/env node

import assert from "node:assert/strict";
import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { registerMarylandDeadlineTestExport } = await import("./lib/md-police-deadline-test-hook.mjs");
registerMarylandDeadlineTestExport();
const { evaluateScreening, mdPoliceRecordDeadlineSafetyGate } = await import("@/lib/rcap-engine/evaluator");
const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { packetPlanForPathway } = await import("@/lib/rcap-engine/packet-planner");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { selectScreeningQuestionIds } = await import("@/lib/rcap-engine/screening-question-selection");
const { legalRouteContract } = await import("@/lib/legal-authority/index");

const PATHWAY_ID = "police-record-expungement-when-no-charge-was-filed-under-10-103";
const profile = getProfileByJurisdiction("MD");
const pathway = profile.pathways.find((candidate) => candidate.id === PATHWAY_ID);
const contract = legalRouteContract("MD", PATHWAY_ID);

assert.ok(pathway, "Maryland police-record pathway exists");
assert.equal(contract?.decisionId, "LD-MD-03", "LD-MD-03 contract exists");
assert.equal(contract?.timing.kind, "filing_deadline", "the eight years is a deadline, not a wait");
assert.equal(contract?.timing.anchorFactId, "arrest_date", "deadline anchor is arrest_date");
assert.equal(pathway.legalAuthority?.decisionId, "LD-MD-03", "compiled Maryland pathway consumes LD-MD-03");

const publicProfile = projectPublicProfile(profile);
const arrestQuestion = publicProfile.questions.find((question) => question.id === "arrest_date");
assert.equal(arrestQuestion?.lifecyclePhase, "postpay_packet_field", "arrest_date is an exact packet/final-verification fact");
for (const candidate of profile.pathways) {
  const selectedIds = selectScreeningQuestionIds(profile, publicProfile, { possible_pathway_context: candidate.label });
  assert.ok(!selectedIds.includes("arrest_date"), `${candidate.id} free screening does not render arrest_date`);
}
const policePlan = packetPlanForPathway(profile, PATHWAY_ID);
assert.ok(policePlan?.requiredInputIds.includes("arrest_date"), "the owning packet plan retains arrest_date for final verification");
for (const candidate of profile.pathways.filter((entry) => entry.id !== PATHWAY_ID)) {
  assert.ok(!packetPlanForPathway(profile, candidate.id)?.requiredInputIds.includes("arrest_date"), `${candidate.id} does not inherit the police-route arrest date`);
}

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

// Preserve the original wire fixture. It is no longer a valid multi-select
// shape, and cannot silently become a qualified modern/legacy source case.
for (const [id, patch] of [["missing", {}], ["within", {arrest_date:"2020-08-25"}], ["boundary", {arrest_date:"2018-08-25"}], ["expired", {arrest_date:"2018-08-24"}]]) {
  assert.throws(() => evaluate(id, patch), error => error.name === "InvalidAnswerError"
    && JSON.stringify(error.invalidQuestionIds) === JSON.stringify(["state_exclusion_categories"]));
  // Historical arithmetic only: invoke the actual unchanged internal gate.
  // This does not classify a modern arrest or establish prior-request timeliness.
  const held = mdPoliceRecordDeadlineSafetyGate(profile, {...BASE, ...patch}, pathway);
  assert.equal(Boolean(held?.code.endsWith("md_police_record_deadline_not_eligible")), id === "expired", id);
}
const originalWire = structuredClone(BASE);
const currentShapeOnly = {...BASE, state_exclusion_categories:["None of these"]};
assert.deepEqual(BASE, originalWire);
const shapeOnly = evaluateScreening({jurisdiction:"MD",profileVersion:profile.profileVersion,answers:currentShapeOnly});
assert.equal(shapeOnly.paymentAllowed,false);
assert.equal(shapeOnly.resultCode,"needs_more_info");
assert.deepEqual(shapeOnly.missingQuestionIds,["ownership_scope","jurisdiction_scope"]);

// New, explicitly synthetic source-stage controls use actual current options.
// They do not rewrite any original recorded premise or declare eligibility.
const SOURCE = {ownership_scope:"Yes",jurisdiction_scope:"State or local",case_outcome:BASE.case_outcome,
  possible_pathway_context:pathway.label,offense_level:"Misdemeanor",pending_cases:"No",state_exclusion_categories:["None of these"]};
const sourceResult = patch => evaluateScreening({jurisdiction:"MD",profileVersion:profile.profileVersion,answers:{...SOURCE,...patch}});
const missing = sourceResult({});
assert.equal(missing.pathwayId,PATHWAY_ID);assert.equal(missing.resultCode,"needs_more_info");
assert.deepEqual(missing.missingQuestionIds,["arrest_date"]);assert.equal(missing.paymentAllowed,false);
for (const date of ["2020-08-25","2018-08-25","2018-08-24"]) {
  const modern = sourceResult({arrest_date:date,md_10103_released_without_charge:"yes"});
  assert.equal(modern.resultCode,"guidance_only");assert.equal(modern.pathwayId,PATHWAY_ID);
  assert.equal(modern.paymentAllowed,false);assert.equal(modern.packetPlan,undefined);
  assert(modern.reasons.some(r=>r.code==="md.police_source_modern"));
}
for (const release of [undefined,"unknown","no"]) {
  const held=sourceResult({arrest_date:"2020-08-25",md_10103_released_without_charge:release});
  assert(["needs_more_info","needs_review"].includes(held.resultCode));assert.equal(held.paymentAllowed,false);assert.equal(held.packetPlan,undefined);
}
for(const [prior,code]of [[undefined,"guidance_only"],["no","guidance_only"],["unknown","guidance_only"],["yes","needs_review"]]){
  const legacy=sourceResult({arrest_date:"2000-01-01",md_10103_prior_written_request:prior});
  assert.equal(legacy.resultCode,code);assert.equal(legacy.packetPlan,undefined);assert.equal(legacy.paymentAllowed,false);
}
console.log("verify-rcap-md-police-record-deadline: GREEN (historical actual-gate arithmetic; protected date; current source stages/no commerce; original wire refusals)");
