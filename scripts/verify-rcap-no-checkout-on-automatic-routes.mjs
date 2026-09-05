#!/usr/bin/env node
await import("./verify-rcap-il-delivery-binding.mjs");
// No automatic/no-filing route can show checkout — the lane-B invariant.
//
// Lane B reported (2026-08-12): Michigan's compiled rule-11 declared
// packet_ready_with_caution / show_cautions_then_allow_packet_checkout for the
// automatic 92-day misdemeanor set-aside (track mi_auto_misd92), a route on
// which the participant files nothing and pays nothing. This verifier makes
// that whole defect class red, in every jurisdiction:
//
//   1. STATIC — in every compiled profile, a decision rule whose candidate
//      pathways are all automatic/no-filing must not declare a packet-ready
//      result or a checkout frontend action.
//   2. LIVE — evaluating every state with every public pathway-context option
//      (plus the no-context flow), a result that lands on an automatic/
//      no-filing pathway must be guidance (never packet_ready*), and
//      paymentAllowed must be false.
//   3. RESOLVER — resolvePacketRoute keeps every automatic pathway
//      unsellable/non-credit-consumable, and the six lane-B guidance tracks
//      are wired: MI/CA pathway-bound tracks surface guidanceTrackIds, and
//      every guidance packet registers jurisdiction-wide.
//
//   node scripts/verify-rcap-no-checkout-on-automatic-routes.mjs

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY || "2026-08-12";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { resolvePacketRoute } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { guidanceTracksForJurisdiction, guidanceTracksForPathway } = await import("../src/lib/rcap/documents/guidance-packet-registry.ts");

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const PROFILE_DIR = path.join(rootDir, "src/lib/rcap-engine/compiled/profiles");
const CHECKOUT_ACTIONS = new Set(["show_cautions_then_allow_packet_checkout"]);
const PACKET_READY = new Set(["packet_ready", "packet_ready_with_caution"]);

function automaticPathwayIds(profile) {
  const planModes = new Map((profile.packetGenerator?.pathways ?? []).map((plan) => [plan.pathwayId, plan.mode]));
  return new Set(
    profile.pathways
      .filter((pathway) =>
        pathway.routeType === "automatic"
        || pathway.filingRequired === false
        || planModes.get(pathway.id) === "automatic_relief_verification_and_guidance")
      .map((pathway) => pathway.id)
  );
}

// --- 1. static: no automatic-only rule may declare checkout ------------------

const profiles = fs.readdirSync(PROFILE_DIR).filter((file) => file.endsWith(".json"));
for (const file of profiles) {
  const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, file), "utf8"));
  const automatic = automaticPathwayIds(profile);
  for (const rule of profile.orderedDecisionRules ?? []) {
    const candidates = rule.candidatePathwayIds ?? [];
    if (candidates.length === 0) continue;
    if (!candidates.every((id) => automatic.has(id))) continue;
    const code = rule.then?.suggestedResultCode ?? "";
    const action = rule.then?.frontendAction ?? "";
    check(
      !PACKET_READY.has(code),
      `${file} ${rule.id}: candidates are all automatic/no-filing but suggestedResultCode is ${code}`
    );
    check(
      !CHECKOUT_ACTIONS.has(action),
      `${file} ${rule.id}: candidates are all automatic/no-filing but frontendAction is ${action}`
    );
  }
}

// --- 2. live: every state x every pathway-context option ---------------------

function answerFor(question) {
  const options = question.options ?? [];
  switch (question.id) {
    case "ownership_scope": return options.find((option) => /^yes$/i.test(option)) ?? "Yes";
    case "jurisdiction_scope": return options.find((option) => /state/i.test(option)) ?? "State or local";
    case "case_outcome": return options.find((option) => /misdemeanor conviction/i.test(option)) ?? options[0];
    case "offense_level": return options.find((option) => /^misdemeanor$/i.test(option)) ?? options[0];
    case "state_exclusion_categories": return options.find((option) => /none/i.test(option)) ?? options[options.length - 1];
    default: break;
  }
  switch (question.type) {
    case "single_choice": return options.find((option) => /no|none/i.test(option)) ?? options[0];
    case "multi_select": return options.find((option) => /none/i.test(option)) ?? options[0];
    case "yes_no_unsure":
    case "yes_no_prefer_not_to_say": return "no";
    case "date":
    case "date_or_unknown": return "2015-01-05";
    case "text":
    case "text_or_unknown": return "Test entry";
    default: return "no";
  }
}

const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
let liveEvaluations = 0;
for (const file of profiles) {
  const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, file), "utf8"));
  const jurisdiction = profile.jurisdiction.code;
  const automatic = automaticPathwayIds(profile);
  const publicProfile = projectPublicProfile(profile);
  const base = {};
  for (const question of publicProfile.questions) {
    if (question.id === "possible_pathway_context") continue;
    base[question.id] = answerFor(question);
  }
  const contextQuestion = publicProfile.questions.find((question) => question.id === "possible_pathway_context");
  const contexts = [undefined, ...(contextQuestion?.options ?? [])];
  for (const context of contexts) {
    const answers = { ...base };
    if (context !== undefined) answers.possible_pathway_context = context;
    let evaluation;
    try {
      evaluation = evaluateScreening({
        jurisdiction,
        profileVersion: profile.profileVersion,
        matterId: "no-checkout-regression",
        answers
      });
    } catch {
      continue; // an answer-shape rejection is not this invariant's concern
    }
    liveEvaluations += 1;
    const onAutomatic = evaluation.pathwayId && automatic.has(evaluation.pathwayId);
    if (onAutomatic) {
      check(
        !PACKET_READY.has(evaluation.resultCode),
        `${jurisdiction} context ${JSON.stringify(context ?? null)}: automatic pathway ${evaluation.pathwayId} produced ${evaluation.resultCode}`
      );
      check(
        evaluation.paymentAllowed === false,
        `${jurisdiction} context ${JSON.stringify(context ?? null)}: automatic pathway ${evaluation.pathwayId} produced paymentAllowed=true`
      );
    }
  }
}
check(liveEvaluations > 100, `live sweep only produced ${liveEvaluations} evaluations; the driver regressed`);

// --- 3. resolver: automatic routes stay unsellable; lane-B tracks are wired --

for (const file of profiles) {
  const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, file), "utf8"));
  const jurisdiction = profile.jurisdiction.code;
  for (const pathwayId of automaticPathwayIds(profile)) {
    const resolution = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId });
    check(
      resolution.sellable === false || resolution.routeKind === "legacy_verified",
      `${jurisdiction}/${pathwayId}: automatic pathway resolved sellable=${resolution.sellable} via ${resolution.routeKind}`
    );
  }
}

const EXPECTED_TRACKS = {
  MI: ["mi_auto_misd92", "mi_auto_misd93"],
  CA: ["ca-auto-conviction"],
  IL: ["il-auto-seal-2028"],
  AK: ["ak-nonconviction-confidential", "ak-sej"]
};
for (const [jurisdiction, trackIds] of Object.entries(EXPECTED_TRACKS)) {
  const registered = guidanceTracksForJurisdiction(jurisdiction).map((track) => track.trackId);
  for (const trackId of trackIds) {
    check(registered.includes(trackId), `${jurisdiction}: guidance track ${trackId} is not registered`);
  }
  for (const track of guidanceTracksForJurisdiction(jurisdiction)) {
    check(track.paymentAllowed === false && track.sellable === false, `${track.trackId} registered with payment or sale enabled`);
  }
}
check(
  guidanceTracksForPathway("MI", "automatic-clean-slate-set-aside-under-mcl-780-621g").map((track) => track.trackId).sort().join(",")
    === "mi_auto_misd92,mi_auto_misd93",
  "MI automatic pathway does not surface both lane-B guidance tracks"
);
{
  const resolution = resolvePacketRoute({ state: "MI", pathway: "automatic-clean-slate-set-aside-under-mcl-780-621g" });
  check(resolution.routeKind === "guidance_only" && resolution.sellable === false, "MI automatic pathway is not a guidance_only unsellable route");
  check(
    (resolution.guidanceTrackIds ?? []).includes("mi_auto_misd92"),
    "MI automatic pathway resolution does not carry its guidance tracks"
  );
}

// --- 4. the reported matter itself ------------------------------------------

{
  const miProfile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, "MI-michigan.json"), "utf8"));
  const evaluation = evaluateScreening({
    jurisdiction: "MI",
    profileVersion: miProfile.profileVersion,
    matterId: "mi-auto-misd92-regression",
    answers: {
      ownership_scope: "Yes",
      jurisdiction_scope: "State or local",
      case_outcome: "Misdemeanor conviction",
      offense_level: "Misdemeanor",
      possible_pathway_context: "Automatic Clean Slate set-aside under MCL 780.621g",
      prior_relief: "no",
      trafficking_status: "no",
      pending_cases: "no",
      state_exclusion_categories: "None of these",
      record_documents: "yes",
      court: "86th District Court",
      charge: "92-day misdemeanor",
      county_or_filing_location: "Grand Traverse",
      case_identifier: "2016-1234-SM"
    }
  });
  check(evaluation.resultCode === "guidance_only", `mi_auto_misd92 matter resolved ${evaluation.resultCode}, expected guidance_only`);
  check(evaluation.paymentAllowed === false, "mi_auto_misd92 matter resolved paymentAllowed=true");
  check(
    evaluation.pathwayId === "automatic-clean-slate-set-aside-under-mcl-780-621g",
    `mi_auto_misd92 matter resolved pathway ${evaluation.pathwayId}`
  );
}

// --- 5. the corrected rule-11 stays corrected --------------------------------

{
  const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, "MI-michigan.json"), "utf8"));
  const rule = (profile.orderedDecisionRules ?? []).find((candidate) => candidate.id.startsWith("rule-11-92-day"));
  check(Boolean(rule), "MI rule-11 (92-day automatic set-aside) is missing");
  if (rule) {
    check(rule.then?.suggestedResultCode === "guidance_only", `MI rule-11 declares ${rule.then?.suggestedResultCode}`);
    check(rule.then?.frontendAction === "save_state_guidance_no_checkout", `MI rule-11 declares ${rule.then?.frontendAction}`);
    check(
      (rule.candidatePathwayIds ?? []).join(",") === "automatic-clean-slate-set-aside-under-mcl-780-621g",
      `MI rule-11 candidates are ${JSON.stringify(rule.candidatePathwayIds)}`
    );
  }
}

if (failures.length > 0) {
  console.error(`verify-rcap-no-checkout-on-automatic-routes FAILED: ${failures.length}/${checks} checks red`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`verify-rcap-no-checkout-on-automatic-routes passed: ${checks} checks (${liveEvaluations} live evaluations) — no automatic/no-filing route can show checkout.`);
