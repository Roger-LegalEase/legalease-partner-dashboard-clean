#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const AUTHORITY_SHA = "714f4d51f93461855b24c8644b6ea6ddad6d15f2";
const output = path.join(root, "data/expungement-ai/corrections-b/assignment.json");

const deterministicRouteKeys = [
  "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59",
  "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1",
  "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
  "NE:pardon-then-seal",
  "NH:marijuana-possession-annulment-under-rsa-651-5-b",
  "NM:cannabis-expungement",
  "NY:automatic-clean-slate-sealing-under-cpl-160-57",
  "NY:automatic-non-conviction-sealing-under-cpl-160-50-160-55",
  "OK:misdemeanor-deferred-dismissal-expungement",
  "OK:nonviolent-felony-deferred-dismissal-expungement",
  "OK:not-more-than-two-eligible-felony-convictions-expungement",
  "OK:other-eligible-misdemeanor-conviction-expungement",
  "PA:path-b-complete-acquittal-not-guilty-expungement",
  "PA:path-e-age-70-expungement",
  "PA:path-i-petition-for-limited-access",
  "SC:diversion-or-program-completion-expungement",
  "SC:human-trafficking-survivor-expungement",
  "SD:automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases",
  "SD:controlled-substance-deferred-disposition-route",
  "SD:diversion-expungement",
  "SD:juvenile-delinquency-sealing",
  "TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106",
  "TN:pathway-2-diversion-expunction-under-40-15-105-40-35-313",
  "VA:petition-based-sealing",
  "VA:regime-1-expungement-available-now",
  "VT:adult-felony-conviction-sealing",
  "VT:adult-misdemeanor-conviction-sealing",
  "VT:dui-sealing",
  "VT:juvenile-sealing",
  "VT:non-conviction-sealing",
  "VT:offense-before-age-25-sealing-under-33-v-s-a-5119-g",
  "VT:young-adult-sealing-for-offenses-committed-at-ages-18-21",
  "WA:blake-drug-possession-vacation-and-refund-route",
  "WV:juvenile-record-relief",
  "WV:pardon-based-expungement",
  "WY:adult-non-conviction-expungement-w-s-7-13-1401",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
];

const flowIds = [
  "EXPAI-AL-eb04cbb3ea",
  "EXPAI-AR-6dd3254b94",
  "EXPAI-CA-820d8cab8d",
  "EXPAI-CA-e7b9a19891",
  "EXPAI-CA-4b928ba8db",
  "EXPAI-CA-c36b60d263",
  "EXPAI-CA-751e637f56",
  "EXPAI-CA-09e5b02e34",
  "EXPAI-CA-38be3a849b",
  "EXPAI-CA-9c540ea67a",
  "EXPAI-HI-4ec05ba1c0",
  "EXPAI-IA-fce6d78f56",
  "EXPAI-IA-4799d9d30e",
  "EXPAI-IA-30be9180cf",
  "EXPAI-IL-7e07ca1afa",
  "EXPAI-IN-0887386bf3",
  "EXPAI-IN-d30de2ac45",
  "EXPAI-MD-d3001d6a11",
  "EXPAI-MI-e2a5ee07be",
  "EXPAI-NH-9bb9ca9a99",
  "EXPAI-OH-8f346f384a",
  "EXPAI-OK-194b56c5ed",
  "EXPAI-OK-81ed7d3182",
  "EXPAI-TX-7e7e6db808",
  "EXPAI-TX-adc17283a1",
  "EXPAI-TX-d0af1ca00d",
  "EXPAI-TX-ab2118ec94"
];

function authorityJson(file) {
  return JSON.parse(execFileSync("git", ["show", `${AUTHORITY_SHA}:${file}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024
  }));
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} contains duplicates`);
  }
}

assertUnique(deterministicRouteKeys, "deterministicRouteKeys");
assertUnique(flowIds, "flowIds");
if (deterministicRouteKeys.length !== 37 || flowIds.length !== 27) {
  throw new Error("assignment count drift");
}

const waiting = authorityJson("data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json");
const dispositions = authorityJson("data/expungement-ai/flow-audit/phase4-corrections/final-flow-dispositions.json");
const manifest = authorityJson("data/expungement-ai/flow-audit/flow-manifest.json");

const deterministic = deterministicRouteKeys.map((routeKey, offset) => {
  const authority = waiting.proposals?.perProposal?.[routeKey];
  if (!authority || authority.decision !== "HELD") {
    throw new Error(`${routeKey} is not a held authority proposal`);
  }
  return { correctionId: offset + 37, routeKey, authority };
});

const flows = flowIds.map((flowId) => {
  const disposition = dispositions.rows.find((row) => row.flowId === flowId);
  const flow = manifest.flows.find((row) => row.flowId === flowId);
  if (!disposition || !flow) throw new Error(`${flowId} missing from authority`);
  if (disposition.shardDisposition !== "HELD_FOR_CORRECTION") {
    throw new Error(`${flowId} is not held for correction`);
  }
  return {
    flowId,
    flowKey: disposition.flowKey,
    jurisdiction: disposition.jurisdiction,
    routeKey: `${disposition.jurisdiction}:${disposition.remedy}`,
    authorityTerminal: disposition.terminal,
    authorityPaymentMode: disposition.paymentMode,
    authoritySponsorshipMode: disposition.sponsorshipMode,
    publicRoute: flow.entryConditions.publicRoute,
    profileVersion: flow.entryConditions.profileVersion,
    fixture: flow.fixture,
    pathwayContextSteer: flow.branchingConditions?.pathwayContextSteer ?? null,
    packetFamily: flow.packetFamily
  };
});

const document = {
  schemaVersion: "expai-corrections-b-assignment/v1",
  authoritySha: AUTHORITY_SHA,
  generatedBy: "scripts/expungement-ai/corrections-b/build-assignment-fixture.mjs",
  deterministic,
  flows
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
console.log(`wrote ${path.relative(root, output)}: ${deterministic.length} deterministic, ${flows.length} flows`);
