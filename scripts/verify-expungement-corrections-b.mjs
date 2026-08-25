#!/usr/bin/env node

process.env.RCAP_EVALUATOR_TODAY ||= "2026-08-25";

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
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
check(Boolean(metadata.routes?.[mdKey]), "MD pardon route lacks explicit product metadata");

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
    check(
      mutated.resultCode === baseline.resultCode,
      `CA unrelated Prop 64 ambiguity changed ${baseline.resultCode} to ${mutated.resultCode}`
    );
    check(
      mutated.paymentAllowed === baseline.paymentAllowed,
      "CA unrelated Prop 64 ambiguity changed payment authority"
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

if (failures.length > 0) {
  console.error(`verify-expungement-corrections-b FAILED: ${failures.length}/${checks} checks red`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `verify-expungement-corrections-b: OK (${checks} checks; 37 deterministic; 27 flows)`
);
