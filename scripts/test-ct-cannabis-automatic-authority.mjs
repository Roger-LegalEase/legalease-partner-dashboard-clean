#!/usr/bin/env node
// Exact E4-R2 current-authority successor; public source-stage qualification and
// completed guidance consumption remain separate. No participant vector is invented.
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
// Pin only the retained CT authority; unrelated national corrections are independent.
const BASELINE = {
  "historicalCTContracts": {
    "CT:cannabis-conviction-erasure": "0267ac2417939a9c8728b707f9574ccc6854c218e5600c7dff46df9af796364b",
    "CT:petition-for-erasure-of-cannabis-conviction-records-under-54-142v": "494cbe864a876ac1053b9ba3f8c560419daea5ca6c2ea088558065794d2f1f4d"
  },
  "historicalCTDecisions": {
    "LD-CT-02": "6cf3e24a0cd26cae50ab9cb37e61061330ff0e1c5f1fe0556fa22b9acee662ca",
    "LEGAL-DESIGN-2026-07-30-CT-01": "558f2f92d334c8ca39fe4795d9ba2623a029b41d69ae95af5345d79c81204899"
  }
};
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const copy = value => structuredClone(value);
let checks = 0;
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); checks++; }
const KEY = "CT:cannabis-conviction-erasure", PATH = "cannabis-conviction-erasure";
const historical = read("src/lib/legal-authority/routes/single-routes.json");
for (const [key, expected] of Object.entries(BASELINE.historicalCTContracts)) equal(hash(JSON.stringify(historical.routes.find(route => route.routeKey === key))), expected, "retained exact CT contract: " + key);
const decisions = read("src/lib/legal-authority/authority.json").decisions;
for (const [id, expected] of Object.entries(BASELINE.historicalCTDecisions)) equal(hash(JSON.stringify(decisions.find(decision => decision.id === id))), expected, "retained exact CT decision: " + id);
const old = historical.routes.find(route => route.routeKey === KEY);
equal([old.outcomeMode, old.stage, old.packetFamily], ["participant_packet", "single_stage", "Connecticut Cannabis Erasure Petition"], "preserve actual historical conflicting current binding");
equal(old.serviceBranches.every(branch => !Object.hasOwn(branch, "selector")), true, "historical automatic branch had no selector");
const { LEGAL_AUTHORITY, SUPERSEDED_ROUTE_CONTRACTS, legalRouteContract, routePaymentAuthority } = await import("@/lib/legal-authority/index");
const { resolveRoute } = await import("@/lib/legal-authority/resolve-route");
const { selectComposedRoute } = await import("@/lib/rcap-engine/composed-route-selector");
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import("@/lib/rcap-engine/packet-planner");
const contract = legalRouteContract("CT", PATH);
equal(LEGAL_AUTHORITY.routes.filter(route => route.routeKey === KEY).length, 1, "one effective original key");
equal(SUPERSEDED_ROUTE_CONTRACTS.filter(entry => entry.routeKey === KEY), [{routeKey: KEY, supersededByDecisionId: "LD-CT-02"}], "exact named same-key supersession");
equal([contract.decisionId, contract.ruleId, contract.statute, contract.outcomeMode, contract.stage, contract.packetFamily], ["LD-CT-02", "CT-CANNABIS-AUTOMATIC-VS-PETITION-MAP", "Conn. Gen. Stat. § 54-142u", "automatic_relief", "automatic", null], "existing decision, correct automatic identity and no petition family");
equal(contract.requiredFacts, ["On what date was the cannabis possession conviction entered?", "Which statute section were you convicted under?", "How many counts are on this docket, and is every one of them erasable?"], "actual source predicates retained, not inferred");
equal(contract.screeningFactIds, ["case_outcome", "offense_level"], "no hidden exact public fact permission");
equal(contract.effectiveFrom, "2023-01-01", "retained source effective date");
equal(routePaymentAuthority(contract), "closed", "automatic contract closes payment");
const adjudicated = read("data/rcap-ledger/crosswalk-resolution-adjudication.json").canonicalRelationships.find(row => row.jobId === "compiled_pathway:" + KEY);
equal([adjudicated.lane, adjudicated.counterpart, adjudicated.relationshipType], ["E4-R2", "ct-cannabis-auto", "direct_runtime_representation"], "canonical existing E4 identity");
const crosswalk = read("data/rcap-ledger/track-pathway-crosswalk.json").compiledPathways.find(row => row.jurisdiction === "CT" && row.compiledPathwayId === PATH);
equal(crosswalk.mappedRegistryTrackIds, ["ct-cannabis-auto"], "no petition co-map");
const memo = read("data/record-clearing/legal-design-intake/CT.memo.json").tracks.find(track => track.trackId === "ct-cannabis-auto");
equal([memo.outputStrategy, memo.geography.venue, memo.rules.fees], ["process_guidance", "No venue. Erasure happens by operation of law without a filing.", "No fee."], "retained source purpose");
// These are contract-only synthetic facts, not permitted public answers or a
// source-qualified public witness. None may turn information into eligibility.
for (const phase of ["PRELIMINARY_SCREENING", "BRIEFCASE_PRESENTATION", "FINAL_VERIFICATION"]) {
  for (const facts of [{}, {conviction_date:{value:"unknown",provenance:"screening_answer"}}, {conviction_date:{value:"1999-12-31",provenance:"screening_answer"}}, {conviction_date:{value:"2010-06-01",provenance:"screening_answer"}}, {possible_pathway_context:{value:"Cannabis-conviction erasure",provenance:"screening_answer"}}]) {
    const before = copy(facts);
    const answer = resolveRoute({jurisdiction:"CT",pathwayId:PATH,facts,on:new Date("2026-10-11T00:00:00Z"),phase});
    equal([answer.serviceDisposition, answer.outcomeMode, answer.selectedBranchId, answer.packetFamily], ["process_guidance", "automatic_relief", null, null], "only informational contract disposition, never individual erasure finding");
    equal([answer.paymentAuthority,answer.sponsorshipAuthority,answer.generationAuthority,answer.commercialDeliveryAuthority], ["closed","closed","closed","closed"], "all commerce closed");
    equal([answer.delivery.paymentAllowed, answer.delivery.sponsoredGenerationAllowed, answer.delivery.generationAllowed,answer.delivery.commerciallyDeliverable], [false,false,false,false], "explicit delivery authority flags false");
    equal(answer.requiredFacts, contract.requiredFacts, "source predicates stay visible even when unavailable");
    equal(facts,before,"raw facts unchanged");
  }
}
for (const disposition of ["unknown","other_conviction","felony_conviction","non_conviction"]) equal(selectComposedRoute({jurisdiction:"CT",pathwayId:PATH,disposition}), {status:"no_composed_route",trackId:null}, "no artificial composed track or hint authority");
const petitionKey = "petition-for-erasure-of-cannabis-conviction-records-under-54-142v";
equal(legalRouteContract("CT", petitionKey), historical.routes.find(route => route.pathwayId === petitionKey), "separate54v object byte-value unchanged");
const petition = resolveRoute({jurisdiction:"CT",pathwayId:petitionKey,on:new Date("2026-10-11T00:00:00Z"),phase:"PRELIMINARY_SCREENING"});
equal([petition.contract.decisionId,petition.outcomeMode,petition.serviceDisposition,petition.paymentAuthority], ["LEGAL-DESIGN-2026-07-30-CT-01","participant_packet","identified_not_yet_available","packet_checkout"], "real petition remains separate and held");
equal([petition.delivery.paymentAllowed,petition.delivery.sponsoredGenerationAllowed,petition.delivery.generationAllowed,petition.delivery.commerciallyDeliverable],[false,false,false,false],"separate petition raw payment classification does not open any actual action");
equal(petition.openDeliveryGateIds,["ct_54_142v_local_filing_configuration","ct_54_142v_artifact_review"],"no petition release gates waived");
equal(legalRouteContract("MA",PATH),undefined,"wrong state gets no CT contract");
equal(legalRouteContract("CT","not-a-route"),undefined,"wrong route gets no authority");
const profileFile = "src/lib/rcap-engine/compiled/profiles/CT-connecticut.json";
const profile = read(profileFile), pathway = profile.pathways[3], rule = profile.orderedDecisionRules[69];
equal(pathway.id,PATH,"exact preserved original pathway position");
equal([pathway.automatic,pathway.filingRequired,pathway.routeType], [true,false,"automatic"], "coherent exact automatic tuple");
equal(pathway.waitingRules,[contract.timing.anchorText,"This rule took effect on 2023-01-01."],"no-filing effective date wording, not filing date");
equal(profile.pathways.find(route => route.id === petitionKey).waitingRules.at(-1),"This rule governs filings on or after 2023-01-01.","participant filing wording unchanged");
equal([pathway.legalAuthority.outcomeMode,pathway.legalAuthority.paymentAuthority,pathway.legalAuthority.packetFamily,pathway.legalAuthority.stage], ["automatic_relief","closed",null,"automatic"],"projected legal authority agrees");
equal(rule.when.backendPathwayId,PATH,"only exact original rule");
equal(rule.when.sourceConditionText,contract.timing.anchorText,"source-owned automatic clock statement");
equal(Object.hasOwn(rule.when,"timingAnchorFactId"),false,"no old petition-date gate");
equal([rule.legalAuthority.mechanism,rule.legalAuthority.statute], [contract.mechanism,contract.statute],"exact rule source mechanism");
const plan = packetPlanForPathway(profile,PATH);
equal([plan.mode,plan.formMappingStatus,plan.sourceFormIds], ["automatic_relief_verification_and_guidance","not_required",[]], "preserved no-form guidance plan");
equal(isPacketPlanFulfillmentReady(plan),false,"no packet fulfillment from plan");
function unchangedProjection(value) {
 const normalized = copy(value), target = normalized.pathways[3], routeRule = normalized.orderedDecisionRules[69];
 for (const key of ["automatic","filingRequired","waitingRules","legalAuthority"]) delete target[key];
 delete routeRule.when.sourceConditionText; delete routeRule.when.timingAnchorFactId;
 for(const key of ["mechanism","statute"]) delete routeRule.legalAuthority[key];
 return hash(JSON.stringify(normalized));
}
// The one-time integration receipt preserves the original 50-profile and CT
// preimage comparisons. A recurring test checks generator isolation against
// this invocation's inputs, so legitimate work on other routes stays independent.
const beforeUnrelatedCT = unchangedProjection(profile);
const profileDirectory = "src/lib/rcap-engine/compiled/profiles";
const siblingProfiles = () => Object.fromEntries(fs.readdirSync(profileDirectory).filter(file => file.endsWith(".json") && file !== "CT-connecticut.json").sort().map(file => [file, hash(fs.readFileSync(profileDirectory + "/" + file))]));
const beforeSiblings = siblingProfiles();
const beforeProfile = fs.readFileSync(profileFile);
for(const args of [["--check","--jurisdiction=CT"],["--jurisdiction=CT"]]) {
 const run=spawnSync(process.execPath,["scripts/apply-legal-authority-to-profiles.mjs",...args],{encoding:"utf8"});
 equal(run.status,0,"scoped generator check/idempotence: "+run.stderr);
 equal(fs.readFileSync(profileFile),beforeProfile,"idempotent actual generator makes no source change");
 equal(unchangedProjection(read(profileFile)), beforeUnrelatedCT, "generator preserves every other CT field");
 equal(siblingProfiles(), beforeSiblings, "scoped generator preserves every sibling profile and file set");
}
for(const argument of ["--jurisdiction=ZZ","--jurisdiction=ct","--jurisdiction=","--jurisdiction"]) equal(spawnSync(process.execPath,["scripts/apply-legal-authority-to-profiles.mjs",argument],{encoding:"utf8"}).status===0,false,"invalid scoped generator target refuses: "+argument);
console.log(JSON.stringify({status:"PASS",checks,scope:"CT21 exact current authority/profile/selector/no-commerce only",originalNegativeRerun:false,publicSourceQualifiedWitness:false,guidanceOutputConsumerAcceptance:false}));
