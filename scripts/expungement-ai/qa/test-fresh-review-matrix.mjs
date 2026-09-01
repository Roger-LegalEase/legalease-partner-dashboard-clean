#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
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
  waitingRuleResolution: "provisional_prose_fallback",
  bindingClassification: null,
  disposition: "READY_FOR_HOSTED_ACCEPTANCE",
  reason: "ready",
  shardDisposition: null,
  purchasableBefore: false,
  purchasableAfter: false,
  countyCourtCatalog: "served",
  active: false
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

const packetReadyFlow = structuredClone(flow);
packetReadyFlow.flowId = "EXPAI-CO-packet-ready";
packetReadyFlow.flowKey = "CO::packet-ready::packet_ready::dtc_paid";
packetReadyFlow.remedy.pathwayId = "packet-ready";
packetReadyFlow.remedy.filingRequired = true;
packetReadyFlow.terminalOutcome.resultCode = "packet_ready";
packetReadyFlow.terminalOutcome.effectiveTerminal = "packet_ready";
packetReadyFlow.paymentMode = "dtc_paid";
packetReadyFlow.fixture.replayResultCode = "packet_ready";
const packetReadyDisposition = {
  ...structuredClone(disposition),
  flowId: packetReadyFlow.flowId,
  flowKey: packetReadyFlow.flowKey,
  remedy: packetReadyFlow.remedy.pathwayId,
  terminal: "packet_ready",
  paymentMode: "dtc_paid",
  purchasableAfter: true
};
const packetReadyArtifacts = buildFreshReviewArtifacts({
  candidateSha: "b".repeat(40),
  manifest: { flows: [packetReadyFlow] },
  dispositions: { rows: [packetReadyDisposition] },
  waitingRuleAuthority: { proposals: { perProposal: {} } },
  expectedRealFlowCount: 1,
  browserShardStateGroups: [["CO"]]
});
assert.equal(
  packetReadyArtifacts.matrix.rows[0].packetTreatment.kind,
  "packet_expected",
  "packet_ready is a packet terminal, not a no-packet terminal"
);

const replayMismatchFlow = structuredClone(flow);
replayMismatchFlow.fixture.reproducesTerminal = false;
replayMismatchFlow.fixture.replayResultCode = "needs_review";
const replayMismatchArtifacts = buildFreshReviewArtifacts({
  candidateSha: "e".repeat(40),
  manifest: { flows: [replayMismatchFlow] },
  dispositions: { rows: [disposition] },
  waitingRuleAuthority: { proposals: { perProposal: {} } },
  expectedRealFlowCount: 1,
  browserShardStateGroups: [["CO"]]
});
const replayMismatchRow = replayMismatchArtifacts.matrix.rows[0];
assert.equal(replayMismatchRow.qaFixtureStatus?.name, "HELD_REPLAY_MISMATCH");
assert.equal(replayMismatchRow.desktopFixture.executionStatus, "HELD_REPLAY_MISMATCH");
assert.equal(replayMismatchRow.mobileFixture.executionStatus, "HELD_REPLAY_MISMATCH");
assert.equal(replayMismatchArtifacts.summary.totalDeviceFixtures, 2);
assert.equal(replayMismatchArtifacts.summary.executableDeviceFixtures, 0);
assert.equal(replayMismatchArtifacts.summary.heldDeviceFixtures, 2);
assert.equal(replayMismatchArtifacts.summary.replayMismatchFlows, 1);
assert.equal(
  replayMismatchArtifacts.summary.invariants.everyFlowHasExecutableDesktopAndMobile,
  false
);
assert.equal(Object.hasOwn(replayMismatchArtifacts.summary, "deviceFixtures"), false);

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
    ...structuredClone(disposition),
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
const contradictoryCanonicalFields = [
  ["flowKey", "CO::contradiction::guidance_only::dtc_no_payment"],
  ["jurisdiction", "MS"],
  ["remedy", "contradictory-remedy"],
  ["terminal", "needs_review"],
  ["paymentMode", "dtc_paid"],
  ["sponsorshipMode", "partner_sponsored_no_charge"]
];
for (const [field, contradictoryValue] of contradictoryCanonicalFields) {
  assert.throws(
    () => buildOne({
      dispositionRows: [{ ...disposition, [field]: contradictoryValue }]
    }),
    new RegExp(`canonical disposition ${field} mismatch for EXPAI-CO-test`),
    `${field} contradiction must fail before ownership derivation`
  );
}
const flowWithoutFixture = structuredClone(flow);
delete flowWithoutFixture.fixture;
assert.throws(
  () => buildOne({ manifestFlows: [flowWithoutFixture] }),
  /missing required fixture for EXPAI-CO-test/
);
assert.throws(
  () => buildOne({
    dispositionRows: [{ ...disposition, disposition: "UNVALIDATED_OWNER_INPUT" }]
  }),
  /unsupported disposition UNVALIDATED_OWNER_INPUT for EXPAI-CO-test/
);
assert.throws(
  () => buildOne({
    dispositionRows: [{ ...disposition, shardDisposition: "UNVALIDATED_SHARD" }]
  }),
  /unsupported shardDisposition UNVALIDATED_SHARD for EXPAI-CO-test/
);
const dispositionWithoutShard = structuredClone(disposition);
delete dispositionWithoutShard.shardDisposition;
assert.throws(
  () => buildOne({ dispositionRows: [dispositionWithoutShard] }),
  /missing disposition field shardDisposition for EXPAI-CO-test/
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
assert.equal(stressArtifacts.summary.totalDeviceFixtures, 6);
assert.equal(stressArtifacts.summary.executableDeviceFixtures, 6);
assert.equal(stressArtifacts.summary.heldDeviceFixtures, 0);
assert.equal(
  stressArtifacts.summary.invariants.everyFlowHasExecutableDesktopAndMobile,
  true
);
assert.equal(stressArtifacts.summary.browserShards, 3);
assert.equal(stressArtifacts.summary.invariants.uniqueFlowIds, true);
assert.equal(stressArtifacts.summary.invariants.shardsDisjoint, true);
assert.equal(stressArtifacts.summary.invariants.shardUnionComplete, true);

const cliPath = path.join(scriptDir, "build-fresh-review-matrix.mjs");
assert.equal(
  fs.existsSync(cliPath),
  true,
  "build-fresh-review-matrix.mjs must exist before exact-SHA artifacts can be generated"
);

const runCli = (...args) => spawnSync(process.execPath, [cliPath, ...args], {
  cwd: rootDir,
  encoding: "utf8"
});

const missingCandidate = runCli();
assert.notEqual(missingCandidate.status, 0);
assert.match(missingCandidate.stderr, /--candidate-sha/);

const invalidCandidate = runCli("--candidate-sha", "not-a-sha");
assert.notEqual(invalidCandidate.status, 0);
assert.match(invalidCandidate.stderr, /40-character lowercase SHA/);

const exactAuthority = "714f4d51f93461855b24c8644b6ea6ddad6d15f2";
assert.equal(
  fs.existsSync(path.join(scriptDir, "vendor-fresh-review-authority.mjs")),
  true,
  "the authority snapshot must have a committed vendoring command"
);
const authorityDir = path.join(
  rootDir,
  "data/expungement-ai/qa/authority",
  exactAuthority
);
assert.equal(
  fs.existsSync(path.join(authorityDir, "AUTHORITY_PROVENANCE.json")),
  true,
  "the exact QA authority bundle must be committed with its provenance"
);
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "legalease-g-matrix-test-"));
const generated = runCli(
  "--candidate-sha",
  exactAuthority,
  "--output-dir",
  outputDir
);
assert.equal(generated.status, 0, generated.stderr);
assert.deepEqual(
  fs.readdirSync(outputDir).sort(),
  [
    "BROWSER_SHARDS.json",
    "BUILD_SUMMARY.json",
    "CURRENT_MATRIX.json",
    "THREE_STATE_STRESS_SET.json"
  ]
);

const generatedSummary = JSON.parse(
  fs.readFileSync(path.join(outputDir, "BUILD_SUMMARY.json"), "utf8")
);
assert.equal(generatedSummary.realFlows, 356);
assert.equal(generatedSummary.totalDeviceFixtures, 712);
assert.equal(generatedSummary.executableDeviceFixtures, 650);
assert.equal(generatedSummary.heldDeviceFixtures, 62);
assert.equal(generatedSummary.replayMismatchFlows, 31);
assert.equal(
  generatedSummary.invariants.everyFlowHasExecutableDesktopAndMobile,
  false
);
for (const flowId of [
  "EXPAI-DC-ce1b907b71",
  "EXPAI-PA-4d793b6257",
  "EXPAI-PA-b248648fdc"
]) {
  assert.ok(
    generatedSummary.replayMismatchFlowIds.includes(flowId),
    `${flowId} must remain held until its fixture reproduces its terminal`
  );
}
assert.equal(generatedSummary.browserShards, 6);
assert.deepEqual(generatedSummary.stressStateFlows, { CO: 5, MS: 14, WI: 6 });

const checked = runCli(
  "--candidate-sha",
  exactAuthority,
  "--output-dir",
  outputDir,
  "--check"
);
assert.equal(checked.status, 0, checked.stderr);

const isolatedRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "legalease-g-shallow-equivalent-")
);
const isolatedScriptDir = path.join(isolatedRoot, "scripts/expungement-ai/qa");
const isolatedAuthorityDir = path.join(
  isolatedRoot,
  "data/expungement-ai/qa/authority",
  exactAuthority
);
fs.mkdirSync(path.dirname(isolatedScriptDir), { recursive: true });
fs.mkdirSync(path.dirname(isolatedAuthorityDir), { recursive: true });
fs.cpSync(scriptDir, isolatedScriptDir, { recursive: true });
fs.cpSync(authorityDir, isolatedAuthorityDir, { recursive: true });
assert.equal(fs.existsSync(path.join(isolatedRoot, ".git")), false);

const isolatedOutputDir = path.join(isolatedRoot, "out");
const isolatedCli = path.join(isolatedScriptDir, "build-fresh-review-matrix.mjs");
const isolatedGenerated = spawnSync(process.execPath, [
  isolatedCli,
  "--candidate-sha",
  exactAuthority,
  "--authority-dir",
  isolatedAuthorityDir,
  "--output-dir",
  isolatedOutputDir
], { cwd: isolatedRoot, encoding: "utf8" });
assert.equal(isolatedGenerated.status, 0, isolatedGenerated.stderr);
for (const fileName of [
  "BROWSER_SHARDS.json",
  "BUILD_SUMMARY.json",
  "CURRENT_MATRIX.json",
  "THREE_STATE_STRESS_SET.json"
]) {
  assert.equal(
    fs.readFileSync(path.join(isolatedOutputDir, fileName), "utf8"),
    fs.readFileSync(path.join(outputDir, fileName), "utf8"),
    `${fileName} must be byte-identical without a Git object store`
  );
}

fs.appendFileSync(path.join(isolatedAuthorityDir, "flow-manifest.json"), " ");
const corruptedAuthority = spawnSync(process.execPath, [
  isolatedCli,
  "--candidate-sha",
  exactAuthority,
  "--authority-dir",
  isolatedAuthorityDir,
  "--output-dir",
  isolatedOutputDir,
  "--check"
], { cwd: isolatedRoot, encoding: "utf8" });
assert.notEqual(corruptedAuthority.status, 0);
assert.match(corruptedAuthority.stderr, /authority digest mismatch for manifest/);

fs.appendFileSync(path.join(outputDir, "CURRENT_MATRIX.json"), " ");
const changed = runCli(
  "--candidate-sha",
  exactAuthority,
  "--output-dir",
  outputDir,
  "--check"
);
assert.notEqual(changed.status, 0);
assert.match(changed.stderr, /CURRENT_MATRIX\.json does not match/);
fs.rmSync(isolatedRoot, { recursive: true, force: true });
fs.rmSync(outputDir, { recursive: true, force: true });

console.log("fresh-review-matrix tests passed (110 assertions).");
