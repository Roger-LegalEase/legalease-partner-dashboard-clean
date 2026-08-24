#!/usr/bin/env node
/**
 * Phase 4 real-flow continuity between the committed Phase 2 manifest and the
 * candidate's regenerated manifest.
 *
 * The assignment's rule: compare real participant flows by stable flowKey,
 * state, remedy, audience, payment/sponsorship mode and terminal meaning; report
 * synthetic probe churn separately; and never count a retired probe hash as a
 * missing real remedy. Read-only.
 */
import fs from "node:fs";
import { readJson, writeArtifact, gitSha } from "../flow-audit/lib/engine.mjs";

const BASE_PATH = process.argv[2];
if (!BASE_PATH || !fs.existsSync(BASE_PATH)) {
  console.error("usage: verify-flow-continuity.mjs <path to the base flow-manifest.json>");
  process.exit(2);
}
const base = JSON.parse(fs.readFileSync(BASE_PATH, "utf8"));
const candidate = readJson("data/expungement-ai/flow-audit/flow-manifest.json");

const isProbe = (flow) => flow.flowKey.includes("_probe_");
/** The identity the assignment names, so a rehashed id can never read as a loss. */
const identity = (flow) => [
  flow.jurisdiction,
  flow.remedy?.pathwayId ?? flow.remedy?.kind ?? "none",
  flow.audience ?? "none",
  flow.paymentMode ?? "none",
  flow.sponsorshipMode ?? "none",
  flow.terminalOutcome?.effectiveTerminal ?? flow.terminalOutcome?.resultCode ?? "none"
].join("|");

const index = (manifest) => {
  const real = new Map(), probe = new Map();
  for (const flow of manifest.flows) (isProbe(flow) ? probe : real).set(flow.flowKey, flow);
  return { real, probe };
};
const baseIndex = index(base);
const candidateIndex = index(candidate);

const missingRealKeys = [...baseIndex.real.keys()].filter((key) => !candidateIndex.real.has(key));
const addedRealKeys = [...candidateIndex.real.keys()].filter((key) => !baseIndex.real.has(key));

/** A remedy is only lost if no candidate row carries its state+remedy at all. */
const candidateRemedies = new Set([...candidateIndex.real.values()].map((flow) => `${flow.jurisdiction}|${flow.remedy?.pathwayId ?? flow.remedy?.kind}`));
const lostRemedies = [...new Set([...baseIndex.real.values()]
  .map((flow) => `${flow.jurisdiction}|${flow.remedy?.pathwayId ?? flow.remedy?.kind}`)
  .filter((key) => !candidateRemedies.has(key)))];

const changed = { terminal: [], packetFamily: [], formSet: [], paymentMode: [], sponsorshipMode: [], eligibility: [] };
for (const [key, baseFlow] of baseIndex.real) {
  const candidateFlow = candidateIndex.real.get(key);
  if (!candidateFlow) continue;
  const compare = (field, left, right) => {
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      changed[field].push({ flowKey: key, jurisdiction: baseFlow.jurisdiction, before: left, after: right });
    }
  };
  compare("terminal", baseFlow.terminalOutcome?.effectiveTerminal ?? baseFlow.terminalOutcome?.resultCode, candidateFlow.terminalOutcome?.effectiveTerminal ?? candidateFlow.terminalOutcome?.resultCode);
  compare("packetFamily", baseFlow.packetFamily, candidateFlow.packetFamily);
  compare("formSet", baseFlow.forms, candidateFlow.forms);
  compare("paymentMode", baseFlow.paymentMode, candidateFlow.paymentMode);
  compare("sponsorshipMode", baseFlow.sponsorshipMode, candidateFlow.sponsorshipMode);
  compare("eligibility", baseFlow.remedy, candidateFlow.remedy);
}

/** An unsupported or referral route must never be purchasable. */
const purchasableUnsupported = [...candidateIndex.real.values()]
  .filter((flow) => flow.unsupportedOrReferralOutcome?.kind && flow.unsupportedOrReferralOutcome.kind !== "supported")
  .filter((flow) => flow.paymentMode === "dtc_paid")
  .map((flow) => flow.flowKey);

const out = {
  schemaVersion: "expai-phase4-flow-continuity/v1",
  candidateSha: gitSha("HEAD"),
  baseManifest: BASE_PATH,
  totals: {
    baseRows: base.flows.length,
    candidateRows: candidate.flows.length,
    baseRealFlows: baseIndex.real.size,
    candidateRealFlows: candidateIndex.real.size,
    baseProbeFlows: baseIndex.probe.size,
    candidateProbeFlows: candidateIndex.probe.size,
    missingRealFlowKeys: missingRealKeys.length,
    addedRealFlowKeys: addedRealKeys.length,
    lostStateRemedyPairs: lostRemedies.length,
    probeChurnRetired: [...baseIndex.probe.keys()].filter((key) => !candidateIndex.probe.has(key)).length,
    probeChurnAdded: [...candidateIndex.probe.keys()].filter((key) => !baseIndex.probe.has(key)).length,
    unexplainedTerminalChanges: changed.terminal.length,
    packetFamilyChanges: changed.packetFamily.length,
    formSetChanges: changed.formSet.length,
    paymentModeChanges: changed.paymentMode.length,
    sponsorshipModeChanges: changed.sponsorshipMode.length,
    eligibilityChanges: changed.eligibility.length,
    purchasableUnsupportedRoutes: purchasableUnsupported.length
  },
  missingRealFlowKeys: missingRealKeys,
  addedRealFlowKeys: addedRealKeys,
  lostStateRemedyPairs: lostRemedies,
  changes: changed,
  purchasableUnsupportedRoutes: purchasableUnsupported
};
writeArtifact("data/expungement-ai/flow-audit/phase4/flow-continuity.json", out);
console.log(JSON.stringify(out.totals, null, 1));
