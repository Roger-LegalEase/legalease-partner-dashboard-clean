#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const libraryPath = path.join(scriptDir, "fresh-review-matrix-lib.mjs");

assert.equal(
  fs.existsSync(libraryPath),
  true,
  "fresh-review-matrix-lib.mjs must exist before the matrix can be built"
);

const {
  buildFreshReviewArtifacts,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  stableJson
} = await import(pathToFileURL(libraryPath));

const flow = {
  flowId: "EXPAI-CO-test",
  flowKey: "CO::automatic-test::guidance_only::dtc_no_payment",
  jurisdiction: "CO",
  jurisdictionName: "Colorado",
  remedy: {
    pathwayId: "automatic-test",
    pathwayLabel: "Automatic test",
    routeType: "automatic",
    automatic: true,
    filingRequired: false
  },
  entryConditions: { publicRoute: "/expungement-ai/screening/colorado" },
  screeningFacts: ["case_outcome"],
  screeningScreenIds: ["case_outcome"],
  packetFacts: [],
  terminalOutcome: {
    resultCode: "guidance_only",
    effectiveTerminal: "guidance_only"
  },
  packetFamily: {
    mode: "automatic_relief_verification_and_guidance",
    packetFamilies: [],
    packetSets: [],
    registryTracks: []
  },
  forms: {
    sourceFormIds: [],
    officialFormIdsNamed: [],
    officialFormIdsHeldInThisRepository: []
  },
  paymentMode: "dtc_no_payment",
  sponsorshipMode: "none_direct_to_consumer",
  fixture: {
    answers: { case_outcome: "Dismissed" },
    reproducesTerminal: true,
    replayResultCode: "guidance_only"
  }
};

const disposition = {
  flowId: flow.flowId,
  flowKey: flow.flowKey,
  jurisdiction: "CO",
  remedy: "automatic-test",
  terminal: "guidance_only",
  paymentMode: "dtc_no_payment",
  sponsorshipMode: "none_direct_to_consumer",
  disposition: "READY_FOR_HOSTED_ACCEPTANCE",
  reason: "ready",
  shardDisposition: null
};

const built = buildFreshReviewArtifacts({
  candidateSha: "a".repeat(40),
  manifest: { flows: [flow] },
  dispositions: { rows: [disposition] },
  waitingRuleAuthority: { proposals: { perProposal: {} } },
  expectedRealFlowCount: 1,
  browserShardStateGroups: [["CO"]]
});

assert.equal(built.matrix.rows.length, 1);
assert.equal(built.matrix.rows[0].expectedTerminal.effective, "guidance_only");
assert.deepEqual(built.matrix.rows[0].desktopFixture.viewport, DESKTOP_VIEWPORT);
assert.deepEqual(built.matrix.rows[0].mobileFixture.viewport, MOBILE_VIEWPORT);

function makeFlow({
  flowId,
  state,
  remedyId,
  automatic = true,
  filingRequired = false,
  evaluatorTerminal = "guidance_only",
  effectiveTerminal = evaluatorTerminal,
  paymentMode = "dtc_no_payment"
}) {
  return {
    ...structuredClone(flow),
    flowId,
    flowKey: `${state}::${remedyId}::${effectiveTerminal}::${paymentMode}`,
    jurisdiction: state,
    jurisdictionName: state,
    remedy: {
      pathwayId: remedyId,
      pathwayLabel: remedyId,
      routeType: automatic ? "automatic" : "court_filing",
      automatic,
      filingRequired
    },
    entryConditions: { publicRoute: `/expungement-ai/screening/${state.toLowerCase()}` },
    terminalOutcome: {
      resultCode: evaluatorTerminal,
      effectiveTerminal
    },
    packetFamily: filingRequired
      ? {
          mode: "official_form_overlay_or_source_form_set",
          packetFamilies: [`family-${state.toLowerCase()}`],
          packetSets: [{ packetSetId: `set-${state.toLowerCase()}` }],
          registryTracks: [`track-${state.toLowerCase()}`]
        }
      : structuredClone(flow.packetFamily),
    forms: filingRequired
      ? {
          sourceFormIds: [`source-${state}`],
          officialFormIdsNamed: [`official-${state}`],
          officialFormIdsHeldInThisRepository: [`held-${state}`]
        }
      : structuredClone(flow.forms),
    paymentMode
  };
}

function makeDisposition(flowRecord, dispositionName, shardDisposition = null) {
  return {
    flowId: flowRecord.flowId,
    flowKey: flowRecord.flowKey,
    jurisdiction: flowRecord.jurisdiction,
    remedy: flowRecord.remedy.pathwayId,
    terminal: flowRecord.terminalOutcome.effectiveTerminal,
    paymentMode: flowRecord.paymentMode,
    sponsorshipMode: flowRecord.sponsorshipMode,
    disposition: dispositionName,
    reason: `${dispositionName} test`,
    shardDisposition
  };
}

const proposalKey = (index) => `ZZ:route-${String(index).padStart(3, "0")}`;
const perProposal = Object.fromEntries(
  Array.from({ length: 73 }, (_, index) => [
    proposalKey(index),
    { decision: "HELD" }
  ])
);

const ownerCases = [
  {
    flow: makeFlow({ flowId: "EXPAI-LL-legal", state: "LL", remedyId: "legal" }),
    disposition: "HELD_FOR_LEGAL_DECISION",
    expectedLane: "B"
  },
  {
    flow: makeFlow({
      flowId: "EXPAI-FF-environment",
      state: "FF",
      remedyId: "environment",
      automatic: false,
      filingRequired: true,
      evaluatorTerminal: "packet_ready_with_caution",
      effectiveTerminal: "packet_ready_with_caution",
      paymentMode: "dtc_paid"
    }),
    disposition: "HELD_FOR_ENVIRONMENT",
    expectedLane: "F"
  },
  {
    flow: makeFlow({ flowId: "EXPAI-ZZ-c", state: "ZZ", remedyId: "route-000" }),
    disposition: "HELD_FOR_CORRECTION",
    expectedLane: "C"
  },
  {
    flow: makeFlow({ flowId: "EXPAI-ZZ-d", state: "ZZ", remedyId: "route-072" }),
    disposition: "HELD_FOR_CORRECTION",
    expectedLane: "D"
  },
  {
    flow: makeFlow({ flowId: "EXPAI-YY-phase3", state: "YY", remedyId: "phase3" }),
    disposition: "HELD_FOR_CORRECTION",
    shardDisposition: "HELD_FOR_CORRECTION",
    expectedLane: "D"
  },
  {
    flow: makeFlow({ flowId: "EXPAI-XX-shared", state: "XX", remedyId: "shared" }),
    disposition: "HELD_FOR_CORRECTION",
    expectedLane: "A"
  },
  {
    flow: makeFlow({ flowId: "EXPAI-AA-ready", state: "AA", remedyId: "ready" }),
    disposition: "READY_FOR_HOSTED_ACCEPTANCE",
    expectedLane: "A"
  }
];

const ownershipArtifacts = buildFreshReviewArtifacts({
  candidateSha: "b".repeat(40),
  manifest: { flows: ownerCases.map((entry) => entry.flow) },
  dispositions: {
    rows: ownerCases.map((entry) => makeDisposition(
      entry.flow,
      entry.disposition,
      entry.shardDisposition
    ))
  },
  waitingRuleAuthority: { proposals: { perProposal } },
  expectedRealFlowCount: ownerCases.length,
  browserShardStateGroups: [["AA", "FF", "LL", "XX", "YY", "ZZ"]]
});

const ownershipRows = new Map(
  ownershipArtifacts.matrix.rows.map((row) => [row.flowId, row])
);
for (const ownerCase of ownerCases) {
  const ownerRow = ownershipRows.get(ownerCase.flow.flowId);
  assert.ok(ownerRow.ownerLane, `${ownerCase.flow.flowId} has an owner lane`);
  assert.equal(
    ownerRow.ownerLane.lane,
    ownerCase.expectedLane,
    `${ownerCase.flow.flowId} owner lane`
  );
}

const noPacketRow = ownershipRows.get("EXPAI-AA-ready");
assert.equal(noPacketRow.packetTreatment.kind, "no_packet");
assert.equal(noPacketRow.packetTreatment.checkoutAllowed, false);
assert.equal(noPacketRow.packetTreatment.packetCreditAllowed, false);
assert.equal(noPacketRow.packetTreatment.renderJobAllowed, false);

const packetRow = ownershipRows.get("EXPAI-FF-environment");
assert.equal(packetRow.packetTreatment.kind, "packet_expected");
assert.deepEqual(packetRow.packetTreatment.packetFamilies, ["family-ff"]);
assert.deepEqual(packetRow.packetTreatment.packetSets, [{ packetSetId: "set-ff" }]);
assert.deepEqual(packetRow.packetTreatment.registryTracks, ["track-ff"]);
assert.deepEqual(packetRow.packetTreatment.forms.officialFormIdsNamed, ["official-FF"]);

const buildOne = ({
  manifestFlows = [flow],
  dispositionRows = [disposition],
  expectedRealFlowCount = 1,
  browserShardStateGroups = [["CO"]]
} = {}) => buildFreshReviewArtifacts({
  candidateSha: "c".repeat(40),
  manifest: { flows: manifestFlows },
  dispositions: { rows: dispositionRows },
  waitingRuleAuthority: { proposals: { perProposal: {} } },
  expectedRealFlowCount,
  browserShardStateGroups
});

assert.throws(
  () => buildOne({ manifestFlows: [flow, structuredClone(flow)] }),
  /duplicate manifest flowId EXPAI-CO-test/
);
assert.throws(
  () => buildOne({
    dispositionRows: [disposition, structuredClone(disposition)],
    expectedRealFlowCount: 2
  }),
  /duplicate disposition flowId EXPAI-CO-test/
);
assert.throws(
  () => buildOne({ expectedRealFlowCount: 2 }),
  /expected 2 real flows; found 1/
);
assert.throws(
  () => buildOne({
    dispositionRows: [{ ...disposition, flowId: "EXPAI-CO-missing" }]
  }),
  /missing manifest flow EXPAI-CO-missing/
);
assert.throws(
  () => buildOne({ browserShardStateGroups: [["CO"], ["CO"]] }),
  /state CO appears in multiple browser shards/
);
assert.throws(
  () => buildOne({ browserShardStateGroups: [["MS"]] }),
  /state CO has no browser shard/
);

const stressFlows = [
  makeFlow({ flowId: "EXPAI-WI-stress", state: "WI", remedyId: "wi-stress" }),
  makeFlow({ flowId: "EXPAI-CO-stress", state: "CO", remedyId: "co-stress" }),
  makeFlow({ flowId: "EXPAI-MS-stress", state: "MS", remedyId: "ms-stress" })
];
const stressDispositions = stressFlows.map((stressFlow) => makeDisposition(
  stressFlow,
  "READY_FOR_HOSTED_ACCEPTANCE"
));
const stressInput = {
  candidateSha: "d".repeat(40),
  manifest: { flows: stressFlows },
  dispositions: { rows: stressDispositions },
  waitingRuleAuthority: { proposals: { perProposal: {} } },
  expectedRealFlowCount: 3,
  browserShardStateGroups: [["WI"], ["CO"], ["MS"]]
};
const stressArtifacts = buildFreshReviewArtifacts(stressInput);

assert.deepEqual(
  stressArtifacts.stressSet.states.map((state) => state.state),
  ["CO", "MS", "WI"]
);
assert.deepEqual(
  stressArtifacts.stressSet.states.map((state) => state.flowCount),
  [1, 1, 1]
);
assert.equal(stressArtifacts.browserShards.shards.length, 3);
assert.deepEqual(
  stressArtifacts.browserShards.shards
    .flatMap((shard) => shard.flows.map((entry) => entry.flowId))
    .sort(),
  stressFlows.map((stressFlow) => stressFlow.flowId).sort()
);

const stressRow = stressArtifacts.matrix.rows[0];
assert.deepEqual(stressRow.requiredFacts.screening, ["case_outcome"]);
assert.deepEqual(stressRow.requiredFacts.packet, []);
assert.equal(stressRow.entryRoute, "/expungement-ai/screening/co");
assert.equal(stressRow.clinicMode.ownerLane, "E");
assert.equal(stressRow.clinicMode.status, "pending_lane_e_integration");
assert.ok(stressRow.privacyControls.includes("save_refresh_resume_back"));
assert.ok(stressRow.privacyControls.includes("sensitive_analytics_exclusion"));
assert.equal(stressRow.currentDisposition.name, "READY_FOR_HOSTED_ACCEPTANCE");

const shuffledArtifacts = buildFreshReviewArtifacts({
  ...stressInput,
  manifest: { flows: [...stressFlows].reverse() },
  dispositions: { rows: [...stressDispositions].reverse() }
});
assert.equal(stableJson(shuffledArtifacts.matrix), stableJson(stressArtifacts.matrix));
assert.equal(
  stableJson(shuffledArtifacts.browserShards),
  stableJson(stressArtifacts.browserShards)
);
assert.equal(stableJson(shuffledArtifacts.stressSet), stableJson(stressArtifacts.stressSet));
assert.equal(stressArtifacts.summary.realFlows, 3);
assert.equal(stressArtifacts.summary.deviceFixtures, 6);
assert.equal(stressArtifacts.summary.browserShards, 3);
assert.equal(stressArtifacts.summary.invariants.uniqueFlowIds, true);
assert.equal(stressArtifacts.summary.invariants.shardsDisjoint, true);
assert.equal(stressArtifacts.summary.invariants.shardUnionComplete, true);

console.log("fresh-review-matrix tests passed (54 assertions).");
