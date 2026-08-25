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
  MOBILE_VIEWPORT
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

console.log("fresh-review-matrix tests passed (4 assertions).");
