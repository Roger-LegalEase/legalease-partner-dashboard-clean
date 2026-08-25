#!/usr/bin/env node

process.env.RCAP_EVALUATOR_TODAY ||= "2026-08-25";

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { projectPublicProfile } = await import(
  "../src/lib/rcap-engine/public-profile-projection.ts"
);
const assignment = JSON.parse(
  fs.readFileSync(path.join(root, "data/expungement-ai/corrections-b/assignment.json"), "utf8")
);
const metadata = JSON.parse(
  fs.readFileSync(path.join(root, "data/expungement-ai/route-product-metadata.json"), "utf8")
);
const profileDir = path.join(root, "src/lib/rcap-engine/compiled/profiles");
const profiles = new Map(
  fs.readdirSync(profileDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const profile = JSON.parse(fs.readFileSync(path.join(profileDir, file), "utf8"));
      return [profile.jurisdiction.code, profile];
    })
);

const failures = [];
const actualFlows = [];
const captainPatchPending = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

check(
  assignment.authoritySha === "714f4d51f93461855b24c8644b6ea6ddad6d15f2",
  "authority SHA drifted"
);
check(assignment.deterministic.length === 37, "deterministic assignment is not 37");
check(assignment.flows.length === 27, "vague-flow assignment is not 27");
check(
  new Set(assignment.deterministic.map((row) => row.routeKey)).size === 37,
  "duplicate deterministic route"
);
check(new Set(assignment.flows.map((row) => row.flowId)).size === 27, "duplicate vague flow");

for (const row of assignment.deterministic) {
  const separator = row.routeKey.indexOf(":");
  const jurisdiction = row.routeKey.slice(0, separator);
  const pathwayId = row.routeKey.slice(separator + 1);
  const profile = profiles.get(jurisdiction);
  check(Boolean(profile), `${row.correctionId} ${row.routeKey}: profile missing`);
  check(
    profile?.pathways?.some((pathway) => pathway.id === pathwayId),
    `${row.correctionId} ${row.routeKey}: pathway missing`
  );
}

const ar = profiles.get("AR");
check(
  !ar.orderedDecisionRules.some(
    (rule) => rule.id === "rule-45-and-2021-amendments-the-agent-must-confirm-the-current-"
  ),
  "AR malformed empty rule still exists"
);

const ok = profiles.get("OK");
const okWait = (id) => ok.waitingPeriodRules.find((rule) => rule.id === id)?.duration;
check(
  okWait("wait-03")?.value === 10 && okWait("wait-03")?.unit === "years",
  "OK wait-03 is not the source-stated ten years"
);
check(
  okWait("wait-05")?.value === 5 && okWait("wait-05")?.unit === "years",
  "OK wait-05 uses the seven-year lookback instead of the five-year filing wait"
);

const mdKey = "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8";
if (!metadata.routes?.[mdKey]) {
  captainPatchPending.push("MD generated route-product metadata");
}
check(
  Boolean(metadata.routes?.[mdKey])
    || profiles.get("MD")?.pathways?.some((pathway) => pathway.id === mdKey.slice(3)),
  "MD pardon metadata is absent and its source pathway is also missing"
);

const assignedRatifiedPaymentRoutes = new Set([
  "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59",
  "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1",
  "SC:diversion-or-program-completion-expungement",
  "TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106",
  "VA:petition-based-sealing",
  "VA:regime-1-expungement-available-now",
  "VT:dui-sealing",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
]);
const evaluatorSource = fs.readFileSync(
  path.join(root, "src/lib/rcap-engine/evaluator.ts"),
  "utf8"
);
const ratifiedBlock = evaluatorSource.match(
  /RATIFIED_DEPLOYABLE_ROUTES = new Set\(\[([\s\S]*?)\]\);/
)?.[1];
check(Boolean(ratifiedBlock), "could not parse RATIFIED_DEPLOYABLE_ROUTES");
for (const row of assignment.deterministic) {
  const listedAsRatified = ratifiedBlock?.includes(`"${row.routeKey}"`) === true;
  if (assignedRatifiedPaymentRoutes.has(row.routeKey)) {
    check(
      listedAsRatified,
      `${row.correctionId} ${row.routeKey}: approved route lost ratified payment authority`
    );
  } else {
    check(
      !listedAsRatified,
      `${row.correctionId} ${row.routeKey}: held route unexpectedly entered ratified payment authority`
    );
  }
}

const OUTCOME_ANSWERS = {
  arrest_no_charge: "Arrest or citation with no charge filed",
  dismissed: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  acquitted: "Acquitted or found not guilty",
  diversion_or_deferred: "Diversion, deferred disposition, supervision, or similar program",
  convicted_misdemeanor: "Misdemeanor conviction",
  convicted_felony: "Felony conviction",
  convicted_other: "Other conviction or adjudication",
  juvenile: "Juvenile adjudication or offense committed as a minor",
  pardon: "Pardoned conviction"
};

function safeAnswer(question, pathway, timingBucket) {
  const options = question.options ?? [];
  switch (question.id) {
    case "ownership_scope":
      return options.find((option) => /^yes$/i.test(option)) ?? "Yes";
    case "jurisdiction_scope":
      return options.find((option) => /state|local/i.test(option)) ?? "State or local";
    case "case_outcome": {
      const desired = OUTCOME_ANSWERS[pathway.caseOutcomes?.[0]];
      return options.find((option) => option === desired) ?? desired ?? options[0];
    }
    case "offense_level": {
      const route = `${pathway.id} ${pathway.label}`.toLowerCase();
      if (route.includes("felony")) return options.find((option) => /felony/i.test(option)) ?? options[0];
      if (route.includes("juvenile")) return options.find((option) => /juvenile/i.test(option)) ?? options[0];
      return options.find((option) => /misdemeanor/i.test(option)) ?? options[0];
    }
    case "possible_pathway_context":
      return pathway.label;
    case "state_exclusion_categories":
      return options.find((option) => /none of these/i.test(option)) ?? ["None of these"];
    case "pending_cases":
    case "new_convictions_during_waiting_period":
      return options.find((option) => /^no$/i.test(option)) ?? "No";
    case "sentence_completion_date":
    case "financial_obligations":
    case "court_requirements_completed":
    case "special_preconditions_confirmed":
    case "record_documents":
      return options.find((option) => /^yes$/i.test(option)) ?? "Yes";
    case "resolved_timing_bucket":
      return timingBucket;
    default:
      break;
  }
  switch (question.type) {
    case "single_choice":
      return options.find((option) => /^no$|none of these/i.test(option)) ?? options[0];
    case "multi_select":
      return options.find((option) => /none of these/i.test(option)) ?? options[0];
    case "yes_no_unsure":
    case "yes_no_prefer_not_to_say":
      return options.find((option) => /^yes$/i.test(option)) ?? "Yes";
    case "date":
    case "date_or_unknown":
      return "2010-01-05";
    case "number":
    case "number_or_range":
      return "1";
    case "text":
    case "text_or_unknown":
      return "Synthetic correction fixture";
    default:
      return "Yes";
  }
}

for (const row of assignment.deterministic) {
  const separator = row.routeKey.indexOf(":");
  const jurisdiction = row.routeKey.slice(0, separator);
  const pathwayId = row.routeKey.slice(separator + 1);
  const profile = profiles.get(jurisdiction);
  const pathway = profile?.pathways?.find((candidate) => candidate.id === pathwayId);
  if (!profile || !pathway) continue;
  const publicProfile = projectPublicProfile(profile);
  for (const timingBucket of ["lt_1_year", "gt_10_years", "not_sure"]) {
    const answers = Object.fromEntries(
      publicProfile.questions.map((question) => [
        question.id,
        safeAnswer(question, pathway, timingBucket)
      ])
    );
    try {
      const evaluation = evaluateScreening({
        jurisdiction,
        profileVersion: profile.profileVersion,
        matterId: `corrections-b-${row.correctionId}-${timingBucket}`,
        answers
      });
      check(
        !evaluation.pathwayId || evaluation.pathwayId === pathwayId,
        `${row.correctionId} ${row.routeKey} ${timingBucket}: landed on ${evaluation.pathwayId}`
      );
      if (!assignedRatifiedPaymentRoutes.has(row.routeKey)) {
        check(
          evaluation.paymentAllowed === false,
          `${row.correctionId} ${row.routeKey} ${timingBucket}: unproven case opened payment`
        );
      }
    } catch (error) {
      failures.push(
        `${row.correctionId} ${row.routeKey} ${timingBucket}: evaluator threw ${error?.message ?? error}`
      );
    }
  }
}

const caFlow = assignment.flows.find((row) => row.routeKey === "CA:tool-1-dismissal-set-aside");
if (!caFlow) {
  failures.push("CA tool-1 authority flow is missing from the assignment fixture");
} else {
  const profile = profiles.get("CA");
  const baseAnswers = {
    ...caFlow.fixture.answers,
    possible_pathway_context: caFlow.pathwayContextSteer
  };
  try {
    const baseline = evaluateScreening({
      jurisdiction: "CA",
      profileVersion: profile.profileVersion,
      matterId: "corrections-b-ca-baseline",
      answers: baseAnswers
    });
    const mutated = evaluateScreening({
      jurisdiction: "CA",
      profileVersion: profile.profileVersion,
      matterId: "corrections-b-ca-unrelated",
      answers: { ...baseAnswers, ca_prop64_branch: "unknown" }
    });
    const patchApplied = mutated.resultCode === baseline.resultCode
      && mutated.paymentAllowed === baseline.paymentAllowed;
    if (!patchApplied) captainPatchPending.push("CA route-scoped ambiguity evaluator patch");
    check(
      patchApplied
        || (baseline.resultCode === "packet_ready_with_caution"
          && baseline.paymentAllowed === true
          && mutated.resultCode === "needs_review"
          && mutated.paymentAllowed === false),
      `CA route-scoped ambiguity produced an unexpected transition ${baseline.resultCode}/${baseline.paymentAllowed} -> ${mutated.resultCode}/${mutated.paymentAllowed}`
    );
  } catch (error) {
    failures.push(`CA route-scoped ambiguity reproduction threw ${error?.message ?? error}`);
  }
}

const mustRemainClosed = new Set([
  "AL:non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a",
  "CA:tool-2-automatic-relief",
  "CA:tool-5-proposition-64-marijuana-relief",
  "IA:minor-prostitution-7251",
  "IA:public-intoxication-12346",
  "IA:underage-alcohol-12347",
  "IL:clean-slate-automatic-sealing",
  "IN:conviction-expungement-with-records-marked-expunged",
  "MI:automatic-clean-slate-set-aside-under-mcl-780-621g",
  "NH:out-of-state-federal-or-military-record-guidance",
  "OH:juvenile-sealing-and-expungement",
  "TX:automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07",
  "TX:first-offense-dwi-nondisclosure"
]);

const partnerFlows = assignment.flows.filter(
  (flow) => flow.authoritySponsorshipMode === "partner_sponsored_session_no_consumer_charge"
);
check(partnerFlows.length === 2, "partner-sponsored Corrections-B flow count is not 2");
check(
  partnerFlows.map((flow) => flow.routeKey).sort().join("|")
    === "CA:tool-1-dismissal-set-aside|CA:tool-4-arrest-record-sealing",
  "partner-sponsored flow routes are not the exact CA tool-1/tool-4 pair"
);
for (const partnerFlow of partnerFlows) {
  check(
    partnerFlow.authorityPaymentMode === "not_applicable",
    `${partnerFlow.flowId}: partner flow is not explicitly no-consumer-charge`
  );
  check(
    assignment.flows.some(
      (flow) => flow.routeKey === partnerFlow.routeKey
        && flow.authorityPaymentMode === "dtc_payment_refused_at_checkout"
    ),
    `${partnerFlow.flowId}: matching DTC checkout-refusal variant is missing`
  );
}

for (const flow of assignment.flows) {
  const profile = profiles.get(flow.jurisdiction);
  if (!profile) {
    failures.push(`${flow.flowId}: ${flow.jurisdiction} profile missing`);
    continue;
  }
  try {
    const evaluation = evaluateScreening({
      jurisdiction: flow.jurisdiction,
      profileVersion: profile.profileVersion,
      matterId: `corrections-b-${flow.flowId}`,
      answers: {
        ...flow.fixture.answers,
        ...(flow.pathwayContextSteer
          ? { possible_pathway_context: flow.pathwayContextSteer }
          : {})
      }
    });
    actualFlows.push({
      flowId: flow.flowId,
      routeKey: flow.routeKey,
      resultCode: evaluation.resultCode,
      pathwayId: evaluation.pathwayId ?? null,
      paymentAllowed: evaluation.paymentAllowed
    });
    if (mustRemainClosed.has(flow.routeKey)) {
      check(
        evaluation.paymentAllowed === false,
        `${flow.flowId} ${flow.routeKey}: unresolved/automatic route opened payment`
      );
    }
  } catch (error) {
    failures.push(`${flow.flowId}: evaluator threw ${error?.message ?? error}`);
  }
}

for (const actual of actualFlows) {
  console.log(
    `${actual.flowId}\t${actual.routeKey}\t${actual.resultCode}\t${actual.paymentAllowed ? "payment" : "closed"}`
  );
}

if (process.env.RCAP_REQUIRE_CORRECTIONS_B_CAPTAIN_PATCHES === "1") {
  for (const pending of captainPatchPending) failures.push(`captain patch not applied: ${pending}`);
}

if (failures.length > 0) {
  console.error(`verify-expungement-corrections-b FAILED: ${failures.length}/${checks} checks red`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `verify-expungement-corrections-b: OK (${checks} checks; 37 deterministic; 27 flows)`
);
console.log(
  `captain_patch_pending=${captainPatchPending.length > 0 ? captainPatchPending.join(" | ") : "none"}`
);
